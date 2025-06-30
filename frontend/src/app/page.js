'use client';

import { useState, useEffect } from 'react';
import { web3Service } from '../utils/web3';
import NFTCard from '../components/NFTCard';
import Link from 'next/link';

export default function Home() {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [stageFilters, setStageFilters] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 1]);
  const [maxPrice, setMaxPrice] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadListings();
    checkConnection();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [listings, searchTerm, priceFilter, stageFilters, priceRange, sortBy]);

  useEffect(() => {
    if (listings.length > 0) {
      calculateMaxPrice();
    }
  }, [listings]);

  const calculateMaxPrice = () => {
    const prices = listings.map(listing => parseFloat(listing.price)).filter(price => !isNaN(price));
    if (prices.length > 0) {
      const max = Math.max(...prices);
      const buffer = max * 0.1; // 10% buffer üstüne
      const newMaxPrice = Math.ceil((max + buffer) * 100) / 100; // 2 decimal places
      setMaxPrice(newMaxPrice);
      
      // Eğer mevcut priceRange max'ı eski maxPrice ise, yeni maxPrice'a güncelle
      if (priceRange[1] === 1) {
        setPriceRange([priceRange[0], newMaxPrice]);
      }
    }
  };

  const checkConnection = async () => {
    const result = await web3Service.checkConnection();
    if (result.connected) {
      setAccount(result.account);
    }
  };

  const loadListings = async () => {
    setLoading(true);
    try {
      const result = await web3Service.getActiveListings();
      if (result.success) {
        console.log('📋 Loaded listings:', result.listings); // Debug için
        setListings(result.listings);
      } else {
        console.error('Listing yükleme hatası:', result.error);
      }
    } catch (error) {
      console.error('Listing yükleme hatası:', error);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...listings];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        listing.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Multi-stage filter
    if (stageFilters.length > 0) {
      filtered = filtered.filter(listing => {
        // Assume stage info is in NFT metadata or description
        const stage = listing.stage || 0; // Default to stage 0 if not specified
        return stageFilters.includes(stage);
      });
    }

    // Price range filter
    filtered = filtered.filter(listing => {
      const price = parseFloat(listing.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Legacy price filter (if needed)
    if (priceFilter !== 'all') {
      switch (priceFilter) {
        case 'low':
          filtered = filtered.filter(listing => parseFloat(listing.price) < 0.05);
          break;
        case 'medium':
          filtered = filtered.filter(listing => 
            parseFloat(listing.price) >= 0.05 && parseFloat(listing.price) < 0.1
          );
          break;
        case 'high':
          filtered = filtered.filter(listing => parseFloat(listing.price) >= 0.1);
          break;
      }
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price-high':
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => parseInt(b.listingId) - parseInt(a.listingId));
        break;
    }

    setFilteredListings(filtered);
  };

  const handleBuyClick = (listingId, price) => {
    console.log('🛒 Buy click params:', { listingId, price }); // Debug için
    
    // Find the full listing object from listings array
    const fullListing = listings.find(listing => listing.listingId === listingId);
    console.log('📋 Found full listing:', fullListing); // Debug için
    
    if (fullListing) {
      setSelectedNFT(fullListing);
      setShowPurchaseModal(true);
    } else {
      alert('❌ Listing bulunamadı!');
      }
  };

  const handleConfirmPurchase = async () => {
    if (!selectedNFT || !account) return;
    
    console.log('💳 Confirming purchase for:', selectedNFT); // Debug için
    
    setProcessing(true);
    try {
      const result = await web3Service.buyNFT(selectedNFT.listingId, selectedNFT.price);
      if (result.success) {
        alert('🎉 NFT başarıyla satın alındı!');
        setShowPurchaseModal(false);
        setSelectedNFT(null);
        loadListings(); // Refresh listings
      } else {
        alert('❌ Satın alma başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Satın alma hatası:', error);
      alert('❌ Bir hata oluştu: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleStageToggle = (stageNumber) => {
    setStageFilters(prev => {
      if (prev.includes(stageNumber)) {
        return prev.filter(stage => stage !== stageNumber);
      } else {
        return [...prev, stageNumber];
      }
    });
  };

  const connectWallet = async () => {
    const result = await web3Service.connectWallet();
    if (result.success) {
      setAccount(result.account);
    } else {
      alert('Cüzdan bağlanmadı: ' + result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary-accent/30">
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-3">🌱 NFT Garden Marketplace</h1>
        <p className="text-foreground/70 text-lg">Evrimleşen NFT'leri keşfedin ve satın alın</p>
      </div>

      {/* Connection Status */}
      {!account && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 text-yellow-700 dark:text-yellow-300 p-4 rounded-lg mb-6 text-center">
          <p className="mb-3">💡 NFT satın almak için cüzdanınızı bağlayın</p>
          <button 
            onClick={connectWallet}
                              className="btn-primary hover:scale-105"
          >
            🔗 Cüzdan Bağla
          </button>
        </div>
      )}

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-8">
        {/* Left Sidebar - Filters */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-secondary-accent rounded-lg p-6 shadow-lg sticky top-4">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center">
              🔍 Filtreler
            </h2>
            
            {/* Search */}
            <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">🔍 Arama</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="NFT adı veya açıklama..."
              className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md focus:ring-2 focus:ring-primary-accent focus:border-transparent"
            />
          </div>
          
            {/* Stage Filters */}
            <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3">🌱 Evrim Aşamaları</label>
              <div className="space-y-3">
              {[
                { value: 0, label: '🌰 Tohum', color: 'bg-yellow-500' },
                { value: 1, label: '🌱 Filiz', color: 'bg-green-400' },
                { value: 2, label: '🌿 Fidan', color: 'bg-green-500' },
                { value: 3, label: '🌸 Çiçek', color: 'bg-pink-500' },
                { value: 4, label: '🍎 Meyve', color: 'bg-red-500' }
              ].map(stage => (
                <label key={stage.value} className="flex items-center cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={stageFilters.includes(stage.value)}
                      onChange={() => handleStageToggle(stage.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 border-primary-accent/50 flex items-center justify-center transition-colors ${
                      stageFilters.includes(stage.value) 
                        ? 'bg-primary-accent border-primary-accent' 
                        : 'bg-background group-hover:border-primary-accent'
                    }`}>
                      {stageFilters.includes(stage.value) && (
                        <svg className="w-3 h-3 text-background" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-sm text-foreground group-hover:text-primary-accent transition-colors">
                    {stage.label}
                  </span>
                  <div className={`ml-auto w-3 h-3 rounded-full ${stage.color}`}></div>
                </label>
              ))}
            </div>
          </div>

            {/* Sort */}
            <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">📊 Sıralama</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md focus:ring-2 focus:ring-primary-accent focus:border-transparent"
            >
              <option value="newest">En Yeni</option>
              <option value="price-low">Fiyat: Düşük → Yüksek</option>
              <option value="price-high">Fiyat: Yüksek → Düşük</option>
            </select>
        </div>

            {/* Price Range */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                💰 Fiyat Aralığı: {priceRange[0].toFixed(3)} - {priceRange[1].toFixed(3)} ETH
              </label>
              <div className="relative mb-4">
                {/* Custom Range Slider */}
                <div className="relative h-2 bg-background rounded-full">
                  <div 
                    className="absolute h-2 bg-gradient-to-r from-grow-green to-primary-accent rounded-full"
                    style={{
                      left: `${(priceRange[0] / maxPrice) * 100}%`,
                      width: `${((priceRange[1] - priceRange[0]) / maxPrice) * 100}%`
                    }}
                  ></div>
                </div>
                
                {/* Min Range Input */}
                <input
                  type="range"
                  min="0"
                  max={maxPrice}
                  step="0.001"
                  value={priceRange[0]}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value < priceRange[1]) {
                      setPriceRange([value, priceRange[1]]);
                    }
                  }}
                  className="absolute top-0 left-0 w-full h-2 bg-transparent appearance-none pointer-events-auto cursor-pointer range-slider"
                />
                
                {/* Max Range Input */}
                <input
                  type="range"
                  min="0"
                  max={maxPrice}
                  step="0.001"
                  value={priceRange[1]}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value > priceRange[0]) {
                      setPriceRange([priceRange[0], value]);
                    }
                  }}
                  className="absolute top-0 left-0 w-full h-2 bg-transparent appearance-none pointer-events-auto cursor-pointer range-slider"
                />
              </div>
              
              {/* Quick Price Filters */}
              <div className="space-y-2">
                <button
                  onClick={() => setPriceRange([0, Math.min(0.05, maxPrice)])}
                  className="w-full px-3 py-2 text-sm bg-green-500/20 text-green-700 dark:text-green-300 rounded-md hover:bg-green-500/30 transition-colors"
                >
                  Düşük (&lt; 0.05 ETH)
                </button>
                <button
                  onClick={() => setPriceRange([0.05, Math.min(0.1, maxPrice)])}
                  className="w-full px-3 py-2 text-sm bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-md hover:bg-yellow-500/30 transition-colors"
                >
                  Orta (0.05-0.1 ETH)
                </button>
                <button
                  onClick={() => setPriceRange([0.1, maxPrice])}
                  className="w-full px-3 py-2 text-sm bg-red-500/20 text-red-700 dark:text-red-300 rounded-md hover:bg-red-500/30 transition-colors"
                >
                  Yüksek (&gt; 0.1 ETH)
                </button>
                <button
                  onClick={() => setPriceRange([0, maxPrice])}
                  className="w-full px-3 py-2 text-sm bg-gray-500/20 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-500/30 transition-colors"
                >
                  Tüm Fiyatlar
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={loadListings}
                disabled={loading}
                                  className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? '🔄' : '🔄'} Yenile
              </button>
              
              {/* Clear Filters */}
              {(searchTerm || stageFilters.length > 0 || (priceRange[0] > 0 || priceRange[1] < maxPrice)) && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStageFilters([]);
                    setPriceRange([0, maxPrice]);
                    setSortBy('newest');
                  }}
                  className="w-full px-4 py-2 bg-gray-500/20 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-500/30 transition-colors"
                >
                  🔄 Filtreleri Temizle
                </button>
              )}
        </div>

        {/* Stats */}
            <div className="mt-6 pt-4 border-t border-primary-accent/20">
              <p className="text-sm text-foreground/70 text-center">
              📊 <strong>{filteredListings.length}</strong> NFT gösteriliyor 
                <br />
                <span className="text-xs">({listings.length} toplam)</span>
            </p>
            
            {/* Active Filters Indicator */}
            {(searchTerm || stageFilters.length > 0 || (priceRange[0] > 0 || priceRange[1] < maxPrice)) && (
                <div className="mt-3 space-y-1">
                {searchTerm && (
                    <span className="block w-full px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded text-xs text-center">
                      🔍 Arama: "{searchTerm}"
                  </span>
                )}
                {stageFilters.length > 0 && (
                    <span className="block w-full px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-300 rounded text-xs text-center">
                      🌱 {stageFilters.length} Aşama Seçili
                  </span>
                )}
                {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                    <span className="block w-full px-2 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded text-xs text-center">
                      💰 Fiyat Filtresi Aktif
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

                 {/* Right Content Area */}
         <div className="flex-1 min-w-0">
      {/* NFT Grid */}
        {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-accent border-r-transparent mb-4"></div>
          <p className="text-foreground/70">NFT'ler yükleniyor...</p>
                </div>
      ) : filteredListings.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredListings.map((listing) => (
              <NFTCard
              key={listing.listingId}
              nft={listing}
                isListed={true}
              onBuy={handleBuyClick}
                currentAccount={account}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary-accent rounded-xl shadow">
          <div className="text-6xl mb-4">🌿</div>
          <h3 className="text-2xl font-semibold text-foreground mb-3">
            {searchTerm || priceFilter !== 'all' || stageFilters.length > 0 || (priceRange[0] > 0 || priceRange[1] < maxPrice) ? 'Arama Kriterlerinize Uygun NFT Bulunamadı' : 'Henüz Satışta NFT Yok'}
            </h3>
          <p className="text-foreground/70 mb-6 max-w-md mx-auto">
            {searchTerm || priceFilter !== 'all' || stageFilters.length > 0 || (priceRange[0] > 0 || priceRange[1] < maxPrice)
              ? 'Farklı arama terimleri deneyin veya filtreleri temizleyin.'
              : 'Admin tarafından yeni NFT\'ler eklendiğinde burada görünecek.'
            }
          </p>
          {(searchTerm || priceFilter !== 'all' || stageFilters.length > 0 || (priceRange[0] > 0 || priceRange[1] < maxPrice)) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setPriceFilter('all');
                setStageFilters([]);
                setPriceRange([0, maxPrice]);
                setSortBy('newest');
              }}
              className="btn-primary hover:scale-105"
            >
              🔄 Filtreleri Temizle
            </button>
          )}
          </div>
        )}
         </div>
       </div>

      {/* Quick Links */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/profiles" className="group bg-secondary-accent p-6 rounded-lg shadow hover:shadow-lg transition-all">
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👥</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Profilleri Keşfet</h3>
          <p className="text-foreground/70">Topluluk üyelerini keşfedin</p>
        </Link>

        <Link href="/my-nfts" className="group bg-secondary-accent p-6 rounded-lg shadow hover:shadow-lg transition-all">
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">💎</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">NFT'lerim</h3>
          <p className="text-foreground/70">Sahip olduğunuz NFT'leri görüntüleyin</p>
        </Link>

        <Link href="/garden/your-address" className="group bg-secondary-accent p-6 rounded-lg shadow hover:shadow-lg transition-all">
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🌺</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Bahçem</h3>
          <p className="text-foreground/70">NFT'lerinizi sulayın ve geliştirin</p>
        </Link>

        <Link href="/mint" className="group bg-secondary-accent p-6 rounded-lg shadow hover:shadow-lg transition-all">
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🌱</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Mint</h3>
          <p className="text-foreground/70">Yeni NFT oluşturun</p>
        </Link>
      </div>

      {/* Purchase Confirmation Modal */}
      {showPurchaseModal && selectedNFT && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary-accent rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4">🛒 Satın Alma Onayı</h3>
            
            <div className="bg-background/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground/70 mb-1">NFT Adı:</p>
              <p className="font-semibold text-foreground">{selectedNFT?.name || 'İsimsiz NFT'}</p>
              
              <p className="text-sm text-foreground/70 mb-1 mt-3">Fiyat:</p>
              <p className="font-bold text-xl text-primary-accent">
                {selectedNFT?.price ? `${selectedNFT.price} ETH` : 'Fiyat Belirlenmemiş'}
              </p>
              
              <p className="text-sm text-foreground/70 mb-1 mt-3">Satıcı:</p>
              <p className="font-mono text-sm text-foreground">
                {selectedNFT?.seller ? 
                  `${selectedNFT.seller.slice(0, 6)}...${selectedNFT.seller.slice(-4)}` : 
                  'Bilinmeyen Satıcı'
                }
              </p>
              
              {/* Debug bilgileri */}
              <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                <p><strong>Debug:</strong></p>
                <p>Listing ID: {selectedNFT?.listingId || 'N/A'}</p>
                <p>Token ID: {selectedNFT?.tokenId || 'N/A'}</p>
                <p>Contract: {selectedNFT?.contractAddress || 'N/A'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedNFT(null);
                }}
                disabled={processing}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                ❌ İptal
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={processing}
                                  className="flex-1 btn-success disabled:opacity-50 flex items-center justify-center hover:scale-105"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2"></div>
                    İşleniyor...
                  </>
                ) : (
                  '✅ Satın Al'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
