import 'dotenv/config'
import {AptosAccount, TransactionBuilder} from "aptos";
import {getAccountFromMetaData} from "../Account.js";
import {client, signGenericTransaction} from "./Helper.js";
import {ADDRESS_GAP} from "../Constant.js";
import {derivePath} from "ed25519-hd-key";
import bip39 from "bip39";

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
        address: metaData.address,
        derivationPath: newDerivationPath
    });
    return newAccount.authKey().toString().split("0x")[1];

}

export const rotateAuthKey = async (account, newAuthKey) =>{
    const payload = {
        type: "script_function_payload",
        function: func,
        type_arguments: type_args,
        arguments: args,
    };
    return signGenericTransaction(
        account,
        "0x1::account::rotate_authentication_key",
        [newAuthKey],
        []
    );
}

const accountMetaData = {
    // current authentication key's derivation path
    derivationPath: "m/44'/637'/0'/0'/0'",
    address: "0x2746f8df274cd4467df8fcfa0b4b7f4700d647077d0d39d86d963b2a5b2e604a"
}

export const getAccountFromMetaData = (code,metaData)=> {
    const seed = bip39.mnemonicToSeedSync(code.toString());
    const { key } = derivePath(metaData.derivationPath, seed.toString('hex'));
    return new AptosAccount(key, metaData.address);
}

const account = getAccountFromMetaData(process.env.WORDS, accountMetaData);
const newAuthKey = generateNextAuthKey(process.env.WORDS, accountMetaData);
rotateAuthKey(account,newAuthKey);

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
