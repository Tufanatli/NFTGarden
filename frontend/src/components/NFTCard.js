'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { EVOLVING_NFT_CONTRACT_ADDRESS } from '../utils/constants';

export default function NFTCard({ 
  nft, 
  isOwned = false,    
  isListed = false,   
  onSell,             
  onBuy,              
  onCancel,           
  onBurn,             
  currentAccount      
}) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [showSellModal, setShowSellModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('/placeholder-nft-beige.svg');
  const [imageLoading, setImageLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    if (nft?.tokenURI) {
      loadMetadataAndImage(nft.tokenURI);
    } else if (nft?.metadata) {
      setMetadata(nft.metadata);
      loadImageFromDirectMetadata(nft.metadata);
    } else {
      setImageUrl('/placeholder-nft-beige.svg');
      setImageLoading(false);
    }
  }, [nft?.tokenURI, nft?.metadata]);

  const processIpfsUrl = (url) => {
    if (url && url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    return url;
  };

  const loadMetadataAndImage = async (tokenURI) => {
    setImageLoading(true);
    try {
      const metadataUrl = processIpfsUrl(tokenURI);
      if (!metadataUrl) {
        setImageUrl('/placeholder-nft-beige.svg');
        setImageLoading(false);
        return;
      }
      const response = await fetch(metadataUrl);
      if (!response.ok) throw new Error(`Metadata fetch error: ${response.statusText}`);
      const fetchedMetadata = await response.json();
      setMetadata(fetchedMetadata);
      
      if (fetchedMetadata?.image) {
        setImageUrl(processIpfsUrl(fetchedMetadata.image) || '/placeholder-nft-beige.svg');
      } else {
        setImageUrl('/placeholder-nft-beige.svg');
      }
    } catch (error) {
      console.error('NFTCard metadata/image yükleme hatası:', error, "URI:", tokenURI);
      setImageUrl('/placeholder-nft-beige.svg');
    } finally {
      setImageLoading(false);
    }
  };

  const loadImageFromDirectMetadata = (directMetadata) => {
    setImageLoading(true);
    if (directMetadata?.image) {
      setImageUrl(processIpfsUrl(directMetadata.image) || '/placeholder-nft-beige.svg');
    } else {
      setImageUrl('/placeholder-nft-beige.svg');
    }
    setImageLoading(false);
  };

  // NFT adından stage kısmını çıkar (örn: "Sarı Çiçek - 🌿 Fidan" -> "Sarı Çiçek")
  const rawName = metadata?.name || nft?.name || 'İsimsiz Varlık';
  const nftName = rawName.includes(' - 🌰') || rawName.includes(' - 🌱') || rawName.includes(' - 🌿') || rawName.includes(' - 🌸') || rawName.includes(' - 🍎')
    ? rawName.split(' - ')[0] 
    : rawName;
  const nftDescription = metadata?.description || nft?.description || 'Açıklama bulunmuyor.';

  // NFT türüne ve stage'e göre renk teması belirleme
  const getStageTheme = () => {
    // Normal NFT kontrolü (evolving NFT değilse)
    const isEvolvingNFT = nft?.contractAddress?.toLowerCase() === EVOLVING_NFT_CONTRACT_ADDRESS.toLowerCase() ||
                         rawName.includes('🌰') || rawName.includes('🌱') || rawName.includes('🌿') || 
                         rawName.includes('🌸') || rawName.includes('🍎') ||
                         (metadata?.attributes && metadata.attributes.some(attr => 
                           attr.trait_type === 'Stage Number' || attr.trait_type === 'Stage'
                         ));

    // Normal NFT için mavi tema
    if (!isEvolvingNFT) {
      return {
        name: 'normal',
        gradient: 'from-blue-400 to-blue-600',
        bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/20',
        accent: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-300 dark:border-blue-600',
        glow: 'from-blue-400/30 to-blue-600/30',
        emoji: '💎',
        stage: 'NFT'
      };
    }

    // Evolving NFT için stage-based tema
    let stage = 0;
    
    // NFT metadata'sından stage bilgisini al
    if (metadata?.attributes) {
      const stageAttr = metadata.attributes.find(attr => 
        attr.trait_type === 'Stage Number' || attr.trait_type === 'Stage'
      );
      if (stageAttr) {
        stage = parseInt(stageAttr.value) || 0;
      }
    }
    
    // İsimden stage çıkarmaya çalış
    if (stage === 0 && rawName) {
      if (rawName.includes('🌰') || rawName.includes('Tohum')) stage = 0;
      else if (rawName.includes('🌱') || rawName.includes('Filiz')) stage = 1;
      else if (rawName.includes('🌿') || rawName.includes('Fidan')) stage = 2;
      else if (rawName.includes('🌸') || rawName.includes('Çiçek')) stage = 3;
      else if (rawName.includes('🍎') || rawName.includes('Meyve')) stage = 4;
    }

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

  const theme = getStageTheme();

  // Action handlers
  const handleCardClick = (e) => {
    // Eğer tıklanan element buton ise modal açma
    if (e.target.closest('button')) return;
    setShowDetailModal(true);
  };

  const handleInitiateSell = (e) => {
    e.stopPropagation();
    if (!isOwned) return;
    setShowSellModal(true);
  };

  const executeSell = async () => {
    if (!sellPrice || parseFloat(sellPrice) <= 0) {
      alert('Lütfen geçerli bir satış fiyatı girin.');
      return;
    }
    setLoadingAction(true);
    try {
      await onSell(nft.tokenId, sellPrice);
      setShowSellModal(false);
      setSellPrice('');
    } catch (error) {
      console.error('NFTCard satışa çıkarma hatası:', error);
      alert('Satışa çıkarma sırasında bir hata oluştu.');
    }
    setLoadingAction(false);
  };

  const executeBuy = async (e) => {
    e.stopPropagation();
    setLoadingAction(true);
    try {
      await onBuy(nft.listingId, nft.price);
    } catch (error) {
      console.error('NFTCard satın alma hatası:', error);
      alert('Satın alma sırasında bir hata oluştu.');
    }
    setLoadingAction(false);
  };

  const executeCancelListing = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Bu listelemeyi iptal etmek istediğinizden emin misiniz?')) return;
    setLoadingAction(true);
    try {
      await onCancel(nft.listingId);
    } catch (error) {
      console.error('NFTCard satış iptal hatası:', error);
      alert('Satış iptali sırasında bir hata oluştu.');
    }
    setLoadingAction(false);
  };

  const isOwnerOfListedItem = currentAccount && nft?.seller && currentAccount.toLowerCase() === nft.seller.toLowerCase();
  const canBuy = !isOwnerOfListedItem && currentAccount;

  return (
    <>
      {/* Compact NFT Card - Stage-themed */}
      <div 
        className={`relative bg-gradient-to-br ${theme.bgGradient} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border ${theme.border} hover:border-opacity-80 overflow-hidden group`}
        onClick={handleCardClick}
      >
        {/* Decorative Background Elements */}
        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${theme.glow} rounded-full -translate-y-10 translate-x-10 opacity-50`}></div>
        <div className={`absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr ${theme.glow} rounded-full translate-y-8 -translate-x-8 opacity-30`}></div>
        
        {/* Stage Emoji Decorator */}
        <div className="absolute top-2 left-2 text-lg opacity-40 group-hover:opacity-60 transition-opacity">
          {theme.emoji}
        </div>

        {/* Image Section - Responsive */}
        <div className="aspect-square relative w-full">
          {imageLoading ? (
            <div className={`w-full h-full ${theme.bgGradient} animate-pulse flex items-center justify-center rounded-t-2xl`}>
              <span className="text-xs text-foreground">Yükleniyor...</span>
            </div>
          ) : (
            <Image
              src={imageUrl}
              alt={nftName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300 rounded-t-2xl"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
              priority={false}
              onError={() => setImageUrl('/placeholder-nft-beige.svg')}
            />
          )}
          
          {/* Overlay Badge */}
          <div className="absolute top-2 right-2">
            {isListed ? (
              <span className={`bg-gradient-to-r ${theme.gradient} text-white text-xs px-2 py-1 rounded-full font-medium shadow-md`}>
                Satışta
              </span>
            ) : isOwned ? (
              <span className={`bg-gradient-to-r ${theme.gradient} text-white text-xs px-2 py-1 rounded-full font-medium shadow-md`}>
                Sahibim
              </span>
            ) : (
              <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                NFT
              </span>
            )}
          </div>
        </div>
        
        {/* Content Section - Stage-themed */}
        <div className="p-4 relative z-10">
          <h3 className={`font-semibold text-sm truncate mb-1 ${theme.accent} group-hover:font-bold transition-all`} title={nftName}>
            {nftName}
          </h3>
          
          <div className="text-xs text-foreground/60 mb-3 flex items-center justify-between">
            <span>#{nft?.tokenId || 'N/A'}</span>
            <span className={`text-xs ${theme.accent} font-medium`}>
              {theme.stage === 'NFT' ? 'NFT' : `Stage ${theme.stage + 1}`}
            </span>
          </div>

          {/* Price & Actions */}
          <div className="flex items-center justify-between">
            {isListed && nft?.price && (
              <div className="flex-1">
                <span className={`text-sm font-bold ${theme.accent}`}>
                  {nft.price} ETH
                </span>
              </div>
            )}

            <div className="flex gap-1">
              {/* Action Buttons - Stage-themed */}
              {isOwned && !isListed && onSell && (
                <button 
                  onClick={handleInitiateSell} 
                  disabled={loadingAction}
                  className={`w-8 h-8 rounded-full text-xs transition-all flex items-center justify-center bg-gradient-to-r ${theme.gradient} text-white hover:scale-110 shadow-md`}
                  title="Satışa Çıkar"
                >
                  🛍️
                </button>
              )}

              {isListed && canBuy && onBuy && (
                <button 
                  onClick={executeBuy} 
                  disabled={loadingAction}
                  className={`w-8 h-8 rounded-full text-xs transition-all flex items-center justify-center bg-gradient-to-r ${theme.gradient} text-white hover:scale-110 shadow-md`}
                  title="Satın Al"
                >
                  💰
                </button>
              )}

              {isListed && isOwnerOfListedItem && onCancel && (
                <button 
                  onClick={executeCancelListing} 
                  disabled={loadingAction}
                  className="w-8 h-8 rounded-full text-xs transition-all flex items-center justify-center bg-gradient-to-r from-red-400 to-red-600 text-white hover:scale-110 shadow-md"
                  title="Satışı İptal Et"
                >
                  ❌
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hover Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.glow} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="bg-card-bg border border-border-color rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="relative p-6">
              {/* Close Button */}
                              <button
                  onClick={() => setShowDetailModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 bg-secondary-accent hover:bg-card-hover rounded-full flex items-center justify-center transition-colors"
                >
                  ✕
                </button>

              {/* Content */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Image */}
                <div className="aspect-square relative rounded-xl overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt={nftName}
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                </div>

                {/* Details */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-foreground">{nftName}</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div>
                      <span className="text-sm font-medium text-text-muted">Token ID:</span>
                      <p className="text-lg text-foreground">#{nft?.tokenId}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-text-muted">Açıklama:</span>
                      <p className="text-foreground">{nftDescription}</p>
                    </div>

                    {nft?.seller && (
                      <div>
                        <span className="text-sm font-medium text-text-muted">Satıcı:</span>
                        <p className="font-mono text-sm text-foreground">{nft.seller}</p>
                      </div>
                    )}

                    {isListed && nft?.price && (
                      <div>
                        <span className="text-sm font-medium text-text-muted">Fiyat:</span>
                        <p className="text-3xl font-bold text-primary-accent">{nft.price} ETH</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 flex-wrap">
                    {isOwned && !isListed && onSell && (
                      <button 
                        onClick={handleInitiateSell}
                        className="btn-sell flex-1 min-w-[120px] hover:scale-105"
                      >
                        🛍️ Satışa Çıkar
                      </button>
                    )}

                    {isListed && canBuy && onBuy && (
                      <button 
                        onClick={executeBuy}
                        disabled={loadingAction}
                        className="btn-success flex-1 min-w-[120px] hover:scale-105 disabled:opacity-50"
                      >
                        {loadingAction ? 'Alınıyor...' : '💰 Satın Al'}
                      </button>
                    )}

                    {isListed && isOwnerOfListedItem && onCancel && (
                        <button 
                          onClick={executeCancelListing}
                          disabled={loadingAction}
                          className="btn-danger flex-1 min-w-[120px] hover:scale-105 disabled:opacity-50"
                        >
                          {loadingAction ? 'İptal Ediliyor...' : '❌ Satışı İptal Et'}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="bg-card-bg border border-border-color p-6 rounded-xl shadow-2xl w-full max-w-md">
            <h4 className="text-xl font-semibold mb-4 text-foreground">🛍️ NFT'yi Satışa Çıkar</h4>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-foreground">Satış Fiyatı (ETH)</label>
              <input 
                type="number" 
                value={sellPrice} 
                onChange={(e) => setSellPrice(e.target.value)} 
                placeholder="0.1"
                step="0.01"
                min="0.0001"
                className="w-full px-3 py-2 border border-border-color rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-transparent bg-secondary-accent text-foreground"
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSellModal(false)} 
                disabled={loadingAction}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                İptal
              </button>
              <button 
                onClick={executeSell} 
                disabled={loadingAction || !sellPrice}
                className="flex-1 btn-sell disabled:opacity-50"
              >
                {loadingAction ? 'İşleniyor...' : 'Satışa Çıkar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 