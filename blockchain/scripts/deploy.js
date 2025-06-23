const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners(); // Deployer adresini almak için
  console.log("Deploying contracts with the account:", deployer.address);

  // Mevcut NFT kontratını deploy et
  const NFT = await ethers.getContractFactory("NFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("NFT kontratı adresi:", nftAddress);

  // Mevcut Marketplace kontratını deploy et
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(); // Eğer marketplace constructor'ı NFT adresi alıyorsa, onu buraya ekleyin
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace kontratı adresi:", marketplaceAddress);

  console.log("\n--- Deploying Evolving NFT Contract ---");

  // EvolvingNFT kontratını deploy et
  const EvolvingNFT = await ethers.getContractFactory("EvolvingNFT");
  console.log("Deploying EvolvingNFT...");
  // Constructor: initialOwner
  const evolvingNFT = await EvolvingNFT.deploy(deployer.address);
  await evolvingNFT.waitForDeployment();
  const evolvingNFTAddress = await evolvingNFT.getAddress();
  console.log("EvolvingNFT deployed to:", evolvingNFTAddress);
  console.log("--- EvolvingNFT Contract Deployed Successfully ---");

  // İleride frontend'de kullanmak üzere bu adresleri ve ABI'ları bir yere kaydetmeniz gerekecek.
  // Örneğin bir JSON dosyasına veya frontend config dosyasına.
  console.log("\n--- Contract Addresses for Frontend ---");
  console.log(`export const nftAddress = "${nftAddress}";`);
  console.log(`export const marketplaceAddress = "${marketplaceAddress}";`);
  console.log(`export const evolvingNFTAddress = "${evolvingNFTAddress}";`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
