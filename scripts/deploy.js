const { sign } = require("crypto");
const hre = require("hardhat");

async function main() {
  const SignatureVerification = await hre.ethers.getContractFactory(
    "SignatureVerification"
  );
  const signatureVerification = await SignatureVerification.deploy();
  await signatureVerification.deployed();
  console.log("deployed to address", signatureVerification.address);

  // const storeTx = await signatureVerification.storeSignature(
  //   "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  //   "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  //   "bafybeiglbadhcqxzt5bledxbnvyxgmaxan2bwtv3idxd5xdbngahb4t4na",
  //   "0x675c42f76f12db63b1cda31e3ddc66a148ad7f64cf09a31c72e0af865726f2ea5c2bbc8e4bf8e30ca979f5a6bdeaf14cacd4c612af16425172afe6d329f7562f1c",
  //   "a message"
  // );
  const storeTx = await signatureVerification.storeSignature(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "bafybeiglbadhcqxzt5bledxbnvyxgmaxan2bwtv3idxd5xdbngahb4t4na",
    hre.ethers.utils.arrayify(
      "0x675c42f76f12db63b1cda31e3ddc66a148ad7f64cf09a31c72e0af865726f2ea5c2bbc8e4bf8e30ca979f5a6bdeaf14cacd4c612af16425172afe6d329f7562f1c"
    ),
    "a message"
  );
  await storeTx.wait();
  const tx = await signatureVerification.getTransactionById(0);
  // await tx.wait();
  console.log("transactionis: ", tx);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
