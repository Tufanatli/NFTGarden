// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
// import "@openzeppelin/contracts/utils/Strings.sol"; // toString() için gerek kalmadı

contract EvolvingNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    enum NFTStage { Seed, Sprout, Sapling, Bloom, Fruiting } // 0, 1, 2, 3, 4

    struct NFTData {
        NFTStage currentStage;
        uint256 wateringCount;
        uint256 lastWateredTimestamp;
        mapping(uint8 => string) stageTokenURIs; // Aşama (uint8) -> Token URI
        mapping(uint8 => uint256) evolutionThresholds; // Mevcut Aşamadan (uint8) -> Bir sonrakine geçmek için gereken sulama
        // address owner; // ERC721 zaten sahibi tutuyor
    }

    mapping(uint256 => NFTData) private _nftData;

    uint256 public constant WATERING_COOLDOWN = 1 days; // Günde 1 sulama (test için kısa tutulabilir, örn: 60 seconds)

    event Watered(uint256 indexed tokenId, uint256 newWateringCount, NFTStage currentStage);
    event Evolved(uint256 indexed tokenId, NFTStage newStage, string newURI);
    event StageDetailsSet(uint256 indexed tokenId, NFTStage stage, string tokenURI, uint256 evolutionThreshold);
    event BatchStageDetailsSet(uint256[] tokenIds, NFTStage stage, string tokenURI, uint256 evolutionThreshold);

    constructor(address initialOwner) ERC721("Evolving NFT", "EVOLVE") Ownable(initialOwner) {}

    function mintNFT(address recipient, string memory initialSeedURI) public onlyOwner returns (uint256) {
        _tokenIdCounter.increment();
        uint256 newTokenId = _tokenIdCounter.current();
        _safeMint(recipient, newTokenId);

        NFTData storage nft = _nftData[newTokenId];
        nft.currentStage = NFTStage.Seed;
        
        nft.stageTokenURIs[uint8(NFTStage.Seed)] = initialSeedURI;
        _setTokenURI(newTokenId, initialSeedURI); // ERC721URIStorage için de set et

        // Varsayılan evrim eşiklerini ayarla
        nft.evolutionThresholds[uint8(NFTStage.Seed)] = 3;    // Seed'den Sprout'a 3 sulama
        nft.evolutionThresholds[uint8(NFTStage.Sprout)] = 5;  // Sprout'tan Sapling'e 5 sulama
        nft.evolutionThresholds[uint8(NFTStage.Sapling)] = 7; // Sapling'den Bloom'a 7 sulama
        nft.evolutionThresholds[uint8(NFTStage.Bloom)] = 10;  // Bloom'dan Fruiting'e 10 sulama
        // Fruiting aşaması son aşama olduğu için bir sonraki aşamaya geçiş eşiği yok.

        emit StageDetailsSet(newTokenId, NFTStage.Seed, initialSeedURI, nft.evolutionThresholds[uint8(NFTStage.Seed)]);
        return newTokenId;
    }

    function setStageDetails(
        uint256 tokenId, 
        NFTStage stage, 
        string memory newStageTokenURI,
        uint256 evolutionThreshold // Bu AŞAMADAN bir sonrakine geçmek için gereken sulama
    ) public onlyOwner {
        require(_exists(tokenId), "EvolvingNFT: Token does not exist");
        require(uint8(stage) <= uint8(NFTStage.Fruiting), "EvolvingNFT: Invalid stage");

        NFTData storage nft = _nftData[tokenId];
        nft.stageTokenURIs[uint8(stage)] = newStageTokenURI;
        
        if (stage != NFTStage.Fruiting) { // Son aşamanın bir sonraki evrim eşiği olmaz
             nft.evolutionThresholds[uint8(stage)] = evolutionThreshold;
        }

        if (nft.currentStage == stage) {
            _setTokenURI(tokenId, newStageTokenURI);
        }
        emit StageDetailsSet(tokenId, stage, newStageTokenURI, stage != NFTStage.Fruiting ? evolutionThreshold : 0);
    }

    // Birden fazla token için aynı aşama detaylarını set etme (gas tasarrufu için)
    function batchSetStageDetails(
        uint256[] memory tokenIds,
        NFTStage stage,
        string memory newStageTokenURI,
        uint256 evolutionThreshold
    ) public onlyOwner {
        require(uint8(stage) <= uint8(NFTStage.Fruiting), "EvolvingNFT: Invalid stage");
        for (uint i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            if (_exists(tokenId)) {
                NFTData storage nft = _nftData[tokenId];
                nft.stageTokenURIs[uint8(stage)] = newStageTokenURI;
                if (stage != NFTStage.Fruiting) {
                    nft.evolutionThresholds[uint8(stage)] = evolutionThreshold;
                }
                if (nft.currentStage == stage) {
                    _setTokenURI(tokenId, newStageTokenURI);
                }
            }
        }
        emit BatchStageDetailsSet(tokenIds, stage, newStageTokenURI, stage != NFTStage.Fruiting ? evolutionThreshold : 0);
    }
    
    function water(uint256 tokenId) public {
        require(_ownerOf(tokenId) == msg.sender, "EvolvingNFT: Caller is not the owner");
        NFTData storage nft = _nftData[tokenId];
        require(nft.currentStage != NFTStage.Fruiting, "EvolvingNFT: NFT is fully evolved");
        require(block.timestamp >= nft.lastWateredTimestamp + WATERING_COOLDOWN, "EvolvingNFT: Watering too soon");

        nft.wateringCount++;
        nft.lastWateredTimestamp = block.timestamp;
        emit Watered(tokenId, nft.wateringCount, nft.currentStage);
    }

    function evolve(uint256 tokenId) public {
        require(_ownerOf(tokenId) == msg.sender, "EvolvingNFT: Caller is not the owner");
        NFTData storage nft = _nftData[tokenId];
        
        NFTStage current = nft.currentStage;
        require(current != NFTStage.Fruiting, "EvolvingNFT: Already fully evolved");

        uint256 requiredWaterings = nft.evolutionThresholds[uint8(current)];
        require(nft.wateringCount >= requiredWaterings, "EvolvingNFT: Not enough waterings to evolve");

        NFTStage nextStage = NFTStage(uint8(current) + 1);
        nft.currentStage = nextStage;
        nft.wateringCount = 0; 

        string memory nextStageURI = nft.stageTokenURIs[uint8(nextStage)];
        require(bytes(nextStageURI).length > 0, "EvolvingNFT: Next stage URI not set by admin for this token");
        
        _setTokenURI(tokenId, nextStageURI);

        emit Evolved(tokenId, nextStage, nextStageURI);
    }

    function getNFTDetails(uint256 tokenId) public view returns (
        NFTStage currentStage,
        uint256 wateringCount,
        uint256 lastWateredTimestamp,
        uint256 currentStageEvolutionThreshold, // Bu AŞAMADAN bir sonrakine geçmek için gereken sulama
        string memory currentStageTokenURI,
        bool canEvolve
    ) {
        require(_exists(tokenId), "EvolvingNFT: Token does not exist");
        NFTData storage nft = _nftData[tokenId];
        currentStage = nft.currentStage;
        wateringCount = nft.wateringCount;
        lastWateredTimestamp = nft.lastWateredTimestamp;
        currentStageTokenURI = nft.stageTokenURIs[uint8(nft.currentStage)];
        
        bool isLastStage = nft.currentStage == NFTStage.Fruiting;
        currentStageEvolutionThreshold = isLastStage ? 0 : nft.evolutionThresholds[uint8(nft.currentStage)];
        canEvolve = !isLastStage && wateringCount >= currentStageEvolutionThreshold;
        
        return (currentStage, wateringCount, lastWateredTimestamp, currentStageEvolutionThreshold, currentStageTokenURI, canEvolve);
    }
    
    function getStageURI(uint256 tokenId, NFTStage stage) public view returns (string memory) {
        require(_exists(tokenId), "EvolvingNFT: Token does not exist");
        return _nftData[tokenId].stageTokenURIs[uint8(stage)];
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721URIStorage, IERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 