'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import classNames from 'classnames';
import { web3Service } from '../../../utils/web3';
import { getProfileByWallet, updateProfile, uploadProfileImage, getOrCreateProfile } from '../../../utils/profileService';
import NFTCard from '../../../components/NFTCard';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileWalletAddress = params.walletAddress?.toLowerCase();

  const [currentAccount, setCurrentAccount] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [userNFTs, setUserNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const setupWeb3 = useCallback(async () => {
    const connection = await web3Service.checkConnection();
    if (connection.connected) {
      setCurrentAccount(connection.account.toLowerCase());
    }
  }, []);

  const loadProfileData = useCallback(async (address) => {
    if (!address) return;
    setLoading(true);
    setLoadingNFTs(true);
    try {
      const profile = await getProfileByWallet(address);
      setProfileData(profile);
      if (profile) {
        setUsername(profile.username || '');
        setBio(profile.bio || '');
        setProfileImagePreview(profile.profile_image_url);
        setBackgroundImagePreview(profile.profile_background_image_url);
      } else {
        // Eğer profil bulunamazsa ve bu kendi profilimizse, oluşturmayı deneyebiliriz veya bir mesaj gösterebiliriz.
        // Şimdilik, Navbar'da getOrCreateProfile çağrıldığı için burada null kalması bir sorun teşkil etmeyebilir.
        console.warn('[ProfilePage] Cüzdan için profil bulunamadı:', address);
      }

      // Kullanıcının NFT'lerini yükle
      const nftsResult = await web3Service.getUserNFTs(address);
      if (nftsResult.success) {
        setUserNFTs(nftsResult.nfts.filter(nft => nft.tokenURI)); // Sadece tokenURI olanlar
      } else {
        console.error("Kullanıcının NFT'leri yüklenirken hata:", nftsResult.error);
        setUserNFTs([]);
      }

    } catch (error) {
      console.error("[ProfilePage] Profil verileri yüklenirken hata:", error);
      setUserNFTs([]);
    } finally {
      setLoading(false);
      setLoadingNFTs(false);
    }
  }, []);

  useEffect(() => {
    setupWeb3();
  }, [setupWeb3]);

  useEffect(() => {
    if (profileWalletAddress) {
      loadProfileData(profileWalletAddress);
    }
  }, [profileWalletAddress, loadProfileData]);

  useEffect(() => {
    if (currentAccount && profileWalletAddress) {
      setIsOwnProfile(currentAccount === profileWalletAddress);
    }
  }, [currentAccount, profileWalletAddress]);

  const handleImageChange = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'profile') {
          setProfileImageFile(file);
          setProfileImagePreview(reader.result);
        } else if (type === 'background') {
          setBackgroundImageFile(file);
          setBackgroundImagePreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!isOwnProfile || !currentAccount) return;
    setSaving(true);
    let newProfileImageUrl = profileData?.profile_image_url;
    let newBackgroundImageUrl = profileData?.profile_background_image_url;

    try {
      if (profileImageFile) {
        const uploadedUrl = await uploadProfileImage(profileImageFile, currentAccount, 'profilepictures');
        if (uploadedUrl) newProfileImageUrl = uploadedUrl;
        setProfileImageFile(null); 
      }
      if (backgroundImageFile) {
        const uploadedUrl = await uploadProfileImage(backgroundImageFile, currentAccount, 'profilebackgroundpictures');
        if (uploadedUrl) newBackgroundImageUrl = uploadedUrl;
        setBackgroundImageFile(null);
      }

      const updates = {
        username: username.trim(),
        bio: bio.trim(),
        profile_image_url: newProfileImageUrl,
        profile_background_image_url: newBackgroundImageUrl,
      };

      // updateProfile yerine getOrCreateProfile'ı güncellemeyle çağırmak daha iyi olabilir
      // ya da updateProfile'ın Supabase'de INSERT yerine UPDATE yaptığından emin olmalıyız.
      // Mevcut profileService.js'deki updateProfile RLS'ye takılabilir eğer satır yoksa.
      // Supabase policy'miz insert'e izin veriyorsa ve update on conflict yapıyorsa sorun olmaz.
      // Şimdilik updateProfile kullanıyoruz.
      const updatedProfileData = await updateProfile(currentAccount, updates);
      
      if (updatedProfileData) {
        setProfileData(updatedProfileData);
        // Önizlemeleri de güncelleyelim, çünkü dosya state'leri sıfırlandı.
        setProfileImagePreview(updatedProfileData.profile_image_url);
        setBackgroundImagePreview(updatedProfileData.profile_background_image_url);
        alert('Profil başarıyla güncellendi!');
        setEditMode(false);
        // Navbar'ı güncellemek için global state veya custom event kullanılabilir.
      } else {
        // Eğer updatedProfileData null ise, profil hiç oluşturulmamış olabilir.
        // Bu durumda getOrCreateProfile çağırıp sonra update denenebilir veya kullanıcıya bilgi verilebilir.
        alert('Profil güncellenirken bir hata oluştu veya profil bulunamadı.');
      }
    } catch (error) {
      console.error("Profil kaydetme hatası:", error);
      alert(`Profil kaydedilirken bir hata oluştu: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    if (profileData) {
        setUsername(profileData.username || '');
        setBio(profileData.bio || '');
        setProfileImagePreview(profileData.profile_image_url);
        setBackgroundImagePreview(profileData.profile_background_image_url);
    }
    setProfileImageFile(null);
    setBackgroundImageFile(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-accent border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="text-xl text-foreground mt-4">Profil yükleniyor...</p>
      </div>
    );
  }

  if (!profileData && !loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
         <div className="bg-secondary-accent p-8 rounded-xl shadow-lg max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-3">👤 Profil Bulunamadı</h2>
            <p className="text-foreground/80 dark:text-foreground/70">
                Bu cüzdan adresine ({profileWalletAddress ? `${profileWalletAddress.slice(0,10)}...` : 'belirtilmemiş'}) ait bir profil bulunamadı.
            </p>
            {isOwnProfile && (
                <p className="text-sm mt-4 text-foreground/70">
                    Profiliniz henüz oluşturulmamış olabilir. Navbar üzerinden veya ilk etkileşimde otomatik oluşturulur.
                </p>
            )}
             <Link href="/" className="mt-6 inline-block bg-primary-accent hover:brightness-95 text-background px-6 py-2.5 rounded-lg font-medium transition-colors shadow hover:shadow-md">
                Ana Sayfaya Dön
            </Link>
        </div>
      </div>
    );
  }
  
  const displayUsernameText = profileData?.username || (profileWalletAddress ? `${profileWalletAddress.slice(0, 6)}...${profileWalletAddress.slice(-4)}` : 'İsimsiz Bahçıvan');
  const nftsTitle = isOwnProfile ? "Bahçemdeki Varlıklar" : `${displayUsernameText}'in Varlıkları`;

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className={classNames("relative h-48 md:h-64 rounded-t-2xl", 
        !backgroundImagePreview ? 'bg-secondary-accent/80' : '' 
      )}>
        {backgroundImagePreview && (
          <Image
            src={backgroundImagePreview}
            alt="Profil Arkaplanı"
            layout="fill"
            objectFit="cover"
            className="rounded-t-2xl"
          />
        )}
        {isOwnProfile && editMode && (
          <div className="absolute bottom-3 right-3 z-10">
            <label htmlFor="backgroundImageInput" 
                className="bg-primary-accent/90 backdrop-blur-sm text-background px-3 py-1.5 rounded-md text-xs cursor-pointer hover:bg-primary-accent transition-all shadow-md">
              Arkaplanı Değiştir
            </label>
            <input id="backgroundImageInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'background')} />
          </div>
        )}
      </div>

      <div className="bg-secondary-accent shadow-xl rounded-b-2xl p-6 md:p-8 relative -mt-16 md:-mt-24 mx-auto max-w-4xl">
        <div className="flex flex-col md:flex-row items-center md:items-end md:space-x-6">
          <div className={classNames("relative h-32 w-32 md:h-40 md:w-40 rounded-full border-4 shadow-lg -mt-16 md:-mt-20 overflow-hidden flex-shrink-0",
             profileImagePreview ? 'border-secondary-accent' : 'border-primary-accent/30 bg-background/80',
             isOwnProfile && editMode ? 'cursor-pointer' : ''
          )} onClick={() => isOwnProfile && editMode && document.getElementById('profileImageInput').click()}>
            {profileImagePreview ? (
              <Image
                src={profileImagePreview}
                alt={displayUsernameText}
                layout="fill"
                objectFit="cover"
                className="rounded-full"
              />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary-accent/70" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
            {isOwnProfile && editMode && (
              <label htmlFor="profileImageInput" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                <span className="text-white text-xs">Değiştir</span>
                <input id="profileImageInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'profile')} />
              </label>
            )}
          </div>

          <div className="mt-4 md:mt-0 flex-grow text-center md:text-left">
            {editMode && isOwnProfile ? (
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı Adınız"
                className="text-2xl md:text-3xl font-bold text-foreground bg-background border border-primary-accent/50 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-primary-accent w-full md:w-auto"
              />
            ) : (
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{displayUsernameText}</h1>
            )}
            <p className="text-sm text-foreground/70 dark:text-foreground/60 mt-1 font-mono" title={profileWalletAddress}>{profileWalletAddress}</p>
            
            {editMode && isOwnProfile ? (
                <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Kendinizden bahsedin... (Max 200 karakter)"
                    rows="3"
                    maxLength="200"
                    className="mt-2 text-sm text-foreground/90 bg-background border border-primary-accent/50 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-primary-accent w-full resize-none"
                />
            ) : (
                profileData?.bio && <p className="mt-2 text-sm text-foreground/90 dark:text-foreground/80 max-w-xl">{profileData.bio}</p>
            )}
          </div>

          <div className="mt-6 md:mt-0 md:ml-auto flex-shrink-0 flex flex-col items-center md:items-end space-y-2 w-full md:w-auto">
            {isOwnProfile && !editMode && (
              <button onClick={() => setEditMode(true)} 
                className="bg-primary-accent hover:brightness-95 text-background font-medium py-2 px-5 rounded-lg transition-colors shadow-md w-full md:w-auto">
                Profili Düzenle
              </button>
            )}
            {isOwnProfile && editMode && (
              <div className="flex space-x-2 w-full md:w-auto">
                <button onClick={handleCancelEdit} disabled={saving}
                  className="flex-1 bg-background/80 hover:bg-background text-foreground font-medium py-2 px-4 rounded-lg transition-colors shadow disabled:opacity-70">
                  İptal
                </button>
                <button onClick={handleSaveProfile} disabled={saving}
                  className="flex-1 bg-primary-accent hover:brightness-95 text-background font-medium py-2 px-4 rounded-lg transition-colors shadow-md disabled:opacity-70 flex items-center justify-center">
                  {saving ? (
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : null}
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            )}
             <Link href={`/garden/${profileWalletAddress}`} 
                className="text-sm text-primary-accent hover:underline mt-2 text-center md:text-right w-full md:w-auto">
                {isOwnProfile ? 'Bahçeme Git' : `${displayUsernameText}'in Bahçesine Git`} 🪴
            </Link>
          </div>
        </div>
      </div>

      {/* Kullanıcının NFT'leri (veya listeledikleri) */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-foreground mb-6">{nftsTitle} ({userNFTs.length})</h2>
        {loadingNFTs ? (
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
        ) : userNFTs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {userNFTs.map(nft => (
              <NFTCard 
                key={nft.tokenId || nft.id}
                nft={nft} 
                isOwned={isOwnProfile} // Profil sahibiyse NFT'ler onundur
                currentAccount={currentAccount}
                // Bu sayfada satış/iptal/yakma aksiyonları olmayabilir, ya da farklı yönetilebilir.
                // Şimdilik sadece görüntüleme amaçlı.
              />
            ))}
          </div>
        ) : (
            <div className="text-center py-10 bg-secondary-accent rounded-xl shadow-inner px-6">
                <div className="text-5xl mb-3">🖼️</div>
                <p className="text-lg text-foreground/80 dark:text-foreground/70">
                    {isOwnProfile ? "Henüz sergilenecek bir NFT'niz yok." : "Bu bahçıvanın henüz sergilenecek bir NFT'si yok."}
                </p>
                {isOwnProfile && (
                    <Link href="/mint" className="mt-4 inline-block bg-primary-accent hover:brightness-95 text-background px-5 py-2.5 rounded-lg font-medium transition-colors shadow hover:shadow-md">
                        İlk Varlığını Mint Et
                    </Link>
                )}
            </div>
        )}
      </div>
    </div>
  );
} 