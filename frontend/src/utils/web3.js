import { ethers } from 'ethers';
import { 
  NFT_CONTRACT_ADDRESS, 
  MARKETPLACE_CONTRACT_ADDRESS, 
  EVOLVING_NFT_CONTRACT_ADDRESS,
  NFT_ABI, 
  MARKETPLACE_ABI,
  EVOLVING_NFT_ABI
} from './constants';
import { getOrCreateProfile } from './profileService'; // Profile servisini import et

export class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.nftContract = null;
    this.marketplaceContract = null;
    this.account = null;
  }

  // Helper function to ensure contract connection
  async connectToContract() {
    if (!this.marketplaceContract || !this.nftContract) {
      const connectionResult = await this.checkConnection();
      if (!connectionResult.connected) {
        throw new Error('Wallet bağlantısı gerekli');
      }
    }
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
      const readOnlyProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const nfts = [];

      // Get regular NFTs
    try {
      if (!this.nftContract) {
          await this.connectToContract();
      }

      const tokenIds = await this.nftContract.getTokensByOwner(userAddress);

      for (const tokenId of tokenIds) {
        try {
          const currentOwner = await this.nftContract.ownerOf(tokenId);
          
          if (currentOwner.toLowerCase() !== userAddress.toLowerCase()) {
            continue;
          }

          const tokenURI = await this.nftContract.tokenURI(tokenId);
          const name = await this.nftContract.getTokenName(tokenId);
          const description = await this.nftContract.getTokenDescription(tokenId);
          
          nfts.push({
            tokenId: tokenId.toString(),
              contractAddress: NFT_CONTRACT_ADDRESS,
            tokenURI,
            name,
            description,
            owner: userAddress
          });
        } catch (error) {
            console.error(`Regular NFT Token ${tokenId} bilgileri alınamadı:`, error);
        }
        }
      } catch (error) {
        console.error('Regular NFT contract error:', error);
      }

      // Get EvolvingNFTs
      try {
        const evolvingNFTContract = new ethers.Contract(EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI, readOnlyProvider);
        
        // Get total supply and check each token
        try {
          const totalSupply = await evolvingNFTContract.totalSupply();
          
          for (let i = 1; i <= totalSupply; i++) {
            try {
              const owner = await evolvingNFTContract.ownerOf(i);
              
              if (owner.toLowerCase() === userAddress.toLowerCase()) {
                const tokenURI = await evolvingNFTContract.tokenURI(i);
                let name = 'EvolvingNFT';
                let description = 'A growing NFT';
                
                // Get EvolvingNFT details
                let details = null;
                try {
                  details = await evolvingNFTContract.getNFTDetails(i);
                } catch (detailsError) {
                  console.warn('Could not get EvolvingNFT details:', detailsError);
                }
                
                // Try to extract name and image from metadata
                let image = null;
                try {
                  console.log(`🔍 Fetching metadata for NFT ${i}, tokenURI:`, tokenURI);
                  
                  if (tokenURI.startsWith('ipfs://')) {
                    const ipfsHash = tokenURI.replace('ipfs://', '');
                    
                    // Try multiple IPFS gateways for better reliability
                    const gateways = [
                      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                      `https://ipfs.io/ipfs/${ipfsHash}`,
                      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
                      `https://gateway.ipfs.io/ipfs/${ipfsHash}`
                    ];
                    
                    let metadata = null;
                    let fetchedFrom = null;
                    
                    for (const gateway of gateways) {
                      try {
                        console.log(`📡 Trying IPFS gateway:`, gateway);
                        const response = await fetch(gateway, { timeout: 10000 });
                        if (response.ok) {
                          metadata = await response.json();
                          fetchedFrom = gateway;
                          console.log(`✅ Successfully fetched from:`, gateway);
                          break;
                        }
                      } catch (gatewayError) {
                        console.warn(`❌ Failed to fetch from ${gateway}:`, gatewayError);
                        continue;
                      }
                    }
                    
                    if (!metadata) {
                      throw new Error('Failed to fetch from all IPFS gateways');
                    }
                    console.log(`📄 Metadata for NFT ${i}:`, metadata);
                    
                    name = metadata.name || 'EvolvingNFT';
                    description = metadata.description || 'A growing NFT';
                    image = metadata.image;
                    
                    // Convert IPFS image URL if needed - use same gateway that worked for metadata
                    if (image && image.startsWith('ipfs://')) {
                      const imageHash = image.replace('ipfs://', '');
                      if (fetchedFrom) {
                        // Use the same gateway that worked for metadata
                        const baseGateway = fetchedFrom.replace(/\/ipfs\/.*$/, '/ipfs/');
                        image = `${baseGateway}${imageHash}`;
                      } else {
                        // Fallback to pinata
                        image = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
                      }
                      console.log(`🖼️ Converted image URL for NFT ${i}:`, image);
                    } else {
                      console.log(`🖼️ Original image URL for NFT ${i}:`, image);
                    }
                  } else {
                    console.log(`⚠️ TokenURI for NFT ${i} doesn't start with ipfs://`);
                  }
                } catch (metadataError) {
                  console.warn(`❌ Metadata fetch error for EvolvingNFT ${i}:`, metadataError);
                }
                
                nfts.push({
                  tokenId: i.toString(),
                  contractAddress: EVOLVING_NFT_CONTRACT_ADDRESS,
                  tokenURI,
                  name,
                  description,
                  image,
                  owner: userAddress,
                  details: details ? {
                    currentStage: details.currentStage || 0,
                    wateringCount: details.wateringCount || 0,
                    lastWateredTimestamp: details.lastWateredTimestamp || 0,
                    currentStageEvolutionThreshold: details.currentStageEvolutionThreshold || 0,
                    currentStageTokenURI: details.currentStageTokenURI || tokenURI,
                    canEvolve: details.canEvolve || false
                  } : null
                });
              }
            } catch (tokenError) {
              // Token may not exist, continue
            }
          }
        } catch (supplyError) {
          console.error('Error getting EvolvingNFT total supply:', supplyError);
        }
      } catch (error) {
        console.error('EvolvingNFT contract error:', error);
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
      // Use read-only provider for getting listings (no wallet connection needed)
      const readOnlyProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI, readOnlyProvider);

      const listings = await marketplaceContract.getActiveListings();
      console.log('🔍 Raw listings from contract:', listings); // Debug log
      
      if (!listings || listings.length === 0) {
        console.warn('No listings found:', listings);
        return {
          success: true,
          listings: []
        };
      }

      const formattedListings = [];

      // Convert Result objects to regular array
      const listingsArray = [...listings];
      console.log('📋 Converted listings array:', listingsArray); // Debug log

      for (const listing of listingsArray) {
        try {
          // Skip empty or invalid listings
          if (!listing || typeof listing !== 'object') {
            console.warn('Invalid listing object:', listing);
            continue;
          }

          // Convert Result object to regular object
          const listingData = {
            listingId: listing.listingId || listing[0],
            nftContract: listing.nftContract || listing[1], 
            tokenId: listing.tokenId || listing[2],
            price: listing.price || listing[3],
            seller: listing.seller || listing[4],
            isActive: listing.isActive || listing[5]
          };
          
          console.log('🔄 Parsed listing data:', listingData); // Debug log
          console.log('🔍 Contract address check:', {
            nftContract: listingData.nftContract,
            EVOLVING_NFT_CONTRACT_ADDRESS: EVOLVING_NFT_CONTRACT_ADDRESS,
            NFT_CONTRACT_ADDRESS: NFT_CONTRACT_ADDRESS,
            isEvolvingNFT: listingData.nftContract.toLowerCase() === EVOLVING_NFT_CONTRACT_ADDRESS.toLowerCase()
          });

          const readOnlyProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
          
          // Determine which contract to use based on listing's nftContract
          let nftContract;
          let tokenURI, name, description;
          
          if (listing.nftContract.toLowerCase() === EVOLVING_NFT_CONTRACT_ADDRESS.toLowerCase()) {
            // EvolvingNFT contract
            nftContract = new ethers.Contract(EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI, readOnlyProvider);
          
            try {
              await nftContract.ownerOf(listing.tokenId);
              tokenURI = await nftContract.tokenURI(listing.tokenId);
              
              // EvolvingNFT doesn't have getTokenName/getTokenDescription, extract from metadata
              try {
                if (tokenURI.startsWith('ipfs://')) {
                  const ipfsUrl = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
                  const response = await fetch(ipfsUrl);
                  const metadata = await response.json();
                  name = metadata.name || 'EvolvingNFT';
                  description = metadata.description || 'A growing NFT';
                } else {
                  name = 'EvolvingNFT';
                  description = 'A growing NFT';
                }
              } catch (metadataError) {
                console.warn('Metadata fetch error for EvolvingNFT:', metadataError);
                name = 'EvolvingNFT';
                description = 'A growing NFT';
              }
            } catch (ownerError) {
              console.warn(`EvolvingNFT Token ID ${listingData.tokenId} bulunamadı, listingId: ${listingData.listingId} atlanıyor.`);
              continue;
            }
            
          } else {
            // Regular NFT contract
            nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, readOnlyProvider);
            
            try {
              await nftContract.ownerOf(listingData.tokenId);
              tokenURI = await nftContract.tokenURI(listingData.tokenId);
              name = await nftContract.getTokenName(listingData.tokenId);
              description = await nftContract.getTokenDescription(listingData.tokenId);
          } catch (ownerError) {
              console.warn(`Regular NFT Token ID ${listingData.tokenId} bulunamadı, listingId: ${listingData.listingId} atlanıyor.`);
              continue;
            }
          }

          // Validate listing data before formatting
          if (!listingData.listingId || !listingData.tokenId || !listingData.price || !listingData.seller) {
            console.warn('Incomplete listing data:', listingData);
            continue;
          }

          const formattedListing = {
            listingId: listingData.listingId.toString(),
            tokenId: listingData.tokenId.toString(),
            price: ethers.formatEther(listingData.price),
            seller: listingData.seller,
            contractAddress: listingData.nftContract, // Marketplace'ten gelen gerçek contract adresi
            tokenURI,
            name,
            description
          };
          
          console.log('✅ Final formatted listing:', formattedListing);
          formattedListings.push(formattedListing);
        } catch (error) {
          console.error(`Listing detayları alınamadı (genel hata):`, error);
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
      console.log('💰 buyNFT called with:', { listingId, price }); // Debug log
      
      // Validate inputs
      if (!listingId || listingId === undefined) {
        throw new Error('Listing ID gerekli');
      }
      if (!price || price === undefined) {
        throw new Error('Fiyat bilgisi gerekli');
      }

      // Ensure wallet connection for buying
      if (!this.marketplaceContract) {
        await this.connectWallet();
        if (!this.marketplaceContract) {
          throw new Error('Wallet bağlantısı gerekli');
        }
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

  // NFT transfer et
  async transferNFT(contractAddress, tokenId, toAddress) {
    try {
      await this.connectToContract();
      
      // Determine which contract to use
      let contract;
      if (contractAddress === NFT_CONTRACT_ADDRESS) {
        contract = this.nftContract;
      } else if (contractAddress === EVOLVING_NFT_CONTRACT_ADDRESS) {
        // For EvolvingNFT, create a separate contract instance
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        contract = new ethers.Contract(contractAddress, EVOLVING_NFT_ABI, signer);
      } else {
        throw new Error('Bilinmeyen contract adresi');
      }

      if (!contract) {
        throw new Error('Contract bağlantısı kurulamadı');
      }

      const fromAddress = await contract.runner.getAddress();
      const transaction = await contract.transferFrom(fromAddress, toAddress, tokenId);
      const receipt = await transaction.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('NFT transfer hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // NFT'yi satışa çıkar
  async sellNFT(tokenId, price, contractAddress = null) {
    try {
      console.log('🛍️ [WEB3 SELL DEBUG] Starting sellNFT:', { tokenId, price, contractAddress });
      
      await this.connectToContract();
      
      if (!this.marketplaceContract) {
        throw new Error('Marketplace contract bağlantısı yok');
      }

      const priceInWei = ethers.parseEther(price.toString());
      console.log('🛍️ [WEB3 SELL DEBUG] Price in Wei:', priceInWei.toString());
      
      let nftContract;
      let finalContractAddress;
      let contractType = '';
      
      // Contract adresini belirle
      if (contractAddress) {
        // Contract address doğrudan verilmiş
        finalContractAddress = contractAddress;
        console.log('🛍️ [WEB3 SELL DEBUG] Using provided contract address:', contractAddress);
      } else {
        // Contract address verilmemiş, hem normal hem evolving NFT'yi kontrol et
        console.log('🛍️ [WEB3 SELL DEBUG] No contract address provided, checking both contracts...');
        
        // Önce normal NFT kontratını kontrol et (çünkü çoğunlukla bu kullanılıyor)
        try {
          await this.nftContract.ownerOf(tokenId);
          finalContractAddress = NFT_CONTRACT_ADDRESS;
          contractType = 'RegularNFT';
          console.log('🛍️ [WEB3 SELL DEBUG] Found in Regular NFT contract');
        } catch (regularError) {
          console.log('🛍️ [WEB3 SELL DEBUG] Not found in Regular NFT, trying EvolvingNFT...', regularError.message);
          
          // Regular NFT'de bulunamadı, EvolvingNFT'yi dene
          try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.BrowserProvider(window.ethereum);
            const evolvingContract = new ethers.Contract(EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI, provider);
            await evolvingContract.ownerOf(tokenId);
            finalContractAddress = EVOLVING_NFT_CONTRACT_ADDRESS;
            contractType = 'EvolvingNFT';
            console.log('🛍️ [WEB3 SELL DEBUG] Found in EvolvingNFT contract');
          } catch (evolvingError) {
            console.error('🛍️ [WEB3 SELL DEBUG] NFT not found in any contract:', evolvingError.message);
            throw new Error(`NFT Token ID ${tokenId} hiçbir kontraktta bulunamadı`);
          }
        }
      }

      // NFT kontratını ayarla
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      if (finalContractAddress === NFT_CONTRACT_ADDRESS) {
        nftContract = this.nftContract;
        contractType = 'RegularNFT';
      } else if (finalContractAddress === EVOLVING_NFT_CONTRACT_ADDRESS) {
        nftContract = new ethers.Contract(EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI, signer);
        contractType = 'EvolvingNFT';
      } else {
        throw new Error('Bilinmeyen contract adresi: ' + finalContractAddress);
      }

      if (!nftContract) {
        throw new Error('NFT contract bağlantısı kurulamadı');
      }

      console.log('🛍️ [WEB3 SELL DEBUG] Using contract:', { contractType, contractAddress: finalContractAddress });

      // Approve marketplace
      console.log('🛍️ [WEB3 SELL DEBUG] Approving marketplace...');
      const approveTx = await nftContract.approve(MARKETPLACE_CONTRACT_ADDRESS, tokenId);
      console.log('🛍️ [WEB3 SELL DEBUG] Approval transaction sent:', approveTx.hash);
      await approveTx.wait();
      console.log('🛍️ [WEB3 SELL DEBUG] Approval confirmed');

      // List NFT with correct contract address
      console.log('🛍️ [WEB3 SELL DEBUG] Listing NFT...', { contractAddress: finalContractAddress, tokenId, priceInWei: priceInWei.toString() });
      const listTx = await this.marketplaceContract.listNFT(finalContractAddress, tokenId, priceInWei);
      console.log('🛍️ [WEB3 SELL DEBUG] List transaction sent:', listTx.hash);
      const receipt = await listTx.wait();
      console.log('🛍️ [WEB3 SELL DEBUG] List transaction confirmed:', receipt.hash);

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('🛍️ [WEB3 SELL DEBUG] NFT satışa çıkarma hatası:', error);
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

          const readOnlyProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
          
          // Determine which contract to use based on listing's nftContract
          let nftContract;
          let tokenURI, name, description;
          
          if (listing.nftContract.toLowerCase() === EVOLVING_NFT_CONTRACT_ADDRESS.toLowerCase()) {
            // EvolvingNFT contract
            nftContract = new ethers.Contract(EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI, readOnlyProvider);
          
            try {
              await nftContract.ownerOf(listing.tokenId);
              tokenURI = await nftContract.tokenURI(listing.tokenId);
              
              // Extract from metadata
              try {
                if (tokenURI.startsWith('ipfs://')) {
                  const ipfsUrl = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
                  const response = await fetch(ipfsUrl);
                  const metadata = await response.json();
                  name = metadata.name || 'EvolvingNFT';
                  description = metadata.description || 'A growing NFT';
                } else {
                  name = 'EvolvingNFT';
                  description = 'A growing NFT';
                }
              } catch (metadataError) {
                console.warn('Metadata fetch error for EvolvingNFT:', metadataError);
                name = 'EvolvingNFT';
                description = 'A growing NFT';
              }
          } catch (ownerError) {
              console.warn(`EvolvingNFT Token ID ${listing.tokenId} (user listing) bulunamadı, listingId: ${listing.listingId} atlanıyor.`);
            continue;
          }
          
          } else {
            // Regular NFT contract
            nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, readOnlyProvider);
            
            try {
              await nftContract.ownerOf(listing.tokenId);
              tokenURI = await nftContract.tokenURI(listing.tokenId);
              name = await nftContract.getTokenName(listing.tokenId);
              description = await nftContract.getTokenDescription(listing.tokenId);
            } catch (ownerError) {
              console.warn(`Regular NFT Token ID ${listing.tokenId} (user listing) bulunamadı, listingId: ${listing.listingId} atlanıyor.`);
              continue;
            }
          }

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