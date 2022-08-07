import {getAccountFromMetaData} from "../Account.js";
import {client, signGenericTransaction, stringToHex} from "./Helper.js";

const accountMetaData = {
    derivationPath: "m/44'/637'/0'/0/0",
    address: "0x2c6ce72e37bbc4d49dc3e165509f896259035d7fe81acdb5e02c25bf7d8c782",
}
const currentAccount = getAccountFromMetaData(process.env.WORDS,accountMetaData);

// console.log('-----account-----------', {
//     privKey: Buffer.from(currentAccount.signingKey.secretKey).toString('hex').slice(0,64)
// });

// SetMessage
// signGenericTransaction(currentAccount,`${currentAccount.address().hex()}::message::set_message`,[stringToHex('hello mengru')],[]).then(console.log).catch(console.log);

// GetMessage
client.getAccountResource(currentAccount.address().hex(),{
    address: currentAccount.address().hex(),
    module: "message",
    name: "MessageHolder",
    generic_type_params: []
}).then(console.log).catch(console.log);
