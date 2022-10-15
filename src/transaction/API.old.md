## Background

In the Aptos blockchain, when creating a new account, a 32-byte authentication key will be created first, this authentication key will be the account's address. The authentication key will change when generating a new pair of the private and public keys to rotate the authentication key, but the account address will not change.

## Motivation

Currently, there is no standard regarding the address generation and authentication key rotation implementations, wallets are using different approaches, leading to several problems:

1.  If wallets are using different address generation solutions, Accounts generated in one wallet might not be able to import to another wallet, which is not a best practice for the web3 world.
2.  It's hard for the wallet software to manage multiple accounts with one mnemonic word.
3.  Wallets are using their own authentication key rotation solutions, making accounts hard to recover. Or wallets might not even implement the key rotation functionality, increasing the asset loss risks if the authentication key is compromised.

## Current status

### Address generation

Currently different wallets are using different ways for address generation:

1. [Petra wallet](https://github.com/aptos-labs/aptos-core/releases?q=wallet&expanded=true) generate the public / private key pair follow the [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) standard, using this private key to initialize the Aptos Account, below is the code snippet to verify the wallet address generated in Petra wallet.

```javascript
import * as bip39 from "bip39"
import { HDKey } from "@scure/bip32"

const generateAccount = () => {
  const seed = bip39.mnemonicToSeedSync(code)
  const node = HDKey.fromMasterSeed(Buffer.from(seed))
  const exKey = node.derive("m/44'/637'/0'/0/0")
  return new AptosAccount(exKey.privateKey)
}
```

2. [Fewcha wallet](https://fewcha.app/) uses the mnemonic seed to initialize the Aptos account, below is the code snippet to verify the address generated in Fewcha wallet.

```javascript
import * as bip39 from "bip39"
const WORDS =
  "rich guitar rally exercise radio food wish pluck input broccoli sample wing"

const generateAccount = () => {
  const seed = bip39.mnemonicToSeedSync(WORDS)
  return new AptosAccount(seed)
}
```

3. [Martian wallet](https://martianwallet.xyz/) follows the [SLIP-10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md) standard to initialize the Aptos account, below is the code snippet to verify the wallet address generated in Martian wallet.

```javascript
import * as bip39 from "bip39"
import { derivePath } from "ed25519-hd-key"
const WORDS =
  "rich guitar rally exercise radio food wish pluck input broccoli sample wing"
const path = "m/44'/637'/0'/0'/0'"

export const getAptosAccount = () => {
  const seed = bip39.mnemonicToSeedSync(process.env.WORDS)
  const { key } = derivePath(path, seed.toString("hex"))
  return new AptosAccount(new Uint8Array(key))
}
```

### Authentication key rotation

After a [great discussion](https://github.com/aptos-labs/aptos-core/issues/566) about authentication key rotation, the [OriginatingAddress](https://github.com/aptos-labs/aptos-core/pull/2972) technology has been implement.

## Proposal

### Account generation

For the account generation, we propose the [SLIP-10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md) for several benefits:

1. It's easy and straightforward, most mainstream wallets on the market(like MetaMasl, Tezor, Ledger, Keystone, etc) are following `SLIP-10`.
2. It's easy for multiple account management, wallets can manage multiple accounts with one mnemonic words, by increasing the "BIP-44 account index" for generating addresses.

### Authentication key rotation

For the authentication key rotation, we propose to follow the [OriginatingAddress](https://github.com/aptos-labs/aptos-core/pull/2972) implementation, a brief description of this implementation can be found [here](https://github.com/aptos-labs/aptos-core/issues/566#issuecomment-1176642851), new mnemonic words rotation should be used for security.

Here is the detailed way of Account generation and Key rotation.

### Account generation

1. derive private and public key pair for ed25519 curve for hdPath "m/44'/637'/0'/0'/0'" following the [slip10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md) standard. the `sha3-256(pubkey_A | signing_schema)` will be the account's initial authentication key according to the [Aptos Authentication Key Definition](https://aptos.dev/concepts/basics-accounts/#authentication-keys), so as the account's address.
2. more private and public key pairs can be derived by increasing the `account level` hdPath described in step 1; respect the `address limit` described below.
   <img width="753" alt="image" src="https://user-images.githubusercontent.com/9380107/188758887-e9fb9418-9748-4ced-8814-76a124640f3b.png">

## Address limit

Address limit should be set. if the wallet hit this limit, it expects there are no used addresses beyond this point and stop searching the address chain.

## Code snippet

### Address generation

```javascript
import { derivePath } from "ed25519-hd-key"
import * as bip39 from "bip39"
import { AptosAccount } from "aptos"
import fetch from "cross-fetch"

// For demo, never use it to manage your assets.
const WORDS =
  "rich guitar rally exercise radio food wish pluck input broccoli sample wing"
const getAccountFromMetaData = (code, metaData) => {
  const seed = bip39.mnemonicToSeedSync(code.toString())
  const { key } = derivePath(metaData.derivationPath, seed.toString("hex"))
  return new AptosAccount(key, metaData.address)
}

const ACCOUNT_LIMIT = 10

const importantAccountsFromMnemonic = async (code) => {
  const accounts = []
  for (let i = 0; i < ACCOUNT_LIMIT; i += 1) {
    const derivationPath = `m/44'/637'/${i}'/0'/0'`
    const acc = getAccountFromMetaData(code, {
      derivationPath,
    })
    const address = acc.authKey().toString()
    const response = await fetch(`${NODE_URL}/accounts/${address}`, {
      method: "GET",
    })
    if (response.status !== 404) {
      accounts.push({
        derivationPath,
        address,
        publicKey: acc.pubKey().toString(),
      })
    }
  }
  return accounts
}
importantAccountsFromMnemonic(WORDS)
```

### Authentication key rotation

1. Wallet use mnemonic phrase to generate an Ed25519 private/public key pair (priv_a, pub_a) follow [SLIP-10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md), with hdPath "m/44'/637'/{accountIndex}'/0'/0'", account_a created with authKey auth_key = sha_256(pub_a | scheme_id).
2. Wallet use a new mnemonic phrase to generate an Ed25519 private/public key pair (priv_b, pub_b) follow [SLIP-10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md), with derivationPath "m/44'/637'/0'/0'/0'", account_b is created on-chain, with the auth_key=sha_256(pub_b | schema_id).
3. Rotate the authentication key follow [this](https://github.com/aptos-labs/aptos-core/pull/2972) technology.
