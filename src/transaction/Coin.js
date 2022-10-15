import assert from "assert";
import fs from "fs";
import {AptosClient, TxnBuilderTypes, TransactionBuilder} from "aptos";
import {client, getAccountBalance} from "./Helper.js";
import {FAUCET_URL, NODE_URL} from "../Constant.js";
import {getAccountFromMetaData} from "../Account.js";

const {BCS} = TransactionBuilder;

export const initializeCoin = async (accountFrom, coinTypeAddress) => {
    const token = new TxnBuilderTypes.TypeTagStruct(
        TxnBuilderTypes.StructTag.fromString(`${coinTypeAddress.hex()}::moon_coin::MoonCoin`),
    );

    const serializer = new BCS.Serializer();
    serializer.serializeBool(false);

    const scriptFunctionPayload = new TxnBuilderTypes.TransactionPayloadScriptFunction(
        TxnBuilderTypes.ScriptFunction.natural(
            "0x1::managed_coin",
            "initialize",
            [token],
            [BCS.bcsSerializeStr("Moon Coin"), BCS.bcsSerializeStr("MOON"), BCS.bcsSerializeUint64(6), serializer.getBytes()],
        ),
    );

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
        BigInt(Math.floor(Date.now() / 1000) + 10),
        new TxnBuilderTypes.ChainId(chainId),
    );

    const bcsTxn = AptosClient.generateBCSTransaction(accountFrom, rawTxn);
    const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);

    return pendingTxn.hash;
}

export const registerCoin = async (coinReceiver, coinTypeAddress) => {
    console.log('------registerCoin-------token---',`${coinTypeAddress.hex()}::moon_coin::MoonCoin`);
    const token = new TxnBuilderTypes.TypeTagStruct(
        TxnBuilderTypes.StructTag.fromString(`${coinTypeAddress.hex()}::moon_coin::MoonCoin`),
    );
    const proof = new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString("0x1::account::RotationProof"));
    proof.serialize()
    /*
    * api updated https://github.com/martian-dao/aptos-web3.js/pull/19/commits/24d69d80fee2d380be12b46b1673cbbfb4ebd017
    * https://github.com/martian-dao/aptos-web3.js/pull/19/commits/24d69d80fee2d380be12b46b1673cbbfb4ebd017
    * **/

    const scriptFunctionPayload = new TxnBuilderTypes.TransactionPayloadScriptFunction(
        TxnBuilderTypes.ScriptFunction.natural("0x1::coins", "register", [token], []),
    );
    console.log('------scriptFunctionPayload----------',scriptFunctionPayload)

    const [{sequence_number: sequenceNumber}, chainId] = await Promise.all([
        client.getAccount(coinReceiver.address()),
        client.getChainId(),
    ]);

    const rawTxn = new TxnBuilderTypes.RawTransaction(
        TxnBuilderTypes.AccountAddress.fromHex(coinReceiver.address()),
        BigInt(sequenceNumber),
        scriptFunctionPayload,
        1000n,
        1n,
        BigInt(Math.floor(Date.now() / 1000) + 10),
        new TxnBuilderTypes.ChainId(chainId),
    );

    const bcsTxn = AptosClient.generateBCSTransaction(coinReceiver, rawTxn);
    const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);

    return pendingTxn.hash;
}

export const mintCoin = async (
    coinOwner,
    coinTypeAddress,
    receiverAddress,
    amount,
) => {
    const token = new TxnBuilderTypes.TypeTagStruct(
        TxnBuilderTypes.StructTag.fromString(`${coinTypeAddress.hex()}::moon_coin::MoonCoin`),
    );

    const scriptFunctionPayload = new TxnBuilderTypes.TransactionPayloadScriptFunction(
        TxnBuilderTypes.ScriptFunction.natural(
            "0x1::managed_coin",
            "mint",
            [token],
            [BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(receiverAddress.hex())), BCS.bcsSerializeUint64(amount)],
        ),
    );

    const [{sequence_number: sequenceNumber}, chainId] = await Promise.all([
        client.getAccount(coinOwner.address()),
        client.getChainId(),
    ]);

    const rawTxn = new TxnBuilderTypes.RawTransaction(
        TxnBuilderTypes.AccountAddress.fromHex(coinOwner.address()),
        BigInt(sequenceNumber),
        scriptFunctionPayload,
        1000n,
        1n,
        BigInt(Math.floor(Date.now() / 1000) + 10),
        new TxnBuilderTypes.ChainId(chainId),
    );

    const bcsTxn = AptosClient.generateBCSTransaction(coinOwner, rawTxn);
    const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
    return pendingTxn.hash;
}

const accountMetaData = {
    derivationPath: "m/44'/637'/0'/0/0",
    address: "0x2c6ce72e37bbc4d49dc3e165509f896259035d7fe81acdb5e02c25bf7d8c782",
}
const currentAccount = getAccountFromMetaData(process.env.WORDS, accountMetaData);
/*
* current account publish module
* aptos move publish --package-dir ./aptos-core/aptos-move/move-examples/moon_coin/ --named-addresses MoonCoinType=0x02c6ce72e37bbc4d49dc3e165509f896259035d7fe81acdb5e02c25bf7d8c782
* **/
// const receiverMetadata = {
//     derivationPath: "m/44'/637'/1'/0/0",
//     address: '0x792ec29f1884a4cdbd5211f01c5189fbdf3e6f9b37d4d25dc705f314927b02bc'
// };
// const receiverAccount = getAccountFromMetaData(process.env.WORDS, receiverMetadata);
//
const thirdMetadata = {
    derivationPath: "m/44'/637'/2'/0/0",
    address: '0x7aa2174259d0f90c08f35fafef679d877a4c99706d1f7d05e4786875ddb4981f'
};
const thirdAccount = getAccountFromMetaData(process.env.WORDS, thirdMetadata);

// console.log('------thirdAccount-----privKey-----',{
//     privKey: thirdAccount.signingKey.secretKey
// })

// initializeCoin(thirdAccount, thirdAccount.address()).then((txHash) => {
//     console.log('-------initializeCoin--txHash-------',txHash);
//     return client.waitForTransaction(txHash)
// }).then(console.log).catch(console.log);

const fifthMetadata = {
    derivationPath: "m/44'/637'/4'/0/0",
    address: '0x1af6258d48a11be115522790776cbaba11c3562eb84f4d7f64c7289e8d31418d'
};
const fifthAccount = getAccountFromMetaData(process.env.WORDS, fifthMetadata);

// registerCoin(fifthAccount, thirdAccount.address()).then((txHash) => {
//     console.log('---------registerCoin txHash-------',txHash);
//     return client.waitForTransaction(txHash)
// }).then(console.log).catch(console.log);

// mintCoin(thirdAccount, thirdAccount.address(), fifthAccount.address(), 100).then(txHash=>{
//     console.log('mintCoin',txHash);
//     return client.waitForTransaction(txHash);
// }).catch(console.log);


getAccountBalance(fifthAccount.address().hex(),{
    address: '0x1',
    module: "coin",
    name: "CoinStore",
    generic_type_params: ["0x7aa2174259d0f90c08f35fafef679d877a4c99706d1f7d05e4786875ddb4981f::moon_coin::MoonCoin"]
}).then(console.log).catch(console.log);

