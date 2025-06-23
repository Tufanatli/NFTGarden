'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

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

  const nftName = metadata?.name || nft?.name || 'İsimsiz Varlık';
  const nftDescription = metadata?.description || nft?.description || 'Açıklama bulunmuyor.';

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
      {/* Compact NFT Card */}
      <div 
        className="nft-card-compact group"
        onClick={handleCardClick}
      >
        {/* Image Section - Responsive */}
        <div className="aspect-square relative w-full">
          {imageLoading ? (
            <div className="w-full h-full bg-secondary-accent animate-pulse flex items-center justify-center">
              <span className="text-xs text-foreground">Yükleniyor...</span>
            </div>
          ) : (
            <Image
              src={imageUrl}
              alt={nftName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300 rounded-t-xl"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
              priority={false}
              onError={() => setImageUrl('/placeholder-nft-beige.svg')}
            />
          )}
          
                      {/* Overlay Badge */}
            <div className="absolute top-2 right-2">
              {isListed ? (
                <span className="bg-success-accent text-white text-xs px-2 py-1 rounded-full font-medium">
                  Satışta
                </span>
              ) : isOwned ? (
                <span className="bg-primary-accent text-white text-xs px-2 py-1 rounded-full font-medium">
                  Sahibim
                </span>
              ) : (
                <span className="bg-text-muted text-white text-xs px-2 py-1 rounded-full font-medium">
                  NFT
                </span>
          )}
            </div>
        </div>
        
        {/* Content Section - Daha kompakt */}
        <div className="p-3">
          <h3 className="font-semibold text-sm truncate mb-1 text-foreground" title={nftName}>
            {nftName}
          </h3>
          
          <div className="text-xs text-text-muted mb-2">
            #{nft?.tokenId || 'N/A'}
          </div>

          {/* Price & Actions */}
          <div className="flex items-center justify-between">
            {isListed && nft?.price && (
              <div className="flex-1">
                <span className="text-sm font-bold text-primary-accent">
                  {nft.price} ETH
                </span>
                 </div>
            )}

            <div className="flex gap-1">
              {/* Action Buttons - Sadece iconlar */}
                {isOwned && !isListed && onSell && (
                <button 
                  onClick={handleInitiateSell} 
                  disabled={loadingAction}
                  className="w-8 h-8 rounded-full text-xs transition-all flex items-center justify-center btn-sell hover:scale-105 shadow-sm"
                  title="Satışa Çıkar"
                >
                  🛍️
                    </button>
                )}

                {isListed && canBuy && onBuy && (
                <button 
                  onClick={executeBuy} 
                  disabled={loadingAction}
                  className="w-8 h-8 rounded-full text-xs transition-all flex items-center justify-center btn-success hover:scale-105 shadow-sm"
                  title="Satın Al"
                >
                  💰
                    </button>
                )}

                {isListed && isOwnerOfListedItem && onCancel && (
                <button 
                  onClick={executeCancelListing} 
                  disabled={loadingAction}
                  className="w-8 h-8 rounded-full text-xs transition-all flex items-center justify-center btn-danger hover:scale-105 shadow-sm"
                  title="Satışı İptal Et"
                >
                  ❌
                    </button>
                )}
            </div>
          </div>
        </div>
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