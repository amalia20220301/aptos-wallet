## Background

In the Aptos blockchain, when creating a new account, a 32-byte authentication key will be created first, this authentication key will be the account's address. The authentication key will change when generating a new pair of the private and public keys to rotate the authentication key, but the account address will not change.

## Motivation

Currently, there is no standard regarding the address generation and authentication key rotation implementations, wallets are using different approaches, leading to several problems:
1.  If wallets are using different address generation solutions, Accounts generated in one wallet might not be able to import to another wallet, which is not a best practice for the web3 world.
2. It's hard for the wallet software to manage multiple accounts with one mnemonic word.
3. Wallets are using their own authentication key rotation solutions, making accounts hard to recover. Or wallets might not even implement the key rotation functionality, increasing the asset loss risks if the authentication key is compromised.

## Current status
Currently, there is two main wallet provider in the Aptos Community. One is Martian and the other is Fewcha. Currently, they are using different ways for address generation and key rotation.

### Address generation

1. Fewcha wallet uses the mnemonic seed to initialize the Aptos account, below is the code snippet to verify the address generated in Fewcha wallet.

```javascript
import * as bip39 from 'bip39';
import {AptosAccount} from "aptos";
const generateAccount = (derivationPath: string) => {
    const seed = bip39.mnemonicToSeedSync(WORDS);
    return new AptosAccount(seed);
}
```

2. Martian wallet derives `private key` following [bip44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) derivation schema for curve secp256k1, using this `private key` to initialize the Aptos account, this `private key` will be used as entropy to generate the account's ed25519 signing key pair, below is the code snippet to verify the wallet address generated in Martian wallet:

```javascript
import * as bip39 from 'bip39';
import {AptosAccount} from "aptos";
import {HDKey} from "@scure/bip32";
const derivationPath = "m/44'/637'/0'/0/0";
const generateAccount = (derivationPath: string) => {
    const seed = bip39.mnemonicToSeedSync(WORDS);
    const node = HDKey.fromMasterSeed(Buffer.from(seed));
    const exKey = node.derive(derivationPath);
    return new AptosAccount(exKey.privateKey);
}

class AptosAccount {
  ...
  constructor(privateKeyBytes?: Uint8Array | undefined, address?: MaybeHexString) {
     if (privateKeyBytes) {
       this.signingKey = Nacl.sign.keyPair.fromSeed(privateKeyBytes.slice(0, 32));
     } else {
       this.signingKey = Nacl.sign.keyPair();
     }
     this.accountAddress = HexString.ensure(address || this.authKey().hex());
  }
  ...
}
```

### Key rotation

Martain has defined the way to do the key rotation. When generating the account, they are using the account index to specify the account address and using the address index increasing for the key rotation.

Fewcha doesn't support key rotation at this time.

## Proposal

We believe  Martian has raised a really good solution. Basically, the wallet will increase the “BIP-44 account index” for generating addresses and increase the “BIP-44 address Index”.  Inspired by the Martian's solution proposes the following enhanced solution. The main difference is this solution will follow  [SLIP-10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md) for key derivation. Most mainstream wallets on the market(like MetaMasl, Tezor, Ledger, Keystone, etc) are following [SLIP-10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md). So following `SLIP-10` will make current wallets easy to support Aptos.

Here is the detailed way of Account generation and Key rotation.

### Account generation

1. derive private and public key pair for ed25519 curve for hdPath "m/44'/637'/0'/0'/0'" following the [slip10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md) standard. the `sha3-256(pubkey_A | signing_schema)` will be the account's initial authentication key according to the [Aptos Authentication Key Definition](https://aptos.dev/concepts/basics-accounts/#authentication-keys), so as the account's address.
2. more private and public key pairs can be derived by increasing the `account level` hdPath described in step 1; respect the `address gap limit` described below.

<img width="733" alt="image" src="https://user-images.githubusercontent.com/9380107/185077241-8fbc4eb8-7327-40a6-9711-85e33951889b.png">


### Authentication key rotation

For key rotation, this solution will follow current Martain's approach.

Account should also be able to rotate their authentication key by increasing the `index level` hdPath, for the newly derived private and public key pair, the `sha3-256(public key | signing schema)` will be used as account's rotated authentication key, but the account's address should remain the same; respect the `key rotation gap limit` described below.

<img width="988" alt="image" src="https://user-images.githubusercontent.com/9380107/185077325-010efd2b-dfcb-4043-959e-b9ac3325eeaf.png">

#### Pros

- easy to manage multiple account with one mnemonic words.
- respect [slip10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md) standard.
- easy to recover account.

## Address gap limit

Address gap limit should be set. if the wallet hit this limit, it expects there are no used addresses beyond this point and stop searching the address chain.

## Key rotation gap limit

Key rotation gap limit should be set. If the wallet hits this limit, no more authentication key can be rotated for this account. Even though limiting the key rotations somehow sacrifices the flexibility, without this limitation, it will be hard for wallet to manage accounts, because wallets is unware of the hdPath for the authentication key unless it stored it locally(there is no such information on Aptos blockchain), making accounts hard to recover.

## Code snippet

### Address generation

```javascript
import {derivePath} from "ed25519-hd-key";
import * as bip39 from 'bip39';
import {AptosAccount} from "aptos";
import fetch from "cross-fetch";

// For demo, never use it to manage your assets.
const WORDS="rich guitar rally exercise radio food wish pluck input broccoli sample wing";
const getAccountFromMetaData = (code,metaData)=> {
    const seed = bip39.mnemonicToSeedSync(code.toString());
    const { key } = derivePath(metaData.derivationPath, seed.toString('hex'));
    return new AptosAccount(key, metaData.address);
}

const createNewAccounts = async (code) => {
    const accounts = [];
    for (let i = 0; i < ACCOUNT_GAP_LIMIT; i += 1) {
        const derivationPath = `m/44'/637'/${i}'/0'/0'`;
        const acc = getAccountFromMetaData(code,{
            derivationPath
        });
        const address = acc.authKey().toString();
        const response = await fetch(
            `${NODE_URL}/accounts/${address}`,
            {
                method: "GET",
            }
        );
        if (response.status === 404) {
            accounts.push({
                derivationPath,
                address,
                publicKey: acc.pubKey().toString(),
            });
        }
    }
    return accounts;
}
createNewAccounts(WORDS);
```

### Authentication key rotation

```javascript
const accountMetaData = {
    // derivationPath for the account's current authentication key.
    derivationPath: "m/44'/637'/0'/0'/0'",
    address: "0x7de81f2944e10abc0935b93ea95eca581d81307a6c9a21d474ac6704d634a9bf"
}

const generateNextAuthKey = (code ,metaData)=>{
    const pathSplit = metaData.derivationPath.split("/");
    const addressIndex = Number(pathSplit[pathSplit.length - 1].slice(0,-1));
    const newDerivationPath = `${pathSplit
        .slice(0, pathSplit.length - 1)
        .join("/")}/${addressIndex + 1}'`;

    if (addressIndex >= KEY_ROTATION_GAP_LIMIT - 1) {
        throw new Error("Maximum key rotation reached");
    }
   
    const newAccount = getAccountFromMetaData(code,{
        address: metaData.address,
        derivationPath: newDerivationPath
    });
    return newAccount.authKey().toString().split("0x")[1];
}
generateNextAuthKey(WORDS, accountMetaData);
```