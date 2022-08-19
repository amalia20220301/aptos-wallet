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
    // console.log('----bcsTxn------------', bcsTxn);
    // const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
    return pendingTxn.hash;
}

const metaData = {
    derivationPath: "m/44'/637'/0'/0/0"
};
const accountFrom = getAccountFromMetaData(process.env.WORDS,metaData);
// console.log('-------accountFrom---------', accountFrom);
// const receipt = "0x7aa2174259d0f90c08f35fafef679d877a4c99706d1f7d05e4786875ddb4981f";
// const amount = 1000;

// transfer(accountFrom, receipt,amount).then(console.log).catch(console.log);

export const sendAptosCoinTransaction = async ({
                                                   amount,
                                                   fromAccount,
                                                   nodeUrl,
                                                   toAddress,
                                               }) => {
    const payload = {
        arguments: [toAddress, `${amount}`],
        function: '0x1::coin::transfer',
        type: 'script_function_payload',
        type_arguments: ['0x1::aptos_coin::AptosCoin'],
    };
    const client = new AptosClient(nodeUrl);
    const txnRequest = await client.generateTransaction(fromAccount.address(), payload);
    const message = await client.createSigningMessage(txnRequest);
    console.log('signTransaction', fromAccount, txnRequest, message);
    const signatureHex = fromAccount.signHexString(message.substring(2));
    console.log({ signatureHex });
    const transactionSignature = {
        public_key: fromAccount.pubKey().hex(),
        signature: signatureHex.hex(),
        type: 'ed25519_signature',
    };
    console.log({ transactionSignature });
    const signedTxn = { signature: transactionSignature, ...txnRequest };
    // const signedTxn = await client.signTransaction(fromAccount, txnRequest);
    // const transactionRes = await client.submitTransaction(signedTxn);
    // await client.waitForTransaction(transactionRes.hash);
    // return transactionRes.hash
}

// sendAptosCoinTransaction(({amount: 2, fromAccount: accountFrom, nodeUrl: "https://devnet.aptoslabs.com", toAddress: "0xaa7420c68c16645775ecf69a5e2fdaa4f89d3293aee0dd280e2d97ad7b879650"})).then(console.log);