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

  console.log("\n--- Deploying Garden Contracts ---");

  // 1. PlantNFT kontratını deploy et
  const PlantNFT = await ethers.getContractFactory("PlantNFT");
  console.log("Deploying PlantNFT...");
  // Constructor: initialOwner, name, symbol
  const plantNFT = await PlantNFT.deploy(deployer.address, "NFT Garden Plant", "PLANT");
  await plantNFT.waitForDeployment();
  const plantNFTAddress = await plantNFT.getAddress();
  console.log("PlantNFT deployed to:", plantNFTAddress);

  // 2. SeedNFT kontratını deploy et
  const SeedNFT = await ethers.getContractFactory("SeedNFT");
  console.log("Deploying SeedNFT...");
  // Constructor: initialOwner, name, symbol, plantNFTContractAddress
  const seedNFT = await SeedNFT.deploy(deployer.address, "NFT Garden Seed", "SEED", plantNFTAddress);
  await seedNFT.waitForDeployment();
  const seedNFTAddress = await seedNFT.getAddress();
  console.log("SeedNFT deployed to:", seedNFTAddress);

  // 3. PlantNFT sözleşmesinde setSeedNFTContract fonksiyonunu çağır
  console.log("Setting SeedNFT contract address in PlantNFT...");
  const tx = await plantNFT.connect(deployer).setSeedNFTContract(seedNFTAddress);
  await tx.wait(); // İşlemin tamamlanmasını bekle
  console.log("SeedNFT contract address set in PlantNFT contract.");
  console.log("--- Garden Contracts Deployed Successfully ---");

  // İleride frontend'de kullanmak üzere bu adresleri ve ABI'ları bir yere kaydetmeniz gerekecek.
  // Örneğin bir JSON dosyasına veya frontend config dosyasına.
  // console.log("\n--- Contract Addresses for Frontend ---");
  // console.log(`export const nftAddress = "${nftAddress}";`);
  // console.log(`export const marketplaceAddress = "${marketplaceAddress}";`);
  // console.log(`export const plantNFTAddress = "${plantNFTAddress}";`);
  // console.log(`export const seedNFTAddress = "${seedNFTAddress}";`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
