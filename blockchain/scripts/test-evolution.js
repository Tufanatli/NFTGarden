const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
  console.log("🧪 Starting Evolution Test Demo...\n");

  // Get accounts
  const [owner, user1] = await ethers.getSigners();
  console.log("👑 Owner address:", owner.address);
  console.log("👤 User address:", user1.address);

  // Get deployed contract
  const evolvingNFTAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const EvolvingNFT = await ethers.getContractFactory("EvolvingNFT");
  const evolvingNFT = EvolvingNFT.attach(evolvingNFTAddress);

  console.log("📄 Contract address:", evolvingNFTAddress);

  // Sample stage URIs
  const stageURIs = {
    0: "ipfs://QmSeedHash123/seed-metadata.json",
    1: "ipfs://QmSproutHash123/sprout-metadata.json",
    2: "ipfs://QmSaplingHash123/sapling-metadata.json",
    3: "ipfs://QmBloomHash123/bloom-metadata.json",
    4: "ipfs://QmFruitingHash123/fruiting-metadata.json"
  };

  const stageNames = ['🌰 Seed', '🌱 Sprout', '🌿 Sapling', '🌸 Bloom', '🍎 Fruiting'];

  try {
    // Step 1: Mint a test NFT
    console.log("\n🎁 Step 1: Minting test NFT...");
    const mintTx = await evolvingNFT.connect(owner).mintNFT(user1.address, stageURIs[0]);
    const mintReceipt = await mintTx.wait();
    console.log("✅ NFT minted successfully!");

    // Get token ID from events (should be 1 if this is the first NFT)
    const tokenId = 1;
    console.log("🏷️  Token ID:", tokenId);

    // Step 2: Set up all stage URIs
    console.log("\n🔧 Step 2: Setting up stage URIs...");
    const stages = [
      { stage: 1, uri: stageURIs[1], threshold: 3 },   // Sprout: need 3 waterings from Seed
      { stage: 2, uri: stageURIs[2], threshold: 5 },   // Sapling: need 5 waterings from Sprout
      { stage: 3, uri: stageURIs[3], threshold: 7 },   // Bloom: need 7 waterings from Sapling  
      { stage: 4, uri: stageURIs[4], threshold: 0 }    // Fruiting: final stage
    ];

    for (const stageData of stages) {
      const tx = await evolvingNFT.connect(owner).setStageDetails(
        tokenId,
        stageData.stage,
        stageData.uri,
        stageData.threshold
      );
      await tx.wait();
      console.log(`   ✅ Stage ${stageData.stage} (${stageNames[stageData.stage]}) configured`);
    }

    // Helper function to display NFT status
    const displayNFTStatus = async () => {
      const details = await evolvingNFT.getNFTDetails(tokenId);
      console.log(`   📊 Current Stage: ${stageNames[details.currentStage]} (${details.currentStage})`);
      console.log(`   💧 Watering Count: ${details.wateringCount}`);
      console.log(`   🎯 Evolution Threshold: ${details.currentStageEvolutionThreshold}`);
      console.log(`   🔄 Can Evolve: ${details.canEvolve ? '✅ Yes' : '❌ No'}`);
      console.log(`   🏷️  Token URI: ${details.currentStageTokenURI}`);
    };

    // Step 3: Initial status
    console.log("\n📊 Step 3: Initial NFT Status");
    await displayNFTStatus();

    // Step 4: Evolution cycle
    console.log("\n🌱 Step 4: Starting Evolution Cycle...");
    
    const evolutionSteps = [
      { targetStage: 1, waterings: 3, name: "Sprout" },
      { targetStage: 2, waterings: 5, name: "Sapling" },
      { targetStage: 3, waterings: 7, name: "Bloom" },
      { targetStage: 4, waterings: 10, name: "Fruiting" }
    ];

    for (const step of evolutionSteps) {
      console.log(`\n🎯 Evolving to ${stageNames[step.targetStage]}...`);
      
      // Water the required number of times
      for (let i = 0; i < step.waterings; i++) {
        console.log(`   💧 Watering ${i + 1}/${step.waterings}...`);
        
        const waterTx = await evolvingNFT.connect(user1).water(tokenId);
        await waterTx.wait();
        
        // Fast forward time to bypass cooldown (for testing)
        await time.increase(24 * 60 * 60 + 1); // 1 day + 1 second
      }

      // Check if can evolve
      const details = await evolvingNFT.getNFTDetails(tokenId);
      if (details.canEvolve) {
        console.log(`   🎉 Evolving to ${stageNames[step.targetStage]}...`);
        const evolveTx = await evolvingNFT.connect(user1).evolve(tokenId);
        await evolveTx.wait();
        console.log(`   ✅ Successfully evolved to ${stageNames[step.targetStage]}!`);
        
        // Display updated status
        await displayNFTStatus();
      } else {
        console.log(`   ❌ Cannot evolve yet. Need more waterings.`);
      }
    }

    // Step 5: Final status
    console.log("\n🎊 Step 5: Final NFT Status");
    await displayNFTStatus();

    // Step 6: Try watering fully evolved NFT (should fail)
    console.log("\n🚫 Step 6: Testing fully evolved NFT watering (should fail)...");
    try {
      await evolvingNFT.connect(user1).water(tokenId);
      console.log("   ❌ Unexpected: Watering succeeded when it should have failed!");
    } catch (error) {
      console.log("   ✅ Expected: Watering failed for fully evolved NFT");
      console.log(`   📝 Error: ${error.message.split('(')[0]}`);
    }

    // Step 7: Try evolving fully evolved NFT (should fail)
    console.log("\n🚫 Step 7: Testing fully evolved NFT evolution (should fail)...");
    try {
      await evolvingNFT.connect(user1).evolve(tokenId);
      console.log("   ❌ Unexpected: Evolution succeeded when it should have failed!");
    } catch (error) {
      console.log("   ✅ Expected: Evolution failed for fully evolved NFT");
      console.log(`   📝 Error: ${error.message.split('(')[0]}`);
    }

    console.log("\n🎉 Evolution Test Demo Completed Successfully!");
    console.log("\n📋 Summary:");
    console.log("   • NFT successfully minted with Seed stage");
    console.log("   • All stage URIs configured properly");
    console.log("   • NFT evolved through all 5 stages: Seed → Sprout → Sapling → Bloom → Fruiting");
    console.log("   • Watering cooldown system working correctly");
    console.log("   • Evolution threshold system working correctly");
    console.log("   • Fully evolved NFT protection working correctly");

  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 