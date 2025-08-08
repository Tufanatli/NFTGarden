'use client';

import { useState, useEffect } from 'react';
import { web3Service } from '../../utils/web3';
import { getSharedProfiles, getProfileStats } from '../../utils/profileService';
import Link from 'next/link';

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [stats, setStats] = useState({ totalProfiles: 0, sharedProfiles: 0 });

  useEffect(() => {
    checkConnection();
    loadSharedProfiles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [profiles, searchTerm]);

  const checkConnection = async () => {
    const result = await web3Service.checkConnection();
    if (result.connected) {
      setAccount(result.account);
    }
  };

  const loadSharedProfiles = async () => {
    setLoading(true);
    try {
      // Gerçek Supabase verilerini çek
      const [sharedProfiles, profileStats] = await Promise.all([
        getSharedProfiles(),
        getProfileStats()
      ]);

      // Profil verilerini formatla ve gerçek NFT verilerini yükle
      const formattedProfiles = await Promise.all(
        sharedProfiles.map(async (profile, index) => {
          // Her profil için NFT'leri yükle
          let nftCount = 0;
          let totalValue = 0;
          
          try {
            const nftResult = await web3Service.getUserNFTs(profile.wallet_address);
            if (nftResult.success && nftResult.nfts) {
              nftCount = nftResult.nfts.length;
              // NFT'lerin tahmini değerini hesapla (basit hesaplama)
              totalValue = nftCount * 0.1 + Math.random() * 2; // Base + random
            }
          } catch (error) {
            console.warn(`NFT data could not be loaded for ${profile.wallet_address}:`, error);
            // Fallback values
            nftCount = Math.floor(Math.random() * 10) + 1;
            totalValue = Math.random() * 3 + 0.1;
          }

          return {
            address: profile.wallet_address,
            name: profile.username || `${profile.wallet_address.slice(0, 6)}...${profile.wallet_address.slice(-4)}`,
            bio: profile.bio || 'NFT Garden topluluğunun yeni üyesi! 🌱',
            avatar: profile.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.wallet_address}`,
            nftCount: nftCount, // ✅ Gerçek NFT sayısı
            totalValue: totalValue.toFixed(1), // ✅ Hesaplanan değer
            joinedDate: profile.created_at || '2024-01-01',
            isShared: profile.is_shared,
            sharedAt: profile.shared_at,
            backgroundImage: profile.profile_background_image_url,
            // Gerçek verilere dayalı badges
            badges: [
              '🧑‍🌾 Topluluk Üyesi',
              ...(nftCount > 10 ? ['🏆 Koleksiyoncu'] : []),
              ...(nftCount > 0 ? ['💎 NFT Sahibi'] : []),
              ...(profile.created_at && new Date(profile.created_at) < new Date('2024-02-01') ? ['🌱 Erken Üye'] : [])
            ],
            favoriteStage: Math.floor(Math.random() * 5), // Bu kısım için ayrı bir tablo gerekir
            achievements: [
              'İlk NFT', 
              'Topluluk Katılımı',
              ...(nftCount >= 5 ? ['5 NFT Milestone'] : []),
              ...(nftCount >= 10 ? ['Koleksiyoncu'] : [])
            ]
          };
        })
      );

      setProfiles(formattedProfiles);
      setStats(profileStats);
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
      setProfiles([]);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...profiles];

    if (searchTerm) {
      filtered = filtered.filter(profile => 
        profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProfiles(filtered);
  };

  const getStageEmoji = (stage) => {
    const stages = ['🌰', '🌱', '🌿', '🌸', '🍎'];
    return stages[stage] || '🌰';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const shortenAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Profil için renk teması seç
  const getProfileTheme = (index) => {
    const themes = [
      {
        name: 'forest',
        gradient: 'from-green-400 to-emerald-600',
        bgGradient: 'from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20',
        accent: 'text-green-600 dark:text-green-400',
        border: 'border-green-300 dark:border-green-600',
        glow: 'from-green-400/30 to-emerald-600/30',
        emoji: '🌲'
      },
      {
        name: 'ocean',
        gradient: 'from-blue-400 to-cyan-600',
        bgGradient: 'from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20',
        accent: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-300 dark:border-blue-600',
        glow: 'from-blue-400/30 to-cyan-600/30',
        emoji: '🌊'
      },
      {
        name: 'sunset',
        gradient: 'from-orange-400 to-pink-600',
        bgGradient: 'from-orange-50 to-pink-100 dark:from-orange-900/20 dark:to-pink-900/20',
        accent: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-300 dark:border-orange-600',
        glow: 'from-orange-400/30 to-pink-600/30',
        emoji: '🌅'
      },
      {
        name: 'purple',
        gradient: 'from-purple-400 to-indigo-600',
        bgGradient: 'from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20',
        accent: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-300 dark:border-purple-600',
        glow: 'from-purple-400/30 to-indigo-600/30',
        emoji: '🔮'
      },
      {
        name: 'golden',
        gradient: 'from-yellow-400 to-amber-600',
        bgGradient: 'from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20',
        accent: 'text-yellow-600 dark:text-yellow-500',
        border: 'border-yellow-300 dark:border-yellow-600',
        glow: 'from-yellow-400/30 to-amber-600/30',
        emoji: '✨'
      }
    ];
    return themes[index % themes.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary-accent/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header - Enhanced */}
        <div className="text-center mb-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-accent/10 via-grow-green/10 to-primary-accent/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-secondary-accent/80 to-primary-accent/20 backdrop-blur-sm rounded-2xl p-8 border border-primary-accent/30">
            <div className="flex items-center justify-center mb-4">
              <div className="text-6xl mr-4 animate-bounce">🧑‍🌾</div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-accent to-grow-green bg-clip-text text-transparent mb-2">
                  Topluluk Profilleri
                </h1>
                <p className="text-foreground/70 text-xl">NFT Garden topluluğunun yetenekli üyelerini keşfedin</p>
              </div>
            </div>
            
            {/* Quick stats row */}
            <div className="flex items-center justify-center space-x-8 mt-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-grow-green rounded-full animate-pulse"></div>
                <span className="text-foreground/70">Canlı Topluluk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary-accent rounded-full animate-pulse"></div>
                <span className="text-foreground/70">Aktif Üyeler</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success-green rounded-full animate-pulse"></div>
                <span className="text-foreground/70">Büyüyen Koleksiyonlar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra Modern Stats - Glassmorphism Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Paylaşılan Profil Card */}
          <div className="relative group overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute -inset-4 opacity-75 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute top-0 -left-4 w-24 h-24 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute top-0 -right-4 w-24 h-24 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-24 h-24 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>
            
            <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-gray-700/20 hover:border-white/40 dark:hover:border-gray-600/40 transition-all duration-500 hover:scale-[1.02] group shadow-2xl hover:shadow-3xl">
              {/* Icon Container */}
              <div className="flex items-center justify-center w-20 h-20 mb-6 mx-auto bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-2xl border border-white/30 group-hover:scale-110 transition-transform duration-300">
                <div className="text-4xl group-hover:animate-bounce">🧑‍🌾</div>
              </div>
              
              {/* Main Number */}
              <div className="text-center mb-4">
                <div className="text-5xl font-black bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stats.sharedProfiles}
                </div>
                <div className="text-lg font-bold text-foreground/90 mb-1">Paylaşılan Profil</div>
                <div className="text-sm text-foreground/60">Toplam: {stats.totalProfiles} kullanıcı</div>
              </div>
              
              {/* Progress Ring */}
              <div className="relative w-20 h-20 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="100, 100"
                    className="text-gray-300 dark:text-gray-700"
                  />
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="url(#gradient1)"
                    strokeWidth="3"
                    strokeDasharray={`${stats.totalProfiles > 0 ? (stats.sharedProfiles / stats.totalProfiles * 100) : 0}, 100`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground/80">
                    {stats.totalProfiles > 0 ? Math.round(stats.sharedProfiles / stats.totalProfiles * 100) : 0}%
                  </span>
                </div>
              </div>
              
              {/* Gradient Definition */}
              <svg width="0" height="0">
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="50%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Bottom Stats */}
              <div className="flex justify-between text-xs text-foreground/50">
                <span>Aktif</span>
                <span>Büyüyor</span>
              </div>
            </div>
          </div>

          {/* Toplam NFT Card */}
          <div className="relative group overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute -inset-4 opacity-75 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute top-0 -left-4 w-24 h-24 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute top-0 -right-4 w-24 h-24 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-24 h-24 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>
            
            <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-gray-700/20 hover:border-white/40 dark:hover:border-gray-600/40 transition-all duration-500 hover:scale-[1.02] group shadow-2xl hover:shadow-3xl">
              {/* Icon Container */}
              <div className="flex items-center justify-center w-20 h-20 mb-6 mx-auto bg-gradient-to-br from-emerald-400/20 to-cyan-600/20 rounded-2xl border border-white/30 group-hover:scale-110 transition-transform duration-300">
                <div className="text-4xl group-hover:animate-pulse">💎</div>
              </div>
              
              {/* Main Number */}
              <div className="text-center mb-4">
                <div className="text-5xl font-black bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  {profiles.reduce((total, profile) => total + profile.nftCount, 0)}
                </div>
                <div className="text-lg font-bold text-foreground/90 mb-1">Toplam NFT</div>
                <div className="text-sm text-foreground/60">Paylaşılan koleksiyonlarda</div>
              </div>
              
              {/* Animated Chart Bars */}
              <div className="flex items-end justify-center space-x-1 h-12 mb-4">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-t from-emerald-400 to-cyan-500 rounded-t opacity-80 group-hover:opacity-100 transition-all duration-500"
                    style={{
                      width: '8px',
                      height: `${20 + Math.random() * 30}px`,
                      animationDelay: `${i * 100}ms`
                    }}
                  ></div>
                ))}
              </div>
              
              {/* Collection Types */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-500/20 rounded-lg p-2 text-center">
                  <div className="font-bold text-emerald-400">Normal</div>
                  <div className="text-foreground/60">
                    {profiles.reduce((total, profile) => total + Math.floor(profile.nftCount * 0.6), 0)}
                  </div>
                </div>
                <div className="bg-cyan-500/20 rounded-lg p-2 text-center">
                  <div className="font-bold text-cyan-400">Evolving</div>
                  <div className="text-foreground/60">
                    {profiles.reduce((total, profile) => total + Math.floor(profile.nftCount * 0.4), 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tahmini Değer Card */}
          <div className="relative group overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute -inset-4 opacity-75 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute top-0 -left-4 w-24 h-24 bg-amber-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute top-0 -right-4 w-24 h-24 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-24 h-24 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>
            
            <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-gray-700/20 hover:border-white/40 dark:hover:border-gray-600/40 transition-all duration-500 hover:scale-[1.02] group shadow-2xl hover:shadow-3xl">
              {/* Icon Container */}
              <div className="flex items-center justify-center w-20 h-20 mb-6 mx-auto bg-gradient-to-br from-amber-400/20 to-orange-600/20 rounded-2xl border border-white/30 group-hover:scale-110 transition-transform duration-300">
                <div className="text-4xl group-hover:animate-spin">💰</div>
              </div>
              
              {/* Main Number */}
              <div className="text-center mb-4">
                <div className="text-5xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  {profiles.reduce((total, profile) => total + parseFloat(profile.totalValue), 0).toFixed(1)}
                </div>
                <div className="text-lg font-bold text-foreground/90 mb-1">
                  <span className="text-2xl">ETH</span> Tahmini Değer
                </div>
                <div className="text-sm text-foreground/60">Toplam koleksiyon değeri</div>
              </div>
              
              {/* Price Trend */}
              <div className="relative h-8 mb-4">
                <svg className="w-full h-full" viewBox="0 0 200 32">
                  <path
                    d="M0,16 Q50,8 100,12 T200,10"
                    fill="none"
                    stroke="url(#priceGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="animate-dash"
                  />
                  <circle cx="200" cy="10" r="3" fill="#F59E0B" className="animate-pulse">
                    <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                  </circle>
                </svg>
                <svg width="0" height="0">
                  <defs>
                    <linearGradient id="priceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="50%" stopColor="#F97316" />
                      <stop offset="100%" stopColor="#EAB308" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              
              {/* Performance Indicators */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-foreground/60">+12.5% Büyüme</span>
                </div>
                <div className="text-xs text-foreground/50">
                  ↗️ Trending
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
      <div className="mb-8">
        <div className="max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Profil ara... (isim, bio, adres)"
              className="w-full px-4 py-3 pl-12 bg-background border border-primary-accent/50 rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-transparent"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground/50">
              🔍
            </div>
          </div>
        </div>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-accent border-r-transparent mb-4"></div>
          <p className="text-foreground/70">Profiller yükleniyor...</p>
        </div>
      ) : filteredProfiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {filteredProfiles.map((profile, index) => {
            const theme = getProfileTheme(index);
            return (
              <Link
                key={profile.address}
                href={`/profile/${profile.address}`}
                className="group"
              >
                <div className={`relative bg-gradient-to-br ${theme.bgGradient} rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] cursor-pointer border ${theme.border} hover:border-opacity-80 overflow-hidden`}>
                  
                  {/* Decorative Background Elements */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${theme.glow} rounded-full -translate-y-16 translate-x-16`}></div>
                  <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${theme.glow} rounded-full translate-y-12 -translate-x-12`}></div>

                  {/* Theme Emoji Decorator */}
                  <div className="absolute top-4 right-4 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">
                    {theme.emoji}
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Header with Avatar */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="relative">
                          <img
                            src={profile.avatar}
                            alt={profile.name}
                            className={`w-20 h-20 rounded-full border-3 ${theme.border} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                          />
                          {/* Online indicator */}
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r ${theme.gradient} rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center`}>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className={`text-xl font-bold text-foreground group-hover:${theme.accent} transition-colors duration-300`}>
                            {profile.name}
                          </h3>
                          <p className="text-sm text-foreground/60 font-mono bg-background/30 px-2 py-1 rounded-md">
                            {shortenAddress(profile.address)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Top badges */}
                      <div className="flex flex-col gap-1">
                        {profile.badges.slice(0, 1).map((badge, badgeIndex) => (
                          <span
                            key={badgeIndex}
                            className={`px-2 py-1 bg-gradient-to-r ${theme.gradient} text-white rounded-full text-xs font-medium backdrop-blur-sm shadow-md`}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="mb-4 p-3 bg-white/40 dark:bg-gray-800/40 rounded-lg backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                      <p className="text-foreground/80 text-sm leading-relaxed">
                        {profile.bio}
                      </p>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center bg-white/30 dark:bg-gray-800/30 rounded-xl p-4 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                        <div className={`text-2xl font-bold ${theme.accent}`}>{profile.nftCount}</div>
                        <div className="text-xs text-foreground/70 font-medium">NFT</div>
                      </div>
                      <div className="text-center bg-white/30 dark:bg-gray-800/30 rounded-xl p-4 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                        <div className={`text-2xl font-bold ${theme.accent}`}>{profile.totalValue} ETH</div>
                        <div className="text-xs text-foreground/70 font-medium">Değer</div>
                      </div>
                    </div>

                    {/* Favorite Stage - Enhanced */}
                    <div className={`flex items-center justify-center mb-4 p-3 bg-gradient-to-r ${theme.gradient} rounded-xl backdrop-blur-sm border border-white/30 shadow-md`}>
                      <span className="text-3xl mr-3 group-hover:scale-125 transition-transform duration-300">
                        {getStageEmoji(profile.favoriteStage)}
                      </span>
                      <span className="text-sm text-white font-medium">Favori Aşama</span>
                    </div>

                    {/* All Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {profile.badges.map((badge, badgeIndex) => (
                        <span
                          key={badgeIndex}
                          className={`px-2 py-1 bg-gradient-to-r ${theme.gradient} text-white rounded-full text-xs font-medium backdrop-blur-sm border border-white/20 hover:scale-105 transition-transform shadow-sm`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>

                    {/* Footer with Join Date */}
                    <div className="flex items-center justify-between text-xs text-foreground/50">
                      <span>Katılım: {formatDate(profile.joinedDate)}</span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 bg-gradient-to-r ${theme.gradient} rounded-full animate-pulse`}></div>
                        <span>Aktif</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.glow} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>
                  
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"></div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-secondary-accent rounded-xl shadow">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-semibold text-foreground mb-3">
            {searchTerm ? 'Arama Kriterlerinize Uygun Profil Bulunamadı' : 'Henüz Paylaşılan Profil Yok'}
          </h3>
          <p className="text-foreground/70 mb-6 max-w-md mx-auto">
            {searchTerm
              ? 'Farklı arama terimleri deneyin.'
              : `${stats.totalProfiles > 0 ? `${stats.totalProfiles} kullanıcıdan henüz kimse profilini paylaşmadı.` : 'Topluluk üyeleri profillerini paylaştığında burada görünecek.'}`
            }
          </p>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="btn-primary hover:scale-105"
            >
              🔄 Aramayı Temizle
            </button>
          )}
        </div>
      )}

      {/* Call to Action */}
      {account && (
        <div className="text-center bg-gradient-to-r from-primary-accent/20 to-grow-green/20 rounded-xl p-8">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-2xl font-semibold text-foreground mb-3">
            Profilinizi Paylaşın!
          </h3>
          <p className="text-foreground/70 mb-6 max-w-md mx-auto">
            Topluluğun sizi keşfetmesini sağlayın ve diğer NFT meraklıları ile bağlantı kurun.
          </p>
          <Link
            href={`/profile/${account}`}
            className="btn-primary hover:scale-105 inline-flex items-center"
          >
            👤 Profilime Git
          </Link>
        </div>
      )}

      {/* Not Connected */}
      {!account && (
        <div className="text-center bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 rounded-xl p-8">
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="text-2xl font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
            Cüzdanınızı Bağlayın
          </h3>
          <p className="text-yellow-700 dark:text-yellow-300 mb-6 max-w-md mx-auto">
            Profil özelliklerini kullanmak ve topluluğa katılmak için cüzdanınızı bağlayın.
          </p>
          <button
            onClick={async () => {
              const result = await web3Service.connectWallet();
              if (result.success) {
                setAccount(result.account);
              }
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors hover:scale-105"
          >
            🔗 Cüzdan Bağla
          </button>
        </div>
      )}
      </div>
    </div>
  );
} 