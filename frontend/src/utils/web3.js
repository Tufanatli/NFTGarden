import { ethers } from 'ethers';
import { NFT_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ADDRESS, NFT_ABI, MARKETPLACE_ABI } from './constants';
import { getOrCreateProfile } from './profileService'; // Profile servisini import et

export class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.nftContract = null;
    this.marketplaceContract = null;
    this.account = null;
  }

  // Cüzdan bağlantısı
  async connectWallet() {
    try {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        this.account = await this.signer.getAddress();
        
        // Contract'ları başlat
        this.nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, this.signer);
        this.marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI, this.signer);
        
        // Supabase'de profili al veya oluştur
        const userProfile = await getOrCreateProfile(this.account);
        // İsteğe bağlı: userProfile'ı state'e veya başka bir yere kaydedebilirsiniz.
        console.log('Supabase profili (connectWallet):', userProfile);

        return {
          success: true,
          account: this.account
        };
      } else {
        throw new Error('MetaMask yüklü değil!');
      }
    } catch (error) {
      console.error('Cüzdan bağlantı hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cüzdan durumunu kontrol et
  async checkConnection() {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.provider = new ethers.BrowserProvider(window.ethereum);
          this.signer = await this.provider.getSigner();
          this.account = accounts[0];
          
          this.nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, this.signer);
          this.marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI, this.signer);
          
          // Supabase'de profili al veya oluştur
          const userProfile = await getOrCreateProfile(this.account);
          // İsteğe bağlı: userProfile'ı state'e veya başka bir yere kaydedebilirsiniz.
          console.log('Supabase profili (checkConnection):', userProfile);

          return {
            connected: true,
            account: this.account
          };
        }
      }
      return { connected: false };
    } catch (error) {
      console.error('Bağlantı kontrol hatası:', error);
      return { connected: false };
    }
  }

  // NFT mint et
  async mintNFT(tokenURI, name, description) {
    try {
      if (!this.nftContract) {
        throw new Error('Contract bağlantısı yok');
      }

      const transaction = await this.nftContract.mint(tokenURI, name, description);
      const receipt = await transaction.wait();
      
      // NFTMinted olayını daha güvenli bir şekilde bul
      let tokenId = null;
      if (receipt.logs) {
        const nftInterface = new ethers.Interface(NFT_ABI);
        for (const log of receipt.logs) {
          try {
            const parsedLog = nftInterface.parseLog(log);
            if (parsedLog && parsedLog.name === "NFTMinted") {
              tokenId = parsedLog.args.tokenId;
              break;
            }
          } catch (e) {
            // Bu log NFTMinted olayı değil, devam et
          }
        }
      }

      if (tokenId === null) {
        throw new Error("NFTMinted olayı bulunamadı veya tokenId alınamadı.");
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        tokenId: tokenId 
      };
    } catch (error) {
      console.error('NFT mint hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Kullanıcının NFT'lerini getir
  async getUserNFTs(userAddress) {
    try {
      if (!this.nftContract) {
        throw new Error('Contract bağlantısı yok');
      }

      const tokenIds = await this.nftContract.getTokensByOwner(userAddress);
      const nfts = [];

      for (const tokenId of tokenIds) {
        try {
          // NFT'nin gerçek sahibini kontrol et
          const currentOwner = await this.nftContract.ownerOf(tokenId);
          
          // Eğer NFT marketplace'e transfer edildiyse, kullanıcının NFT'leri arasında gösterme
          if (currentOwner.toLowerCase() !== userAddress.toLowerCase()) {
            continue;
          }

          const tokenURI = await this.nftContract.tokenURI(tokenId);
          const name = await this.nftContract.getTokenName(tokenId);
          const description = await this.nftContract.getTokenDescription(tokenId);
          
          nfts.push({
            tokenId: tokenId.toString(),
            tokenURI,
            name,
            description,
            owner: userAddress
          });
        } catch (error) {
          console.error(`Token ${tokenId} bilgileri alınamadı:`, error);
        }
      }

      return {
        success: true,
        nfts
      };
    } catch (error) {
      console.error('NFT listesi alma hatası:', error);
      return {
        success: false,
        error: error.message,
        nfts: []
      };
    }
  }

  // NFT'yi satışa çıkar
  async listNFT(tokenId, price) {
    try {
      if (!this.nftContract || !this.marketplaceContract) {
        throw new Error('Contract bağlantısı yok');
      }

      // Önce marketplace'e approval ver
      const approvalTx = await this.nftContract.setApprovalForAll(MARKETPLACE_CONTRACT_ADDRESS, true);
      await approvalTx.wait();

      // NFT'yi listele
      const priceInWei = ethers.parseEther(price.toString());
      const listTx = await this.marketplaceContract.listNFT(NFT_CONTRACT_ADDRESS, tokenId, priceInWei);
      const receipt = await listTx.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('NFT listeleme hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Satışa çıkarılan NFT'leri getir
  async getActiveListings() {
    try {
      if (!this.marketplaceContract) {
        throw new Error('Contract bağlantısı yok');
      }

      const listings = await this.marketplaceContract.getActiveListings();
      const formattedListings = [];

      for (const listing of listings) {
        try {
          // NFT detaylarını al
          const readOnlyProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
          const readOnlyNftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, readOnlyProvider);
          
          // Token var mı diye kontrol et, yoksa bu listing'i atla
          try {
            await readOnlyNftContract.ownerOf(listing.tokenId); // Bu satır token yoksa hata fırlatır
          } catch (ownerError) {
            console.warn(`Token ID ${listing.tokenId} bulunamadı (muhtemelen yakılmış), listingId: ${listing.listingId} atlanıyor.`);
            continue; // Bu listing'i atla
          }

          const tokenURI = await readOnlyNftContract.tokenURI(listing.tokenId);
          const name = await readOnlyNftContract.getTokenName(listing.tokenId);
          const description = await readOnlyNftContract.getTokenDescription(listing.tokenId);

          formattedListings.push({
            listingId: listing.listingId.toString(),
            tokenId: listing.tokenId.toString(),
            price: ethers.formatEther(listing.price),
            seller: listing.seller,
            tokenURI,
            name,
            description
          });
        } catch (error) {
          // Bu catch bloğu genel hatalar için (örn: provider bağlantı sorunu)
          // Token yok hatası yukarıda yakalandığı için buraya düşmemeli.
          console.error(`Listing ${listing.listingId} detayları alınamadı (genel hata):`, error);
        }
      }

      return {
        success: true,
        listings: formattedListings
      };
    } catch (error) {
      console.error('Listing listesi alma hatası:', error);
      return {
        success: false,
        error: error.message,
        listings: []
      };
    }
  }

  // NFT satın al
  async buyNFT(listingId, price) {
    try {
      if (!this.marketplaceContract) {
        throw new Error('Contract bağlantısı yok');
      }

      const priceInWei = ethers.parseEther(price.toString());
      const transaction = await this.marketplaceContract.buyNFT(listingId, {
        value: priceInWei
      });
      const receipt = await transaction.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('NFT satın alma hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // NFT listing'ini iptal et (satıştan kaldır)
  async cancelListing(listingId) {
    try {
      if (!this.marketplaceContract) {
        throw new Error('Contract bağlantısı yok');
      }

      const transaction = await this.marketplaceContract.cancelListing(listingId);
      const receipt = await transaction.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('Listing iptal etme hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // NFT'yi yakma (burn) işlemi
  async burnNFT(tokenId) {
    try {
      if (!this.nftContract) {
        throw new Error('NFT contract bağlantısı yok');
      }

      const transaction = await this.nftContract.burnNFT(tokenId);
      const receipt = await transaction.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('NFT yakma hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Kullanıcının marketplace'te listelediği NFT'leri getir
  async getUserListings(userAddress) {
    try {
      if (!this.marketplaceContract) {
        throw new Error('Marketplace contract bağlantısı yok');
      }

      const listings = await this.marketplaceContract.getListingsByUser(userAddress);
      const formattedListings = [];

      for (const listing of listings) {
        try {
          // Sadece aktif listingleri al
          if (!listing.active || listing.sold) {
            continue;
          }

          // NFT detaylarını al
          const readOnlyProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
          const readOnlyNftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, readOnlyProvider);
          
          // Token var mı diye kontrol et, yoksa bu listing'i atla
          try {
            await readOnlyNftContract.ownerOf(listing.tokenId);
          } catch (ownerError) {
            console.warn(`Token ID ${listing.tokenId} (user listing) bulunamadı (muhtemelen yakılmış), listingId: ${listing.listingId} atlanıyor.`);
            continue;
          }
          
          const tokenURI = await readOnlyNftContract.tokenURI(listing.tokenId);
          const name = await readOnlyNftContract.getTokenName(listing.tokenId);
          const description = await readOnlyNftContract.getTokenDescription(listing.tokenId);

          formattedListings.push({
            listingId: listing.listingId.toString(),
            tokenId: listing.tokenId.toString(),
            price: ethers.formatEther(listing.price),
            seller: listing.seller,
            tokenURI,
            name,
            description,
            active: listing.active,
            sold: listing.sold
          });
        } catch (error) {
          console.error(`Listing ${listing.listingId} (user listing) detayları alınamadı (genel hata):`, error);
        }
      }

      return {
        success: true,
        listings: formattedListings
      };
    } catch (error) {
      console.error('User listing listesi alma hatası:', error);
      return {
        success: false,
        error: error.message,
        listings: []
      };
    }
  }

  // Eth bakiyesi getir
  async getBalance(address) {
    try {
      if (!this.provider) {
        throw new Error('Provider bağlantısı yok');
      }

      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Bakiye alma hatası:', error);
      return '0';
    }
  }
}

// Global instance
export const web3Service = new Web3Service(); 