const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EvolvingNFT", function () {
  let evolvingNFT;
  let owner;
  let user1;
  let user2;

  // Sample IPFS URIs for different stages
  const stageURIs = {
    seed: "ipfs://QmSeedHash123/metadata.json",
    sprout: "ipfs://QmSproutHash123/metadata.json", 
    sapling: "ipfs://QmSaplingHash123/metadata.json",
    bloom: "ipfs://QmBloomHash123/metadata.json",
    fruiting: "ipfs://QmFruitingHash123/metadata.json"
  };

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const EvolvingNFT = await ethers.getContractFactory("EvolvingNFT");
    evolvingNFT = await EvolvingNFT.deploy(owner.address);
    await evolvingNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await evolvingNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await evolvingNFT.name()).to.equal("Evolving NFT");
      expect(await evolvingNFT.symbol()).to.equal("EVOLVE");
    });
  });

  describe("Minting", function () {
    it("Should mint NFT with Seed stage", async function () {
      const tx = await evolvingNFT.mintNFT(user1.address, stageURIs.seed);
      await tx.wait();

      const details = await evolvingNFT.getNFTDetails(1);
      expect(details.currentStage).to.equal(0); // Seed = 0
      expect(details.wateringCount).to.equal(0);
      expect(details.currentStageTokenURI).to.equal(stageURIs.seed);
    });

    it("Should only allow owner to mint", async function () {
      await expect(
        evolvingNFT.connect(user1).mintNFT(user1.address, stageURIs.seed)
      ).to.be.revertedWithCustomError(evolvingNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("Stage Management", function () {
    beforeEach(async function () {
      // Mint a test NFT
      await evolvingNFT.mintNFT(user1.address, stageURIs.seed);
    });

    it("Should allow owner to set stage details", async function () {
      await evolvingNFT.setStageDetails(1, 1, stageURIs.sprout, 5);
      
      const sproutURI = await evolvingNFT.getStageURI(1, 1);
      expect(sproutURI).to.equal(stageURIs.sprout);
    });

    it("Should batch set stage details", async function () {
      // Mint more NFTs
      await evolvingNFT.mintNFT(user2.address, stageURIs.seed);
      
      await evolvingNFT.batchSetStageDetails([1, 2], 1, stageURIs.sprout, 5);
      
      expect(await evolvingNFT.getStageURI(1, 1)).to.equal(stageURIs.sprout);
      expect(await evolvingNFT.getStageURI(2, 1)).to.equal(stageURIs.sprout);
    });
  });

  describe("Watering Mechanism", function () {
    beforeEach(async function () {
      await evolvingNFT.mintNFT(user1.address, stageURIs.seed);
    });

    it("Should allow owner to water NFT", async function () {
      const tx = await evolvingNFT.connect(user1).water(1);
      await tx.wait();

      const details = await evolvingNFT.getNFTDetails(1);
      expect(details.wateringCount).to.equal(1);
    });

    it("Should prevent non-owner from watering", async function () {
      await expect(
        evolvingNFT.connect(user2).water(1)
      ).to.be.revertedWith("EvolvingNFT: Caller is not the owner");
    });

    it("Should enforce watering cooldown", async function () {
      await evolvingNFT.connect(user1).water(1);
      
      await expect(
        evolvingNFT.connect(user1).water(1)
      ).to.be.revertedWith("EvolvingNFT: Watering too soon");
    });

    it("Should allow watering after cooldown period", async function () {
      await evolvingNFT.connect(user1).water(1);
      
      // Fast forward 1 day
      await time.increase(24 * 60 * 60);
      
      await evolvingNFT.connect(user1).water(1);
      const details = await evolvingNFT.getNFTDetails(1);
      expect(details.wateringCount).to.equal(2);
    });

    it("Should prevent watering fully evolved NFT", async function () {
      // Set up all stage URIs first
      await evolvingNFT.setStageDetails(1, 1, stageURIs.sprout, 5);
      await evolvingNFT.setStageDetails(1, 2, stageURIs.sapling, 7);
      await evolvingNFT.setStageDetails(1, 3, stageURIs.bloom, 10);
      await evolvingNFT.setStageDetails(1, 4, stageURIs.fruiting, 0);

      // Evolve to final stage
      for(let i = 0; i < 25; i++) { // More than enough waterings
        await evolvingNFT.connect(user1).water(1);
        await time.increase(24 * 60 * 60);
        
        const details = await evolvingNFT.getNFTDetails(1);
        if(details.canEvolve) {
          await evolvingNFT.connect(user1).evolve(1);
        }
        if(details.currentStage == 4) break; // Fruiting stage
      }

      await expect(
        evolvingNFT.connect(user1).water(1)
      ).to.be.revertedWith("EvolvingNFT: NFT is fully evolved");
    });
  });

  describe("Evolution Process", function () {
    beforeEach(async function () {
      await evolvingNFT.mintNFT(user1.address, stageURIs.seed);
      // Set up stage URIs
      await evolvingNFT.setStageDetails(1, 1, stageURIs.sprout, 5);
      await evolvingNFT.setStageDetails(1, 2, stageURIs.sapling, 7);
      await evolvingNFT.setStageDetails(1, 3, stageURIs.bloom, 10);
      await evolvingNFT.setStageDetails(1, 4, stageURIs.fruiting, 0);
    });

    it("Should evolve from Seed to Sprout", async function () {
      // Water 3 times (threshold for Seed -> Sprout)
      for(let i = 0; i < 3; i++) {
        await evolvingNFT.connect(user1).water(1);
        await time.increase(24 * 60 * 60);
      }

      await evolvingNFT.connect(user1).evolve(1);
      
      const details = await evolvingNFT.getNFTDetails(1);
      expect(details.currentStage).to.equal(1); // Sprout
      expect(details.wateringCount).to.equal(0); // Reset after evolution
      expect(details.currentStageTokenURI).to.equal(stageURIs.sprout);
    });

    it("Should prevent evolution without enough waterings", async function () {
      // Only water 2 times (need 3 for evolution)
      for(let i = 0; i < 2; i++) {
        await evolvingNFT.connect(user1).water(1);
        await time.increase(24 * 60 * 60);
      }

      await expect(
        evolvingNFT.connect(user1).evolve(1)
      ).to.be.revertedWith("EvolvingNFT: Not enough waterings to evolve");
    });

    it("Should complete full evolution cycle", async function () {
      const stages = [
        { threshold: 3, expectedStage: 1, uri: stageURIs.sprout },
        { threshold: 5, expectedStage: 2, uri: stageURIs.sapling },
        { threshold: 7, expectedStage: 3, uri: stageURIs.bloom },
        { threshold: 10, expectedStage: 4, uri: stageURIs.fruiting }
      ];

      for(const stage of stages) {
        // Water required times
        for(let i = 0; i < stage.threshold; i++) {
          await evolvingNFT.connect(user1).water(1);
          await time.increase(24 * 60 * 60);
        }

        await evolvingNFT.connect(user1).evolve(1);
        
        const details = await evolvingNFT.getNFTDetails(1);
        expect(details.currentStage).to.equal(stage.expectedStage);
        expect(details.currentStageTokenURI).to.equal(stage.uri);
      }
    });

    it("Should prevent evolution of fully evolved NFT", async function () {
      // Evolve to final stage first
      const thresholds = [3, 5, 7, 10];
      for(const threshold of thresholds) {
        for(let i = 0; i < threshold; i++) {
          await evolvingNFT.connect(user1).water(1);
          await time.increase(24 * 60 * 60);
        }
        await evolvingNFT.connect(user1).evolve(1);
      }

      await expect(
        evolvingNFT.connect(user1).evolve(1)
      ).to.be.revertedWith("EvolvingNFT: Already fully evolved");
    });
  });

  describe("Events", function () {
    beforeEach(async function () {
      await evolvingNFT.mintNFT(user1.address, stageURIs.seed);
    });

    it("Should emit Watered event", async function () {
      await expect(evolvingNFT.connect(user1).water(1))
        .to.emit(evolvingNFT, "Watered")
        .withArgs(1, 1, 0); // tokenId, wateringCount, currentStage
    });

    it("Should emit Evolved event", async function () {
      await evolvingNFT.setStageDetails(1, 1, stageURIs.sprout, 5);
      
      // Water enough times
      for(let i = 0; i < 3; i++) {
        await evolvingNFT.connect(user1).water(1);
        await time.increase(24 * 60 * 60);
      }

      await expect(evolvingNFT.connect(user1).evolve(1))
        .to.emit(evolvingNFT, "Evolved")
        .withArgs(1, 1, stageURIs.sprout); // tokenId, newStage, newURI
    });
  });
}); 