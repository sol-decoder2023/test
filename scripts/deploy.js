const { ethers } = require("hardhat");
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.getBalance();
  const Oxyo2 = await hre.ethers.getContractFactory("Oxyo2");
  const contract = await Oxyo2.deploy(
    "0x53940D46a35162255511ff7cade811891d49533c"
  );
  await contract.deployed();
  // 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

  console.log("Oxyo2 Contract deployed to:-", contract.address);

  const data = {
    address: contract.address,
    abi: JSON.parse(contract.interface.format("json")),
  };

  //This writes the ABI and address to the mktplace.json
  fs.writeFileSync("./src/contract.json", JSON.stringify(data));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// const { ethers } = require("hardhat");
// const hre = require("hardhat");
// const fs = require("fs");

// async function main() {
//   const [deployer] = await ethers.getSigners();
//   const balance = await deployer.getBalance();
//   console.log("Deploying contracts with account:", deployer.address);
//   console.log("Account balance:", balance.toString());

//   // Deploy Marketplace contract
//   const Marketplace = await hre.ethers.getContractFactory("NFTMarketplace");
//   const marketplace = await Marketplace.deploy();
//   await marketplace.deployed();
//   console.log("Marketplace deployed to:", marketplace.address);

//   // Deploy MyNFTContract and link it with the Marketplace contract
//   const MyNFTContract = await hre.ethers.getContractFactory("MyNFTContract");
//   const myNFTContract = await MyNFTContract.deploy(marketplace.address);
//   await myNFTContract.deployed();
//   console.log("MyNFTContract deployed to:", myNFTContract.address);

//   // Prepare and write the ABI and address for Marketplace contract
//   const marketplaceData = {
//     address: marketplace.address,
//     abi: JSON.parse(marketplace.interface.format('json'))
//   }
//   fs.writeFileSync('./src/Marketplace.json', JSON.stringify(marketplaceData, null, 2));

//   // Prepare and write the ABI and address for MyNFTContract contract
//   const myNFTContractData = {
//     address: myNFTContract.address,
//     abi: JSON.parse(myNFTContract.interface.format('json'))
//   }
//   fs.writeFileSync('./src/MyNFTContract.json', JSON.stringify(myNFTContractData, null, 2));

//   console.log("Contracts deployed and addresses saved!");
// }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
