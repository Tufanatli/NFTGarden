'use client';

import { useState } from 'react';
import Link from 'next/link';
import { web3Service } from '../../utils/web3';
import { uploadFileToIPFS, createAndUploadMetadata } from '../../utils/pinata';

export default function MintPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mintedTokenId, setMintedTokenId] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      
      // Preview oluştur
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleMint = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.image) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      // 1. Cüzdan bağlantısını kontrol et
      const connection = await web3Service.checkConnection();
      if (!connection.connected) {
        const connectResult = await web3Service.connectWallet();
        if (!connectResult.success) {
          alert('Cüzdan bağlantısı başarısız');
          setLoading(false);
          return;
        }
      }

      // 2. Resmi IPFS'e yükle
      console.log('Resim IPFS\'e yükleniyor...');
      const imageResult = await uploadFileToIPFS(formData.image);
      if (!imageResult.success) {
        throw new Error('Resim yükleme başarısız: ' + imageResult.error);
      }

      // 3. Metadata oluştur ve IPFS'e yükle
      console.log('Metadata oluşturuluyor...');
      const metadataResult = await createAndUploadMetadata(
        formData.name,
        formData.description,
        imageResult.url,
        []
      );
      if (!metadataResult.success) {
        throw new Error('Metadata yükleme başarısız: ' + metadataResult.error);
      }

      // 4. NFT'yi mint et
      console.log('NFT mint ediliyor...');
      const tokenUriForContract = `ipfs://${metadataResult.ipfsHash}`;

      const mintResult = await web3Service.mintNFT(
        tokenUriForContract,
        formData.name,
        formData.description
      );

      if (mintResult.success) {
        setMintedTokenId(mintResult.tokenId);
        alert('NFT başarıyla mint edildi ve bahçenize eklenmeye hazır!');
        
        // Formu sıfırla
        setFormData({ name: '', description: '', image: null });
        setPreview(null);
      } else {
        throw new Error('NFT mint etme başarısız: ' + mintResult.error);
      }

    } catch (error) {
      console.error('Mint hatası:', error);
      alert('Bir hata oluştu: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            🌱 Yeni Bir Tohum Ek
          </h1>
          <p className="text-foreground text-opacity-80 dark:text-opacity-90">
            Dijital varlığınızı bir NFT'ye dönüştürün ve bahçenizde sergileyin.
          </p>
        </div>

        {mintedTokenId && (
          <div className="bg-primary-accent/20 border border-primary-accent text-primary-accent dark:text-foreground px-4 py-3 rounded-lg mb-6 shadow">
            <strong>Harika!</strong> Tohumunuz başarıyla ekildi. Token ID: #{mintedTokenId.toString()}
            <div className="mt-2">
              <Link 
                href="/my-nfts" 
                className="text-primary-accent hover:brightness-110 font-semibold underline"
              >
                Bahçenizdeki NFT'leri Görüntüleyin
              </Link>
            </div>
          </div>
        )}

        <div className="bg-secondary-accent rounded-xl shadow-lg p-6">
          <form onSubmit={handleMint} className="space-y-6">
            {/* Resim Yükleme */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tohum/Bitki Resmi *
              </label>
              <div className="border-2 border-dashed border-primary-accent/50 dark:border-primary-accent/70 rounded-lg p-6 text-center hover:border-primary-accent transition-colors">
                {preview ? (
                  <div className="space-y-4">
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="mx-auto max-h-64 rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null);
                        setFormData({ ...formData, image: null });
                      }}
                      className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 text-sm font-medium"
                    >
                      Resmi Değiştir
                    </button>
                  </div>
                ) : (
                  <div>
                    <svg className="mx-auto h-12 w-12 text-primary-accent/70" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-foreground hover:text-primary-accent">
                          Resim yüklemek için tıklayın veya sürükleyin
                        </span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                      <p className="mt-2 text-xs text-foreground text-opacity-70 dark:text-opacity-80">
                        PNG, JPG, GIF (Max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* NFT Adı */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Tohum/Bitki Adı *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent placeholder:text-foreground/50"
                placeholder="Örn: Ayçiçeği Tohumu"
                maxLength="100"
              />
              <div className="text-right text-xs text-foreground text-opacity-70 dark:text-opacity-80 mt-1">
                {formData.name.length}/100
              </div>
            </div>

            {/* Açıklama */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                Açıklama *
              </label>
              <textarea
                id="description"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent placeholder:text-foreground/50"
                placeholder="Bu özel tohum hakkında bilgi..."
              />
            </div>

            {/* Mint Butonu */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-accent hover:brightness-95 text-background font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    İşleniyor...
                  </>
                ) : (
                  'Tohumu Toprağa Bırak'
                )}
              </button>
            </div>

            {/* Bilgi */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Mint İşlemi Hakkında
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Resminiz önce IPFS'e yüklenecek</li>
                      <li>Metadata blockchain'e kaydedilecek</li>
                      <li>İşlem yaklaşık 1-2 dakika sürebilir</li>
                      <li>Gas ücretleri gerekebilir</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 