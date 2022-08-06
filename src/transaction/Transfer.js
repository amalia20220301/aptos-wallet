import 'dotenv/config';
import {client} from "./Helper.js";
import {AptosClient, TransactionBuilder, TxnBuilderTypes} from "aptos";
const {BCS} = TransactionBuilder;
import {getAccountFromMetaData} from "../Account.js";

export const transfer = async(accountFrom,recipient,amount)=>{
    const token = new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString("0x1::aptos_coin::AptosCoin"));
    const scriptFunctionPayload = new TxnBuilderTypes.TransactionPayloadScriptFunction(
        TxnBuilderTypes.ScriptFunction.natural(
            "0x1::coin",
            "transfer",
            [token],
            [BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(recipient)), BCS.bcsSerializeUint64(amount)],
        ));
    const [{sequence_number: sequenceNumber}, chainId] = await Promise.all([
        client.getAccount(accountFrom.address()),
        client.getChainId(),
    ]);
    const rawTxn = new TxnBuilderTypes.RawTransaction(
        TxnBuilderTypes.AccountAddress.fromHex(accountFrom.address()),
        BigInt(sequenceNumber),
        scriptFunctionPayload,
        1000n,
        1n,
        BigInt(Math.floor(Date.now()/1000)+10),
        new TxnBuilderTypes.ChainId(chainId)
    )
    console.log('----rawTxn------------', rawTxn);
    const bcsTxn = AptosClient.generateBCSTransaction(accountFrom, rawTxn);
    console.log('----bcsTxn------------', bcsTxn);
    const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
    return pendingTxn.hash;
}
// const metaData = {
//     derivationPath: "m/44'/637'/1'/0/0",
//     address: "0x792ec29f1884a4cdbd5211f01c5189fbdf3e6f9b37d4d25dc705f314927b02bc",
// };
// const accountFrom = getAccountFromMetaData(process.env.WORDS,metaData);
// console.log('-------accountFrom---------', accountFrom);
// const receipt = "0x7aa2174259d0f90c08f35fafef679d877a4c99706d1f7d05e4786875ddb4981f";
// const amount = 1000;
//
// transfer(accountFrom, receipt,amount).then(console.log).catch(console.log);
