import 'dotenv/config'
import bip39 from 'bip39'
import {HDKey} from "@scure/bip32";
import {AptosAccount} from "aptos";
import fetch from "cross-fetch";
import sha3 from "js-sha3";
import {Buffer} from "buffer";
import {ADDRESS_GAP, COIN_TYPE, MAX_ACCOUNTS, NODE_URL} from "./Constant.js";

// address generation logic following https://github.com/martian-dao/aptos-web3.js/search?q=HDKey
export const getAccount = () => {
    const seed = bip39.mnemonicToSeedSync(process.env.WORDS);
    const node = HDKey.fromMasterSeed(Buffer.from(seed));
    const exKey = node.derive(`m/44'/637'/0'/0/1`);
    return new AptosAccount(exKey.privateKey);
}

// generate account authentication key from signing publicKey
export const hash = (pubKey) => {
    const hash = sha3.sha3_256.create();
    hash.update(Buffer.from(pubKey));
    hash.update("\x00");
    return hash.hex();
}

export const importWallet = async (code) => {
    let flag = false;
    let address = "";
    let publicKey = "";
    let derivationPath = "";
    let authKey = "";

    const seed = bip39.mnemonicToSeedSync(code);
    const node = HDKey.fromMasterSeed(Buffer.from(seed));
    const accountMetaData = [];
    for (let i = 1; i < MAX_ACCOUNTS; i += 1) {
        flag = false;
        address = "";
        publicKey = "";
        derivationPath = "";
        authKey = "";
        for (let j = 0; j < ADDRESS_GAP; j += 1) {
            const exKey = node.derive(`m/44'/${COIN_TYPE}'/${i}'/0/${j}`);

            let acc = new AptosAccount(exKey.privateKey);
            if (j === 0) {
                address = acc.authKey().toString();
                publicKey = acc.pubKey().toString();
                const response = await fetch(
                    `${NODE_URL}/accounts/${address}`,
                    {
                        method: "GET",
                    }
                );
                if (response.status === 404) {
                    break;
                }
                const respBody = await response.json();
                authKey = respBody.authentication_key;
            }
            acc = new AptosAccount(exKey.privateKey, address);
            if (acc.authKey().toString() === authKey) {
                flag = true;
                derivationPath = `m/44'/${COIN_TYPE}'/${i}'/0/${j}`;
                break;
            }
        }
        if (!flag) {
            break;
        }
        accountMetaData.push({
            derivationPath,
            address,
            publicKey,
        });
    }

    return {code, accounts: accountMetaData};
}

const createNewAccount = async (code) => {
    const seed = bip39.mnemonicToSeedSync(code.toString());
    const node = HDKey.fromMasterSeed(Buffer.from(seed));
    for (let i = 0; i < MAX_ACCOUNTS; i += 1) {
        const derivationPath = `m/44'/${COIN_TYPE}'/${i}'/0/0`;
        const exKey = node.derive(derivationPath);
        const acc = new AptosAccount(exKey.privateKey);
        const address = acc.authKey().toString();
        const response = await fetch(
            `${NODE_URL}/accounts/${address}`,
            {
                method: "GET",
            }
        );
        if (response.status === 404) {
            await this.faucetClient.fundAccount(acc.authKey(), 0);
            return {
                derivationPath,
                address,
                publicKey: acc.pubKey().toString(),
            };
        }
    }
}

export const getAccountFromMetaData = (code,metaData)=> {
    const seed = bip39.mnemonicToSeedSync(code.toString());
    const node = HDKey.fromMasterSeed(Buffer.from(seed));
    const exKey = node.derive(metaData.derivationPath);
    return new AptosAccount(exKey.privateKey, metaData.address);
}
