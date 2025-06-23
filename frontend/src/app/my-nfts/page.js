'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { web3Service } from '../../utils/web3';
import NFTCard from '../../components/NFTCard';
import { EVOLVING_NFT_CONTRACT_ADDRESS } from '../../utils/constants';

export default function MyNFTsPage() {
  const [nfts, setNfts] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('owned'); // 'owned' or 'listed'
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (account) {
      loadNFTs();
      loadListings();
    }
  }, [account]);

  const checkConnection = async () => {
    setLoading(true);
    const result = await web3Service.checkConnection();
    if (result.connected) {
      setAccount(result.account);
    }
    setLoading(false);
  };
  
  const loadNFTs = async () => {
    if (!account) return;
    
    const nftResult = await web3Service.getUserNFTs(account);
    if (nftResult.success) {
      // Filter for both regular NFTs and EvolvingNFTs
      setNfts(nftResult.nfts);
    }
  };

  const loadListings = async () => {
    if (!account) return;
    
    const listingResult = await web3Service.getUserListings(account);
    if (listingResult.success) {
      setListings(listingResult.listings);
    }
  };

  const connectWallet = async () => {
    const result = await web3Service.connectWallet();
    if (result.success) {
      setAccount(result.account);
    } else {
      alert('Cüzdan bağlanmadı: ' + result.error);
    }
  };

  const handleTransferToGarden = (nft) => {
    // Special transfer to garden (user's own garden address)
    setSelectedNFT(nft);
    setTransferAddress(`garden-${account}`); // Unique garden identifier
    setShowTransferModal(true);
  };

  const handleSell = (nft) => {
    setSelectedNFT(nft);
    setShowSellModal(true);
  };

  // NFTCard için uyumlu sell fonksiyonu
  const handleSellFromCard = async (tokenId, price) => {
    console.log('🛍️ [SELL FROM CARD] Attempting to sell:', { tokenId, price });
    
    setProcessing(true);
    try {
      const result = await web3Service.sellNFT(tokenId, price);
      console.log('🛍️ [SELL FROM CARD] Result:', result);
      
      if (result.success) {
        alert('🛍️ NFT başarıyla satışa çıkarıldı!');
        loadNFTs();
        loadListings();
      } else {
        console.error('🛍️ [SELL FROM CARD] Failed:', result.error);
        alert('❌ Satışa çıkarma başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('🛍️ [SELL FROM CARD] Error:', error);
      alert('❌ Satış hatası: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleTransfer = (nft) => {
    setSelectedNFT(nft);
    setTransferAddress('');
    setShowTransferModal(true);
  };

  const confirmTransfer = async () => {
    if (!selectedNFT || !transferAddress.trim()) return;

    setProcessing(true);
    try {
      let targetAddress = transferAddress;
      
      // If transferring to garden, use special garden service
      if (transferAddress.startsWith('garden-')) {
        // For now, just simulate garden transfer by storing in localStorage
        // In a real app, this would be handled by a garden contract
        const gardenNFTs = JSON.parse(localStorage.getItem(`garden_${account}`) || '[]');
        gardenNFTs.push({
          ...selectedNFT,
          inGarden: true,
          transferredAt: Date.now()
        });
        localStorage.setItem(`garden_${account}`, JSON.stringify(gardenNFTs));
        
        alert('🌱 NFT başarıyla bahçenize transfer edildi!');
        setShowTransferModal(false);
        setSelectedNFT(null);
        setTransferAddress('');
        loadNFTs(); // Refresh NFTs
        return;
      }

      // Regular transfer to another address
      const result = await web3Service.transferNFT(
        selectedNFT.contractAddress || EVOLVING_NFT_CONTRACT_ADDRESS,
        selectedNFT.tokenId,
        targetAddress
      );

      if (result.success) {
        alert('✅ NFT başarıyla transfer edildi!');
        setShowTransferModal(false);
        setSelectedNFT(null);
        setTransferAddress('');
        loadNFTs(); // Refresh NFTs
      } else {
        alert('❌ Transfer başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      alert('❌ Transfer hatası: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const confirmSell = async () => {
    if (!selectedNFT || !sellPrice || parseFloat(sellPrice) <= 0) {
      alert('Lütfen geçerli bir fiyat girin');
      return;
    }

    console.log('🛍️ [SELL DEBUG] Attempting to sell NFT:', {
      tokenId: selectedNFT.tokenId,
      contractAddress: selectedNFT.contractAddress,
      price: sellPrice,
      nftData: selectedNFT
    });

    setProcessing(true);
    try {
      const result = await web3Service.sellNFT(selectedNFT.tokenId, sellPrice);
      console.log('🛍️ [SELL DEBUG] SellNFT result:', result);
      
      if (result.success) {
        alert('🛍️ NFT başarıyla satışa çıkarıldı!');
        setShowSellModal(false);
        setSelectedNFT(null);
        setSellPrice('');
        loadNFTs();
        loadListings();
      } else {
        console.error('🛍️ [SELL DEBUG] Sell failed:', result.error);
        alert('❌ Satışa çıkarma başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('🛍️ [SELL DEBUG] Sell error:', error);
      alert('❌ Satış hatası: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async (listingId) => {
    try {
      const result = await web3Service.cancelListing(listingId);
      if (result.success) {
        alert('🚫 NFT satıştan kaldırıldı!');
        loadListings();
        loadNFTs();
      } else {
        alert('❌ İptal işlemi başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert('❌ İptal hatası: ' + error.message);
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
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Cüzdan Bağlantısı Gerekli</h2>
          <p className="text-foreground/70 mb-6">NFT'lerinizi görüntülemek için cüzdanınızı bağlayın.</p>
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
        <h1 className="text-4xl font-bold text-foreground mb-3">💎 NFT Koleksiyonum</h1>
        <p className="text-foreground/70 text-lg">Sahip olduğunuz ve sattığınız NFT'leri yönetin</p>
      </div>

      {/* Account Info */}
      <div className="bg-secondary-accent rounded-lg p-4 mb-6 text-center">
        <p className="text-sm text-foreground/70 mb-1">Bağlı Cüzdan:</p>
        <p className="font-mono text-foreground">{account}</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 bg-background/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('owned')}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                activeTab === 'owned'
              ? 'bg-primary-accent text-background shadow-md'
              : 'text-foreground/70 hover:text-foreground hover:bg-background/50'
            }`}
          >
          🏠 Sahip Olduklarım ({nfts.length})
          </button>
          <button
            onClick={() => setActiveTab('listed')}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                activeTab === 'listed'
              ? 'bg-primary-accent text-background shadow-md'
              : 'text-foreground/70 hover:text-foreground hover:bg-background/50'
            }`}
          >
          🛍️ Satışta ({listings.length})
          </button>
      </div>

      {/* Content */}
      {activeTab === 'owned' ? (
        <div>
          {nfts.length > 0 ? (
            <>
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-300 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🌱</div>
                  <p className="font-medium">Bahçeye Transfer Et</p>
                  <p className="text-xs opacity-75">NFT'leri bahçenizde sulayın</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-400 text-blue-700 dark:text-blue-300 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🛍️</div>
                  <p className="font-medium">Satışa Çıkar</p>
                  <p className="text-xs opacity-75">Marketplace'te sat</p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-400 text-purple-700 dark:text-purple-300 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">📨</div>
                  <p className="font-medium">Transfer Et</p>
                  <p className="text-xs opacity-75">Başka cüzdana gönder</p>
                </div>
              </div>

              {/* NFT Grid - Daha kompakt */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {nfts.map((nft) => (
              <NFTCard
                key={nft.tokenId}
                nft={nft}
                isOwned={true}
                currentAccount={account}
                    onSell={handleSellFromCard}
              />
            ))}
          </div>
            </>
        ) : (
          <div className="text-center py-12 bg-secondary-accent rounded-xl shadow">
              <div className="text-6xl mb-4">🌟</div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">Henüz NFT'niz Yok</h3>
              <p className="text-foreground/70 mb-6 max-w-md mx-auto">
                Marketplace'ten NFT satın alın veya kendi NFT'nizi oluşturun.
            </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/"
                  className="btn-primary hover:scale-105"
                >
                  🛒 Marketplace'e Git
                </a>
                <a 
              href="/mint" 
                  className="btn-success hover:scale-105"
            >
                  🌱 NFT Oluştur
                </a>
              </div>
            </div>
          )}
          </div>
      ) : (
        <div>
          {listings.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {listings.map((listing) => (
            <NFTCard
              key={listing.listingId}
              nft={listing}
              isListed={true}
              onCancel={handleCancel}
              onBuy={null}
              currentAccount={account}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-secondary-accent rounded-xl shadow">
          <div className="text-5xl mb-4">🍂</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Satışta Hiçbir Varlığınız Yok</h3>
              <p className="text-foreground/70 mb-6">Sahip olduğunuz NFT'lerden bazılarını satışa çıkarabilirsiniz.</p>
          {nfts.length > 0 && (
            <button 
              onClick={() => setActiveTab('owned')} 
                  className="btn-primary hover:scale-105"
            > 
              Sahip Olduklarımı Göster 
            </button> 
          )}
            </div>
          )}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedNFT && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary-accent rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">
              {transferAddress.startsWith('garden-') ? '🌱 Bahçeye Transfer' : '📨 NFT Transfer'}
            </h3>
            
            <div className="bg-background/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground/70 mb-1">NFT:</p>
              <p className="font-semibold text-foreground">{selectedNFT.name || 'İsimsiz NFT'}</p>
              <p className="text-sm text-foreground/70 mt-2">Token ID: {selectedNFT.tokenId}</p>
            </div>

            {!transferAddress.startsWith('garden-') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Hedef Cüzdan Adresi:</label>
                <input
                  type="text"
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedNFT(null);
                  setTransferAddress('');
                }}
                disabled={processing}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                ❌ İptal
              </button>
              <button
                onClick={confirmTransfer}
                disabled={processing || (!transferAddress.trim())}
                className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2"></div>
                    İşleniyor...
                  </>
                ) : (
                  transferAddress.startsWith('garden-') ? '🌱 Bahçeye Gönder' : '📨 Transfer Et'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && selectedNFT && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary-accent rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">🛍️ NFT Satışa Çıkar</h3>
            
            <div className="bg-background/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground/70 mb-1">NFT:</p>
              <p className="font-semibold text-foreground">{selectedNFT.name || 'İsimsiz NFT'}</p>
              <p className="text-sm text-foreground/70 mt-2">Token ID: {selectedNFT.tokenId}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Satış Fiyatı (ETH):</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0.01"
                className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSellModal(false);
                  setSelectedNFT(null);
                  setSellPrice('');
                }}
                disabled={processing}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                ❌ İptal
              </button>
              <button
                onClick={confirmSell}
                disabled={processing || !sellPrice || parseFloat(sellPrice) <= 0}
                className="flex-1 btn-sell disabled:opacity-50 flex items-center justify-center hover:scale-105"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2"></div>
                    İşleniyor...
                  </>
                ) : (
                  '🛍️ Satışa Çıkar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 