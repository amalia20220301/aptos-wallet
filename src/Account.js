import 'dotenv/config'
import bip39 from 'bip39'
import nacl from "tweetnacl";
import sha3 from "js-sha3";

const getAccount = ()=>{
    const seed = bip39.mnemonicToSeedSync(process.env.WORDS)
    const signingKey = nacl.sign.keyPair.fromSeed(seed.slice(0, 32));
    const hash = sha3.sha3_256.create();
    hash.update(Buffer.from(signingKey.publicKey));
    hash.update("\x00");
    console.log('-------getAccount--------', {
        publicKey: Buffer.from(signingKey.publicKey).toString('hex'),
        privateKey: Buffer.from(signingKey.secretKey).toString('hex'),
        authKey: hash.hex(),
        address: hash.hex(),
    });
}

getAccount()
0203ed654f7d7fbbb177d467dbfb83c16cd28242e0c75bf609dd6b12c1aec4e49bfe0a9900686cebc6baa64db8e0783374986d3d90630c800eefd899728578c7
0203ed654f7d7fbbb177d467dbfb83c16cd28242e0c75bf609dd6b12c1aec4e49bfe0a9900686cebc6baa64db8e0783374986d3d90630c800eefd899728578c7