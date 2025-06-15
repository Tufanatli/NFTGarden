import { supabase } from './supabaseClient';
import { getProfileByWallet } from './profileService'; // Profil kontrolü için

// Bir cüzdan adresine ait bahçe ayarlarını getirir
export const getGardenSettingsByWallet = async (walletAddress) => {
  if (!walletAddress) return null;
  try {
    const { data, error } = await supabase
      .from('gardens')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: Kayıt bulunamadı
      console.error('Bahçe ayarları getirme hatası:', error);
      return null;
    }
    return data; // Kayıt varsa döner, yoksa null döner
  } catch (error) {
    console.error('Beklenmedik bahçe ayarları getirme hatası:', error);
    return null;
  }
};

// Bir cüzdan adresine ait bahçe ayarlarını getirir veya profil varsa oluşturur
export const getOrCreateGardenSettings = async (walletAddress) => {
  if (!walletAddress) {
    console.log('[GardenService] Cüzdan adresi yok, çıkılıyor.');
    return null;
  }
  const lowercasedWalletAddress = walletAddress.toLowerCase();
  console.log('[GardenService] getOrCreateGardenSettings için adres:', lowercasedWalletAddress);

  let gardenSettings = await getGardenSettingsByWallet(lowercasedWalletAddress);

  if (gardenSettings) {
    console.log('[GardenService] Mevcut bahçe ayarları bulundu:', gardenSettings);
    return gardenSettings;
  }

  // Bahçe ayarı yok, oluşturmayı dene. Ama önce profil var mı diye kontrol et.
  console.log('[GardenService] Mevcut bahçe ayarı bulunamadı, profil kontrol ediliyor...');
  const profile = await getProfileByWallet(lowercasedWalletAddress);

  if (!profile) {
    console.warn(`[GardenService] Cüzdan adresi (${lowercasedWalletAddress}) için profil bulunamadı. Bahçe oluşturulmayacak.`);
    // İsteğe bağlı olarak kullanıcıya bir mesaj gösterilebilir.
    return null; // Profil yoksa bahçe de oluşturma
  }

  console.log('[GardenService] Profil bulundu, yeni bahçe ayarları oluşturuluyor...');
  try {
    const { data: newGarden, error: insertError } = await supabase
      .from('gardens')
      .insert({
        wallet_address: lowercasedWalletAddress,
        is_public: true, // Varsayılan olarak herkese açık
      })
      .select()
      .single();

    if (insertError) {
      console.error('[GardenService] Bahçe ayarları oluşturma Supabase hatası:', insertError);
      return null;
    }
    console.log('[GardenService] Yeni bahçe ayarları başarıyla oluşturuldu:', newGarden);
    return newGarden;
  } catch (e) {
    console.error('[GardenService] Beklenmedik bahçe ayarları oluşturma genel hatası:', e);
    return null;
  }
};

// Bahçe gizlilik ayarını günceller
export const updateGardenPrivacy = async (walletAddress, isPublic) => {
  if (!walletAddress) return null;
  try {
    const { data, error } = await supabase
      .from('gardens')
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq('wallet_address', walletAddress.toLowerCase())
      .select()
      .single();

    if (error) {
      console.error('Bahçe gizlilik güncelleme hatası:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Beklenmedik bahçe gizlilik güncelleme hatası:', error);
    return null;
  }
}; 