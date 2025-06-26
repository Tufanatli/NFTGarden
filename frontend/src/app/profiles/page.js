'use client';

import { useState, useEffect } from 'react';
import { web3Service } from '../../utils/web3';
import Link from 'next/link';

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState([]);

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
      // Mock data for now - in real app this would come from a backend/database
      const mockProfiles = [
        {
          address: '0x1234567890123456789012345678901234567890',
          name: 'Bahçıvan Alice',
          bio: 'NFT koleksiyoncusu ve bahçe tutkunusu 🌱',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
          nftCount: 12,
          totalValue: '2.5',
          joinedDate: '2024-01-15',
          isShared: true,
          badges: ['🌱 Erken Kullanıcı', '🏆 Koleksiyoncu'],
          favoriteStage: 2,
          achievements: ['İlk NFT', '10 NFT Sahibi', 'Bahçe Ustası']
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          name: 'Çiftçi Bob',
          bio: 'Evrimleşen NFT dünyasında yeniyim ama heyecanlıyım! 🚀',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
          nftCount: 7,
          totalValue: '1.8',
          joinedDate: '2024-02-10',
          isShared: true,
          badges: ['🌿 Yeşil Thumb'],
          favoriteStage: 0,
          achievements: ['İlk NFT', 'İlk Evrim']
        },
        {
          address: '0x1111222233334444555566667777888899990000',
          name: 'Botanikçi Carol',
          bio: 'Bitki bilimci ve NFT araştırmacısı 🔬🌺',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
          nftCount: 25,
          totalValue: '5.2',
          joinedDate: '2023-12-05',
          isShared: true,
          badges: ['👩‍🔬 Araştırmacı', '🏆 Koleksiyoncu', '⭐ VIP'],
          favoriteStage: 4,
          achievements: ['İlk NFT', '10 NFT Sahibi', '25 NFT Sahibi', 'Bahçe Ustası', 'Evrim Uzmanı']
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProfiles(mockProfiles);
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-3">👥 Topluluk Profilleri</h1>
        <p className="text-foreground/70 text-lg">NFT Garden topluluğunun üyelerini keşfedin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-secondary-accent rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold text-foreground">{profiles.length}</div>
          <div className="text-sm text-foreground/70">Paylaşılan Profil</div>
        </div>
        <div className="bg-secondary-accent rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">💎</div>
          <div className="text-2xl font-bold text-foreground">
            {profiles.reduce((total, profile) => total + profile.nftCount, 0)}
          </div>
          <div className="text-sm text-foreground/70">Toplam NFT</div>
        </div>
        <div className="bg-secondary-accent rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-foreground">
            {profiles.reduce((total, profile) => total + parseFloat(profile.totalValue), 0).toFixed(1)} ETH
          </div>
          <div className="text-sm text-foreground/70">Toplam Değer</div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredProfiles.map((profile) => (
            <Link
              key={profile.address}
              href={`/profile/${profile.address}`}
              className="group"
            >
              <div className="bg-secondary-accent rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border border-primary-accent/20 hover:border-primary-accent/50">
                {/* Avatar and Basic Info */}
                <div className="flex items-center mb-4">
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-16 h-16 rounded-full border-2 border-primary-accent mr-4"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-primary-accent transition-colors">
                      {profile.name}
                    </h3>
                    <p className="text-sm text-foreground/60 font-mono">
                      {shortenAddress(profile.address)}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-foreground/80 text-sm mb-4 line-clamp-2">
                  {profile.bio}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center bg-background/50 rounded-lg p-3">
                    <div className="text-lg font-bold text-foreground">{profile.nftCount}</div>
                    <div className="text-xs text-foreground/70">NFT</div>
                  </div>
                  <div className="text-center bg-background/50 rounded-lg p-3">
                    <div className="text-lg font-bold text-foreground">{profile.totalValue} ETH</div>
                    <div className="text-xs text-foreground/70">Değer</div>
                  </div>
                </div>

                {/* Favorite Stage */}
                <div className="flex items-center justify-center mb-4 p-2 bg-background/30 rounded-lg">
                  <span className="text-2xl mr-2">{getStageEmoji(profile.favoriteStage)}</span>
                  <span className="text-sm text-foreground/70">Favori Aşama</span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {profile.badges.slice(0, 2).map((badge, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary-accent/20 text-primary-accent rounded-full text-xs"
                    >
                      {badge}
                    </span>
                  ))}
                  {profile.badges.length > 2 && (
                    <span className="px-2 py-1 bg-gray-500/20 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                      +{profile.badges.length - 2}
                    </span>
                  )}
                </div>

                {/* Join Date */}
                <div className="text-xs text-foreground/50 text-center">
                  Katılım: {formatDate(profile.joinedDate)}
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-primary-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            </Link>
          ))}
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
              : 'Topluluk üyeleri profillerini paylaştığında burada görünecek.'
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
  );
} 