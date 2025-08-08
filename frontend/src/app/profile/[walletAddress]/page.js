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
    <div className="min-h-screen relative overflow-hidden">
      {/* Ultra-Modern Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-full filter blur-3xl animate-blob"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Ultra-Modern Hero Background */}
        <div className={classNames(
          "relative h-64 md:h-80 rounded-3xl overflow-hidden border border-white/20 dark:border-gray-700/30",
          !backgroundImagePreview ? 'bg-gradient-to-br from-primary-accent/30 via-blue-500/20 to-purple-500/30' : ''
        )}>
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-8 w-32 h-32 bg-white/10 rounded-full filter blur-2xl animate-blob"></div>
            <div className="absolute bottom-6 left-6 w-24 h-24 bg-primary-accent/20 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

        {backgroundImagePreview && (
          <Image
            src={backgroundImagePreview}
            alt="Profil Arkaplanı"
            layout="fill"
            objectFit="cover"
              className="rounded-3xl"
          />
        )}

          {/* Modern gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 rounded-3xl"></div>

        {isOwnProfile && editMode && (
            <div className="absolute bottom-4 right-4 z-10">
            <label htmlFor="backgroundImageInput" 
                  className="bg-white/20 backdrop-blur-xl border border-white/30 text-white px-4 py-2 rounded-2xl text-sm cursor-pointer hover:bg-white/30 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2">
                <span className="text-lg">🖼️</span>
                <span>Arkaplanı Değiştir</span>
            </label>
            <input id="backgroundImageInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'background')} />
          </div>
        )}
      </div>

      {/* Ultra-Modern Glassmorphism Profile Card */}
      <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-2xl rounded-3xl p-8 md:p-12 -mt-20 md:-mt-32 mx-auto max-w-5xl overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 right-8 w-32 h-32 bg-primary-accent/10 rounded-full filter blur-2xl animate-blob"></div>
          <div className="absolute bottom-6 left-6 w-24 h-24 bg-blue-500/10 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-purple-500/10 rounded-full filter blur-lg animate-blob animation-delay-4000"></div>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-6">
          <div className={classNames("relative h-32 w-32 md:h-40 md:w-40 rounded-full border-4 shadow-lg -mt-8 md:-mt-12 overflow-hidden flex-shrink-0",
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

          <div className="mt-8 md:mt-4 flex-grow text-center md:text-left flex flex-col justify-center">
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
                    className="mt-3 text-sm text-foreground/90 bg-background border border-primary-accent/50 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-primary-accent w-full resize-none"
                />
            ) : (
                profileData?.bio && <p className="mt-3 text-sm text-foreground/90 dark:text-foreground/80 max-w-xl">{profileData.bio}</p>
            )}
          </div>

          <div className="mt-6 md:mt-4 md:ml-auto flex-shrink-0 flex flex-col items-center md:items-end justify-center space-y-2 w-full md:w-auto md:min-w-[200px]">
            {isOwnProfile && !editMode && (
              <div className="w-full md:w-auto space-y-2">
                {/* Main Edit Button */}
              <button onClick={() => setEditMode(true)} 
                  className="bg-gradient-to-r from-primary-accent to-primary-accent/80 hover:from-primary-accent/90 hover:to-primary-accent/70 text-background font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 w-full md:w-auto flex items-center justify-center group">
                  <span className="mr-2 group-hover:scale-110 transition-transform">✏️</span>
                Profili Düzenle
              </button>
                
                {/* Share Profile Button */}
                <button 
                  onClick={handleShareProfile}
                  disabled={shareLoading}
                  className={`font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center group w-full md:w-auto ${
                    isProfileShared 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                  } hover:scale-105`}
                >
                  {shareLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <span className="mr-2 group-hover:scale-110 transition-transform">
                      {isProfileShared ? '🌐' : '🧑‍🌾'}
                    </span>
                  )}
                  <span className="text-sm">
                    {shareLoading 
                      ? 'Güncelleniyor...' 
                      : isProfileShared 
                        ? 'Paylaşıldı' 
                        : 'Toplulukta Paylaş'
                    }
                  </span>
                </button>
                
                {/* Copy Profile Link Button */}
                <button 
                  onClick={copyProfileLink}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 w-full md:w-auto flex items-center justify-center group"
                >
                  <span className="mr-2 group-hover:scale-110 transition-transform">🔗</span>
                  <span className="text-sm">Link Kopyala</span>
                </button>

                {/* Status Indicator */}
                {isProfileShared && (
                  <div className="text-xs text-green-600 dark:text-green-400 text-center md:text-right bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                    <div className="flex items-center justify-center md:justify-end">
                      <span className="mr-1">✅</span>
                      <span className="font-medium text-xs">Toplulukta görünür</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {isOwnProfile && editMode && (
              <div className="flex space-x-3 w-full md:w-auto">
                <button onClick={handleCancelEdit} disabled={saving}
                  className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 dark:from-gray-700 dark:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 text-foreground font-medium py-2.5 px-5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 hover:scale-105 flex items-center justify-center group">
                  <span className="mr-2 group-hover:scale-110 transition-transform">❌</span>
                  İptal
                </button>
                <button onClick={handleSaveProfile} disabled={saving}
                  className="flex-1 bg-gradient-to-r from-primary-accent to-primary-accent/80 hover:from-primary-accent/90 hover:to-primary-accent/70 text-background font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-70 hover:scale-105 flex items-center justify-center group">
                  {saving ? (
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : (
                    <span className="mr-2 group-hover:scale-110 transition-transform">💾</span>
                  )}
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            )}
            


          </div>
        </div>
      </div>

      {/* Ultra-Modern NFT Collection Section */}
      <div className="mt-16">
        {/* Modern Section Header */}
        <div className="relative mb-8">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 left-8 w-24 h-24 bg-primary-accent/10 rounded-full filter blur-xl animate-blob"></div>
            <div className="absolute top-0 right-12 w-20 h-20 bg-blue-500/10 rounded-full filter blur-lg animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-6 md:p-8 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-white/20">
                  <span className="text-3xl">🎨</span>
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black">
                    <span className="bg-gradient-to-r from-primary-accent via-blue-500 to-purple-500 bg-clip-text text-transparent">
                      {nftsTitle}
                    </span>
                  </h2>
                  <p className="text-foreground/60 mt-1">
                    <span className="font-mono text-primary-accent">{userNFTs.length}</span> varlık sergileniyor
                  </p>
                </div>
              </div>
              
              {/* Collection Stats */}
              <div className="hidden md:flex space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-accent">{userNFTs.length}</div>
                  <div className="text-xs text-foreground/60">Toplam</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {userNFTs.filter(nft => nft.name?.includes('🌸') || nft.name?.includes('🍎')).length}
                  </div>
                  <div className="text-xs text-foreground/60">Gelişmiş</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {loadingNFTs ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {[...Array(8)].map((_, index) => (
                    <div key={index} className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-lg overflow-hidden">
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-2 right-2 w-8 h-8 bg-primary-accent/10 rounded-full filter blur-lg animate-blob"></div>
                      </div>
                      
                      <div className="aspect-square bg-gradient-to-br from-primary-accent/20 to-blue-500/20 animate-pulse"></div>
                      <div className="p-4">
                          <div className="h-4 bg-gradient-to-r from-primary-accent/30 to-blue-500/30 rounded-xl mb-2 animate-pulse"></div>
                          <div className="h-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg mb-3 w-2/3 animate-pulse"></div>
                          <div className="h-8 bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-xl animate-pulse"></div>
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
            <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-12 md:p-16 text-center overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-8 left-8 w-32 h-32 bg-primary-accent/10 rounded-full filter blur-2xl animate-blob"></div>
                  <div className="absolute bottom-8 right-8 w-24 h-24 bg-blue-500/10 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
                </div>
                
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20">
                    <span className="text-5xl">🎨</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    {isOwnProfile ? "Koleksiyonunuz Boş" : "Koleksiyon Boş"}
                  </h3>
                  
                  <p className="text-lg text-foreground/70 mb-8 max-w-md mx-auto">
                      {isOwnProfile ? "Henüz sergilenecek bir NFT'niz yok. İlk varlığınızı oluşturun ve koleksiyonunuzu büyütmeye başlayın!" : "Bu bahçıvanın henüz sergilenecek bir NFT'si yok."}
                  </p>
                  
                {isOwnProfile && (
                      <Link href="/mint" className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-accent to-primary-accent/80 hover:from-primary-accent/90 hover:to-primary-accent/70 text-background font-semibold px-8 py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105">
                        <span className="text-xl">🌱</span>
                        <span>İlk Varlığını Mint Et</span>
                    </Link>
                )}
                </div>
            </div>
        )}
      </div>

      {/* Ultra-Modern 3D Garden Section */}
      <div className="mt-20">
        {/* Modern 3D Section Header */}
        <div className="relative mb-8">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 left-8 w-28 h-28 bg-green-500/10 rounded-full filter blur-xl animate-blob"></div>
            <div className="absolute top-0 right-12 w-24 h-24 bg-teal-500/10 rounded-full filter blur-lg animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-6 md:p-8 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-white/20">
                  <span className="text-3xl">🎮</span>
                </div>
          <div>
                  <h2 className="text-2xl md:text-3xl font-black">
                    <span className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
                      {isOwnProfile ? 'Senin 3D Bahçen' : `${displayUsernameText}'in 3D Bahçesi`}
                    </span>
            </h2>
                  <p className="text-foreground/60 mt-1">
              İzometrik görünümde bahçenizi keşfedin ve NFT'lerinizle etkileşim kurun
            </p>
                </div>
          </div>
          
          {/* 3D Controls Info */}
              <div className="hidden md:block bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                <div className="text-foreground font-medium mb-2 flex items-center space-x-2">
                  <span className="text-lg">🎮</span>
                  <span>Kontroller</span>
                </div>
                <div className="text-foreground/60 space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-primary-accent">🖱️</span>
                    <span>Mouse: Döndür</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-500">⚪</span>
                    <span>Scroll: Zoom</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-500">👆</span>
                    <span>Sağ tık: Kaydır</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra-Modern 3D Canvas Container */}
        <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl overflow-hidden">
          {/* Animated Frame Elements */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-4 left-4 w-16 h-16 bg-green-500/10 rounded-full filter blur-xl animate-blob"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 bg-teal-500/10 rounded-full filter blur-lg animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="h-[500px] md:h-[600px] relative">
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
          
          {/* Ultra-Modern Bottom Info Bar */}
          <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border-t border-white/20 dark:border-gray-700/30 px-6 py-4">
            {/* Animated Background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-2 left-8 w-20 h-20 bg-green-500/10 rounded-full filter blur-xl animate-blob"></div>
            </div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3 text-foreground/70">
                <span className="text-2xl">💡</span>
                <span className="text-sm font-medium">3D Bahçe ile NFT'lerinizle etkileşimli deneyim yaşayın</span>
              </div>
              
              <div className="flex space-x-3">
                <button className="bg-gradient-to-r from-green-500/20 to-teal-500/20 hover:from-green-500/30 hover:to-teal-500/30 backdrop-blur-sm border border-white/20 text-foreground text-xs px-4 py-2 rounded-xl transition-all hover:scale-105 flex items-center space-x-2">
                  <span>🏠</span>
                  <span>Tam Ekran</span>
                </button>
                <Link 
                  href={`/garden/${profileWalletAddress}`}
                  className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 backdrop-blur-sm border border-white/20 text-foreground text-xs px-4 py-2 rounded-xl transition-all hover:scale-105 flex items-center space-x-2"
                >
                  <span>📋</span>
                  <span>2D Görünüm</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra-Modern Mobile Controls Info */}
        <div className="mt-6 relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl p-6 md:hidden overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 right-4 w-16 h-16 bg-primary-accent/10 rounded-full filter blur-xl animate-blob"></div>
            <div className="absolute bottom-2 left-4 w-12 h-12 bg-blue-500/10 rounded-full filter blur-lg animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-accent/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-white/20">
                <span className="text-lg">📱</span>
              </div>
              <h3 className="text-foreground font-bold text-lg">Mobil Kontroller</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 rounded-2xl p-3 flex items-center space-x-2">
                <span className="text-primary-accent text-lg">👆</span>
                <span className="text-foreground/70 text-sm">Tek parmak: Döndür</span>
              </div>
              <div className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 rounded-2xl p-3 flex items-center space-x-2">
                <span className="text-blue-500 text-lg">✌️</span>
                <span className="text-foreground/70 text-sm">İki parmak: Zoom</span>
              </div>
              <div className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 rounded-2xl p-3 flex items-center space-x-2">
                <span className="text-green-500 text-lg">🤏</span>
                <span className="text-foreground/70 text-sm">Pinch: Yakınlaştır</span>
              </div>
              <div className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 rounded-2xl p-3 flex items-center space-x-2">
                <span className="text-purple-500 text-lg">🌱</span>
                <span className="text-foreground/70 text-sm">Bitkilere dokunun</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
} 