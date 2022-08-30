import {AptosSignRequest, AptosSignature, SignType} from "@keystonehq/bc-ur-registry-aptos";
import {CryptoKeypath, CryptoMultiAccounts, PathComponent} from "@keystonehq/bc-ur-registry";
import {URDecoder, UREncoder} from "@ngraveio/bc-ur";
import nacl from "tweetnacl";
import {derivePath} from 'ed25519-hd-key'
import bip39 from 'bip39';
import bs58 from 'bs58';
import 'dotenv/config'
import * as uuid from "uuid";
import {AptosClient} from "aptos";
import {getAccountFromMetaData} from "../Account.js";

// signature data from the QR Code

export const generateSignatureData = ()=>{
    const decoder = new URDecoder();

    const ur = 'ur:aptos-signature/otadtpdagdndcawmgtfrkigrpmndutdnbtkgfssbjnaohdfzflvdrebeksfyamuroygtnettfneteebglugaskjnursamnuyaoskaajpcfktnyuewebgadkbdlnebyjtlskodmlnyaahstehckpdmyqzaxzmclmhbaammefwpazoehbaaxhdcxmnguvdpaamhflyjnvdaydkvladjlseoektvdksdavydedauogwcnnefpleprvtgloynbcfut';

    decoder.receivePart(ur)

    if(decoder.isSuccess()) {
        const ur = decoder.resultUR();
        const aptosSignature = AptosSignature.fromCBOR(ur.cbor);
        const requestIdBuffer = aptosSignature.getRequestId();
        const signature = aptosSignature.getSignature();
        const publicKey = aptosSignature.getAuthenticationPublicKey();
        return {
            signature,
            publicKey,
        } // it will return signature and publicKey to construct TransactionSignature.

    } else if(decoder.isError()){
        // logic for error handling
        throw new Error()
    }
}

export const decodeSignRequestUR = () =>{
    const decoder = new URDecoder();

    const ur = 'ur:aptos-sign-request/onadtpdagdlbjelyutlsspfehfqdoxwttbidlseernaohdwfrewlkipflbnbrybagomkpkenfxptrfjliymuryuocynewpnniogefgckpkaepamurpzocyprylkokgeosaeyjnoybtatahltcpurfdlfrpldadgdeshewmtejntputihaeaeaeaeaeaeaeaeaoaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeadaaiajlinjtayjyjphsjtjkiyihjpadataeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeadbkhsjojyjljkheiajlinjtasfpjojyjljkfxjlinjtaeaocxpkjycxswlkcmiehgkpwpynnyhydltnoxyanteymuplvtutdebadpmspmkgltmtgdayaxaeaeaeaeaeaeaetiataeaeaeaeaeaeadaeaeaeaeaeaeaevsldaaiaaeaeaeaecsaxlytaaddyoeadlecsdwykcfaokiykaeykaeykaeykaocywlcscewfaalaamaxgmontpve';

    decoder.receivePart(ur)

    if(decoder.isSuccess()) {
        const ur = decoder.resultUR();
        const aptosSignRequest = AptosSignRequest.fromCBOR(ur.cbor);
        const requestIdBuffer = aptosSignRequest.getRequestId();
        console.log(uuid.stringify(requestIdBuffer));
        console.log("origin",aptosSignRequest.getOrigin())
        console.log("authKeyPath", aptosSignRequest.getAuthenticationKeyDerivationPaths())
        console.log("signData", aptosSignRequest.getSignData())
        console.log("accounts", aptosSignRequest.getSignRequestAccounts())
        console.log("signType", aptosSignRequest.getSignType())
        return aptosSignRequest.getSignData().toString('hex');

    }
}

console.log(decodeSignRequestUR());
// console.log(generateSignatureData());

export const generateCryptoMultiAccountsData = ()=>{
    const decoder = new URDecoder();
    const ur = "UR:CRYPTO-MULTI-ACCOUNTS/OTADCYWLCSCEWFAOLYTAADDLOEAXHDCLAOWDVEROKOPDINHSEEROISYALKSAYKCTJSHEDPRNUYJYFGROVAWEWFTYGHCEGLRPKGAMTAADDYOYADLECSDWYKCFAOKIYKAEYKAEYKAEYKAXISJEIHKKJKJYJLJTIHOXTORNJY"
    decoder.receivePart(ur);
    if(decoder.isSuccess()) {
        const ur = decoder.resultUR();
        const cryptoMultiAccounts=CryptoMultiAccounts.fromCBOR(ur.cbor);
        const account1=cryptoMultiAccounts.getKeys()[0];
        const path1=account1.getOrigin().getPath();
        const key1=account1.getKey();
        console.log(key1.toString('hex'));
    }
}

