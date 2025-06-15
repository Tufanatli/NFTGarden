// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFT is ERC721URIStorage, ERC721Burnable, ReentrancyGuard {
    uint256 private _tokenIdCounter;

    mapping(uint256 => string) private _tokenNames;
    mapping(uint256 => string) private _tokenDescriptions;
    
    event NFTMinted(uint256 indexed tokenId, address indexed owner, string tokenURI, string name, string description);
    event NFTBurned(uint256 indexed tokenId, address indexed owner);

    constructor() ERC721("NFT Marketplace", "NFTM") {}

    function mint(
        string memory _tokenURI,
        string memory _name,
        string memory _description
    ) external nonReentrant returns (uint256) {
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        _tokenNames[newTokenId] = _name;
        _tokenDescriptions[newTokenId] = _description;
        
        emit NFTMinted(newTokenId, msg.sender, _tokenURI, _name, _description);
        return newTokenId;
    }

    function getTokenName(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token mevcut degil");
        return _tokenNames[tokenId];
    }

    function getTokenDescription(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token mevcut degil");
        return _tokenDescriptions[tokenId];
    }

    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        uint256 counter = 0;
        
        for (uint256 i = 1; i <= _tokenIdCounter; i++) {
            if (_ownerOf(i) != address(0) && ownerOf(i) == owner) {
                tokens[counter] = i;
                counter++;
            }
        }
        return tokens;
    }

    // Custom burn fonksiyonu - sadece sahibi yakabilir
    function burnNFT(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Sadece sahibi NFT'yi yakabilir");
        
        // Event emit et
        emit NFTBurned(tokenId, msg.sender);
        
        // Token verilerini temizle
        delete _tokenNames[tokenId];
        delete _tokenDescriptions[tokenId];
        
        // NFT'yi yak
        _burn(tokenId);
    }

    // tokenURI override - ERC721URIStorage ile çakışmasın diye
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    // supportsInterface override - multiple inheritance için
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
