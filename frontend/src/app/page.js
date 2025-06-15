'use client';

import { useState, useEffect } from 'react';
import { web3Service } from '../utils/web3';
import NFTCard from '../components/NFTCard';
import Link from 'next/link';

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    loadListings();
    checkConnection();
  }, []);

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
        setListings(result.listings);
      } else {
        console.error('Listing yükleme hatası:', result.error);
      }
    } catch (error) {
      console.error('Listing yükleme hatası:', error);
    }
    setLoading(false);
  };

  const handleBuy = async (listingId, price) => {
    try {
      if (!account) {
        alert('Lütfen önce cüzdanınızı bağlayın');
        return;
      }

      const result = await web3Service.buyNFT(listingId, price);
      if (result.success) {
        alert('NFT başarıyla satın alındı!');
        loadListings(); // Listeyi yenile
      } else {
        alert('Satın alma başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Satın alma hatası:', error);
      alert('Bir hata oluştu: ' + error.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12 py-8 md:py-12">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
          NFT <span className="text-primary-accent">Garden</span>
        </h1>
        <p className="text-xl text-foreground text-opacity-80 dark:text-opacity-90 max-w-2xl mx-auto">
          Kişisel NFT bahçenizde benzersiz dijital varlıkları keşfedin, büyütün ve takas edin.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-secondary-accent rounded-xl p-6 text-center shadow-lg">
          <div className="text-3xl font-bold text-primary-accent mb-2">{listings.length}</div>
          <div className="text-foreground text-opacity-80 dark:text-opacity-90">Aktif Listing</div>
        </div>
        <div className="bg-secondary-accent rounded-xl p-6 text-center shadow-lg">
          <div className="text-3xl font-bold text-primary-accent mb-2">
            {listings.reduce((total, nft) => total + parseFloat(nft.price), 0).toFixed(2)}
          </div>
          <div className="text-foreground text-opacity-80 dark:text-opacity-90">Toplam Değer (ETH)</div>
        </div>
        <div className="bg-secondary-accent rounded-xl p-6 text-center shadow-lg">
          <div className="text-3xl font-bold text-primary-accent mb-2">24</div>
          <div className="text-foreground text-opacity-80 dark:text-opacity-90">Aktif Bahçıvan</div>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">🌿 En Yeni Tohumlar ve Bitkiler</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="bg-secondary-accent rounded-xl shadow-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-background opacity-50"></div>
                <div className="p-6">
                  <div className="h-6 bg-background opacity-50 rounded mb-2"></div>
                  <div className="h-4 bg-background opacity-50 rounded mb-4"></div>
                  <div className="h-10 bg-background opacity-50 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((nft) => (
              <NFTCard
                key={nft.listingId}
                nft={nft}
                isListed={true}
                onBuy={handleBuy}
                currentAccount={account}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary-accent rounded-xl shadow">
            <div className="text-6xl mb-4">🪴</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Bahçede Henüz Hiçbir Şey Yok
            </h3>
            <p className="text-foreground text-opacity-80 dark:text-opacity-90 mb-6">
              İlk tohumunuzu ekip bahçenizi yeşertmeye başlayın!
            </p>
            <Link
              href="/mint"
              className="inline-block bg-primary-accent hover:brightness-95 text-background px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Tohum Ek
            </Link>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-primary-accent rounded-2xl p-8 md:p-12 text-center text-background">
        <h2 className="text-3xl font-bold mb-4">Kendi NFT Bahçenizi Kurun</h2>
        <p className="text-lg mb-6 opacity-90">
          Eşsiz bitki NFT'leri yetiştirin ve dijital bahçenizi dünyaya sergileyin.
        </p>
        <Link
          href="/mint"
          className="inline-block bg-background text-primary-accent hover:bg-opacity-90 px-8 py-3 rounded-lg font-medium transition-colors"
        >
          Bahçeni Oluştur
        </Link>
      </div>
    </div>
  );
}
