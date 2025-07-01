'use client';

import { useState, useEffect, use } from 'react';
import { ethers } from 'ethers';
import { web3Service } from '../../../utils/web3';
import { EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI } from '../../../utils/constants';
import Image from 'next/image';

export default function GardenPage({ params }) {
  const [account, setAccount] = useState(null);
  const [gardenNFTs, setGardenNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState({});
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [nftDetails, setNftDetails] = useState({});
  const [evolving, setEvolving] = useState({});

  const resolvedParams = use(params);
  const walletAddress = resolvedParams?.walletAddress || '';

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (account) {
      loadGardenNFTs();
    }
  }, [account]);

  const checkConnection = async () => {
    const result = await web3Service.checkConnection();
    if (result.connected) {
      setAccount(result.account);
    }
    setLoading(false);
  };

  const loadGardenNFTs = async () => {
    try {
      // Load NFTs from localStorage (garden simulation)
      const gardenData = JSON.parse(localStorage.getItem(`garden_${account}`) || '[]');
      
      // Also load any EvolvingNFTs that the user owns directly
      const userNFTs = await web3Service.getUserNFTs(account);
      if (userNFTs.success) {
        const evolvingNFTs = userNFTs.nfts.filter(nft => 
          nft.contractAddress === EVOLVING_NFT_CONTRACT_ADDRESS ||
          !nft.contractAddress // Default to EvolvingNFT if no contract specified
        );
        
        // Combine garden NFTs with directly owned EvolvingNFTs
        const allGardenNFTs = [...gardenData, ...evolvingNFTs];
        
        // Remove duplicates based on tokenId
        const uniqueNFTs = allGardenNFTs.filter((nft, index, self) => 
          index === self.findIndex(n => n.tokenId === nft.tokenId)
        );
        
        setGardenNFTs(uniqueNFTs);
        
        // Load detailed information for each NFT
        for (const nft of uniqueNFTs) {
          await loadNFTDetails(nft.tokenId);
        }
      }
    } catch (error) {
      console.error('Garden NFT loading error:', error);
    }
  };

  const loadNFTDetails = async (tokenId) => {
    try {
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const contract = new ethers.Contract(EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI, provider);
      
      const nftData = await contract.getNFTDetails(tokenId);
      const tokenURI = await contract.tokenURI(tokenId);
      
      // Fetch metadata from IPFS
      let metadata = null;
      let imageUrl = null;
      if (tokenURI) {
        try {
          const ipfsUrl = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          const response = await fetch(ipfsUrl);
          if (response.ok) {
            metadata = await response.json();
            if (metadata.image) {
              imageUrl = metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            }
          }
        } catch (metadataError) {
          console.warn(`Metadata fetch failed for token ${tokenId}:`, metadataError);
        }
      }
      
      setNftDetails(prev => ({
        ...prev,
        [tokenId]: {
          stage: parseInt(nftData.currentStage),
          wateringCount: parseInt(nftData.wateringCount),
          lastWatered: parseInt(nftData.lastWateredTimestamp),
          tokenURI: tokenURI,
          canEvolve: nftData.canEvolve,
          evolutionThreshold: parseInt(nftData.currentStageEvolutionThreshold),
          metadata: metadata,
          imageUrl: imageUrl
        }
      }));
    } catch (error) {
      console.error(`Error loading details for token ${tokenId}:`, error);
    }
  };

  const handleWater = async (tokenId) => {
    if (!account) {
      alert('Lütfen cüzdanınızı bağlayın');
      return;
    }

    setWatering(prev => ({ ...prev, [tokenId]: true }));
    
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI, signer);

      const tx = await contract.water(tokenId);
      await tx.wait();

      alert('💧 NFT başarıyla sulandı! Gelişimi için tekrar sulayabilirsiniz.');
      
      // Reload NFT details
      await loadNFTDetails(tokenId);
      
    } catch (error) {
      console.error('Watering error:', error);
      alert('❌ Sulama hatası: ' + error.message);
    } finally {
      setWatering(prev => ({ ...prev, [tokenId]: false }));
    }
  };

  const handleEvolve = async (tokenId) => {
    if (!account) {
      alert('Lütfen cüzdanınızı bağlayın');
      return;
    }

    setEvolving(prev => ({ ...prev, [tokenId]: true }));
    
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI, signer);

      const tx = await contract.evolve(tokenId);
      await tx.wait();

      alert('🌟 NFT başarıyla evrimleşti! Yeni aşamasını görmek için sayfayı yenileyin.');
      
      // Reload NFT details
      await loadNFTDetails(tokenId);
      
    } catch (error) {
      console.error('Evolution error:', error);
      alert('❌ Evrim hatası: ' + error.message);
    } finally {
      setEvolving(prev => ({ ...prev, [tokenId]: false }));
    }
  };

  const openDetailsModal = (nft) => {
    setSelectedNFT(nft);
    setShowDetailsModal(true);
  };

  const getStageInfo = (stage) => {
    const stages = [
      { name: '🌰 Tohum', description: 'Başlangıç aşaması', color: 'brown' },
      { name: '🌱 Filiz', description: 'İlk büyüme', color: 'green' },
      { name: '🌿 Fidan', description: 'Genç bitki', color: 'green' },
      { name: '🌸 Çiçek', description: 'Çiçeklenme', color: 'pink' },
      { name: '🍎 Meyve', description: 'Olgunluk', color: 'red' }
    ];
    return stages[stage] || stages[0];
  };

  // Stage-based renk teması belirleme
  const getStageTheme = (stage) => {
    const themes = [
      {
        name: 'seed',
        gradient: 'from-amber-400 to-yellow-600',
        bgGradient: 'from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20',
        accent: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-300 dark:border-amber-600',
        glow: 'from-amber-400/30 to-yellow-600/30',
        emoji: '🌰',
        stage: 0
      },
      {
        name: 'sprout',
        gradient: 'from-lime-400 to-green-600',
        bgGradient: 'from-lime-50 to-green-100 dark:from-lime-900/20 dark:to-green-900/20',
        accent: 'text-lime-600 dark:text-lime-400',
        border: 'border-lime-300 dark:border-lime-600',
        glow: 'from-lime-400/30 to-green-600/30',
        emoji: '🌱',
        stage: 1
      },
      {
        name: 'sapling',
        gradient: 'from-green-400 to-emerald-600',
        bgGradient: 'from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20',
        accent: 'text-green-600 dark:text-green-400',
        border: 'border-green-300 dark:border-green-600',
        glow: 'from-green-400/30 to-emerald-600/30',
        emoji: '🌿',
        stage: 2
      },
      {
        name: 'bloom',
        gradient: 'from-pink-400 to-rose-600',
        bgGradient: 'from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20',
        accent: 'text-pink-600 dark:text-pink-400',
        border: 'border-pink-300 dark:border-pink-600',
        glow: 'from-pink-400/30 to-rose-600/30',
        emoji: '🌸',
        stage: 3
      },
      {
        name: 'fruit',
        gradient: 'from-red-400 to-rose-600',
        bgGradient: 'from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20',
        accent: 'text-red-600 dark:text-red-400',
        border: 'border-red-300 dark:border-red-600',
        glow: 'from-red-400/30 to-rose-600/30',
        emoji: '🍎',
        stage: 4
      }
    ];

    return themes[stage] || themes[0];
  };

  const getProgressPercentage = (stage, wateringCount, evolutionThreshold) => {
    if (stage >= 4) return 100; // Final stage
    if (!evolutionThreshold) return 0;
    
    return Math.min((wateringCount / evolutionThreshold) * 100, 100);
  };

  const getNextEvolutionInfo = (stage, wateringCount, evolutionThreshold) => {
    if (stage >= 4) return null; // Final stage
    if (!evolutionThreshold) return 0;
    
    const needed = evolutionThreshold - wateringCount;
    return needed > 0 ? needed : 0;
  };

  const connectWallet = async () => {
    const result = await web3Service.connectWallet();
    if (result.success) {
      setAccount(result.account);
    } else {
      alert('Cüzdan bağlanmadı: ' + result.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Ultra-Modern Animated Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="container mx-auto px-4 py-16 relative z-10 flex items-center justify-center min-h-screen">
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-12 text-center overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 right-8 w-24 h-24 bg-green-500/10 rounded-full filter blur-xl animate-blob"></div>
              <div className="absolute bottom-4 left-8 w-20 h-20 bg-teal-500/10 rounded-full filter blur-lg animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20">
                <span className="text-4xl">🌱</span>
              </div>
              
              <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xl font-medium text-foreground">Bahçe yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Ultra-Modern Animated Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="container mx-auto px-4 py-16 relative z-10 flex items-center justify-center min-h-screen">
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-12 max-w-lg mx-auto text-center overflow-hidden shadow-2xl">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 right-8 w-32 h-32 bg-green-500/10 rounded-full filter blur-2xl animate-blob"></div>
              <div className="absolute bottom-4 left-8 w-24 h-24 bg-teal-500/10 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>
            
            <div className="relative z-10">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/20">
                <span className="text-6xl">🌱</span>
              </div>
              
              <h2 className="text-3xl font-black mb-4">
                <span className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
                  Bahçeye Hoş Geldiniz
                </span>
              </h2>
              
              <p className="text-lg text-foreground/70 mb-8 leading-relaxed">
                Bu özel bahçeyi keşfetmek ve NFT'lerle etkileşim kurmak için cüzdanınızı bağlayın.
              </p>
              
          <button 
            onClick={connectWallet}
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
                <span className="text-xl">🔗</span>
                <span>Cüzdan Bağla</span>
          </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
     return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ultra-Modern Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-full filter blur-3xl animate-blob"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Ultra-Modern Header */}
        <div className="relative mb-12">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 left-8 w-32 h-32 bg-green-500/10 rounded-full filter blur-2xl animate-blob"></div>
            <div className="absolute top-0 right-12 w-28 h-28 bg-teal-500/10 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-8 md:p-12 text-center overflow-hidden shadow-xl">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-3xl flex items-center justify-center border border-white/20">
                <span className="text-4xl">🌺</span>
              </div>
              <div className="text-left">
                <h1 className="text-3xl md:text-4xl font-black">
                  <span className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
                    NFT Bahçem
                  </span>
                </h1>
                <p className="text-foreground/60 text-lg">NFT'lerinizi sulayın ve evrimlerini izleyin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra-Modern Garden Owner Info */}
        <div className="relative mb-8">
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-6 text-center overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 right-6 w-20 h-20 bg-primary-accent/10 rounded-full filter blur-xl animate-blob"></div>
              <div className="absolute bottom-2 left-6 w-16 h-16 bg-green-500/10 rounded-full filter blur-lg animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10 flex items-center justify-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-accent/20 to-green-500/20 rounded-2xl flex items-center justify-center border border-white/20">
                <span className="text-2xl">👤</span>
              </div>
              <div className="text-left">
                <p className="text-sm text-foreground/60 mb-1">Bahçe Sahibi</p>
                <p className="font-mono text-foreground font-medium">{walletAddress}</p>
        {account.toLowerCase() === walletAddress.toLowerCase() && (
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-xs text-green-500 font-medium">Bu sizin bahçeniz</p>
                  </div>
        )}
      </div>
            </div>
          </div>
        </div>

        {/* Ultra-Modern Garden Stats */}
        {gardenNFTs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {/* Toplam NFT */}
            <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-6 text-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 right-2 w-16 h-16 bg-primary-accent/10 rounded-full filter blur-lg animate-blob"></div>
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <span className="text-2xl">🌿</span>
                </div>
                <div className="text-3xl font-black text-primary-accent mb-2">{gardenNFTs.length}</div>
                <div className="text-sm text-foreground/60 font-medium">Toplam NFT</div>
              </div>
            </div>

            {/* Olgun Bitkiler */}
            <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-6 text-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 right-2 w-16 h-16 bg-green-500/10 rounded-full filter blur-lg animate-blob"></div>
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <span className="text-2xl">🍎</span>
                </div>
                <div className="text-3xl font-black text-green-500 mb-2">
              {gardenNFTs.filter(nft => (nftDetails[nft.tokenId]?.stage || 0) >= 4).length}
                </div>
                <div className="text-sm text-foreground/60 font-medium">Olgun Bitkiler</div>
              </div>
            </div>

            {/* Büyüyen Bitkiler */}
            <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-6 text-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 right-2 w-16 h-16 bg-teal-500/10 rounded-full filter blur-lg animate-blob"></div>
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <span className="text-2xl">🌱</span>
                </div>
                <div className="text-3xl font-black text-teal-500 mb-2">
              {gardenNFTs.filter(nft => {
                const stage = nftDetails[nft.tokenId]?.stage || 0;
                return stage > 0 && stage < 4;
              }).length}
            </div>
                <div className="text-sm text-foreground/60 font-medium">Büyüyen Bitkiler</div>
              </div>
            </div>

            {/* Tohumlar */}
            <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-6 text-center overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 right-2 w-16 h-16 bg-amber-500/10 rounded-full filter blur-lg animate-blob"></div>
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <span className="text-2xl">🌰</span>
          </div>
                <div className="text-3xl font-black text-amber-500 mb-2">
              {gardenNFTs.filter(nft => (nftDetails[nft.tokenId]?.stage || 0) === 0).length}
        </div>
                <div className="text-sm text-foreground/60 font-medium">Tohumlar</div>
              </div>
          </div>
          </div>
        )}

      {/* Garden Grid */}
      {gardenNFTs.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {gardenNFTs.map((nft) => {
            const details = nftDetails[nft.tokenId] || {};
            const stageInfo = getStageInfo(details.stage || 0);
            const theme = getStageTheme(details.stage || 0);
            const progress = getProgressPercentage(details.stage || 0, details.wateringCount || 0, details.evolutionThreshold || 0);
            const wateringsNeeded = getNextEvolutionInfo(details.stage || 0, details.wateringCount || 0, details.evolutionThreshold || 0);
            const canWater = account.toLowerCase() === walletAddress.toLowerCase();

            return (
              <div key={nft.tokenId} className={`relative bg-gradient-to-br ${theme.bgGradient} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden border ${theme.border} group`}>
                {/* Decorative Background Elements */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${theme.glow} rounded-full -translate-y-10 translate-x-10 opacity-50`}></div>
                <div className={`absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr ${theme.glow} rounded-full translate-y-8 -translate-x-8 opacity-30`}></div>
                
                {/* Stage Emoji Decorator */}
                <div className="absolute top-2 left-2 text-lg opacity-40 group-hover:opacity-60 transition-opacity z-10">
                  {theme.emoji}
                </div>

                {/* NFT Image */}
                <div className={`aspect-square relative ${theme.bgGradient}`}>
                  {details.imageUrl ? (
                    <Image
                      src={details.imageUrl}
                      alt={details.metadata?.name || `NFT #${nft.tokenId}`}
                      fill
                      sizes="400px"
                      className="object-cover rounded-t-2xl group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback Emoji Display */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ display: details.imageUrl ? 'none' : 'flex' }}
                  >
                    <div className="text-6xl">{stageInfo.name.split(' ')[0]}</div>
                  </div>
                  
                  {/* Stage Badge */}
                  <div className={`absolute top-2 right-2 bg-gradient-to-r ${theme.gradient} text-white px-2 py-1 rounded-full text-xs font-medium z-10 shadow-md`}>
                    Aşama {(details.stage || 0) + 1}
                  </div>
                  
                  {/* Details Button */}
                  <button
                    onClick={() => openDetailsModal(nft)}
                    className="absolute bottom-2 right-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 rounded-full hover:scale-110 transition-all z-10 shadow-md"
                  >
                    ℹ️
                  </button>
                </div>

                {/* NFT Info */}
                <div className="p-4 relative z-10">
                  <h3 className={`font-semibold ${theme.accent} mb-1 truncate group-hover:font-bold transition-all`}>
                    {(() => {
                      const rawName = nft.name || `NFT #${nft.tokenId}`;
                      // Stage kısmını çıkar (örn: "Sarı Çiçek - 🌿 Fidan" -> "Sarı Çiçek")
                      return rawName.includes(' - 🌰') || rawName.includes(' - 🌱') || rawName.includes(' - 🌿') || rawName.includes(' - 🌸') || rawName.includes(' - 🍎')
                        ? rawName.split(' - ')[0] 
                        : rawName;
                    })()}
                  </h3>
                  <p className="text-sm text-foreground/70 mb-3">{stageInfo.name}</p>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-foreground/70 mb-1">
                      <span>Evrim İlerlemesi</span>
                      <span className={theme.accent}>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-white/40 dark:bg-gray-800/40 rounded-full h-2">
                      <div 
                        className={`bg-gradient-to-r ${theme.gradient} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    {wateringsNeeded > 0 ? (
                      <p className="text-xs text-foreground/60 mt-1">
                        {wateringsNeeded} sulama daha gerekli
                      </p>
                    ) : details.canEvolve ? (
                      <p className={`text-xs ${theme.accent} mt-1 font-medium`}>
                        ✨ Evrim için hazır!
                      </p>
                    ) : null}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-white/30 dark:bg-gray-800/30 rounded p-2 text-center border border-white/20">
                      <div className={`font-semibold ${theme.accent}`}>{details.wateringCount || 0}</div>
                      <div className="text-foreground/60">Sulama</div>
                    </div>
                    <div className="bg-white/30 dark:bg-gray-800/30 rounded p-2 text-center border border-white/20">
                      <div className={`font-semibold ${theme.accent}`}>#{nft.tokenId}</div>
                      <div className="text-foreground/60">Token ID</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canWater ? (
                    <div className="space-y-2">
                      {/* Water Button - Only show if not fully evolved */}
                      {(details.stage || 0) < 4 && (
                        <button
                          onClick={() => handleWater(nft.tokenId)}
                          disabled={watering[nft.tokenId]}
                          className={`w-full bg-gradient-to-r ${theme.gradient} text-white py-2 px-4 rounded-lg font-medium hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md`}
                        >
                          {watering[nft.tokenId] ? (
                            <>
                              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"></div>
                              Sulanıyor...
                            </>
                          ) : (
                            '💧 Sula'
                          )}
                        </button>
                      )}
                      
                      {/* Evolve Button */}
                      {details.canEvolve && (
                        <button
                          onClick={() => handleEvolve(nft.tokenId)}
                          disabled={evolving[nft.tokenId]}
                          className={`w-full bg-gradient-to-r ${theme.gradient} text-white py-2 px-4 rounded-lg font-medium hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md`}
                        >
                          {evolving[nft.tokenId] ? (
                            <>
                              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"></div>
                              Evrimleşiyor...
                            </>
                          ) : (
                            '🌟 Evrimleş'
                          )}
                        </button>
                      )}
                      
                      {/* Fully Evolved Status */}
                      {(details.stage || 0) >= 4 && (
                        <div className={`w-full bg-gradient-to-r ${theme.gradient} text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center shadow-md`}>
                          🏆 Tam Evrimleşmiş
                        </div>
                      )}
                </div>
              ) : (
                    <div className="w-full bg-text-muted text-white py-2 px-4 rounded-lg font-medium text-center cursor-not-allowed">
                      🔒 Sadece sahip işlem yapabilir
                    </div>
                  )}
                </div>

                {/* Hover Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.glow} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-16 text-center overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-8 left-8 w-32 h-32 bg-green-500/10 rounded-full filter blur-2xl animate-blob"></div>
            <div className="absolute bottom-8 right-8 w-24 h-24 bg-teal-500/10 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/20">
              <span className="text-6xl">🌱</span>
            </div>
            
            <h3 className="text-3xl font-black mb-6">
              <span className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
                Bahçe Boş
              </span>
            </h3>
            
            <p className="text-lg text-foreground/70 mb-8 max-w-lg mx-auto leading-relaxed">
            {account.toLowerCase() === walletAddress.toLowerCase() 
              ? 'Henüz bahçenizde NFT bulunmuyor. NFT\'lerinizi "NFT\'lerim" sayfasından bahçenize transfer edebilirsiniz.'
              : 'Bu bahçede henüz NFT bulunmuyor.'
            }
          </p>
            
          {account.toLowerCase() === walletAddress.toLowerCase() && (
            <a 
              href="/my-nfts"
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
            >
                <span className="text-xl">💎</span>
                <span>NFT'lerime Git</span>
            </a>
                    )}
          </div>
                </div>
              )}

        {/* Ultra-Modern Evolution Guide */}
        <div className="mt-16 relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-8 md:p-12 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-8 w-32 h-32 bg-green-500/10 rounded-full filter blur-2xl animate-blob"></div>
            <div className="absolute bottom-4 right-8 w-28 h-28 bg-teal-500/10 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-blue-500/10 rounded-full filter blur-lg animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-white/20">
                <span className="text-3xl">🌱</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black">
                <span className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
                  Evrim Rehberi
                </span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[
                { stage: '🌰', name: 'Tohum', waterings: '0', description: 'Başlangıç', color: 'from-amber-500/20 to-yellow-500/20', accent: 'text-amber-500' },
                { stage: '🌱', name: 'Filiz', waterings: '3', description: 'İlk büyüme', color: 'from-lime-500/20 to-green-500/20', accent: 'text-lime-500' },
                { stage: '🌿', name: 'Fidan', waterings: '5', description: 'Genç bitki', color: 'from-green-500/20 to-emerald-500/20', accent: 'text-green-500' },
                { stage: '🌸', name: 'Çiçek', waterings: '7', description: 'Çiçeklenme', color: 'from-pink-500/20 to-rose-500/20', accent: 'text-pink-500' },
                { stage: '🍎', name: 'Meyve', waterings: '10', description: 'Olgunluk', color: 'from-red-500/20 to-rose-500/20', accent: 'text-red-500' }
              ].map((stage, index) => (
                <div key={index} className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center overflow-hidden hover:scale-105 transition-all duration-300">
                  {/* Stage Background Element */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute top-2 right-2 w-12 h-12 bg-gradient-to-br ${stage.color} rounded-full filter blur-lg animate-blob`}></div>
                  </div>
                  
                  <div className="relative z-10">
                    <div className="text-4xl mb-4">{stage.stage}</div>
                    <div className={`font-bold text-lg ${stage.accent} mb-2`}>{stage.name}</div>
                    <div className="text-sm text-foreground/70 mb-3">{stage.description}</div>
                    <div className="text-xs font-medium bg-white/20 dark:bg-gray-800/20 rounded-full px-3 py-1 backdrop-blur-sm border border-white/20">
                      {index === 0 ? 'Başla' : `${stage.waterings} sulama`}
                    </div>
              </div>
            </div>
          ))}
        </div>
          </div>
        </div>

        {/* Ultra-Modern Details Modal */}
        {showDetailsModal && selectedNFT && (() => {
          const nftData = nftDetails[selectedNFT.tokenId] || {};
          const theme = getStageTheme(nftData.stage || 0);
          const stageInfo = getStageInfo(nftData.stage || 0);
          
          return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className={`relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-8 max-w-xl w-full shadow-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100`}>
                
                {/* Themed Animated Background Elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                  <div className={`absolute top-8 right-12 w-32 h-32 bg-gradient-to-br ${theme.glow} rounded-full filter blur-2xl animate-blob opacity-30`}></div>
                  <div className={`absolute bottom-8 left-12 w-24 h-24 bg-gradient-to-tr ${theme.glow} rounded-full filter blur-xl animate-blob animation-delay-2000 opacity-20`}></div>
                  <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-gradient-to-br ${theme.glow} rounded-full filter blur-3xl animate-blob animation-delay-4000 opacity-10`}></div>
      </div>

                <div className="relative z-10">
                  {/* Modal Header */}
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${theme.bgGradient} rounded-2xl flex items-center justify-center border border-white/20 shadow-lg`}>
                        <span className="text-3xl">{theme.emoji}</span>
                      </div>
                      <div>
                        <h3 className="text-3xl font-black">
                          <span className={`bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent`}>
                            NFT Detayları
                          </span>
                        </h3>
                        <p className="text-foreground/60 text-sm font-medium">{stageInfo.name}</p>
                      </div>
                    </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                      className={`bg-gradient-to-br ${theme.glow} backdrop-blur-sm border border-white/20 p-4 rounded-2xl hover:scale-110 transition-all duration-200 shadow-lg hover:shadow-xl`}
              >
                      <span className="text-xl">✖️</span>
              </button>
            </div>
            
                  <div className="space-y-6">
                    {/* NFT Main Display */}
                    <div className={`relative text-center p-8 bg-gradient-to-br ${theme.bgGradient} rounded-3xl border border-white/20 overflow-hidden`}>
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8"></div>
                      
                      <div className="relative z-10">
                        <div className="w-40 h-40 mx-auto mb-6 relative rounded-2xl overflow-hidden shadow-2xl bg-white/10 border border-white/20">
                          {nftData.imageUrl ? (
                    <Image
                              src={nftData.imageUrl}
                              alt={nftData.metadata?.name || `NFT #${selectedNFT.tokenId}`}
                      fill
                              sizes="160px"
                              className="object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback Emoji */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                            style={{ display: nftData.imageUrl ? 'none' : 'flex' }}
                          >
                            <div className="text-8xl">{theme.emoji}</div>
                          </div>
                        </div>
                        
                        <h4 className="text-2xl font-black text-white mb-2">
                          {(() => {
                            const rawName = nftData.metadata?.name || selectedNFT.name || `NFT #${selectedNFT.tokenId}`;
                            return rawName.includes(' - 🌰') || rawName.includes(' - 🌱') || rawName.includes(' - 🌿') || rawName.includes(' - 🌸') || rawName.includes(' - 🍎')
                              ? rawName.split(' - ')[0] 
                              : rawName;
                          })()}
                        </h4>
                        <p className="text-white/80 text-sm font-medium">Token #{selectedNFT.tokenId}</p>
                      </div>
                    </div>

                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 rounded-2xl p-4 overflow-hidden`}>
                        <div className={`absolute top-1 right-1 w-12 h-12 bg-gradient-to-br ${theme.glow} rounded-full filter blur-lg opacity-30`}></div>
                        <div className="relative z-10">
                          <div className="text-foreground/70 text-sm mb-2 font-medium">🏷️ Token ID</div>
                          <div className={`font-black text-xl ${theme.accent}`}>#{selectedNFT.tokenId}</div>
                  </div>
                </div>
                      
                      <div className={`relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 rounded-2xl p-4 overflow-hidden`}>
                        <div className={`absolute top-1 right-1 w-12 h-12 bg-gradient-to-br ${theme.glow} rounded-full filter blur-lg opacity-30`}></div>
                        <div className="relative z-10">
                          <div className="text-foreground/70 text-sm mb-2 font-medium">🌱 Aşama</div>
                          <div className={`font-black text-xl ${theme.accent}`}>
                            {stageInfo.name}
                          </div>
                </div>
              </div>

                      <div className={`relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 rounded-2xl p-4 overflow-hidden`}>
                        <div className={`absolute top-1 right-1 w-12 h-12 bg-gradient-to-br ${theme.glow} rounded-full filter blur-lg opacity-30`}></div>
                        <div className="relative z-10">
                          <div className="text-foreground/70 text-sm mb-2 font-medium">💧 Toplam Sulama</div>
                          <div className={`font-black text-xl ${theme.accent}`}>
                            {nftData.wateringCount || 0}
                </div>
                  </div>
                </div>
                      
                      <div className={`relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 rounded-2xl p-4 overflow-hidden`}>
                        <div className={`absolute top-1 right-1 w-12 h-12 bg-gradient-to-br ${theme.glow} rounded-full filter blur-lg opacity-30`}></div>
                        <div className="relative z-10">
                          <div className="text-foreground/70 text-sm mb-2 font-medium">⏰ Son Sulama</div>
                          <div className={`font-bold text-sm ${theme.accent}`}>
                            {nftData.lastWatered 
                              ? new Date(nftData.lastWatered * 1000).toLocaleDateString('tr-TR')
                      : 'Hiç sulanmadı'
                    }
                  </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Progress Section */}
                    <div className={`relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 rounded-2xl p-6 overflow-hidden`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.glow} opacity-5`}></div>
                      <div className={`absolute top-2 right-4 w-16 h-16 bg-gradient-to-br ${theme.glow} rounded-full filter blur-xl opacity-30`}></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`w-10 h-10 bg-gradient-to-br ${theme.bgGradient} rounded-xl flex items-center justify-center border border-white/20`}>
                            <span className="text-lg">📊</span>
                          </div>
                          <div>
                            <div className="text-foreground font-bold text-lg">Evrim İlerlemesi</div>
                            <div className="text-foreground/60 text-sm">Sonraki aşamaya kadar</div>
                </div>
              </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-foreground/70 font-medium">İlerleme</span>
                            <span className={`font-bold ${theme.accent}`}>
                              {Math.round(getProgressPercentage(
                                nftData.stage || 0, 
                                nftData.wateringCount || 0,
                                nftData.evolutionThreshold || 0
                              ))}%
                            </span>
                          </div>
                          <div className="w-full bg-white/20 dark:bg-gray-800/20 rounded-full h-4 border border-white/20 overflow-hidden">
                            <div 
                              className={`bg-gradient-to-r ${theme.gradient} h-4 rounded-full transition-all duration-500 shadow-md relative overflow-hidden`}
                    style={{ 
                      width: `${getProgressPercentage(
                                  nftData.stage || 0, 
                                  nftData.wateringCount || 0,
                                  nftData.evolutionThreshold || 0
                      )}%` 
                    }}
                            >
                              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                          </div>
                </div>
                        
                        <div className={`text-sm font-medium ${theme.accent} bg-white/10 dark:bg-gray-800/10 rounded-xl p-3 border border-white/20`}>
                  {(() => {
                    const needed = getNextEvolutionInfo(
                              nftData.stage || 0, 
                              nftData.wateringCount || 0,
                              nftData.evolutionThreshold || 0
                    );
                    return needed > 0 
                              ? `🌱 Sonraki aşama için ${needed} sulama daha gerekli`
                              : '🏆 Evrim için hazır veya maksimum aşamada!';
                  })()}
                        </div>
                      </div>
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className={`w-full bg-gradient-to-r ${theme.gradient} text-white font-bold py-4 px-6 rounded-2xl hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-2xl flex items-center justify-center space-x-3`}
                    >
                      <span className="text-xl">✨</span>
                      <span>Kapat</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        </div>
    </div>
  );
} 