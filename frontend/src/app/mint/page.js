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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary-accent/20 to-tertiary-accent/10">
      {/* Ultra Modern Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-green-500/10 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-primary-accent/10 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-grow-green/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative container mx-auto px-4 py-16 max-w-4xl">
          {/* Modern Hero Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500/20 to-primary-accent/20 backdrop-blur-sm rounded-3xl border border-white/30 dark:border-gray-700/30 mb-8 hover:scale-110 transition-transform duration-300">
              <span className="text-4xl animate-bounce">🌱</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-green-500 via-primary-accent to-grow-green bg-clip-text text-transparent">
                Create Your
              </span>
              <br />
              <span className="text-3xl md:text-4xl text-foreground/80 font-bold">
                Digital Seed
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-foreground/70 mb-8 max-w-2xl mx-auto leading-relaxed">
              ✨ Dijital varlığınızı bir NFT'ye dönüştürün ve bahçenizde sergileyin. 
              <br className="hidden md:block" />
              Her tohum benzersiz bir hikaye anlatır.
            </p>

            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-black text-foreground">IPFS</div>
                <div className="text-sm text-foreground/60">Decentralized</div>
              </div>
              <div className="w-px h-12 bg-foreground/20"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-foreground">🔗</div>
                <div className="text-sm text-foreground/60">Blockchain</div>
              </div>
              <div className="w-px h-12 bg-foreground/20"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-foreground">∞</div>
                <div className="text-sm text-foreground/60">Forever</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message - Ultra Modern */}
      <div className="relative container mx-auto px-4 max-w-2xl">
        {mintedTokenId && (
          <div className="relative bg-gradient-to-r from-green-500/10 via-primary-accent/10 to-grow-green/10 backdrop-blur-xl rounded-3xl p-6 mb-8 border border-green-500/30 dark:border-green-400/30 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 right-4 w-20 h-20 bg-green-500/10 rounded-full filter blur-2xl animate-blob"></div>
              <div className="absolute bottom-2 left-4 w-16 h-16 bg-primary-accent/10 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-primary-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🌱</span>
              </div>
              
              <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
                Tohum Başarıyla Ekildi! 🎉
              </h3>
              <p className="text-green-700 dark:text-green-300 mb-4">
                <strong>Token ID:</strong> #{mintedTokenId.toString()}
              </p>
              
              <Link 
                href="/my-nfts" 
                className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-primary-accent text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/30 backdrop-blur-sm"
              >
                <span className="mr-2 group-hover:scale-125 transition-transform duration-300">🌺</span>
                Bahçemi Görüntüle
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Ultra Modern Form Container */}
        <div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl rounded-3xl p-8 shadow-4xl border border-white/30 dark:border-gray-700/30 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-4 w-32 h-32 bg-primary-accent/10 rounded-full filter blur-3xl animate-blob"></div>
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-green-500/10 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
          </div>

          <div className="relative z-10">
            {/* Form Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-accent/20 to-green-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📝</span>
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-primary-accent to-green-500 bg-clip-text text-transparent mb-2">
                NFT Detayları
              </h2>
              <p className="text-foreground/70">Tohumunuzun bilgilerini girin</p>
            </div>

            <form onSubmit={handleMint} className="space-y-8">
              {/* Ultra Modern Image Upload */}
              <div>
                <label className="block text-sm font-bold text-foreground/90 mb-4 flex items-center">
                  <span className="mr-2">🖼️</span>
                  Tohum/Bitki Resmi *
                </label>
                <div className="relative bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm rounded-3xl p-8 border-2 border-dashed border-white/30 dark:border-gray-600/30 hover:border-primary-accent/50 transition-all duration-300 group">
                  {preview ? (
                    <div className="space-y-6">
                      <div className="relative">
                        <img 
                          src={preview} 
                          alt="Preview" 
                          className="mx-auto max-h-64 rounded-2xl shadow-2xl border border-white/20"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPreview(null);
                          setFormData({ ...formData, image: null });
                        }}
                        className="group mx-auto flex items-center px-4 py-2 bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-500/30 transition-all duration-300 hover:scale-105 border border-red-500/30"
                      >
                        <span className="mr-2 group-hover:scale-125 transition-transform duration-300">🗑️</span>
                        Resmi Değiştir
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary-accent/20 to-green-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-3xl">📸</span>
                      </div>
                      <div>
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-lg font-bold text-foreground group-hover:text-primary-accent transition-colors duration-300">
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
                        <p className="mt-3 text-sm text-foreground/60">
                          PNG, JPG, GIF • Max 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modern Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-foreground/90 mb-4 flex items-center">
                  <span className="mr-2">🏷️</span>
                  Tohum/Bitki Adı *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-6 py-4 bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-primary-accent/50 focus:border-primary-accent/50 transition-all duration-300 text-foreground placeholder-foreground/50 font-medium"
                    placeholder="Örn: Ayçiçeği Tohumu"
                    maxLength="100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-accent/5 to-green-500/5 rounded-2xl pointer-events-none"></div>
                </div>
                <div className="text-right text-xs text-foreground/60 mt-2">
                  {formData.name.length}/100
                </div>
              </div>

              {/* Modern Description Input */}
              <div>
                <label htmlFor="description" className="block text-sm font-bold text-foreground/90 mb-4 flex items-center">
                  <span className="mr-2">📝</span>
                  Açıklama *
                </label>
                <div className="relative">
                  <textarea
                    id="description"
                    name="description"
                    rows="4"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-6 py-4 bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-2xl focus:ring-2 focus:ring-primary-accent/50 focus:border-primary-accent/50 transition-all duration-300 text-foreground placeholder-foreground/50 font-medium resize-none"
                    placeholder="Bu özel tohum hakkında bilgi..."
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-accent/5 to-green-500/5 rounded-2xl pointer-events-none"></div>
                </div>
              </div>

              {/* Ultra Modern Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full px-8 py-4 bg-gradient-to-r from-green-500 via-primary-accent to-grow-green text-white rounded-2xl font-black text-lg transition-all duration-300 hover:scale-105 hover:shadow-4xl disabled:opacity-50 disabled:hover:scale-100 border border-white/30 backdrop-blur-sm"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"></div>
                      <span>Tohum Toprakta...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <span className="text-2xl group-hover:scale-125 transition-transform duration-300">🌱</span>
                      <span>Tohumu Toprağa Bırak</span>
                      <span className="text-2xl group-hover:scale-125 transition-transform duration-300">✨</span>
                    </div>
                  )}
                </button>
              </div>
            </form>

            {/* Modern Info Panel */}
            <div className="mt-8 bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-600/20">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">💡</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-3 flex items-center">
                    Mint İşlemi Hakkında
                  </h3>
                  <div className="space-y-2 text-sm text-foreground/70">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>Resminiz önce IPFS'e yüklenecek</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>Metadata blockchain'e kaydedilecek</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      <span>İşlem yaklaşık 1-2 dakika sürebilir</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>Gas ücretleri gerekebilir</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 