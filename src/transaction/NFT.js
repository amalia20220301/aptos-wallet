import 'dotenv/config'
import {AptosClient, TxnBuilderTypes} from "aptos";
import {NODE_URL} from "../Constant.js";

import {TransactionBuilder} from 'aptos';
import {getAccountFromMetaData} from "../Account.js";
const {BCS} = TransactionBuilder;

function serializeVectorBool(vecBool) {
    const serializer = new BCS.Serializer();
    serializer.serializeU32AsUleb128(vecBool.length);
    vecBool.forEach((el) => {
        serializer.serializeBool(el);
    });
    return serializer.getBytes();
}

const NUMBER_MAX = 9007199254740991;
const client = new AptosClient(NODE_URL);

/** Creates a new collection within the specified account */
async function createCollection(account, name, description, uri) {
    const scriptFunctionPayload = new TxnBuilderTypes.TransactionPayloadScriptFunction(
        TxnBuilderTypes.ScriptFunction.natural(
            "0x3::token",
            "create_collection_script",
            [],
            [
                BCS.bcsSerializeStr(name),
                BCS.bcsSerializeStr(description),
                BCS.bcsSerializeStr(uri),
                BCS.bcsSerializeUint64(NUMBER_MAX),
                serializeVectorBool([false, false, false]),
            ],
        ),
    );

    const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
        client.getAccount(account.address()),
        client.getChainId(),
    ]);

    const rawTxn = new TxnBuilderTypes.RawTransaction(
        TxnBuilderTypes.AccountAddress.fromHex(account.address()),
        BigInt(sequenceNumber),
        scriptFunctionPayload,
        1000n,
        1n,
        BigInt(Math.floor(Date.now() / 1000) + 10),
        new TxnBuilderTypes.ChainId(chainId),
    );

    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
    await client.waitForTransaction(pendingTxn.hash);
}


async function createToken(
    account,
    collection_name,
    name,
    description,
    supply,
    uri,
) {
    // Serializes empty arrays
    const serializer = new BCS.Serializer();
    serializer.serializeU32AsUleb128(0);

    const scriptFunctionPayload = new TxnBuilderTypes.TransactionPayloadScriptFunction(
        TxnBuilderTypes.ScriptFunction.natural(
            "0x3::token",
            "create_token_script",
            [],
            [
                BCS.bcsSerializeStr(collection_name),
                BCS.bcsSerializeStr(name),
                BCS.bcsSerializeStr(description),
                BCS.bcsSerializeUint64(supply),
                BCS.bcsSerializeUint64(NUMBER_MAX),
                BCS.bcsSerializeStr(uri),
                BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(account.address())),
                BCS.bcsSerializeUint64(0),
                BCS.bcsSerializeUint64(0),
                serializeVectorBool([false, false, false, false, false]),
                serializer.getBytes(),
                serializer.getBytes(),
                serializer.getBytes(),
            ],
        ),
    );

    const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
        client.getAccount(account.address()),
        client.getChainId(),
    ]);

    const rawTxn = new TxnBuilderTypes.RawTransaction(
        TxnBuilderTypes.AccountAddress.fromHex(account.address()),
        BigInt(sequenceNumber),
        scriptFunctionPayload,
        1000n,
        1n,
        BigInt(Math.floor(Date.now() / 1000) + 10),
        new TxnBuilderTypes.ChainId(chainId),
    );

    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
    await client.waitForTransaction(pendingTxn.hash);
}


async function tableItem(handle, keyType, valueType, key) {
    const getTokenTableItemRequest = {
        key_type: keyType,
        value_type: valueType,
        key,
    };
    return client.getTableItem(handle, getTokenTableItemRequest);
}

async function getTokenBalance(
    owner,
    creator,
    collection_name,
    token_name,
) {
    const token_store = await client.getAccountResource(owner, {
        address: "0x3",
        module: "token",
        name: "TokenStore",
        generic_type_params: [],
    });

    const token_data_id = {
        creator: creator.hex(),
        collection: collection_name,
        name: token_name,
    };

    const token_id = {
        token_data_id,
        property_version: "0",
    };

    const token = await tableItem(
        (token_store.data)["tokens"]["handle"],
        "0x3::token::TokenId",
        "0x3::token::Token",
        token_id,
);

    return token.amount;
}

