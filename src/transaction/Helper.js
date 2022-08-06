import {AptosClient} from "aptos";
import fetch from "cross-fetch";
import {NODE_URL} from "../Constant.js";

export const client = new AptosClient("https://fullnode.devnet.aptoslabs.com");


export const getAccount = async (accountAddress) => {
    const response =  await fetch(
        `${NODE_URL}/accounts/${accountAddress}`,
        {
            method: "GET",
        }
    );
    return response.json();
}

export const createSigningMessage = async (txnRequest) =>{
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

export const submitTransaction = async (SignedTransaction) =>{
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

export const getAccountBalance = async (address, resource)=>{
    const result = await client.getAccountResource(address, resource);
    if (result == null) {
        return null;
    }
    return parseInt((result.data)["coin"]["value"]);
}

// const address = "0x792ec29f1884a4cdbd5211f01c5189fbdf3e6f9b37d4d25dc705f314927b02bc";
// getAccountBalance(address,{
//     address: "0x1",
//     module: "coin",
//     name: "CoinStore",
//     generic_type_params: ["0x1::aptos_coin::AptosCoin"]
// }).then(console.log)


export const signTransaction = async (accountFrom, txnRequest) =>{
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

export const submitTransactionHelper = async (account, payload, options)=>{
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

export const signGenericTransaction = async (
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
