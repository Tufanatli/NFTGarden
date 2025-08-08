const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

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

  // Kontrat adreslerini JSON dosyasına kaydet
  const contractAddresses = {
    NFT_CONTRACT_ADDRESS: nftAddress,
    MARKETPLACE_CONTRACT_ADDRESS: marketplaceAddress,
    EVOLVING_NFT_CONTRACT_ADDRESS: evolvingNFTAddress,
    ADMIN_WALLET_ADDRESS: deployer.address,
    deployedAt: new Date().toISOString(),
    network: "localhost"
  };

  // JSON dosyasını frontend utils klasörüne yaz
  const addressesDir = path.join(__dirname, "../../frontend/src/utils");
  const addressesFile = path.join(addressesDir, "contractAddresses.json");
  
  if (!fs.existsSync(addressesDir)) {
    fs.mkdirSync(addressesDir, { recursive: true });
  }
  
  fs.writeFileSync(addressesFile, JSON.stringify(contractAddresses, null, 2));
  
  console.log("\n🎉 === DEPLOYMENT SUCCESSFUL === 🎉");
  console.log("✅ Contract addresses saved to:", addressesFile);
  console.log("✅ Frontend will automatically use new addresses!");
  
  console.log("\n📋 Contract Addresses:");
  console.log("- NFT Contract:", nftAddress);
  console.log("- Marketplace Contract:", marketplaceAddress);
  console.log("- EvolvingNFT Contract:", evolvingNFTAddress);
  console.log("- Admin Wallet:", deployer.address);
  console.log("- Deployed At:", new Date().toISOString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
