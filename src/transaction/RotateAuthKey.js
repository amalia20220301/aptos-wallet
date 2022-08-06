import 'dotenv/config'
import {AptosClient, TxnBuilderTypes, BCS} from "aptos";
import {getAccountFromMetaData} from "../Account.js";
import fetch from "cross-fetch";
import {signGenericTransaction} from "./Helper.js";
import {ADDRESS_GAP} from "../Constant.js";

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
    const newAccount = getAccountFromMetaData(code,metaData);
    return newAccount.authKey().toString().split("0x")[1];

}
export const rotateAuthKey = async (account, newAuthKey) =>{
    const transactionStatus = await signGenericTransaction(
        account,
        "0x1::account::rotate_authentication_key",
        [newAuthKey],
        []
    );
}

// const accountMetaData = {
//     derivationPath: "m/44'/637'/0'/0/2",
//     address: "0xaa7420c68c16645775ecf69a5e2fdaa4f89d3293aee0dd280e2d97ad7b879650",
// }
// const newAuthKey = generateNextAuthKey(process.env.WORDS, accountMetaData);
// const currentAccount = getAccountFromMetaData(process.env.WORDS,accountMetaData);
// signGenericTransaction(currentAccount,
//     "0x1::account::rotate_authentication_key",
//     [newAuthKey],
//     []).then(console.log);