// console.log(generateCryptoMultiAccountsData())

export const generateSignRequestURFromMsg = (signingMsg) => {
    const aptosData = Buffer.from(
        signingMsg,
        "hex"
    );

    const aptosRequestId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

    const authenticationKeyPath = "m/44'/637'/0'/0'/0'";
    const aptosSignRequest = AptosSignRequest.constructAptosRequest(aptosData, [authenticationKeyPath], ["78230804"], SignType.SingleSign, aptosRequestId, ["0xaa7420c68c16645775ecf69a5e2fdaa4f89d3293aee0dd280e2d97ad7b879650"], "aptosWallet");

    const cborHex = aptosSignRequest.toCBOR().toString("hex");
    return aptosSignRequest.toUREncoder(1000).nextPart();
}
const metaData = {
    derivationPath: "m/44'/637'/0'/0/0"
};
const fromAccount = getAccountFromMetaData(process.env.WORDS,metaData);

export const generateSignRequestUR = async ()=>{
    const payload = {
        "arguments": [
            "0xaa7420c68c16645775ecf69a5e2fdaa4f89d3293aee0dd280e2d97ad7b879650",
            "1"
        ],
        "function": "0x1::coin::transfer",
        "type": "entry_function_payload",
        "type_arguments": [
            "0x1::aptos_coin::AptosCoin"
        ]
    };
    const nodeUrl="https://fullnode.devnet.aptoslabs.com/v1";
    const client = new AptosClient(nodeUrl);
    const txnRequest = await client.generateTransaction(fromAccount.address(), payload);
    const aptosData = await client.createSigningMessage(txnRequest);
    const requestId = uuid.v4();
    const authenticationKeyPath = "m/44'/637'/0'/0'/0'";
    const xfp = "78230804"; // master fingerprint
    const senderAddress=fromAccount.address();
    const aptosSignRequest = AptosSignRequest.constructAptosRequest(
        aptosData,[authenticationKeyPath],
        [xfp],
        SignType.SingleSign,
        requestId,
        [senderAddress],
        "aptosWallet");

    const eachChunkNumberInEachQR = 1000; // specify each chunk Number in single QR Code

// get the ur decoder
    const urDecoder = aptosSignRequest.toUREncoder(eachChunkNumberInEachQR);
    return urDecoder.nextPart();
}

// generateSignRequestUR().then(console.log);


const signMessage = "b5e97db07fa0bd0e5598aa3643a9bc6f6693bddc1a9fec9e674a461eaa00b193b6fb1ab2f7767b33c2326da10d07058722df4882b6890150395febd36dd8dd65000000000000000002000000000000000000000000000000000000000000000000000000000000000104636f696e087472616e73666572010700000000000000000000000000000000000000000000000000000000000000010a6170746f735f636f696e094170746f73436f696e000220aa7420c68c16645775ecf69a5e2fdaa4f89d3293aee0dd280e2d97ad7b879650080300000000000000d0070000000000000100000000000000e88904630000000018";
// console.log(generateSignRequestUR(signMessage));
const fromHexString = (hexString) =>
    Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

export const generateSignature = (signingMsg)=>{
    const secretKey = new Uint8Array([
        15, 149, 161, 233,  85, 190, 188,  16,  59,  87,   8,
        214,   8,  13,  10, 134, 183, 205, 236,  57, 218,   3,
        165,  64, 232, 228, 132, 163, 128,  90,  73,  31,  19,
        129, 176, 114, 149, 128,  56, 160, 117, 119, 176, 180,
        112,  15, 135, 211,  32, 231,  15, 222,  70, 145, 129,
        206, 228, 113, 198,  81,  11, 220, 209, 150
    ]);
    const signature = nacl.sign.detached(fromHexString(signingMsg), secretKey);
    return Buffer.from(signature).toString("hex");
}

// console.log(generateSignature(signMessage))
