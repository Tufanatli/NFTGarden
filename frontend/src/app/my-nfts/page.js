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
  const handleSellFromCard = async (tokenId, price, nftData) => {
    console.log('🛍️ [SELL FROM CARD] Attempting to sell:', { tokenId, price, nftData });
    
    setProcessing(true);
    try {
      // NFT'nin contract adresini belirle
      const contractAddress = nftData?.contractAddress;
      console.log('🛍️ [SELL FROM CARD] Using contract address:', contractAddress);
      
      const result = await web3Service.sellNFT(tokenId, price, contractAddress);
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
      const result = await web3Service.sellNFT(selectedNFT.tokenId, sellPrice, selectedNFT.contractAddress);
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
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary-accent/20 to-tertiary-accent/10 flex items-center justify-center">
        <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-12 shadow-4xl border border-white/30 dark:border-gray-700/30 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-4 w-32 h-32 bg-primary-accent/10 rounded-full filter blur-3xl animate-blob"></div>
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-blue-500/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-2 border-primary-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
            
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-accent to-blue-500 bg-clip-text text-transparent mb-4">
              Koleksiyonunuz Yükleniyor...
            </h2>
            <p className="text-foreground/70">
              NFT'leriniz blockchain'den getiriliyor
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary-accent/20 to-tertiary-accent/10 flex items-center justify-center">
        <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-12 max-w-lg mx-4 shadow-4xl border border-white/30 dark:border-gray-700/30 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-4 w-32 h-32 bg-primary-accent/10 rounded-full filter blur-3xl animate-blob"></div>
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-blue-500/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🔐</span>
            </div>
            
            <h2 className="text-3xl font-black text-foreground mb-4">Cüzdan Bağlantısı Gerekli</h2>
            <p className="text-foreground/70 mb-8 text-lg">
              NFT koleksiyonunuzu görüntülemek için MetaMask cüzdanınızı bağlayın.
            </p>
            
            <button
              onClick={connectWallet}
              className="group px-8 py-4 bg-gradient-to-r from-primary-accent to-blue-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/30 backdrop-blur-sm"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl group-hover:scale-125 transition-transform duration-300">🔗</span>
                <span>MetaMask Bağla</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary-accent/20 to-tertiary-accent/10">
      {/* Ultra Modern Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-primary-accent/10 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative container mx-auto px-4 py-8 max-w-7xl">
          {/* Compact Hero Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-primary-accent/20 backdrop-blur-sm rounded-2xl border border-white/30 dark:border-gray-700/30 flex items-center justify-center">
                <span className="text-2xl">💎</span>
              </div>
              
              <div className="text-left">
                <h1 className="text-2xl md:text-3xl font-black">
                  <span className="bg-gradient-to-r from-blue-500 via-primary-accent to-purple-500 bg-clip-text text-transparent">
                    My NFT Collection
                  </span>
                </h1>
                <p className="text-sm text-foreground/70">
                  Koleksiyonunuzu yönetin ve keşfedin
                </p>
              </div>
            </div>

            {/* Compact Account Info */}
            <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-2xl p-4 border border-white/30 dark:border-gray-700/30 max-w-lg mx-auto overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1 right-2 w-12 h-12 bg-primary-accent/10 rounded-full filter blur-xl animate-blob"></div>
                <div className="absolute bottom-1 left-2 w-10 h-10 bg-blue-500/10 rounded-full filter blur-lg animate-blob animation-delay-2000"></div>
              </div>
              
                             <div className="relative z-10 flex items-center justify-center space-x-3">
                 <div className="w-8 h-8 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                   <span className="text-lg">🔗</span>
                 </div>
                 
                 <div className="text-left">
                   <p className="text-xs font-medium text-foreground/60">Bağlı Cüzdan</p>
                   <p className="font-mono text-foreground text-sm break-all">
                     {account}
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ultra Modern Tabs */}
      <div className="relative container mx-auto px-4 max-w-4xl mb-12">
        <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-2 border border-white/30 dark:border-gray-700/30 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1 right-2 w-16 h-16 bg-primary-accent/10 rounded-full filter blur-xl animate-blob"></div>
            <div className="absolute bottom-1 left-2 w-12 h-12 bg-blue-500/10 rounded-full filter blur-lg animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative z-10 flex space-x-2">
            <button
              onClick={() => setActiveTab('owned')}
              className={`group flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                activeTab === 'owned'
                  ? 'bg-gradient-to-r from-blue-500 to-primary-accent text-white shadow-2xl scale-105'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/20 dark:hover:bg-gray-800/30 hover:scale-102'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className={`text-2xl transition-transform duration-300 ${activeTab === 'owned' ? 'scale-125' : 'group-hover:scale-110'}`}>🏠</span>
                <span>Sahip Olduklarım</span>
                <span className={`px-2 py-1 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === 'owned' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-primary-accent/20 text-primary-accent'
                }`}>
                  {nfts.length}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('listed')}
              className={`group flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                activeTab === 'listed'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-2xl scale-105'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/20 dark:hover:bg-gray-800/30 hover:scale-102'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className={`text-2xl transition-transform duration-300 ${activeTab === 'listed' ? 'scale-125' : 'group-hover:scale-110'}`}>🛍️</span>
                <span>Satışta</span>
                <span className={`px-2 py-1 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === 'listed' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-purple-500/20 text-purple-500'
                }`}>
                  {listings.length}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Content Container */}
      <div className="relative container mx-auto px-4 max-w-7xl">
        {activeTab === 'owned' ? (
          <div>
            {nfts.length > 0 ? (
              <div className="relative bg-white/5 dark:bg-gray-900/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-gray-700/20 overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 right-4 w-32 h-32 bg-blue-500/5 rounded-full filter blur-2xl animate-blob"></div>
                  <div className="absolute bottom-4 left-4 w-24 h-24 bg-primary-accent/5 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
                </div>
                
                <div className="relative z-10">
                  {/* Collection Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-black bg-gradient-to-r from-blue-500 to-primary-accent bg-clip-text text-transparent mb-2">
                      Koleksiyonunuz
                    </h2>
                    <p className="text-foreground/70">
                      {nfts.length} NFT'niz var • Her biri benzersiz bir hikaye anlatır
                    </p>
                  </div>

                  {/* Enhanced NFT Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
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
                </div>
              </div>
            ) : (
              <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-12 text-center border border-white/30 dark:border-gray-700/30 overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 right-4 w-32 h-32 bg-primary-accent/10 rounded-full filter blur-3xl animate-blob"></div>
                  <div className="absolute bottom-4 left-4 w-24 h-24 bg-blue-500/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
                </div>
                
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">🌟</span>
                  </div>
                  
                  <h3 className="text-3xl font-black text-foreground mb-4">Henüz NFT'niz Yok</h3>
                  <p className="text-foreground/70 mb-8 max-w-md mx-auto text-lg">
                    Marketplace'ten NFT satın alın veya kendi NFT'nizi oluşturun.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a 
                      href="/"
                      className="group px-8 py-4 bg-gradient-to-r from-primary-accent to-blue-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/30 backdrop-blur-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl group-hover:scale-125 transition-transform duration-300">🛒</span>
                        <span>Marketplace'e Git</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </a>
                    
                    <a 
                      href="/mint" 
                      className="group px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/30 backdrop-blur-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl group-hover:scale-125 transition-transform duration-300">🌱</span>
                        <span>NFT Oluştur</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
              ) : (
          <div>
            {listings.length > 0 ? (
              <div className="relative bg-white/5 dark:bg-gray-900/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-gray-700/20 overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 right-4 w-32 h-32 bg-purple-500/5 rounded-full filter blur-2xl animate-blob"></div>
                  <div className="absolute bottom-4 left-4 w-24 h-24 bg-pink-500/5 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
                </div>
                
                <div className="relative z-10">
                  {/* Listed Collection Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-black bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                      Satışta Olanlar
                    </h2>
                    <p className="text-foreground/70">
                      {listings.length} NFT satışta • Marketplace'te görünüyor
                    </p>
                  </div>

                  {/* Enhanced Listed NFT Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
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
                </div>
              </div>
            ) : (
              <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-12 text-center border border-white/30 dark:border-gray-700/30 overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 right-4 w-32 h-32 bg-purple-500/10 rounded-full filter blur-3xl animate-blob"></div>
                  <div className="absolute bottom-4 left-4 w-24 h-24 bg-pink-500/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
                </div>
                
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">🍂</span>
                  </div>
                  
                  <h3 className="text-3xl font-black text-foreground mb-4">Satışta Hiçbir Varlığınız Yok</h3>
                  <p className="text-foreground/70 mb-8 max-w-md mx-auto text-lg">
                    Sahip olduğunuz NFT'lerden bazılarını satışa çıkarabilirsiniz.
                  </p>
                  
                  {nfts.length > 0 && (
                    <button 
                      onClick={() => setActiveTab('owned')} 
                      className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/30 backdrop-blur-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl group-hover:scale-125 transition-transform duration-300">🏠</span>
                        <span>Sahip Olduklarımı Göster</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ultra Modern Transfer Modal */}
      {showTransferModal && selectedNFT && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-3xl rounded-3xl p-8 max-w-lg w-full shadow-4xl border border-white/30 dark:border-gray-700/30 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 right-4 w-32 h-32 bg-blue-500/10 rounded-full filter blur-3xl animate-blob"></div>
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-green-500/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">{transferAddress.startsWith('garden-') ? '🌱' : '📨'}</span>
                </div>
                <h3 className="text-2xl font-black bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent mb-2">
                  {transferAddress.startsWith('garden-') ? 'Bahçeye Transfer' : 'NFT Transfer'}
                </h3>
                <p className="text-foreground/70">NFT'nizi transfer etmek istediğinizden emin misiniz?</p>
              </div>
              
              {/* NFT Details Card */}
              <div className="bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20 dark:border-gray-600/20">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground/60 mb-1">NFT Adı</p>
                    <p className="font-bold text-lg text-foreground">{selectedNFT.name || 'İsimsiz NFT'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-foreground/60 mb-1">Token ID</p>
                    <p className="font-mono text-sm text-foreground bg-white/20 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                      #{selectedNFT.tokenId}
                    </p>
                  </div>
                </div>
              </div>

              {!transferAddress.startsWith('garden-') && (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-foreground/90 mb-3 flex items-center">
                    <span className="mr-2">🎯</span>
                    Hedef Cüzdan Adresi
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferAddress}
                      onChange={(e) => setTransferAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-3 bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 text-foreground placeholder-foreground/50 font-mono"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5 rounded-2xl pointer-events-none"></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedNFT(null);
                    setTransferAddress('');
                  }}
                  disabled={processing}
                  className="group flex-1 px-6 py-4 bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl font-bold text-foreground hover:bg-white/30 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-lg group-hover:scale-125 transition-transform duration-300">❌</span>
                    <span>İptal</span>
                  </div>
                </button>
                
                <button
                  onClick={confirmTransfer}
                  disabled={processing || (!transferAddress.trim())}
                  className="group flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100 border border-white/30 backdrop-blur-sm"
                >
                  {processing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div>
                      <span>İşleniyor...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-lg group-hover:scale-125 transition-transform duration-300">
                        {transferAddress.startsWith('garden-') ? '🌱' : '📨'}
                      </span>
                      <span>{transferAddress.startsWith('garden-') ? 'Bahçeye Gönder' : 'Transfer Et'}</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ultra Modern Sell Modal */}
      {showSellModal && selectedNFT && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-3xl rounded-3xl p-8 max-w-lg w-full shadow-4xl border border-white/30 dark:border-gray-700/30 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 right-4 w-32 h-32 bg-purple-500/10 rounded-full filter blur-3xl animate-blob"></div>
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-pink-500/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🛍️</span>
                </div>
                <h3 className="text-2xl font-black bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                  NFT Satışa Çıkar
                </h3>
                <p className="text-foreground/70">NFT'nizi marketplace'te satmak istediğinizden emin misiniz?</p>
              </div>
              
              {/* NFT Details Card */}
              <div className="bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20 dark:border-gray-600/20">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground/60 mb-1">NFT Adı</p>
                    <p className="font-bold text-lg text-foreground">{selectedNFT.name || 'İsimsiz NFT'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-foreground/60 mb-1">Token ID</p>
                    <p className="font-mono text-sm text-foreground bg-white/20 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                      #{selectedNFT.tokenId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-foreground/90 mb-3 flex items-center">
                  <span className="mr-2">💰</span>
                  Satış Fiyatı (ETH)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="0.01"
                    className="w-full px-4 py-3 bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-foreground placeholder-foreground/50 font-mono text-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl pointer-events-none"></div>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-foreground/60 font-bold">
                    ETH
                  </div>
                </div>
                {sellPrice && parseFloat(sellPrice) > 0 && (
                  <p className="text-xs text-foreground/60 mt-2">
                    ≈ ${(parseFloat(sellPrice) * 2000).toFixed(2)} USD (tahmini)
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowSellModal(false);
                    setSelectedNFT(null);
                    setSellPrice('');
                  }}
                  disabled={processing}
                  className="group flex-1 px-6 py-4 bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl font-bold text-foreground hover:bg-white/30 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-lg group-hover:scale-125 transition-transform duration-300">❌</span>
                    <span>İptal</span>
                  </div>
                </button>
                
                <button
                  onClick={confirmSell}
                  disabled={processing || !sellPrice || parseFloat(sellPrice) <= 0}
                  className="group flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100 border border-white/30 backdrop-blur-sm"
                >
                  {processing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div>
                      <span>İşleniyor...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-lg group-hover:scale-125 transition-transform duration-300">🛍️</span>
                      <span>Satışa Çıkar</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 