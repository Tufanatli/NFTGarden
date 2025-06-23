const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting script to list Seed NFTs on the marketplace...");

  const [owner] = await ethers.getSigners();
  const marketplacePrice = ethers.parseEther("0.01"); // Price for each Seed NFT
  const batchSize = 5; // How many NFTs to mint and list

  console.log(`👤 Listing as owner: ${owner.address}`);
  console.log(`💰 Listing price: ${ethers.formatEther(marketplacePrice)} ETH`);
  console.log(`📦 Batch size: ${batchSize} NFTs`);

  // Deployed contract addresses
  const evolvingNFTAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const marketplaceAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // Get contract instances
  const EvolvingNFT = await ethers.getContractFactory("EvolvingNFT");
  const evolvingNFT = EvolvingNFT.attach(evolvingNFTAddress);

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = Marketplace.attach(marketplaceAddress);

  console.log("\n🔗 Connected to contracts:");
  console.log(`   - EvolvingNFT at ${evolvingNFTAddress}`);
  console.log(`   - Marketplace at ${marketplaceAddress}`);

  // Sample IPFS URIs (replace with your actual URIs)
  const stageURIs = {
    seed: "ipfs://QmSeedHash/seed.json",
    sprout: "ipfs://QmSproutHash/sprout.json",
    sapling: "ipfs://QmSaplingHash/sapling.json",
    bloom: "ipfs://QmBloomHash/bloom.json",
    fruiting: "ipfs://QmFruitingHash/fruiting.json"
  };

  const evolutionThresholds = {
    seed: 3,     // Seed -> Sprout
    sprout: 5,   // Sprout -> Sapling
    sapling: 7,  // Sapling -> Bloom
    bloom: 10    // Bloom -> Fruiting
  };

  // --- Step 1: Approve Marketplace ---
  console.log("\n одобрение Step 1: Approving marketplace to handle NFTs...");
  try {
    const approvalTx = await evolvingNFT.setApprovalForAll(marketplaceAddress, true);
    await approvalTx.wait();
    console.log("✅ Marketplace approved successfully.");
  } catch (error) {
    console.error("❌ Failed to approve marketplace:", error);
    return;
  }

  // --- Step 2: Mint, Setup, and List NFTs ---
  console.log(`\n🌱 Step 2: Minting, setting up, and listing ${batchSize} Seed NFTs...`);
  
  const mintedTokenIds = [];
  for (let i = 0; i < batchSize; i++) {
    const currentMintNumber = i + 1;
    console.log(`\n--- Processing NFT ${currentMintNumber}/${batchSize} ---`);
    
    try {
      // --- Mint ---
      console.log(`   ${currentMintNumber}.1: Minting Seed NFT...`);
      const mintTx = await evolvingNFT.mintNFT(owner.address, stageURIs.seed);
      const mintReceipt = await mintTx.wait();
      
      // A simple way to get the tokenId. Assumes they are sequential.
      // For production, parsing events is more robust.
      const lastTokenId = await evolvingNFT._tokenIdCounter();
      const tokenId = Number(lastTokenId);
      mintedTokenIds.push(tokenId);
      console.log(`   ✅ Minted successfully. Token ID: ${tokenId}`);

      // --- Setup Stages ---
      console.log(`   ${currentMintNumber}.2: Setting up evolution stages for Token ID ${tokenId}...`);
      await evolvingNFT.setStageDetails(tokenId, 1, stageURIs.sprout, evolutionThresholds.sprout);
      await evolvingNFT.setStageDetails(tokenId, 2, stageURIs.sapling, evolutionThresholds.sapling);
      await evolvingNFT.setStageDetails(tokenId, 3, stageURIs.bloom, evolutionThresholds.bloom);
      await evolvingNFT.setStageDetails(tokenId, 4, stageURIs.fruiting, 0); // No threshold for final stage
      console.log(`   ✅ All stages configured for Token ID ${tokenId}.`);

      // --- List on Marketplace ---
      console.log(`   ${currentMintNumber}.3: Listing Token ID ${tokenId} on the marketplace...`);
      const listTx = await marketplace.listNFT(evolvingNFTAddress, tokenId, marketplacePrice);
      await listTx.wait();
      console.log(`   ✅ Token ID ${tokenId} listed for ${ethers.formatEther(marketplacePrice)} ETH.`);

    } catch (error) {
      console.error(`❌ Failed to process NFT ${currentMintNumber}:`, error);
      // Decide if you want to stop on error or continue
      // break; 
    }
  }

  console.log("\n\n🎉 Script finished!");
  console.log(`Successfully minted and listed ${mintedTokenIds.length} NFTs.`);
  console.log("Listed Token IDs:", mintedTokenIds.join(', '));
  console.log("Go to the frontend to see them on the marketplace!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 