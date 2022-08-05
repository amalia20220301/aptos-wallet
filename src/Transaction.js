import 'dotenv/config'
import {AptosClient, TxnBuilderTypes, BCS} from "aptos";
import {getAccountFromMetaData, NODE_URL, rotateAuthKey} from "./Account.js";
import fetch from "cross-fetch";

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com");

const transfer = async(accountFrom,recipient,amount)=>{
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
    const bcsTxn = AptosClient.generateBCSTransaction(accountFrom, rawTxn);
    const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
    return pendingTxn.hash;
}

const getAccount = async (accountAddress) => {
    const response =  await fetch(
        `${NODE_URL}/accounts/${accountAddress}`,
        {
            method: "GET",
        }
    );
    return response.json();
}

const createSigningMessage = async (txnRequest) =>{
    const url = `${NODE_URL}/transactions/signing_message`;
    const options = {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(txnRequest),
    };
    const res = await fetch(url, options);
    return res.json();
}

const submitTransaction = async (SignedTransaction) =>{
    const url = `${NODE_URL}/transactions`;
    const options = {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(SignedTransaction),
    };
    const res = await fetch(url, options);
    console.log('-------submitTransaction--------', JSON.stringify(SignedTransaction), res);
    return res.json();
}

const signTransaction = async (accountFrom, txnRequest) =>{
    const result = await createSigningMessage(txnRequest);
    console.log('----signTransaction-----message------', result);
    const signatureHex = accountFrom.signHexString(result.message);
    console.log('----signTransaction-----signatureHex------', signatureHex);
    const txSignature = {
        type: 'ed25519_signature',
        public_key: accountFrom.pubKey().hex(),
        signature: signatureHex.hex(),
    }
    return {signature: txSignature, ...txnRequest};
}
const submitTransactionHelper = async (account, payload, options)=>{
    const senderAddress = account.address().hex();
    const onChainAccount = await getAccount(senderAddress);
    const txnRequest = {
        sender: senderAddress,
        sequence_number: onChainAccount.sequence_number,
        max_gas_amount: '1000',
        gas_unit_price: '1',
        gas_currency_code: 'XUS',
        // Unix timestamp, in seconds + 10 seconds
        expiration_timestamp_secs: (Math.floor(Date.now() / 1000) + 10).toString(),
        payload,
        ...(options || {}),
    };
    const signedTxn = await signTransaction(account,txnRequest);

    console.log('------submitTransactionHelper---------', signedTxn);
    const res = await submitTransaction(signedTxn);
    console.log('------submitTransactionHelper transaction hash---------', res.hash);
}

const signGenericTransaction = async (
    account,
    func,
    args,
    type_args
) =>  {
    const payload = {
        type: "script_function_payload",
        function: func,
        type_arguments: type_args,
        arguments: args,
    };

    return submitTransactionHelper(
        account,
        payload,
        {max_gas_amount: '4000'}
    );
}

const accountMetaData = {
    derivationPath: "m/44'/637'/0'/0/2",
    address: "0xaa7420c68c16645775ecf69a5e2fdaa4f89d3293aee0dd280e2d97ad7b879650",
}
const currentAccount = getAccountFromMetaData(process.env.WORDS, accountMetaData);
console.log('------currentAccount---------',{
    publicKey: Buffer.from(currentAccount.signingKey.publicKey).toString('hex')
});
const newAuthKey = await rotateAuthKey(process.env.WORDS,accountMetaData);

// signGenericTransaction(currentAccount,
//     "0x1::account::rotate_authentication_key",
//     [newAuthKey],
//     []).then(console.log);