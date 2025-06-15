'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { web3Service } from '../../utils/web3';
import SeedNFT_ABI from '../../utils/contracts/SeedNFT.json';
import { uploadFileToIPFS, createAndUploadMetadata } from '../../utils/pinata';

const SEED_NFT_CONTRACT_ADDRESS = "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690"; 
const ADMIN_WALLET_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; 

export default function AdminPage() {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [recipientAddress, setRecipientAddress] = useState('');
  const [nftName, setNftName] = useState('');
  const [nftDescription, setNftDescription] = useState('');
  const [nftImage, setNftImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [attributes, setAttributes] = useState([{ trait_type: '', value: '' }]);
  
  const [minting, setMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState('');

  const checkAuthorization = useCallback(async () => {
    setPageLoading(true);
    try {
      const connection = await web3Service.checkConnection();
      if (connection.connected) {
        const acc = connection.account.toLowerCase();
        setCurrentAccount(acc);
        setIsAuthorized(acc === ADMIN_WALLET_ADDRESS);
      } else {
        setCurrentAccount(null);
        setIsAuthorized(false);
      }
    } catch (error) {
      console.error("Yetki kontrol hatası:", error);
      setCurrentAccount(null);
      setIsAuthorized(false);
    }
    setPageLoading(false);
  }, []);

  useEffect(() => {
    checkAuthorization();
  }, [checkAuthorization]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNftImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAttributeChange = (index, event) => {
    const values = [...attributes];
    values[index][event.target.name] = event.target.value;
    setAttributes(values);
  };

  const addAttribute = () => setAttributes([...attributes, { trait_type: '', value: '' }]);
  const removeAttribute = (index) => setAttributes(attributes.filter((_, i) => i !== index));

  const handleSubmitMint = async (e) => {
    e.preventDefault();
    if (!recipientAddress || !nftName || !nftDescription || !nftImage) {
      setMintStatus('Hata: Lütfen tüm zorunlu alanları (Alıcı, İsim, Açıklama, Resim) doldurun.');
      return;
    }
    if (!ethers.utils.isAddress(recipientAddress)) {
      setMintStatus('Hata: Geçersiz alıcı cüzdan adresi.');
      return;
    }

    setMinting(true);
    setMintStatus('Yeni tohum hazırlanıyor ve Pinata\'ya yükleniyor...');

    try {
      if (!window.ethereum) throw new Error("MetaMask bulunamadı.");
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      setMintStatus('Resim Pinata\'ya yükleniyor...');
      const imageUploadResult = await uploadFileToIPFS(nftImage);
      if (!imageUploadResult.success || !imageUploadResult.ipfsHash) {
        throw new Error(`Resim Pinata'ya yüklenemedi: ${imageUploadResult.error || 'IPFS hash alınamadı'}`);
      }
      const imageIpfsUrl = `ipfs://${imageUploadResult.ipfsHash}`;

      setMintStatus('Resim başarıyla yüklendi. Metadata oluşturuluyor...');
      const finalAttributes = attributes.filter(attr => attr.trait_type.trim() !== '' && attr.value.trim() !== '');
      const metadataUploadResult = await createAndUploadMetadata(
        nftName,
        nftDescription,
        imageIpfsUrl,
        finalAttributes
      );

      if (!metadataUploadResult.success || !metadataUploadResult.ipfsHash) {
        throw new Error(`Metadata Pinata'ya yüklenemedi: ${metadataUploadResult.error || 'IPFS hash alınamadı'}`);
      }
      const metadataTokenUri = `ipfs://${metadataUploadResult.ipfsHash}`;
      
      setMintStatus('Metadata başarıyla oluşturuldu. Tohum NFT mint ediliyor...');
      const seedNFTContract = new ethers.Contract(SEED_NFT_CONTRACT_ADDRESS, SeedNFT_ABI.abi, signer);
      const tx = await seedNFTContract.mintSeed(recipientAddress, metadataTokenUri);
      
      setMintStatus(`İşlem gönderildi: ${tx.hash}. Zincir üzerinde onay bekleniyor...`);
      await tx.wait();

      setMintStatus(`🌱 Tohum NFT başarıyla mint edildi! Alıcı: ${recipientAddress}, URI: ${metadataTokenUri}`);
      setRecipientAddress('');
      setNftName('');
      setNftDescription('');
      setNftImage(null);
      setImagePreview(null);
      setAttributes([{ trait_type: '', value: '' }]);

    } catch (error) {
      console.error("Tohum NFT mint etme hatası:", error);
      setMintStatus(`Hata: ${error.message || 'Bilinmeyen bir hata oluştu.'}`);
    } finally {
      setMinting(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-foreground text-lg">Yetki kontrol ediliyor, lütfen bekleyin...</p>
        <div className="mt-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-accent border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="bg-secondary-accent p-8 rounded-xl shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4">🔒 Admin Erişimi</h2>
            <p className="text-foreground text-opacity-80 dark:text-opacity-90 mb-6">Bu sayfaya erişmek için lütfen admin cüzdanınızı bağlayın.</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-2">🚫 Yetkisiz Erişim!</h2>
            <p>Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-foreground text-center">🧑‍🌾 Admin Paneli - Yeni Tohum Ek</h1>
      
      <form onSubmit={handleSubmitMint} className="bg-secondary-accent shadow-xl rounded-lg px-6 md:px-8 pt-6 pb-8 mb-4 max-w-2xl mx-auto space-y-6">
        <div>
          <label htmlFor="recipientAddress" className="block text-sm font-medium text-foreground mb-1">Alıcı Cüzdan Adresi *</label>
          <input type="text" id="recipientAddress" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-primary-accent sm:text-sm placeholder:text-foreground/50"
            placeholder="0x..." required />
        </div>

        <div>
          <label htmlFor="nftName" className="block text-sm font-medium text-foreground mb-1">Tohum Adı *</label>
          <input type="text" id="nftName" value={nftName} onChange={(e) => setNftName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-primary-accent sm:text-sm placeholder:text-foreground/50"
            placeholder="Örn: Kadife Çiçeği Tohumu" required />
        </div>

        <div>
          <label htmlFor="nftDescription" className="block text-sm font-medium text-foreground mb-1">Tohum Açıklaması *</label>
          <textarea id="nftDescription" value={nftDescription} onChange={(e) => setNftDescription(e.target.value)} rows="3"
            className="mt-1 block w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-primary-accent sm:text-sm placeholder:text-foreground/50"
            placeholder="Bu tohumun özellikleri, hikayesi..." required />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Tohum Resmi *</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-primary-accent/50 border-dashed rounded-md hover:border-primary-accent transition-colors">
            <div className="space-y-1 text-center">
              {imagePreview ? (
                <img src={imagePreview} alt="Önizleme" className="mx-auto h-40 w-auto rounded-md shadow" />
              ) : (
                <svg className="mx-auto h-12 w-12 text-primary-accent/70" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <div className="flex text-sm text-foreground/80">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-background rounded-md font-medium text-primary-accent hover:text-primary-accent/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:ring-primary-accent px-2 py-1">
                  <span>Resim Yükle</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                </label>
                <p className="pl-1">veya sürükleyip bırakın</p>
              </div>
              <p className="text-xs text-foreground/60">PNG, JPG, GIF (Max 10MB)</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium text-foreground mb-2">Özellikler (Attributes)</h3>
          {attributes.map((attribute, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input type="text" name="trait_type" placeholder="Özellik Adı (örn: Nadirlik)" value={attribute.trait_type} onChange={event => handleAttributeChange(index, event)}
                className="block w-1/2 px-3 py-2 bg-background border border-primary-accent/50 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-accent placeholder:text-foreground/50" />
              <input type="text" name="value" placeholder="Değer (örn: Çok Nadir)" value={attribute.value} onChange={event => handleAttributeChange(index, event)}
                className="block w-1/2 px-3 py-2 bg-background border border-primary-accent/50 rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-accent placeholder:text-foreground/50" />
              {attributes.length > 1 && (
                <button type="button" onClick={() => removeAttribute(index)} 
                  className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 p-1 rounded-full text-sm font-bold">✖</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addAttribute}
            className="mt-2 text-sm text-primary-accent hover:text-primary-accent/80 font-medium py-1.5 px-3 border border-primary-accent/70 rounded-md hover:bg-primary-accent/10 transition-colors">
            + Özellik Ekle
          </button>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={minting}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-background bg-primary-accent hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary-accent focus:ring-primary-accent disabled:opacity-70 disabled:cursor-not-allowed transition-all">
            {minting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Tohum Ekiliyor...
                </>
              ) : 'Tohumu Mint Et'}
          </button>
        </div>

        {mintStatus && (
          <p className={`mt-4 text-sm text-center font-medium ${mintStatus.startsWith('Hata:') ? 'text-red-600 dark:text-red-400' : 'text-primary-accent dark:text-dark-primary'}`}>
            {mintStatus}
          </p>
        )}
      </form>
    </div>
  );
} 