'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { web3Service } from '../../utils/web3';
import NFTCard from '../../components/NFTCard';

export default function MyNFTsPage() {
  const [nfts, setNfts] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('owned'); // 'owned' or 'listed'

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const connection = await web3Service.checkConnection();
      if (!connection.connected) {
        setLoading(false);
        return;
      }
      setAccount(connection.account);
      await loadAllUserData(connection.account);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    }
    setLoading(false);
  };
  
  const connectAndLoadData = async () => {
    setLoading(true);
    try {
        const connectResult = await web3Service.connectWallet();
        if (!connectResult.success) {
          alert('Cüzdan bağlantısı başarısız: ' + connectResult.error);
          setLoading(false);
          return;
        }
        setAccount(connectResult.account);
        await loadAllUserData(connectResult.account);
    } catch (error) {
        console.error('Cüzdan bağlama ve veri yükleme hatası:', error);
        alert('Bir hata oluştu: ' + error.message);
    }
    setLoading(false);
  };

  const loadAllUserData = async (userAccount) => {
    if (!userAccount) return;
    setLoading(true);
    try {
      const [nftResult, listingResult] = await Promise.all([
        web3Service.getUserNFTs(userAccount),
        web3Service.getUserListings(userAccount)
      ]);

      if (nftResult.success) {
        setNfts(nftResult.nfts);
      } else {
        console.error('NFT yükleme hatası:', nftResult.error);
        setNfts([]);
      }

      if (listingResult.success) {
        const formattedListings = listingResult.listings.map(listing => ({
          ...listing,
        }));
        setListings(formattedListings);
      } else {
        console.error('Listing yükleme hatası:', listingResult.error);
        setListings([]);
      }
    } catch (error) {
      console.error('Kullanıcı verilerini yükleme hatası:', error);
      setNfts([]);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async (tokenId, price) => {
    setLoading(true);
    try {
      const result = await web3Service.listNFT(tokenId, price);
      if (result.success) {
        alert('NFT\'niz başarıyla satışa çıkarıldı!');
        await loadAllUserData(account);
      } else {
        alert('Satışa çıkarma başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Satış hatası:', error);
      alert('Bir hata oluştu: ' + error.message);
    }
    setLoading(false);
  };

  const handleCancel = async (listingId) => {
    setLoading(true);
    try {
      const result = await web3Service.cancelListing(listingId);
      if (result.success) {
        alert('NFT\'niz başarıyla satıştan kaldırıldı!');
        await loadAllUserData(account);
      } else {
        alert('Satıştan kaldırma başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Satıştan kaldırma hatası:', error);
      alert('Bir hata oluştu: ' + error.message);
    }
    setLoading(false);
  };

  const handleBurn = async (tokenId) => {
    if (!confirm('Bu NFT\'yi yakmak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }
    setLoading(true);
    try {
      const result = await web3Service.burnNFT(tokenId);
      if (result.success) {
        alert('NFT\'niz başarıyla yakıldı! (Silindi) 🔥');
        await loadAllUserData(account);
      } else {
        alert('NFT yakma başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('NFT yakma hatası:', error);
      alert('Bir hata oluştu: ' + error.message);
    }
    setLoading(false);
  };

  if (!account && !loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center bg-secondary-accent p-8 rounded-xl shadow-lg max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-3">
            🪴 Bahçenizdeki Varlıklar
          </h1>
          <p className="text-foreground text-opacity-80 dark:text-opacity-90 mb-6">
            Tohumlarınızı, bitkilerinizi ve diğer NFT'lerinizi görmek için lütfen cüzdanınızı bağlayın.
          </p>
          <button
            onClick={connectAndLoadData}
            disabled={loading}
            className="bg-primary-accent hover:brightness-95 text-background px-6 py-3 rounded-lg font-medium transition-colors shadow hover:shadow-md disabled:opacity-70"
          >
            {loading ? 'Bağlanıyor...' : 'Cüzdan Bağla'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-3">
          🪴 Bahçemdeki Varlıklar
        </h1>
        <p className="text-foreground text-opacity-80 dark:text-opacity-90 max-w-xl mx-auto">
          Sahip olduğunuz tohumları, bitkileri ve satışta olanları buradan yönetin.
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-secondary-accent rounded-lg p-1 shadow-md flex space-x-1">
          <button
            onClick={() => setActiveTab('owned')}
            className={`px-5 py-2 rounded-md font-medium transition-all duration-200 ease-in-out text-sm md:text-base
              ${
                activeTab === 'owned'
                  ? 'bg-primary-accent text-background shadow-sm'
                  : 'text-foreground hover:bg-primary-accent/20 hover:text-primary-accent dark:hover:text-dark-primary'
            }`}
          >
            Sahip Olduklarım ({nfts.length})
          </button>
          <button
            onClick={() => setActiveTab('listed')}
            className={`px-5 py-2 rounded-md font-medium transition-all duration-200 ease-in-out text-sm md:text-base
              ${
                activeTab === 'listed'
                  ? 'bg-primary-accent text-background shadow-sm'
                  : 'text-foreground hover:bg-primary-accent/20 hover:text-primary-accent dark:hover:text-dark-primary'
            }`}
          >
            Satışta Olanlar ({listings.length})
          </button>
        </div>
      </div>

      {loading && (!nfts.length && !listings.length && activeTab === 'owned' || !listings.length && activeTab === 'listed') ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-secondary-accent rounded-xl shadow-lg overflow-hidden animate-pulse">
              <div className="aspect-square bg-background opacity-60 dark:opacity-40"></div>
              <div className="p-5">
                <div className="h-5 bg-background opacity-60 dark:opacity-40 rounded mb-3 w-3/4"></div>
                <div className="h-4 bg-background opacity-60 dark:opacity-40 rounded mb-4 w-1/2"></div>
                <div className="h-9 bg-background opacity-60 dark:opacity-40 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'owned' ? (
        nfts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nfts.map((nft) => (
              <NFTCard
                key={nft.tokenId}
                nft={nft}
                isOwned={true}
                onSell={handleSell}
                onBurn={handleBurn}
                currentAccount={account}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary-accent rounded-xl shadow">
            <div className="text-5xl mb-4">🍃</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Henüz Hiç Tohum veya Bitkiniz Yok
            </h3>
            <p className="text-foreground text-opacity-80 dark:text-opacity-90 mb-6">
              Pazaryerinden yeni tohumlar alabilir veya kendiniz ekebilirsiniz.
            </p>
            <Link
              href="/mint" 
              className="inline-block bg-primary-accent hover:brightness-95 text-background px-6 py-3 rounded-lg font-medium transition-colors shadow hover:shadow-md mr-2"
            >
              Yeni Tohum Ek
            </Link>
            <Link
              href="/"
              className="inline-block bg-primary-accent/80 hover:bg-primary-accent text-background px-6 py-3 rounded-lg font-medium transition-colors shadow hover:shadow-md"
            >
              Pazaryerini Keşfet
            </Link>
          </div>
        )
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Satışta Hiçbir Varlığınız Yok
          </h3>
          <p className="text-foreground text-opacity-80 dark:text-opacity-90 mb-6">
            Bahçenizdeki varlıklardan bazılarını satışa çıkarabilirsiniz.
          </p>
          {nfts.length > 0 && (
            <button 
              onClick={() => setActiveTab('owned')} 
              className="inline-block bg-primary-accent hover:brightness-95 text-background px-6 py-3 rounded-lg font-medium transition-colors shadow hover:shadow-md"
            > 
              Sahip Olduklarımı Göster 
            </button> 
          )}
        </div>
      )}
    </div>
  );
} 