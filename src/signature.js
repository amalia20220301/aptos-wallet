import nacl from 'tweetnacl';
const message = "APTOS\nmessage: hello\nnonce: random_string"
const verified = nacl.sign.detached.verify(Buffer.from(message),
    Buffer.from("d212b7ba3faed9323b7baef1061f14cb68845a339f651835a8d297c733208f753b6e46a4120721ad0b518c60cf30c125d7260f324058fa6819cc050323cb1409", 'hex'),
    Buffer.from("f42ae9e16d7d0a975b48b48270f8cfbebd75a16f466c8557f7fce0680a87a181", 'hex'));

console.log(verified)