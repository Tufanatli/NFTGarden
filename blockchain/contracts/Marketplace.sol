// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace is ReentrancyGuard {
    uint256 private _listingIdCounter;

    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        address seller;
        bool sold;
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    
    uint256 public constant MARKETPLACE_FEE_PERCENT = 250; // 2.5%
    address payable public owner;

    event Listed(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price,
        address seller
    );
    
    event Sale(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price,
        address seller,
        address buyer
    );
    
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller
    );

    constructor() {
        owner = payable(msg.sender);
    }

    function listNFT(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price
    ) external nonReentrant {
        require(_price > 0, "Fiyat sifir olamaz");
        require(
            IERC721(_nftContract).ownerOf(_tokenId) == msg.sender,
            "Siz bu NFT'nin sahibi degilsiniz"
        );
        require(
            IERC721(_nftContract).isApprovedForAll(msg.sender, address(this)) ||
            IERC721(_nftContract).getApproved(_tokenId) == address(this),
            "Marketplace bu NFT icin onaylanmamis"
        );

        _listingIdCounter++;
        uint256 listingId = _listingIdCounter;

        listings[listingId] = Listing(
            listingId,
            _nftContract,
            _tokenId,
            _price,
            msg.sender,
            false,
            true
        );

        emit Listed(listingId, _nftContract, _tokenId, _price, msg.sender);
    }

    function buyNFT(uint256 _listingId) external payable nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.active, "Listing aktif degil");
        require(!listing.sold, "NFT zaten satildi");
        require(msg.value >= listing.price, "Yetersiz odeme");
        require(listing.seller != msg.sender, "Kendi NFT'nizi satin alamazsiniz");

        listing.sold = true;
        listing.active = false;

        uint256 marketplaceFee = (listing.price * MARKETPLACE_FEE_PERCENT) / 10000;
        uint256 sellerAmount = listing.price - marketplaceFee;

        // NFT'yi alıcıya transfer et
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // Ödemeyi paylaştır
        payable(listing.seller).transfer(sellerAmount);
        owner.transfer(marketplaceFee);

        // Fazla ödeme varsa iade et
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }

        emit Sale(
            _listingId,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            listing.seller,
            msg.sender
        );
    }

    function cancelListing(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.seller == msg.sender, "Sadece satici iptal edebilir");
        require(listing.active, "Listing zaten aktif degil");
        require(!listing.sold, "Satilmis listing iptal edilemez");

        listing.active = false;

        emit ListingCancelled(_listingId, msg.sender);
    }

    function getActiveListings() external view returns (Listing[] memory) {
        uint256 totalListings = _listingIdCounter;
        uint256 activeCount = 0;

        // Aktif listing sayısını hesapla
        for (uint256 i = 1; i <= totalListings; i++) {
            if (listings[i].active && !listings[i].sold) {
                activeCount++;
            }
        }

        Listing[] memory activeListings = new Listing[](activeCount);
        uint256 currentIndex = 0;

        for (uint256 i = 1; i <= totalListings; i++) {
            if (listings[i].active && !listings[i].sold) {
                activeListings[currentIndex] = listings[i];
                currentIndex++;
            }
        }

        return activeListings;
    }

    function getListingsByUser(address _user) external view returns (Listing[] memory) {
        uint256 totalListings = _listingIdCounter;
        uint256 userListingCount = 0;

        // Kullanıcının listing sayısını hesapla
        for (uint256 i = 1; i <= totalListings; i++) {
            if (listings[i].seller == _user) {
                userListingCount++;
            }
        }

        Listing[] memory userListings = new Listing[](userListingCount);
        uint256 currentIndex = 0;

        for (uint256 i = 1; i <= totalListings; i++) {
            if (listings[i].seller == _user) {
                userListings[currentIndex] = listings[i];
                currentIndex++;
            }
        }

        return userListings;
    }

    function getCurrentListingId() external view returns (uint256) {
        return _listingIdCounter;
    }
}