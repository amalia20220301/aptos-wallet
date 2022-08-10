import {derivePath} from "ed25519-hd-key";
import * as bip39 from 'bip39';
import {AptosAccount} from "aptos";
import fetch from "cross-fetch";
import {NODE_URL} from "../Constant.js";

// For demo, never use it to manage your assets.
const WORDS="rich guitar rally exercise radio food wish pluck input broccoli sample wing";
const KEY_ROTATION_GAP_LIMIT=10;
const ACCOUNT_GAP_LIMIT=5;

const getAccountFromMetaData = (code,metaData)=> {
    const seed = bip39.mnemonicToSeedSync(code.toString());
    const { key } = derivePath(metaData.derivationPath, seed.toString('hex'));
    return new AptosAccount(key, metaData.address);
}

const createNewAccounts = async (code) => {
    const accounts = [];
    for (let i = 0; i < ACCOUNT_GAP_LIMIT; i += 1) {
        const derivationPath = `m/44'/637'/${i}'/0'/0'`;
        const acc = getAccountFromMetaData(code,{
            derivationPath
        });
        const address = acc.authKey().toString();
        const response = await fetch(
            `${NODE_URL}/accounts/${address}`,
            {
                method: "GET",
            }
        );
        if (response.status === 404) {
            accounts.push({
                derivationPath,
                address,
                publicKey: acc.pubKey().toString(),
            });
        }
    }
    return accounts;
}

// createNewAccounts(WORDS)

// Authentication Key rotation

const accountMetaData = {
    // derivationPath for the account's current authentication key.
    derivationPath: "m/44'/637'/0'/0'/0'",
    address: "0x7de81f2944e10abc0935b93ea95eca581d81307a6c9a21d474ac6704d634a9bf"
}

const generateNextAuthKey = (code ,metaData)=>{
    const pathSplit = metaData.derivationPath.split("/");
    const addressIndex = Number(pathSplit[pathSplit.length - 1].slice(0,-1));
    const newDerivationPath = `${pathSplit
        .slice(0, pathSplit.length - 1)
        .join("/")}/${addressIndex + 1}'`;

    if (addressIndex >= KEY_ROTATION_GAP_LIMIT - 1) {
        throw new Error("Maximum key rotation reached");
    }

    const newAccount = getAccountFromMetaData(code,{
        address: metaData.address,
        derivationPath: newDerivationPath
    });
    console.log('----publicKey-----------', newAccount.pubKey().toString());
    return newAccount.authKey().toString().split("0x")[1];
}
console.log(generateNextAuthKey(WORDS, accountMetaData));