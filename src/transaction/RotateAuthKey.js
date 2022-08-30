import 'dotenv/config'
import {AptosAccount, TransactionBuilder} from "aptos";
import {client, signGenericTransaction} from "./Helper.js";
import {ADDRESS_GAP} from "../Constant.js";
import {derivePath} from "ed25519-hd-key";
import bip39 from "bip39";
import * as Aptosis from '@aptosis/aptos-framework';

export const getAccountFromMetaData = (code,metaData)=> {
    const seed = bip39.mnemonicToSeedSync(code.toString());
    const { key } = derivePath(metaData.derivationPath, seed.toString('hex'));
    return new AptosAccount(key, metaData.address);
}

const generateNextAuthKey = (code ,metaData)=>{
    //根据metaData获取当前的Account
    const account = getAccountFromMetaData(code ,metaData);
    const pathSplit = metaData.derivationPath.split("/");
    const addressIndex = Number(pathSplit[pathSplit.length - 1]);
    const newDerivationPath = `${pathSplit
        .slice(0, pathSplit.length - 1)
        .join("/")}/${addressIndex + 1}`;

    if (addressIndex >= ADDRESS_GAP - 1) {
        throw new Error("Maximum key rotation reached");
    }
    //生成下一个account，address不变，但是signingKey改变了。authentication key 也随之改变了。
    const newAccount = getAccountFromMetaData(code,{
        derivationPath: newDerivationPath
    });
    return newAccount.authKey().toString().split("0x")[1];

}

// https://github.com/aptosis/aptos-framework/blob/master/packages/aptos-framework/src/account/index.ts#L270
export const rotateAuthKey = async (account, newAuthKey) =>{
    return signGenericTransaction(
        account,
        "0x1::account::rotate_authentication_key",
        ["","","",""
        ],
        []
    );
}

const accountMetaData = {
    // current authentication key's derivation path
    derivationPath: "m/44'/637'/0'/0'/0'"
}


const originalAccount = getAccountFromMetaData("toilet debate cup test rice scout kitchen frozen cannon help stick can", accountMetaData);
console.log("originalAccount", originalAccount);
const account = getAccountFromMetaData(process.env.WORDS, accountMetaData);
console.log('account', account);
const newAuthKey = account.authKey().toString().split("0x")[1];
rotateAuthKey(originalAccount,newAuthKey);

// const currentAccount = getAccountFromMetaData(process.env.WORDS,accountMetaData);

// console.log('-------account before rotateKey--------',{
//     address: currentAccount.address().hex(),
//     privKey: Buffer.from(currentAccount.signingKey.secretKey).toString('hex'),
//     pubKey: Buffer.from(currentAccount.signingKey.publicKey).toString('hex'),
//     authKey: currentAccount.authKey()
// });

// const newAuthKey = generateNextAuthKey(process.env.WORDS, accountMetaData);
// console.log('-----newAuthKey----------', newAuthKey);
// rotateAuthKey(currentAccount,newAuthKey).then(console.log).catch(console.log);
