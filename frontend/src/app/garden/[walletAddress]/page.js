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
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-accent border-r-transparent"></div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="bg-secondary-accent rounded-lg p-8 max-w-md mx-auto shadow-lg">
          <div className="text-6xl mb-4">🌱</div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Bahçeye Hoş Geldiniz</h2>
          <p className="text-foreground/70 mb-6">Bahçenizi görüntülemek için cüzdanınızı bağlayın.</p>
          <button 
            onClick={connectWallet}
            className="bg-primary-accent text-background px-6 py-3 rounded-lg font-medium hover:brightness-90 transition-all"
          >
            🔗 Cüzdan Bağla
          </button>
        </div>
      </div>
    );
  }
  
     return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-3">🌺 NFT Bahçem</h1>
        <p className="text-foreground/70 text-lg">NFT'lerinizi sulayın ve evrimlerini izleyin</p>
        </div>

      {/* Garden Owner Info */}
      <div className="bg-secondary-accent rounded-lg p-4 mb-6 text-center">
        <p className="text-sm text-foreground/70 mb-1">Bahçe Sahibi:</p>
        <p className="font-mono text-foreground">{walletAddress}</p>
        {account.toLowerCase() === walletAddress.toLowerCase() && (
          <p className="text-xs text-success-accent mt-1">✅ Bu sizin bahçeniz</p>
        )}
      </div>

      {/* Garden Stats */}
      {gardenNFTs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-secondary-accent p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary-accent">{gardenNFTs.length}</div>
            <div className="text-sm text-foreground/70">Toplam NFT</div>
          </div>
          <div className="bg-secondary-accent p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-success-accent">
              {gardenNFTs.filter(nft => (nftDetails[nft.tokenId]?.stage || 0) >= 4).length}
            </div>
            <div className="text-sm text-foreground/70">Olgun Bitkiler</div>
                </div>
          <div className="bg-secondary-accent p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary-accent">
              {gardenNFTs.filter(nft => {
                const stage = nftDetails[nft.tokenId]?.stage || 0;
                return stage > 0 && stage < 4;
              }).length}
            </div>
            <div className="text-sm text-foreground/70">Büyüyen Bitkiler</div>
          </div>
          <div className="bg-secondary-accent p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-tertiary-accent">
              {gardenNFTs.filter(nft => (nftDetails[nft.tokenId]?.stage || 0) === 0).length}
        </div>
            <div className="text-sm text-foreground/70">Tohumlar</div>
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
        <div className="text-center py-12 bg-secondary-accent rounded-xl shadow">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-2xl font-semibold text-foreground mb-3">Bahçe Boş</h3>
          <p className="text-foreground/70 mb-6 max-w-md mx-auto">
            {account.toLowerCase() === walletAddress.toLowerCase() 
              ? 'Henüz bahçenizde NFT bulunmuyor. NFT\'lerinizi "NFT\'lerim" sayfasından bahçenize transfer edebilirsiniz.'
              : 'Bu bahçede henüz NFT bulunmuyor.'
            }
          </p>
          {account.toLowerCase() === walletAddress.toLowerCase() && (
            <a 
              href="/my-nfts"
              className="bg-primary-accent text-background px-6 py-3 rounded-lg font-medium hover:brightness-90 transition-all"
            >
              💎 NFT'lerime Git
            </a>
                    )}
                </div>
              )}

      {/* Evolution Guide */}
      <div className="mt-12 bg-secondary-accent rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">🌱 Evrim Rehberi</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { stage: '🌰', name: 'Tohum', waterings: '0', description: 'Başlangıç' },
            { stage: '🌱', name: 'Filiz', waterings: '3', description: 'İlk büyüme' },
            { stage: '🌿', name: 'Fidan', waterings: '5', description: 'Genç bitki' },
            { stage: '🌸', name: 'Çiçek', waterings: '7', description: 'Çiçeklenme' },
            { stage: '🍎', name: 'Meyve', waterings: '10', description: 'Olgunluk' }
          ].map((stage, index) => (
            <div key={index} className="text-center p-4 bg-background/30 rounded-lg">
              <div className="text-3xl mb-2">{stage.stage}</div>
              <div className="font-semibold text-foreground">{stage.name}</div>
              <div className="text-sm text-foreground/70 mb-2">{stage.description}</div>
              <div className="text-xs text-primary-accent font-medium">
                {index === 0 ? 'Başla' : `${stage.waterings} sulama`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedNFT && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary-accent rounded-lg p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-foreground">NFT Detayları</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="bg-background/50 p-2 rounded-full hover:bg-background transition-colors"
              >
                ❌
              </button>
            </div>
            
            <div className="space-y-4">
              {/* NFT Image in Modal */}
              <div className="text-center p-4 bg-background/30 rounded-lg">
                <div className="w-32 h-32 mx-auto mb-4 relative rounded-lg overflow-hidden bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900">
                  {nftDetails[selectedNFT.tokenId]?.imageUrl ? (
                    <Image
                      src={nftDetails[selectedNFT.tokenId].imageUrl}
                      alt={nftDetails[selectedNFT.tokenId]?.metadata?.name || `NFT #${selectedNFT.tokenId}`}
                      fill
                      sizes="128px"
                      className="object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback Emoji */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ display: nftDetails[selectedNFT.tokenId]?.imageUrl ? 'none' : 'flex' }}
                  >
                    <div className="text-4xl">
                      {getStageInfo(nftDetails[selectedNFT.tokenId]?.stage || 0).name.split(' ')[0]}
                    </div>
                  </div>
                </div>
                <div className="font-semibold text-foreground">
                  {(() => {
                    const rawName = nftDetails[selectedNFT.tokenId]?.metadata?.name || selectedNFT.name || `NFT #${selectedNFT.tokenId}`;
                    // Stage kısmını çıkar
                    return rawName.includes(' - 🌰') || rawName.includes(' - 🌱') || rawName.includes(' - 🌿') || rawName.includes(' - 🌸') || rawName.includes(' - 🍎')
                      ? rawName.split(' - ')[0] 
                      : rawName;
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-background/30 rounded p-3">
                  <div className="text-foreground/70 mb-1">Token ID</div>
                  <div className="font-semibold text-foreground">#{selectedNFT.tokenId}</div>
                </div>
                <div className="bg-background/30 rounded p-3">
                  <div className="text-foreground/70 mb-1">Aşama</div>
                  <div className="font-semibold text-foreground">
                    {getStageInfo(nftDetails[selectedNFT.tokenId]?.stage || 0).name}
                  </div>
                </div>
                <div className="bg-background/30 rounded p-3">
                  <div className="text-foreground/70 mb-1">Toplam Sulama</div>
                  <div className="font-semibold text-foreground">
                    {nftDetails[selectedNFT.tokenId]?.wateringCount || 0}
                  </div>
                </div>
                <div className="bg-background/30 rounded p-3">
                  <div className="text-foreground/70 mb-1">Son Sulama</div>
                  <div className="font-semibold text-foreground text-xs">
                    {nftDetails[selectedNFT.tokenId]?.lastWatered 
                      ? new Date(nftDetails[selectedNFT.tokenId].lastWatered * 1000).toLocaleDateString('tr-TR')
                      : 'Hiç sulanmadı'
                    }
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-background/30 rounded p-3">
                <div className="text-foreground/70 mb-2">Evrim İlerlemesi</div>
                <div className="w-full bg-background/50 rounded-full h-3 mb-2">
                  <div 
                    className="bg-gradient-to-r from-grow-green to-primary-accent h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${getProgressPercentage(
                        nftDetails[selectedNFT.tokenId]?.stage || 0, 
                        nftDetails[selectedNFT.tokenId]?.wateringCount || 0,
                        nftDetails[selectedNFT.tokenId]?.evolutionThreshold || 0
                      )}%` 
                    }}
                  ></div>
                </div>
                <div className="text-sm text-foreground/70">
                  {(() => {
                    const needed = getNextEvolutionInfo(
                      nftDetails[selectedNFT.tokenId]?.stage || 0, 
                      nftDetails[selectedNFT.tokenId]?.wateringCount || 0,
                      nftDetails[selectedNFT.tokenId]?.evolutionThreshold || 0
                    );
                    return needed > 0 
                      ? `Sonraki aşama için ${needed} sulama daha gerekli`
                      : 'Evrim için hazır veya maksimum aşamada!';
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 