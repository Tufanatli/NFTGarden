'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function NFTCard({ 
  nft, 
  isOwned = false,    // Bu NFT kullanıcıya mı ait?
  isListed = false,   // Bu NFT satışta mı?
  onSell,             // Satışa çıkarma fonksiyonu (tokenId, price)
  onBuy,              // Satın alma fonksiyonu (listingId, price)
  onCancel,           // Satıştan kaldırma fonksiyonu (listingId)
  onBurn,             // NFT yakma fonksiyonu (tokenId)
  currentAccount      // Mevcut bağlı kullanıcı cüzdanı
}) {
  const [loadingAction, setLoadingAction] = useState(false); // Buton aksiyonları için genel loading
  const [sellPrice, setSellPrice] = useState('');
  const [showSellModal, setShowSellModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('/placeholder-nft.jpg'); // Temaya uygun placeholder olabilir
  const [imageLoading, setImageLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    if (nft?.tokenURI) {
      loadMetadataAndImage(nft.tokenURI);
    } else if (nft?.metadata) { // Eğer metadata doğrudan geliyorsa (örn: listing objesinde)
      setMetadata(nft.metadata);
      loadImageFromDirectMetadata(nft.metadata);
    } else {
      setImageUrl('/placeholder-nft-beige.svg'); // Yeni placeholder
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

  // --- Eylemler için Handler Fonksiyonları ---
  const handleInitiateSell = () => {
    if (!isOwned) return; // Sadece sahip olunanlar satılabilir
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

  const executeBuy = async () => {
    setLoadingAction(true);
    try {
      await onBuy(nft.listingId, nft.price); // listingId ve price listing objesinden gelmeli
    } catch (error) {
      console.error('NFTCard satın alma hatası:', error);
      alert('Satın alma sırasında bir hata oluştu.');
    }
    setLoadingAction(false);
  };

  const executeCancelListing = async () => {
    if (!window.confirm('Bu listelemeyi iptal etmek istediğinizden emin misiniz?')) return;
    setLoadingAction(true);
    try {
      await onCancel(nft.listingId); // listingId listing objesinden gelmeli
    } catch (error) {
      console.error('NFTCard satış iptal hatası:', error);
      alert('Satış iptali sırasında bir hata oluştu.');
    }
    setLoadingAction(false);
  };

  const executeBurn = async () => {
    if (!window.confirm('DİKKAT: Bu varlığı kalıcı olarak yakmak (silmek) istediğinizden emin misiniz? Bu işlem geri alınamaz!')) return;
    if (!window.confirm('Son bir onay: Bu NFT\yi yakmak istediğinize gerçekten emin misiniz?')) return;
    setLoadingAction(true);
    try {
      await onBurn(nft.tokenId);
    } catch (error) {
      console.error('NFTCard yakma hatası:', error);
      alert('Yakma işlemi sırasında bir hata oluştu.');
    }
    setLoadingAction(false);
  };

  const isOwnerOfListedItem = currentAccount && nft?.seller && currentAccount.toLowerCase() === nft.seller.toLowerCase();
  const canBuy = !isOwnerOfListedItem && currentAccount;

  // --- Buton Stilleri ---
  const baseButtonClass = "flex-1 min-w-[120px] py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary-accent";
  const primaryButtonClass = `${baseButtonClass} bg-primary-accent text-background hover:brightness-95 focus:ring-primary-accent`;
  const dangerButtonClass = `${baseButtonClass} bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 focus:ring-red-500`;
  const neutralButtonClass = `${baseButtonClass} bg-primary-accent/30 text-primary-accent cursor-default`;

  return (
    <>
      <div className="bg-secondary-accent rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 flex flex-col h-full">
        <div className="aspect-square relative w-full">
          {imageLoading ? (
            <div className="w-full h-full bg-background/70 dark:bg-dark-bg/70 animate-pulse flex items-center justify-center">
              <span className="text-foreground opacity-60">Yükleniyor...</span>
            </div>
          ) : (
            <Image
              src={imageUrl}
              alt={nftName}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
              onError={() => setImageUrl('/placeholder-nft-beige.svg')} // Hata durumunda placeholder
            />
          )}
        </div>
        
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold text-foreground mb-1.5 truncate" title={nftName}>{nftName}</h3>
          {nftDescription && <p className="text-sm text-foreground/80 dark:text-foreground/70 mb-3 line-clamp-2">{nftDescription}</p>}
          
          <div className="text-xs text-foreground/60 dark:text-foreground/50 mb-1">
            Token ID: #{nft?.tokenId || 'N/A'}
          </div>
          {isListed && nft?.seller && (
            <div className="text-xs text-foreground/60 dark:text-foreground/50 mb-3 truncate" title={nft.seller}>
              Satıcı: {nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}
            </div>
          )}

          <div className="mt-auto space-y-2 pt-3">
            {isListed && nft?.price && (
                 <div className="text-right mb-2">
                    <span className="text-xl font-bold text-primary-accent">{nft.price} ETH</span>
                 </div>
            )}

            {/* Eylem Butonları */} 
            <div className="flex gap-2 flex-wrap items-center">
                {isOwned && !isListed && onSell && (
                    <button onClick={handleInitiateSell} disabled={loadingAction} className={primaryButtonClass}>
                        {loadingAction ? 'Bekle...' : 'Satışa Çıkar'}
                    </button>
                )}

                {isListed && canBuy && onBuy && (
                    <button onClick={executeBuy} disabled={loadingAction} className={primaryButtonClass}>
                        {loadingAction ? 'Alınıyor...' : 'Satın Al'}
                    </button>
                )}

                {isListed && isOwnerOfListedItem && onCancel && (
                     <button onClick={executeCancelListing} disabled={loadingAction} className={dangerButtonClass}> 
                        {loadingAction ? 'İptal Ediliyor...' : 'Satışı İptal Et'}
                    </button>
                )}
                
                {/* Sahip olunan ve satışta olmayan bir NFT için Yakma butonu */} 
                {isOwned && !isListed && onBurn && (
                    <button onClick={executeBurn} disabled={loadingAction} className={`${dangerButtonClass} opacity-80 hover:opacity-100`}>
                        {loadingAction ? 'Yakılıyor...' : 'Yak'}
                    </button>
                )}

                {isListed && isOwnerOfListedItem && !onCancel && (
                     <div className={`${neutralButtonClass} text-center w-full`}>Sizin Tarafınızdan Listelendi</div>
                )}
                 {!isListed && isOwned && !onSell && !onBurn && (
                    <div className={`${neutralButtonClass} text-center w-full`}>Bahçenizde</div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Satış Modalı */} 
      {showSellModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
          <div className="bg-secondary-accent p-6 rounded-lg shadow-xl w-full max-w-md space-y-4">
            <h4 className="text-xl font-semibold text-foreground">NFT'yi Satışa Çıkar</h4>
            <div>
              <label htmlFor="sellPrice" className="block text-sm font-medium text-foreground mb-1">Satış Fiyatı (ETH)</label>
              <input 
                type="number" 
                id="sellPrice" 
                value={sellPrice} 
                onChange={(e) => setSellPrice(e.target.value)} 
                placeholder="0.1"
                step="0.01"
                min="0.0001"
                className="w-full px-3 py-2 bg-background border border-primary-accent/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-accent placeholder:text-foreground/50"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowSellModal(false)} disabled={loadingAction} className={`${baseButtonClass} bg-background text-foreground hover:bg-background/80 focus:ring-primary-accent`}>
                İptal
              </button>
              <button onClick={executeSell} disabled={loadingAction || !sellPrice} className={primaryButtonClass}>
                {loadingAction ? 'İşleniyor...' : 'Satışa Çıkar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 