'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import classNames from 'classnames';
import { web3Service } from '../../../utils/web3';
import { getProfileByWallet } from '../../../utils/profileService';
import { getOrCreateGardenSettings, updateGardenPrivacy } from '../../../utils/gardenService';
import NFTCard from '../../../components/NFTCard';
import Link from 'next/link';

// Örnek Seed/Plant NFT verileri (normalde API'den veya kontrattan gelir)
const sampleSeedNFTs = [
  // { tokenId: '1', name: 'Ayçiçeği Tohumu', description: 'Güneşli günler için bir tohum.', tokenURI: 'ipfs://somehash1', seller: '0xOWNER', metadata: { name: 'Ayçiçeği Tohumu', description: 'Güneşli günler için bir tohum.', image: 'ipfs://QmZc3K5zZgY5PZQY5qZgY5PZQY5qZgY5PZQY5qZgY5PZQY5/sunflower_seed.png' } },
  // { tokenId: '2', name: 'Gül Tohumu', description: 'Aşkın ve tutkunun sembolü.', tokenURI: 'ipfs://somehash2', seller: '0xOWNER', metadata: { name: 'Gül Tohumu', description: 'Aşkın ve tutkunun sembolü.', image: 'ipfs://QmZc3K5zZgY5PZQY5qZgY5PZQY5qZgY5PZQY5qZgY5PZQY5/rose_seed.png' } },
];
const samplePlantNFTs = [
  // { tokenId: '101', name: 'Gelişmiş Ayçiçeği', description: 'Bahçenizin parlayan yıldızı.', tokenURI: 'ipfs://somehash101', seller: '0xOWNER', metadata: { name: 'Gelişmiş Ayçiçeği', description: 'Bahçenizin parlayan yıldızı.', image: 'ipfs://QmZc3K5zZgY5PZQY5qZgY5PZQY5qZgY5PZQY5qZgY5PZQY5/sunflower_plant.png' } },
];

