'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  EVOLVING_NFT_CONTRACT_ADDRESS, 
  EVOLVING_NFT_ABI,
  MARKETPLACE_CONTRACT_ADDRESS,
  MARKETPLACE_ABI,
  ADMIN_WALLET_ADDRESS 
} from '../../utils/constants';
import { uploadFileToIPFS, createAndUploadMetadata } from '../../utils/pinata';

// --- Helper: Stage Names and URIs ---
const STAGE_NAMES = ['🌰 Tohum', '🌱 Filiz', '🌿 Fidan', '🌸 Çiçek', '🍎 Meyve'];
const STAGE_DESCRIPTIONS = [
  'NFT\'nin başlangıç aşaması',
  'İlk büyüme aşaması', 
  'Genç bitki aşaması',
  'Çiçeklenme aşaması',
  'Olgunluk aşaması'
];
const DEFAULT_EVOLUTION_THRESHOLDS = {
  sprout: 3, sapling: 5, bloom: 7, fruiting: 10
};
// ----------------------------------------

export default function AdminPage() {
  const [account, setAccount] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState([]);

  // NFT Basic Info
  const [nftName, setNftName] = useState('');
  const [nftDescription, setNftDescription] = useState('');
  const [batchSize, setBatchSize] = useState(1);
  const [price, setPrice] = useState('0.01');

  // Stage Images & Thresholds
  const [stageImages, setStageImages] = useState({
    0: null, 1: null, 2: null, 3: null, 4: null
  });
  const [stagePreview, setStagePreview] = useState({
    0: null, 1: null, 2: null, 3: null, 4: null
  });
  const [evolutionThresholds, setEvolutionThresholds] = useState({
    0: 3,  // Seed -> Sprout
    1: 5,  // Sprout -> Sapling  
    2: 7,  // Sapling -> Bloom
    3: 10, // Bloom -> Fruiting
    4: 0   // Final stage
  });

  // --- Authorization and Connection ---
  const checkAuthorization = useCallback(async () => {
    setPageLoading(true);
    try {
      if (typeof window.ethereum === 'undefined') {
        addLog('MetaMask bulunamadı.', 'error');
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const acc = accounts[0].toLowerCase();
        setAccount(acc);
        setIsAuthorized(acc === ADMIN_WALLET_ADDRESS.toLowerCase());
      }
    } catch (error) {
      addLog(`Yetki kontrol hatası: ${error.message}`, 'error');
    } finally {
    setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthorization();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkAuthorization);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkAuthorization);
      }
    };
  }, [checkAuthorization]);

  // --- Logger ---
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [{ timestamp, message, type }, ...prevLogs]);
  };

  // --- Image Handling ---
  const handleImageChange = (stageIndex, e) => {
    const file = e.target.files[0];
    if (file) {
      setStageImages(prev => ({ ...prev, [stageIndex]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setStagePreview(prev => ({ ...prev, [stageIndex]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThresholdChange = (stageIndex, value) => {
    setEvolutionThresholds(prev => ({ 
      ...prev, 
      [stageIndex]: stageIndex === 4 ? 0 : Math.max(1, parseInt(value) || 1)
    }));
  };

  // --- Validation ---
  const validateForm = () => {
    if (!nftName.trim()) {
      addLog('NFT adı gerekli!', 'error');
      return false;
    }
    if (!nftDescription.trim()) {
      addLog('NFT açıklaması gerekli!', 'error');
      return false;
    }
    if (!stageImages[0]) {
      addLog('En az Tohum aşaması için görsel yüklenmelidir!', 'error');
      return false;
    }
    return true;
  };

  // --- Main Process ---
  const handleAdvancedMint = async (e) => {
    e.preventDefault();
    if (!isAuthorized || !validateForm()) return;
    
    setProcessing(true);
    setLogs([]);
    addLog(`🚀 Gelişmiş mint işlemi başlatıldı!`);
    addLog(`📊 ${batchSize} adet "${nftName}" NFT'si mint edilecek, tanesi ${price} ETH.`);

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const evolvingNFTContract = new ethers.Contract(EVOLVING_NFT_CONTRACT_ADDRESS, EVOLVING_NFT_ABI, signer);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI, signer);
      const marketplacePrice = ethers.parseEther(price);

      // Step 1: Upload all stage images to IPFS
      addLog('📤 1. Adım: Görseller IPFS\'e yükleniyor...');
      const stageURIs = {};
      
      for (let stage = 0; stage <= 4; stage++) {
        if (stageImages[stage]) {
          addLog(`   📷 ${STAGE_NAMES[stage]} görseli yükleniyor...`);
          const imageResult = await uploadFileToIPFS(stageImages[stage]);
          if (!imageResult.success) {
            throw new Error(`${STAGE_NAMES[stage]} görseli yüklenemedi: ${imageResult.error}`);
          }
          
          // Create metadata for this stage
          const metadata = {
            name: `${nftName} - ${STAGE_NAMES[stage]}`,
            description: `${nftDescription} - ${STAGE_DESCRIPTIONS[stage]}`,
            image: `ipfs://${imageResult.ipfsHash}`,
            attributes: [
              { trait_type: "Stage", value: STAGE_NAMES[stage] },
              { trait_type: "Stage Number", value: stage },
              { trait_type: "Evolution Threshold", value: evolutionThresholds[stage] || 0 }
            ]
          };

          const metadataResult = await createAndUploadMetadata(
            metadata.name,
            metadata.description, 
            metadata.image,
            metadata.attributes
      );

          if (!metadataResult.success) {
            throw new Error(`${STAGE_NAMES[stage]} metadata'sı yüklenemedi: ${metadataResult.error}`);
      }

          stageURIs[stage] = `ipfs://${metadataResult.ipfsHash}`;
          addLog(`   ✅ ${STAGE_NAMES[stage]} başarıyla yüklendi!`, 'success');
        } else if (stage === 0) {
          throw new Error('Tohum aşaması görseli zorunludur!');
        } else {
          // Use placeholder for missing stages
          stageURIs[stage] = `ipfs://placeholder-${stage}`;
          addLog(`   ⚠️ ${STAGE_NAMES[stage]} görseli yok, placeholder kullanılıyor.`, 'warning');
        }
      }

      // Step 2: Approve Marketplace
      addLog('🔐 2. Adım: Marketplace onayı veriliyor...');
      const approvalTx = await evolvingNFTContract.setApprovalForAll(MARKETPLACE_CONTRACT_ADDRESS, true);
      await approvalTx.wait();
      addLog('✅ Marketplace onaylandı!', 'success');

      // Step 3: Mint, Setup, and List NFTs
      addLog(`🌱 3. Adım: ${batchSize} adet NFT mint ediliyor ve listeleniyor...`);
      
      for (let i = 0; i < batchSize; i++) {
        const currentNum = i + 1;
        addLog(`--- NFT ${currentNum}/${batchSize} işleniyor... ---`);

        // 3.1 Mint
        addLog(`   ${currentNum}.1: Tohum NFT mint ediliyor...`);
        const mintTx = await evolvingNFTContract.mintNFT(account, stageURIs[0]);
        const mintReceipt = await mintTx.wait();
        
        // Get token ID from Transfer event
        const mintEvent = mintReceipt.logs.map(log => {
          try {
            const iface = new ethers.Interface(EVOLVING_NFT_ABI);
            return iface.parseLog(log);
          } catch {
            return null;
          }
        }).find(parsedLog => parsedLog?.name === 'Transfer');

        if (!mintEvent) throw new Error("Token ID bulunamadı!");
        const tokenId = mintEvent.args.tokenId.toString();
        addLog(`   ✅ Token ID ${tokenId} mint edildi!`, 'success');

        // 3.2 Setup Evolution Stages
        addLog(`   ${currentNum}.2: Evrim aşamaları ayarlanıyor...`);
        for (let stage = 1; stage <= 4; stage++) {
          if (stageURIs[stage]) {
            await evolvingNFTContract.setStageDetails(
              tokenId, 
              stage, 
              stageURIs[stage], 
              evolutionThresholds[stage-1] || 0
            );
          }
        }
        addLog(`   ✅ Tüm aşamalar ayarlandı!`, 'success');

        // 3.3 List on Marketplace
        addLog(`   ${currentNum}.3: Marketplace'te listeleniyor...`);
        const listTx = await marketplaceContract.listNFT(EVOLVING_NFT_CONTRACT_ADDRESS, tokenId, marketplacePrice);
        await listTx.wait();
        addLog(`   ✅ ${price} ETH fiyatıyla listelendi!`, 'success');
      }

      addLog('🎉🎉🎉 TÜM İŞLEMLER BAŞARIYLA TAMAMLANDI!', 'success');
      addLog(`🛍️ ${batchSize} adet "${nftName}" NFT'si marketplace'te satışa çıkarıldı!`, 'success');

    } catch (error) {
      console.error(error);
      addLog(`❌ HATA: ${error.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // --- Reset Form ---
  const resetForm = () => {
    setNftName('');
    setNftDescription('');
    setBatchSize(1);
    setPrice('0.01');
    setStageImages({ 0: null, 1: null, 2: null, 3: null, 4: null });
    setStagePreview({ 0: null, 1: null, 2: null, 3: null, 4: null });
    setEvolutionThresholds({ 0: 3, 1: 5, 2: 7, 3: 10, 4: 0 });
    setLogs([]);
  };

  // --- Render Logic ---
  if (pageLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-accent border-r-transparent"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 p-6 rounded-lg max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-2">🚫 Yetkisiz Erişim!</h2>
          <p>Bu sayfayı sadece Admin görüntüleyebilir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">🧑‍🌾 Gelişmiş Admin Paneli</h1>
        <p className="text-foreground/70">5 Aşamalı Evolution NFT Mint & Marketplace Sistemi</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAIN FORM - 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Basic Info */}
          <div className="bg-secondary-accent rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-foreground mb-4">📝 Temel Bilgiler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
                <label className="block text-sm font-medium text-foreground mb-1">NFT Adı *</label>
                <input
                  type="text"
                  value={nftName}
                  onChange={(e) => setNftName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md"
                  placeholder="Örn: Sihirli Ayçiçeği"
                  required
                />
        </div>
        <div>
                <label className="block text-sm font-medium text-foreground mb-1">Açıklama *</label>
                <textarea
                  value={nftDescription}
                  onChange={(e) => setNftDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md"
                  placeholder="Bu NFT'nin hikayesi..."
                  rows="3"
                  required
                />
        </div>
        <div>
                <label className="block text-sm font-medium text-foreground mb-1">Mint Sayısı</label>
                <input
                  type="number"
                  min="1"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md"
                />
        </div>
        <div>
                <label className="block text-sm font-medium text-foreground mb-1">Satış Fiyatı (ETH)</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-primary-accent/50 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Stage Images & Evolution */}
          <div className="bg-secondary-accent rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-foreground mb-4">🖼️ Aşama Görselleri & Evrim Eşikleri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4].map(stageIndex => (
                <div key={stageIndex} className="bg-background/50 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    {STAGE_NAMES[stageIndex]} {stageIndex === 0 && '*'}
                  </h3>
                  
                  {/* Image Upload */}
                  <div className="border-2 border-dashed border-primary-accent/50 rounded-lg p-3 mb-3 hover:border-primary-accent transition-colors">
                    {stagePreview[stageIndex] ? (
                      <img 
                        src={stagePreview[stageIndex]} 
                        alt={STAGE_NAMES[stageIndex]}
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                    ) : (
                      <div className="h-32 flex items-center justify-center text-foreground/50">
                        <span className="text-4xl">📷</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(stageIndex, e)}
                      className="w-full text-xs text-foreground/70"
                      required={stageIndex === 0}
                    />
        </div>
        
                  {/* Evolution Threshold */}
                  {stageIndex < 4 && (
        <div>
                      <label className="block text-xs font-medium text-foreground/80 mb-1">
                        Sonraki aşama için sulama
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={evolutionThresholds[stageIndex]}
                        onChange={(e) => handleThresholdChange(stageIndex, e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-background border border-primary-accent/30 rounded"
                      />
                    </div>
              )}
            </div>
          ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleAdvancedMint}
              disabled={processing}
              className="flex-1 bg-primary-accent text-background font-bold py-4 px-6 rounded-lg hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
            >
              {processing && <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div>}
              <span>{processing ? 'İşlem Sürüyor...' : '🚀 Gelişmiş Mint & Liste'}</span>
            </button>
            <button
              onClick={resetForm}
              disabled={processing}
              className="bg-gray-500 text-white font-medium py-4 px-6 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              🔄 Sıfırla
          </button>
          </div>
        </div>

        {/* LOG PANEL - 1 column */}
        <div className="bg-secondary-accent rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-4">📋 İşlem Kayıtları</h2>
          <div className="bg-background/50 rounded-md p-4 h-96 overflow-y-auto space-y-2 text-sm">
            {logs.length === 0 ? (
              <p className="text-foreground/50 italic text-center mt-10">İşlem başladığında kayıtlar burada görünecek...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`flex items-start space-x-2 ${
                  log.type === 'error' ? 'text-red-400' : 
                  log.type === 'success' ? 'text-green-400' : 
                  log.type === 'warning' ? 'text-yellow-400' :
                  'text-foreground/80'
                }`}>
                  <span className="font-mono text-xs text-foreground/50 min-w-max">{log.timestamp}</span>
                  <p className="break-words">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 