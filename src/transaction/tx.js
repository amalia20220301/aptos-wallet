// import { AptosAccount, TxnBuilderTypes, BCS, MaybeHexString } from "aptos";

import { AptosClient, FaucetClient } from "aptos";
import {NODE_URL} from "../Account.js";

const client = new AptosClient(NODE_URL);

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