export default function GardenPage() {
  const params = useParams();
  const gardenWalletAddress = params.walletAddress;

  const [currentAccount, setCurrentAccount] = useState(null);
  const [gardenOwnerProfile, setGardenOwnerProfile] = useState(null);
  const [gardenSettings, setGardenSettings] = useState(null);
  const [isOwnGarden, setIsOwnGarden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [seedNFTs, setSeedNFTs] = useState([]); // sampleSeedNFTs ile başlatılabilir
  const [plantNFTs, setPlantNFTs] = useState([]); // samplePlantNFTs ile başlatılabilir
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  const setupWeb3 = useCallback(async () => {
    const connection = await web3Service.checkConnection();
    if (connection.connected) {
      setCurrentAccount(connection.account.toLowerCase());
    }
  }, []);

  const loadGardenData = useCallback(async (address) => {
    if (!address) return;
    setLoading(true);
    setLoadingNFTs(true);
    try {
      const [profile, settings] = await Promise.all([
        getProfileByWallet(address),
        getOrCreateGardenSettings(address)
      ]);

      setGardenOwnerProfile(profile);
      setGardenSettings(settings);

      if (!settings) {
        console.warn(`Bahçe ayarları yüklenemedi veya oluşturulamadı (muhtemelen profil yok): ${address}`);
      }
      
      // TODO: Gerçek Seed ve Plant NFT'lerini yükle (web3Service veya Supabase üzerinden)
      // Örnek verileri geçici olarak kullanabiliriz veya NFTCard'ları göstermek için boş bırakabiliriz.
      const userNFTsResult = await web3Service.getUserNFTs(address); // Tüm NFT'leri al
      if(userNFTsResult.success) {
        // Burada SeedNFT ve PlantNFT contract adreslerine göre filtreleme yapılabilir.
        // Şimdilik tümünü Seed gibi gösterelim, veya bir 'type' alanı ekleyelim metadata'ya.
        // Bu örnek için gelen tüm NFT'leri Seed gibi listeliyoruz.
        setSeedNFTs(userNFTsResult.nfts.filter(nft => nft.tokenURI)); // Sadece tokenURI olanları alalım
        // setPlantNFTs([]); // Plant NFT'ler için ayrı bir yükleme/filtreleme mekanizması gerekli
      } else {
        console.error("Kullanıcının NFT'leri yüklenirken hata:", userNFTsResult.error);
        setSeedNFTs(sampleSeedNFTs); // Hata durumunda örnek veri
        setPlantNFTs(samplePlantNFTs);
      }

    } catch (error) {
      console.error("Bahçe verileri yüklenirken hata:", error);
      setSeedNFTs(sampleSeedNFTs); // Hata durumunda örnek veri
      setPlantNFTs(samplePlantNFTs);
    } finally {
      setLoading(false);
      setLoadingNFTs(false);
    }
  }, []);

  useEffect(() => {
    setupWeb3();
  }, [setupWeb3]);

  useEffect(() => {
    if (gardenWalletAddress) {
      loadGardenData(gardenWalletAddress.toLowerCase());
    }
  }, [gardenWalletAddress, loadGardenData]);

  useEffect(() => {
    if (currentAccount && gardenWalletAddress) {
      setIsOwnGarden(currentAccount === gardenWalletAddress.toLowerCase());
    }
  }, [currentAccount, gardenWalletAddress]);

  const handlePrivacyChange = async (newIsPublic) => {
    if (!isOwnGarden || !gardenSettings) return;
    setSavingPrivacy(true);
    try {
      const updatedSettings = await updateGardenPrivacy(currentAccount, newIsPublic);
      if (updatedSettings) {
        setGardenSettings(updatedSettings);
        alert(`Bahçe görünürlüğü ${newIsPublic ? 'Herkese Açık' : 'Özel'} olarak ayarlandı.`);
      } else {
        alert('Gizlilik ayarı güncellenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error("Bahçe gizliliği güncellenirken hata:", error);
      alert('Gizlilik ayarı güncellenirken bir hata oluştu.');
    } finally {
      setSavingPrivacy(false);
    }
  };
  
  const displayUsername = gardenOwnerProfile?.username || (gardenWalletAddress ? `${gardenWalletAddress.slice(0, 6)}...${gardenWalletAddress.slice(-4)}` : 'Bilinmeyen Bahçıvan');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-accent border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="text-xl text-foreground mt-4">Bahçe yükleniyor...</p>
      </div>
    );
  }

  if (!gardenOwnerProfile) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-secondary-accent p-8 rounded-xl shadow-lg max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-3">🪴 Bahçe Bulunamadı</h2>
            <p className="text-foreground/80 dark:text-foreground/70">
                Bu cüzdan adresine ({gardenWalletAddress ? `${gardenWalletAddress.slice(0, 10)}...` : 'belirtilmemiş'}) ait bir profil bulunamadı. 
                Bu nedenle bahçe görüntülenemiyor.
            </p>
        </div>
      </div>
    );
  }
  
  if (!gardenSettings && !loading) {
     return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-secondary-accent p-8 rounded-xl shadow-lg max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-3">🚧 Bahçe Hatası</h2>
            <p className="text-foreground/80 dark:text-foreground/70">
                Bahçe ayarları yüklenemedi. Lütfen daha sonra tekrar deneyin.
            </p>
            {isOwnGarden && <p className="text-sm mt-3 text-foreground/60">Not: Bahçe ayarlarınızın oluşturulabilmesi için bir profilinizin olması gerekmektedir.</p>}
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-secondary-accent shadow-xl rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-primary-accent/20">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{displayUsername}'in Bahçesi</h1>
            <p className="text-sm text-foreground/70 dark:text-foreground/60 mt-1 font-mono" title={gardenWalletAddress}>{gardenWalletAddress}</p>
          </div>
          {isOwnGarden && gardenSettings && (
            <div className="mt-4 md:mt-0 flex items-center space-x-3 bg-background/70 dark:bg-dark-bg/70 p-3 rounded-lg shadow-sm">
              <label htmlFor="privacyToggle" className="flex items-center cursor-pointer select-none">
                <span className="mr-3 text-sm font-medium text-foreground">
                  {gardenSettings.is_public ? 'Bahçe Herkese Açık' : 'Bahçe Özel'}
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    id="privacyToggle"
                    className="sr-only"
                    checked={gardenSettings.is_public}
                    onChange={(e) => handlePrivacyChange(e.target.checked)}
                    disabled={savingPrivacy}
                  />
                  <div className={classNames("block w-12 h-7 rounded-full transition-colors", { 'bg-primary-accent': gardenSettings.is_public, 'bg-foreground/30': !gardenSettings.is_public })}></div>
                  <div className={classNames("dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform", { 'transform translate-x-full': gardenSettings.is_public })}></div>
                </div>
              </label>
              {savingPrivacy && 
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary-accent border-r-transparent"></div>
              }
            </div>
          )}
        </div>

        {!isOwnGarden && gardenSettings && !gardenSettings.is_public && (
          <div className="text-center py-12 bg-background rounded-xl shadow-inner px-6">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Bu Bahçe Özel</h2>
            <p className="text-foreground/80 dark:text-foreground/70 max-w-md mx-auto">
              Bu bahçenin sahibi, içeriğini sadece kendisi görecek şekilde ayarlamış. 
              Herkese açık hale getirilene kadar varlıklar görüntülenemez.
            </p>
          </div>
        )}

        {(!gardenSettings || gardenSettings.is_public || isOwnGarden) && (
          <>
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Tohumlar 🌱 ({seedNFTs.length})</h2>
              {loadingNFTs ? (
                <p className="text-foreground/70 italic">Tohumlar yükleniyor...</p>
              ) : seedNFTs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {seedNFTs.map(nft => (
                    <NFTCard 
                        key={nft.tokenId || nft.id} // Supabase'den geliyorsa id olabilir
                        nft={nft}
                        isOwned={isOwnGarden} // Bahçe sahibiyse tüm NFT'ler onundur
                        // onSell, onBurn gibi aksiyonlar bu sayfada olmayabilir, veya farklı olabilir
                        currentAccount={currentAccount} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-background rounded-xl shadow-inner px-6">
                    <div className="text-5xl mb-3">🍂</div>
                    <p className="text-lg text-foreground/80 dark:text-foreground/70">
                        {isOwnGarden ? "Henüz hiç tohum ekmemişsiniz." : "Bu bahçıvan henüz hiç tohum ekmemiş."}
                    </p>
                    {isOwnGarden && (
                        <Link href="/mint" className="mt-4 inline-block bg-primary-accent hover:brightness-95 text-background px-5 py-2.5 rounded-lg font-medium transition-colors shadow hover:shadow-md">
                            İlk Tohumunu Ek
                        </Link>
                    )}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Bitkiler 🪴 ({plantNFTs.length})</h2>
              {loadingNFTs ? (
                <p className="text-foreground/70 italic">Bitkiler yükleniyor...</p>
              ) : plantNFTs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {plantNFTs.map(nft => (
                     <NFTCard 
                        key={nft.tokenId || nft.id}
                        nft={nft}
                        isOwned={isOwnGarden}
                        currentAccount={currentAccount} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-background rounded-xl shadow-inner px-6">
                    <div className="text-5xl mb-3">🥀</div>
                    <p className="text-lg text-foreground/80 dark:text-foreground/70">
                        {isOwnGarden ? "Henüz hiç bitkiniz filizlenmemiş." : "Bu bahçıvanın henüz hiç bitkisi filizlenmemiş."}
                    </p>
                     {isOwnGarden && seedNFTs.length > 0 && (
                        <p className="text-sm mt-2 text-foreground/60">Tohumlarınızı sulayarak bitkiye dönüştürebilirsiniz.</p>
                     )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
} 