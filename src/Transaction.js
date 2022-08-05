import 'dotenv/config'
import {AptosClient, FaucetClient, TxnBuilderTypes, BCS, AptosAccount} from "aptos";
import { derivePath, getMasterKeyFromSeed, getPublicKey } from 'ed25519-hd-key'
import bip39 from 'bip39'
import { getAccount } from "./Account.js";

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

const account = getAccount();
//0xaa7420c68c16645775ecf69a5e2fdaa4f89d3293aee0dd280e2d97ad7b879650
console.log('-----account----------',{
    publicKey: account.pubKey(),
    secretKey: Buffer.from(account.signingKey.secretKey).toString('hex'),
    address: account.address(),
});
// const hash = await transfer(account,"0x3c607262a025a88da0e1883d0c3bbc099ab3c56ff45de223003deb0c55cf951b", 10);
// console.log('----pending transaction-----------', hash);