async function getTokenData(creator, collection_name, token_name) {
    const collections = await client.getAccountResource(creator, {
        address: "0x3",
        module: "token",
        name: "Collections",
        generic_type_params: [],
    });

    const token_data_id = {
        creator: creator.hex(),
        collection: collection_name,
        name: token_name,
    };

    const token = await tableItem(
        (collections.data)["token_data"]["handle"],
        "0x3::token::TokenDataId",
        "0x3::token::TokenData",
        token_data_id,
);
    return token;
}

async function offerToken(
    account,
    receiver,
    creator,
    collection_name,
    token_name,
    amount,
) {
    const scriptFunctionPayload = new TxnBuilderTypes.TransactionPayloadScriptFunction(
        TxnBuilderTypes.ScriptFunction.natural(
            "0x3::token_transfers",
            "offer_script",
            [],
            [
                BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(receiver.hex())),
                BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(creator.hex())),
                BCS.bcsSerializeStr(collection_name),
                BCS.bcsSerializeStr(token_name),
                BCS.bcsSerializeUint64(0),
                BCS.bcsSerializeUint64(amount),
            ],
        ),
    );

    const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
        client.getAccount(account.address()),
        client.getChainId(),
    ]);

    const rawTxn = new TxnBuilderTypes.RawTransaction(
        TxnBuilderTypes.AccountAddress.fromHex(account.address()),
        BigInt(sequenceNumber),
        scriptFunctionPayload,
        1000n,
        1n,
        BigInt(Math.floor(Date.now() / 1000) + 10),
        new TxnBuilderTypes.ChainId(chainId),
    );

    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
    await client.waitForTransaction(pendingTxn.hash);
}

async function claimToken(
    account,
    sender,
    creator,
    collection_name,
    token_name,
) {
    const scriptFunctionPayload = new TxnBuilderTypes.TransactionPayloadScriptFunction(
        TxnBuilderTypes.ScriptFunction.natural(
            "0x3::token_transfers",
            "claim_script",
            [],
            [
                BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(sender.hex())),
                BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(creator.hex())),
                BCS.bcsSerializeStr(collection_name),
                BCS.bcsSerializeStr(token_name),
                BCS.bcsSerializeUint64(0),
            ],
        ),
    );

    const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
        client.getAccount(account.address()),
        client.getChainId(),
    ]);

    const rawTxn = new TxnBuilderTypes.RawTransaction(
        TxnBuilderTypes.AccountAddress.fromHex(account.address()),
        BigInt(sequenceNumber),
        scriptFunctionPayload,
        1000n,
        1n,
        BigInt(Math.floor(Date.now() / 1000) + 10),
        new TxnBuilderTypes.ChainId(chainId),
    );

    const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);
    const pendingTxn = await client.submitSignedBCSTransaction(bcsTxn);
    await client.waitForTransaction(pendingTxn.hash);
}
const collection_name = "Toilet Cat collection";
const token_name = "Toilet's tabby";
const account = getAccountFromMetaData( process.env.WORDS,{
    derivationPath: "m/44'/637'/0'/0/2",
    address: "0xaa7420c68c16645775ecf69a5e2fdaa4f89d3293aee0dd280e2d97ad7b879650",
})
// createCollection(account, collection_name, "Toilet's simple collection", "https://aptos.dev").then(console.log).catch(console.log);

// createToken(
//     account,
//     collection_name,
//     token_name,
//     "Toilet's tabby",
//     1,
//     "https://aptos.dev/img/nyan.jpeg", //TODO: replace with uri link matching ERC1155 off-chain standard
// ).then(console.log).catch(console.log);

// getTokenBalance(account.address(), account.address(), collection_name, token_name).then(console.log).catch(console.log);
// getTokenData(account.address(), collection_name, token_name).then(console.log).catch(console.log);
const receiver = getAccountFromMetaData( process.env.WORDS,{
    derivationPath: "m/44'/637'/1'/0/0",
    address: "0x97f95acfb04f84d228dce9bda4ad7e2a5cb324d5efdd6a7f0b959e755ebb3a70",
})
// offerToken(account, receiver.address(), account.address(), collection_name, token_name, 1).then(console.log).catch(console.log);
// getTokenBalance(account.address(), account.address(), collection_name, token_name).then(console.log).catch(console.log);
// getTokenBalance(receiver.address(), receiver.address(), collection_name, token_name).then(console.log).catch(console.log);
claimToken(receiver, account.address(), account.address(), collection_name, token_name).then(console.log).catch(console.log);
