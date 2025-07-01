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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary-accent/20 to-tertiary-accent/10">
      {/* Hero Section - Ultra Modern */}
      <div className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary-accent/10 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-grow-green/10 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-tertiary-accent/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative container mx-auto px-4 py-16 max-w-7xl">
          {/* Modern Hero Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-accent/20 to-grow-green/20 backdrop-blur-sm rounded-3xl border border-white/30 dark:border-gray-700/30 mb-8 hover:scale-110 transition-transform duration-300">
              <span className="text-4xl animate-bounce">🌱</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-black mb-6">
              <span className="bg-gradient-to-r from-primary-accent via-grow-green to-tertiary-accent bg-clip-text text-transparent">
                NFT Garden
              </span>
              <br />
              <span className="text-4xl md:text-5xl text-foreground/80 font-bold">
                Marketplace
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-foreground/70 mb-8 max-w-3xl mx-auto leading-relaxed">
              ✨ Evrimleşen dijital varlıkları keşfedin, sahip olun ve büyütün. 
              <br className="hidden md:block" />
              Her NFT benzersiz bir hikaye anlatır.
            </p>

            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-black text-foreground">{listings.length}</div>
                <div className="text-sm text-foreground/60">Aktif NFT</div>
              </div>
              <div className="w-px h-12 bg-foreground/20"></div>
              <div className="text-center">
                <div className="text-3xl font-black text-foreground">🌱</div>
                <div className="text-sm text-foreground/60">Evolving</div>
              </div>
              <div className="w-px h-12 bg-foreground/20"></div>
              <div className="text-center">
                <div className="text-3xl font-black text-foreground">∞</div>
                <div className="text-sm text-foreground/60">Olasılık</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="#nft-section" className="group relative bg-gradient-to-r from-primary-accent to-grow-green text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/30 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-xl group-hover:scale-125 transition-transform duration-300">🛒</span>
                  <span>NFT'leri Keşfet</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-accent to-grow-green rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              </Link>
              
              <Link href="/mint" className="group px-8 py-4 bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl font-bold text-lg text-foreground hover:bg-white/20 dark:hover:bg-gray-800/30 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-2">
                  <span className="text-xl group-hover:scale-125 transition-transform duration-300">🌱</span>
                  <span>NFT Oluştur</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Ultra Modern Connection Status */}
      {!account && (
        <div className="relative bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-amber-500/10 backdrop-blur-xl rounded-3xl p-6 mb-8 border border-yellow-500/30 dark:border-yellow-400/30 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 right-4 w-20 h-20 bg-yellow-500/10 rounded-full filter blur-2xl animate-blob"></div>
            <div className="absolute bottom-2 left-4 w-16 h-16 bg-orange-500/10 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl animate-bounce">💡</span>
            </div>
            
            <h3 className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
              Cüzdan Bağlantısı Gerekli
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-6 max-w-md mx-auto">
              NFT satın almak, satmak ve marketplace özelliklerini kullanmak için MetaMask cüzdanınızı bağlayın
            </p>
            
          <button 
            onClick={connectWallet}
              className="group px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/30 backdrop-blur-sm"
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
      )}

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-8">
        {/* Left Sidebar - Ultra Modern Filters */}
        <div className="w-80 flex-shrink-0">
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-6 shadow-3xl border border-white/30 dark:border-gray-700/30 sticky top-4 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 right-4 w-20 h-20 bg-primary-accent/10 rounded-full filter blur-2xl animate-blob"></div>
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-grow-green/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-accent/20 to-grow-green/20 rounded-2xl flex items-center justify-center mr-3">
                  <span className="text-xl">🔍</span>
                </div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-primary-accent to-grow-green bg-clip-text text-transparent">
                  Smart Filters
                </h2>
              </div>
            
              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground/90 mb-3 flex items-center">
                  <span className="mr-2">🔍</span>
                  Akıllı Arama
                </label>
                <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="NFT adı, açıklama veya özellik..."
                    className="w-full px-4 py-3 bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-primary-accent/50 focus:border-primary-accent/50 transition-all duration-300 text-foreground placeholder-foreground/50"
            />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-accent/5 to-grow-green/5 rounded-2xl pointer-events-none"></div>
                </div>
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
                <label className="block text-sm font-medium text-foreground/90 mb-3 flex items-center">
                  <span className="mr-2">📊</span>
                  Akıllı Sıralama
                </label>
                <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-primary-accent/50 focus:border-primary-accent/50 transition-all duration-300 text-foreground appearance-none cursor-pointer"
                  >
                    <option value="newest">✨ En Yeni</option>
                    <option value="price-low">💰 Fiyat: Düşük → Yüksek</option>
                    <option value="price-high">💎 Fiyat: Yüksek → Düşük</option>
            </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-accent/5 to-grow-green/5 rounded-2xl pointer-events-none"></div>
          </div>
        </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground/90 mb-3 flex items-center">
                  <span className="mr-2">💰</span>
                  Fiyat Aralığı
              </label>
                <div className="bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20 dark:border-gray-600/20">
                  <div className="text-center mb-4">
                    <span className="text-lg font-bold bg-gradient-to-r from-primary-accent to-grow-green bg-clip-text text-transparent">
                      {priceRange[0].toFixed(3)} - {priceRange[1].toFixed(3)} ETH
                    </span>
                  </div>
                  
                  <div className="relative mb-6">
                    {/* Modern Range Slider */}
                    <div className="relative h-3 bg-white/20 dark:bg-gray-700/40 rounded-full shadow-inner">
                      <div 
                        className="absolute h-3 bg-gradient-to-r from-grow-green via-primary-accent to-tertiary-accent rounded-full shadow-lg"
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
                      className="absolute top-0 left-0 w-full h-3 bg-transparent appearance-none pointer-events-auto cursor-pointer range-slider"
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
                      className="absolute top-0 left-0 w-full h-3 bg-transparent appearance-none pointer-events-auto cursor-pointer range-slider"
                />
              </div>
              
                  {/* Quick Price Filters - Modern Pills */}
                  <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPriceRange([0, Math.min(0.05, maxPrice)])}
                      className="px-3 py-2 text-xs font-medium bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-600 dark:text-green-400 rounded-xl hover:from-green-500/30 hover:to-green-600/30 transition-all duration-300 border border-green-500/30 hover:border-green-500/50 backdrop-blur-sm hover:scale-105"
                >
                      💚 Düşük
                </button>
                <button
                  onClick={() => setPriceRange([0.05, Math.min(0.1, maxPrice)])}
                      className="px-3 py-2 text-xs font-medium bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl hover:from-yellow-500/30 hover:to-orange-500/30 transition-all duration-300 border border-yellow-500/30 hover:border-yellow-500/50 backdrop-blur-sm hover:scale-105"
                >
                      🧡 Orta
                </button>
                <button
                  onClick={() => setPriceRange([0.1, maxPrice])}
                      className="px-3 py-2 text-xs font-medium bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-600 dark:text-red-400 rounded-xl hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-300 border border-red-500/30 hover:border-red-500/50 backdrop-blur-sm hover:scale-105"
                >
                      ❤️ Yüksek
                </button>
                <button
                  onClick={() => setPriceRange([0, maxPrice])}
                      className="px-3 py-2 text-xs font-medium bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-600 dark:text-gray-400 rounded-xl hover:from-gray-500/30 hover:to-slate-500/30 transition-all duration-300 border border-gray-500/30 hover:border-gray-500/50 backdrop-blur-sm hover:scale-105"
                >
                      🌟 Tümü
                </button>
                  </div>
              </div>
            </div>

              {/* Action Buttons */}
              <div className="space-y-3">
              <button 
                onClick={loadListings}
                disabled={loading}
                  className="group w-full px-4 py-3 bg-gradient-to-r from-primary-accent to-grow-green text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none border border-white/30 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className={`text-lg transition-transform duration-300 ${loading ? 'animate-spin' : 'group-hover:scale-125'}`}>
                      {loading ? '🔄' : '⚡'}
                    </span>
                    <span>{loading ? 'Yükleniyor...' : 'Yenile'}</span>
                  </div>
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
                    className="group w-full px-4 py-3 bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl font-medium text-foreground hover:bg-white/30 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-105"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-lg group-hover:scale-125 transition-transform duration-300">🧹</span>
                      <span>Filtreleri Temizle</span>
            </div>
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

      {/* Ultra Modern Quick Links */}
      <div className="mt-16 mb-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4">
            <span className="bg-gradient-to-r from-primary-accent via-grow-green to-tertiary-accent bg-clip-text text-transparent">
              Quick Access
            </span>
          </h2>
          <p className="text-xl text-foreground/70">Hızlı erişim menünüzden istediğiniz sayfaya geçin</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/profiles" className="group relative overflow-hidden bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-6 shadow-3xl border border-white/30 dark:border-gray-700/30 transition-all duration-500 hover:scale-105 hover:shadow-4xl hover:bg-white/15 dark:hover:bg-gray-800/30">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-4 right-4 w-16 h-16 bg-purple-500/10 rounded-full filter blur-xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
            
            <div className="relative z-10">
                              <div className="text-5xl mb-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">🧑‍🌾</div>
              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-purple-400 transition-colors duration-300">Profilleri Keşfet</h3>
              <p className="text-foreground/70 group-hover:text-foreground/90 transition-colors duration-300">Topluluk üyelerini keşfedin ve bağlantı kurun</p>
            </div>
          </Link>

          <Link href="/my-nfts" className="group relative overflow-hidden bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-6 shadow-3xl border border-white/30 dark:border-gray-700/30 transition-all duration-500 hover:scale-105 hover:shadow-4xl hover:bg-white/15 dark:hover:bg-gray-800/30">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-4 right-4 w-16 h-16 bg-blue-500/10 rounded-full filter blur-xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="text-5xl mb-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">💎</div>
              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-blue-400 transition-colors duration-300">NFT Koleksiyonum</h3>
              <p className="text-foreground/70 group-hover:text-foreground/90 transition-colors duration-300">Sahip olduğunuz NFT'leri yönetin</p>
            </div>
        </Link>

          <Link href="/garden/your-address" className="group relative overflow-hidden bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-6 shadow-3xl border border-white/30 dark:border-gray-700/30 transition-all duration-500 hover:scale-105 hover:shadow-4xl hover:bg-white/15 dark:hover:bg-gray-800/30">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-lime-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-4 right-4 w-16 h-16 bg-green-500/10 rounded-full filter blur-xl group-hover:bg-green-500/20 transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="text-5xl mb-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">🌺</div>
              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-green-400 transition-colors duration-300">Dijital Bahçem</h3>
              <p className="text-foreground/70 group-hover:text-foreground/90 transition-colors duration-300">NFT'lerinizi sulayın ve geliştirin</p>
            </div>
        </Link>

          <Link href="/mint" className="group relative overflow-hidden bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-6 shadow-3xl border border-white/30 dark:border-gray-700/30 transition-all duration-500 hover:scale-105 hover:shadow-4xl hover:bg-white/15 dark:hover:bg-gray-800/30">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-4 right-4 w-16 h-16 bg-orange-500/10 rounded-full filter blur-xl group-hover:bg-orange-500/20 transition-all duration-500"></div>
            
            <div className="relative z-10">
              <div className="text-5xl mb-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">🌱</div>
              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-orange-400 transition-colors duration-300">NFT Oluştur</h3>
              <p className="text-foreground/70 group-hover:text-foreground/90 transition-colors duration-300">Yeni dijital varlıklar yaratın</p>
            </div>
        </Link>
        </div>
      </div>

      {/* Ultra Modern Purchase Modal */}
      {showPurchaseModal && selectedNFT && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-3xl rounded-3xl p-8 max-w-lg w-full shadow-4xl border border-white/30 dark:border-gray-700/30 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 right-4 w-32 h-32 bg-primary-accent/10 rounded-full filter blur-3xl animate-blob"></div>
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-grow-green/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-accent/20 to-grow-green/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🛒</span>
                </div>
                <h3 className="text-2xl font-black bg-gradient-to-r from-primary-accent to-grow-green bg-clip-text text-transparent mb-2">
                  Satın Alma Onayı
                </h3>
                <p className="text-foreground/70">NFT'yi satın almak istediğinizden emin misiniz?</p>
              </div>
              
              {/* NFT Details Card */}
              <div className="bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20 dark:border-gray-600/20">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground/60 mb-1">NFT Adı</p>
                    <p className="font-bold text-lg text-foreground">{selectedNFT?.name || 'İsimsiz NFT'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-foreground/60 mb-1">Fiyat</p>
                    <p className="font-black text-2xl bg-gradient-to-r from-primary-accent to-grow-green bg-clip-text text-transparent">
                {selectedNFT?.price ? `${selectedNFT.price} ETH` : 'Fiyat Belirlenmemiş'}
              </p>
                  </div>
              
                  <div>
                    <p className="text-sm font-medium text-foreground/60 mb-1">Satıcı</p>
                    <p className="font-mono text-sm text-foreground bg-white/20 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                {selectedNFT?.seller ? 
                  `${selectedNFT.seller.slice(0, 6)}...${selectedNFT.seller.slice(-4)}` : 
                  'Bilinmeyen Satıcı'
                }
              </p>
              </div>
            </div>

                {/* Debug Panel - Collapsible */}
                <details className="mt-4">
                  <summary className="text-xs text-foreground/50 cursor-pointer hover:text-foreground/70 transition-colors">
                    🔧 Debug Bilgileri
                  </summary>
                  <div className="mt-2 p-3 bg-white/10 dark:bg-gray-800/20 rounded-xl text-xs space-y-1">
                    <p><span className="font-medium">Listing ID:</span> {selectedNFT?.listingId || 'N/A'}</p>
                    <p><span className="font-medium">Token ID:</span> {selectedNFT?.tokenId || 'N/A'}</p>
                    <p><span className="font-medium">Contract:</span> {selectedNFT?.contractAddress || 'N/A'}</p>
                  </div>
                </details>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedNFT(null);
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
                onClick={handleConfirmPurchase}
                disabled={processing}
                  className="group flex-1 px-6 py-4 bg-gradient-to-r from-primary-accent to-grow-green text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100 border border-white/30 backdrop-blur-sm"
              >
                {processing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div>
                      <span>İşleniyor...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-lg group-hover:scale-125 transition-transform duration-300">✅</span>
                      <span>Satın Al</span>
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
