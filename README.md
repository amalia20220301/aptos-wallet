## Aptos wallet

### Reference Link

- https://aptos-labs.github.io/ts-sdk-doc/classes/AptosAccount.html#constructor
- https://github.com/martian-dao/aptos-web3.js

### Setup aptos cli

```shell
cargo install --git https://github.com/aptos-labs/aptos-core.git aptos --branch devnet
# privKey can be found with `getAccountFromMetaData` in `src/Account.js`
aptos init
```

### Publish a move module
```shell
aptos move publish --package-dir ./aptos-core/aptos-move/move-examples/hello_blockchain/ --named-addresses HelloBlockchain=0x02c6ce72e37bbc4d49dc3e165509f896259035d7fe81acdb5e02c25bf7d8c782
```
