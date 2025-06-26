'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import classNames from 'classnames';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { web3Service } from '../../../utils/web3';
import { getProfileByWallet, updateProfile, uploadProfileImage, getOrCreateProfile } from '../../../utils/profileService';
import NFTCard from '../../../components/NFTCard';
import IsometricGarden from '../../../components/3d/IsometricGarden';

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
  const [isProfileShared, setIsProfileShared] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

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
        setIsProfileShared(profile.is_shared || false);
      } else {
        // Eğer profil bulunamazsa ve bu kendi profilimizse, oluşturmayı deneyebiliriz veya bir mesaj gösterebiliriz.
        // Şimdilik, Navbar'da getOrCreateProfile çağrıldığı için burada null kalması bir sorun teşkil etmeyebilir.
        console.warn('[ProfilePage] Cüzdan için profil bulunamadı:', address);
      }

      // Kullanıcının NFT'lerini yükle
      const nftsResult = await web3Service.getUserNFTs(address);
      if (nftsResult.success) {
        console.log('👤 User NFTs loaded:', nftsResult.nfts);
        let userNftList = nftsResult.nfts.filter(nft => nft.tokenURI);
        
        // Test: Add sample NFTs with images if no NFTs exist
        if (userNftList.length === 0 && isOwnProfile) {
          console.log('🧪 Adding test NFTs for development...');
          userNftList = [
            {
              tokenId: 'test-1',
              contractAddress: 'test',
              name: 'Test Sunflower',
              description: 'A beautiful test sunflower',
              image: 'https://images.unsplash.com/photo-1597848212624-e8bb4d8b8c00?w=300&h=300&fit=crop&crop=center',
              tokenURI: 'test-uri-1',
              owner: address,
              details: {
                currentStage: 0,
                wateringCount: 2,
                currentStageEvolutionThreshold: 3,
                canEvolve: false
              }
            },
            {
              tokenId: 'test-2',
              contractAddress: 'test',
              name: 'Test Rose',
              description: 'A lovely test rose',
              image: 'https://images.unsplash.com/photo-1518895312237-a4e52b180dd4?w=300&h=300&fit=crop&crop=center',
              tokenURI: 'test-uri-2',
              owner: address,
              details: {
                currentStage: 2,
                wateringCount: 7,
                currentStageEvolutionThreshold: 7,
                canEvolve: true
              }
            },
            {
              tokenId: 'test-3',
              contractAddress: 'test',
              name: 'Test Tulip',
              description: 'A colorful test tulip',
              image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c35a?w=300&h=300&fit=crop&crop=center',
              tokenURI: 'test-uri-3',
              owner: address,
              details: {
                currentStage: 4,
                wateringCount: 15,
                currentStageEvolutionThreshold: 0,
                canEvolve: false
              }
            }
          ];
        }
        
        setUserNFTs(userNftList);
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
        setIsProfileShared(profileData.is_shared || false);
    }
    setProfileImageFile(null);
    setBackgroundImageFile(null);
  };

  const handleShareProfile = async () => {
    if (!isOwnProfile || !currentAccount) return;
    setShareLoading(true);
    
    try {
      const updates = {
        is_shared: !isProfileShared,
        shared_at: !isProfileShared ? new Date().toISOString() : null
      };

      const updatedProfile = await updateProfile(currentAccount, updates);
      
      if (updatedProfile) {
        setIsProfileShared(!isProfileShared);
        setProfileData({...profileData, ...updates});
        alert(
          !isProfileShared 
            ? '🎉 Profiliniz artık toplulukta görünür! Diğer kullanıcılar sizi keşfedebilir.' 
            : 'ℹ️ Profiliniz artık toplulukta gizli. Sadece direkt link ile erişilebilir.'
        );
      } else {
        alert('Profil paylaşım durumu güncellenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Profil paylaşım hatası:', error);
      alert('Bir hata oluştu: ' + error.message);
    } finally {
      setShareLoading(false);
    }
  };

  const copyProfileLink = () => {
    const profileUrl = `${window.location.origin}/profile/${profileWalletAddress}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      alert('🔗 Profil linki kopyalandı! Artık arkadaşlarınızla paylaşabilirsiniz.');
    }).catch(() => {
      alert('📋 Link kopyalanamadı. URL: ' + profileUrl);
    });
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
              <div className="w-full md:w-auto space-y-2">
              <button onClick={() => setEditMode(true)} 
                className="bg-primary-accent hover:brightness-95 text-background font-medium py-2 px-5 rounded-lg transition-colors shadow-md w-full md:w-auto">
                  ✏️ Profili Düzenle
                </button>
                
                {/* Share Profile Button */}
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  <button 
                    onClick={handleShareProfile}
                    disabled={shareLoading}
                    className={`flex-1 font-medium py-2 px-4 rounded-lg transition-all shadow-md hover:scale-105 disabled:opacity-70 flex items-center justify-center ${
                      isProfileShared 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {shareLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <span className="mr-2">{isProfileShared ? '🌐' : '👥'}</span>
                    )}
                    {shareLoading 
                      ? 'Güncelleniyor...' 
                      : isProfileShared 
                        ? 'Toplulukta Paylaşıldı' 
                        : 'Toplulukta Paylaş'
                    }
                  </button>
                  
                  <button 
                    onClick={copyProfileLink}
                    className="flex-1 md:flex-initial bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-all shadow-md hover:scale-105 flex items-center justify-center"
                  >
                    🔗 Link Kopyala
              </button>
                </div>
                
                {isProfileShared && (
                  <div className="text-xs text-green-600 dark:text-green-400 text-center md:text-right bg-green-100 dark:bg-green-900/30 rounded-lg px-3 py-2">
                    ✅ Profiliniz toplulukta görünür
                  </div>
                )}
              </div>
            )}
            
            {isOwnProfile && editMode && (
              <div className="flex space-x-2 w-full md:w-auto">
                <button onClick={handleCancelEdit} disabled={saving}
                  className="flex-1 bg-background/80 hover:bg-background text-foreground font-medium py-2 px-4 rounded-lg transition-colors shadow disabled:opacity-70">
                  ❌ İptal
                </button>
                <button onClick={handleSaveProfile} disabled={saving}
                  className="flex-1 bg-primary-accent hover:brightness-95 text-background font-medium py-2 px-4 rounded-lg transition-colors shadow-md disabled:opacity-70 flex items-center justify-center">
                  {saving ? (
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : null}
                  {saving ? 'Kaydediliyor...' : '💾 Değişiklikleri Kaydet'}
                </button>
              </div>
            )}
            
            {/* Profile Actions for Non-Own Profiles */}
            {!isOwnProfile && (
              <div className="w-full md:w-auto space-y-2">
                <button 
                  onClick={copyProfileLink}
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all shadow-md hover:scale-105 flex items-center justify-center"
                >
                  🔗 Profil Linkini Paylaş
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
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

      {/* 3D İzometrik Bahçe */}
      <div className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              🎮 {isOwnProfile ? 'Senin 3D Bahçen' : `${displayUsernameText}'in 3D Bahçesi`}
            </h2>
            <p className="text-text-muted mt-1">
              İzometrik görünümde bahçenizi keşfedin ve NFT'lerinizle etkileşim kurun
            </p>
          </div>
          
          {/* 3D Controls Info */}
          <div className="bg-secondary-accent rounded-lg p-3 text-xs hidden md:block">
            <div className="text-foreground font-medium mb-1">🎮 Kontroller:</div>
            <div className="text-text-muted space-y-0.5">
              <div>• Mouse: Döndür</div>
              <div>• Scroll: Zoom</div>
              <div>• Sağ tık: Kaydır</div>
            </div>
          </div>
        </div>

        {/* 3D Canvas Container */}
        <div className="bg-card-bg rounded-2xl shadow-lg overflow-hidden border border-border-color">
          <div className="h-[500px] md:h-[600px]">
            <Canvas
              camera={{
                position: [8, 8, 8],
                fov: 45,
                near: 0.1,
                far: 1000
              }}
              style={{ background: 'linear-gradient(to bottom, #87CEEB, #98FB98)' }}
            >
              {/* Enhanced Lighting for better visibility */}
              <ambientLight intensity={0.8} color={0xffffff} />
              <directionalLight
                position={[10, 10, 5]}
                intensity={1.2}
                color={0xffffff}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <directionalLight
                position={[-5, 5, 5]}
                intensity={0.5}
                color={0xffffff}
              />
              <pointLight
                position={[0, 10, 0]}
                intensity={0.3}
                color={0xffffff}
              />

              {/* Environment */}
              <Environment preset="park" />

              {/* Grid */}
              <Grid
                args={[16, 16]}
                cellSize={1}
                cellThickness={0.3}
                cellColor="#8fbc8f"
                sectionSize={4}
                sectionThickness={0.8}
                sectionColor="#228b22"
                fadeDistance={25}
                fadeStrength={1}
                followCamera={false}
                infiniteGrid={false}
              />

              {/* Main Garden Component */}
              <Suspense fallback={null}>
                <IsometricGarden 
                  userNFTs={userNFTs} 
                  onNFTClick={(nft) => {
                    alert(`🌱 ${nft.name || `NFT #${nft.tokenId}`} tıklandı!\n\nDetaylar:\n• Token ID: ${nft.tokenId}\n• Stage: ${nft.details?.currentStage || 0}\n• Sulama: ${nft.details?.wateringCount || 0}\n\nBurada sulama ve evrim işlemleri yapılabilir.`);
                  }}
                />
              </Suspense>

              {/* Controls */}
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                maxPolarAngle={Math.PI / 2.2}
                minDistance={4}
                maxDistance={40}
                target={[0, 0, 0]}
              />
            </Canvas>
          </div>
          
          {/* Bottom Info Bar */}
          <div className="bg-primary-accent/10 border-t border-border-color px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="text-text-muted">
                💡 3D Bahçe ile NFT'lerinizle etkileşimli deneyim yaşayın
              </div>
              
              <div className="flex space-x-2">
                <button className="btn-primary text-xs px-2 py-1 opacity-80 hover:opacity-100">
                  🏠 Tam Ekran
                </button>
                <Link 
                  href={`/garden/${profileWalletAddress}`}
                  className="btn-secondary text-xs px-2 py-1 opacity-80 hover:opacity-100"
                >
                  📋 2D Görünüm
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Controls Info */}
        <div className="mt-4 bg-secondary-accent rounded-lg p-3 text-sm md:hidden">
          <div className="text-foreground font-medium mb-2">📱 Mobil Kontroller:</div>
          <div className="text-text-muted grid grid-cols-2 gap-2">
            <div>• Tek parmak: Döndür</div>
            <div>• İki parmak: Zoom</div>
            <div>• Pinch: Yakınlaştır</div>
            <div>• Bitkilere dokunun</div>
          </div>
        </div>
      </div>
    </div>
  );
} 