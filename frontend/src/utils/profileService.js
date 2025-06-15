import { supabase } from './supabaseClient';

// Kullanıcının profilini cüzdan adresine göre getirir
export const getProfileByWallet = async (walletAddress) => {
  if (!walletAddress) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single(); // Tek bir kayıt bekliyoruz

    if (error && error.code !== 'PGRST116') { // PGRST116: Kayıt bulunamadı hatası, bu normal olabilir
      console.error('Profil getirme hatası:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Beklenmedik profil getirme hatası:', error);
    return null;
  }
};

// Yeni bir profil oluşturur veya mevcutsa getirir
export const getOrCreateProfile = async (walletAddress) => {
  if (!walletAddress) {
    console.log('[getOrCreateProfile] Cüzdan adresi yok, çıkılıyor.');
    return null;
  }
  const lowercasedWalletAddress = walletAddress.toLowerCase();
  console.log('[getOrCreateProfile] Adres:', lowercasedWalletAddress);

  let profile = await getProfileByWallet(lowercasedWalletAddress);
  console.log('[getOrCreateProfile] getProfileByWallet sonucu:', profile);

  if (profile) {
    console.log('[getOrCreateProfile] Mevcut profil bulundu:', profile);
    return profile;
  }

  console.log('[getOrCreateProfile] Mevcut profil bulunamadı, yeni profil oluşturuluyor...');
  try {
    const { data, error, status } = await supabase
      .from('profiles')
      .insert([{ wallet_address: lowercasedWalletAddress, username: null, bio: null, profile_image_url: null, profile_background_image_url: null }])
      .select() // Oluşturulan kaydı geri döndür
      .single();

    console.log('[getOrCreateProfile] Insert işlemi sonucu - Data:', data);
    console.log('[getOrCreateProfile] Insert işlemi sonucu - Error:', error);
    console.log('[getOrCreateProfile] Insert işlemi sonucu - Status:', status);

    if (error) {
      console.error('[getOrCreateProfile] Profil oluşturma Supabase hatası:', error);
      return null;
    }
    if (!data) {
      console.warn('[getOrCreateProfile] Profil oluşturuldu ama Supabase data dönmedi. Bu beklenmedik bir durum.');
      return null;
    }
    console.log('[getOrCreateProfile] Yeni profil başarıyla oluşturuldu:', data);
    return data;
  } catch (e) { // Genel try-catch bloğu
    console.error('[getOrCreateProfile] Beklenmedik profil oluşturma genel hatası:', e);
    return null;
  }
};

// Profil bilgilerini günceller
export const updateProfile = async (walletAddress, updates) => {
  if (!walletAddress || !updates) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('wallet_address', walletAddress.toLowerCase())
      .select()
      .single();

    if (error) {
      console.error('Profil güncelleme hatası:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Beklenmedik profil güncelleme hatası:', error);
    return null;
  }
};

// Profil resmini Supabase Storage'a yükler
export const uploadProfileImage = async (file, walletAddress, type = 'profilepictures') => {
  if (!file || !walletAddress) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${walletAddress.toLowerCase()}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  try {
    console.log(`[uploadProfileImage] Yükleniyor: ${type}/${filePath}, Dosya:`, file);
    const { error: uploadError } = await supabase.storage
      .from(type) // 'profile-pictures' veya 'profilebackgroundpictures'
      .upload(filePath, file, { upsert: true }); // upsert: true üzerine yazar

    if (uploadError) {
      console.error(`Resim yükleme hatası (${type}/${filePath}):`, uploadError);
      return null;
    }

    console.log(`[uploadProfileImage] Yüklendi, public URL alınıyor: ${type}/${filePath}`);
    // Yüklenen resmin public URL'ini al
    const { data: publicUrlData, error: publicUrlError } = supabase.storage
      .from(type)
      .getPublicUrl(filePath);

    if (publicUrlError) {
      console.error(`Public URL alma hatası (${type}/${filePath}):`, publicUrlError);
      return null;
    }
    
    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error(`Yüklenen resmin public URL'i alınamadı (${type}/${filePath}). Dönen veri:`, publicUrlData);
      return null;
    }
    console.log(`[uploadProfileImage] Public URL alındı: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error(`Beklenmedik resim yükleme hatası (${type}/${filePath}):`, error);
    return null;
  }
};

// Kullanıcı adını cüzdan adresine göre getirir (kısa yol)
export const getUsernameByWallet = async (walletAddress) => {
  if (!walletAddress) return 'Bilinmeyen Kullanıcı';
  const profile = await getProfileByWallet(walletAddress);
  return profile?.username || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}; 