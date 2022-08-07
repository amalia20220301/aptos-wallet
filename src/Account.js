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

export const getAccountFromSeed = () =>{
    const seed = bip39.mnemonicToSeedSync(process.env.WORDS);
    return new AptosAccount(seed.slice(0,32));
}

// const fewchaAccount = getAccountFromSeed();
// console.log('-------fewchaAccount--------',{
//     address: fewchaAccount.address().hex(),
//     privKey: Buffer.from(fewchaAccount.signingKey.secretKey).toString('hex'),
//     pubKey: Buffer.from(fewchaAccount.signingKey.publicKey).toString('hex')
// });

// const fewchaImportAccount = (privKey)=>{
//     return AptosAccount.fromAptosAccountObject({
//         privateKeyHex: privKey
//     })
// }
//
// const account = fewchaImportAccount("0xfa1a9401364ce3d54cb2471e80977b709c57445700c3f1b2f7aa263e6dc37576");
// console.log('-------account--------',{
//     address: account.address().hex(),
//     privKey: Buffer.from(account.signingKey.secretKey).toString('hex'),
//     pubKey: Buffer.from(account.signingKey.publicKey).toString('hex')
// });

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


/**
 * words: rich guitar rally exercise radio food wish pluck input broccoli sample wing
 * account1: derivationPath: "m/44'/637'/0'/0/0"
 * {
 *   address: '0x7de81f2944e10abc0935b93ea95eca581d81307a6c9a21d474ac6704d634a9bf',
 *   privKey: '7e42dc68a6a4a8c3660ec5d2c6be90bd74670624d31bbdcee6c241e18733d5b4744eb29b1deba703caf103c900625455e9875166aa8387a367fcaf5027990794',
 *   pubKey: '744eb29b1deba703caf103c900625455e9875166aa8387a367fcaf5027990794',
 *   authKey: HexString {
 *     hexString: '0x7de81f2944e10abc0935b93ea95eca581d81307a6c9a21d474ac6704d634a9bf'
 *   }
 * }
 *
 * account2: derivationPath: "m/44'/637'/1'/0/0"
 * {
 *   address: '0xbf19fdca26156f8d7edce94a4088379ac63f993327a0dfa43e48fe9903a30b8a',
 *   privKey: '073b901ea7f472d09ee4668e37e61dc3ea897002ecc1b3e1d7e72d5b0dce89fa02a9237eaa3333db104cefeb839f14c4fa64d08a76c6e6f49e9962d0f2607d1e',
 *   pubKey: '02a9237eaa3333db104cefeb839f14c4fa64d08a76c6e6f49e9962d0f2607d1e',
 *   authKey: HexString {
 *     hexString: '0xbf19fdca26156f8d7edce94a4088379ac63f993327a0dfa43e48fe9903a30b8a'
 *   }
 * }
 * rotate key pair for account2,
 * derivationPath: "m/44'/637'/1'/0/0"
 * {
 *   address: '0x8a322875b95a1868e9c8e5ed0c3bef4d600e48371ffe86230cf4f599405c383b',
 *   privKey: 'dcfbcee225801b768348ef9b01b736a65e682eae8909ec87357cd00befe1277d214c32c48ce92bf6f5f0981cfa485bd74fb80808ca57e8e8284dcc7233c39f83',
 *   pubKey: '214c32c48ce92bf6f5f0981cfa485bd74fb80808ca57e8e8284dcc7233c39f83',
 *   authKey: HexString {
 *     hexString: '0x8a322875b95a1868e9c8e5ed0c3bef4d600e48371ffe86230cf4f599405c383b'
 *   }
 * }
 *
 * account3: derivationPath: "m/44'/637'/2'/0/0"
 * {
 *   address: '0x31af7a756e86f4c67765d736308a617ba8089c44cbced0604d2ca36349567e73',
 *   privKey: '6bb34823a2e3953fd55e8a41630f3d1ec375827177c91a29fc37729b129dbde480508f37d29df00a85234063cec9bd0146599ab0c252b36d4cb38e6e9760dab0',
 *   pubKey: '80508f37d29df00a85234063cec9bd0146599ab0c252b36d4cb38e6e9760dab0',
 *   authKey: HexString {
 *     hexString: '0x31af7a756e86f4c67765d736308a617ba8089c44cbced0604d2ca36349567e73'
 *   }
 * }
 *
 *
 *
 * **/
// const metaData = {
//     derivationPath: "m/44'/637'/2'/0/0"
// };
// const account = getAccountFromMetaData(process.env.WORDS,metaData);
// console.log('-------currentAccount--------',{
//     address: account.address().hex(),
//     privKey: Buffer.from(account.signingKey.secretKey).toString('hex'),
//     pubKey: Buffer.from(account.signingKey.publicKey).toString('hex'),
//     authKey: account.authKey()
// });