# NFT Marketplace

Bu proje Next.js, Hardhat, Solidity ve Pinata kullanarak geliştirilmiş basit bir NFT marketplace uygulamasıdır.

## 🚀 Özellikler

- ✅ MetaMask cüzdan bağlantısı
- ✅ NFT mint etme
- ✅ Kendi NFT'lerinizi görüntüleme
- ✅ NFT'leri satışa çıkarma
- ✅ Satışa çıkarılan NFT'lerden satın alma
- ✅ IPFS (Pinata) entegrasyonu
- ✅ Responsive tasarım

## 🛠 Teknolojiler

- **Frontend:** Next.js, React, Tailwind CSS
- **Blockchain:** Hardhat, Solidity, Ethers.js
- **Storage:** Pinata (IPFS)
- **Wallet:** MetaMask

## 📦 Kurulum

### 1. Repository'yi klonlayın
```bash
git clone <repo-url>
cd nft-marketplace
```

### 2. Backend (Blockchain) Kurulumu
```bash
cd blockchain
npm install
```

### 3. Frontend Kurulumu
```bash
cd frontend
npm install
```

### 4. Pinata Hesabı Oluşturun
1. [Pinata Cloud](https://pinata.cloud/) hesabı oluşturun
2. API anahtarlarınızı alın
3. `frontend/.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key  
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
```

## 🔧 Çalıştırma

### 1. Hardhat Lokal Ağını Başlatın
```bash
cd blockchain
npx hardhat node
```

### 2. Contract'ları Deploy Edin
Yeni terminal açın:
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Contract Adreslerini Güncelleyin
Deploy sonrası çıkan adresleri `frontend/src/utils/constants.js` dosyasında güncelleyin.

### 4. Frontend'i Başlatın
```bash
cd frontend
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 🦊 MetaMask Kurulumu

1. [MetaMask](https://metamask.io/) browser extension'ını yükleyin
2. Hardhat lokal ağını MetaMask'a ekleyin:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

3. Hardhat'in verdiği test hesaplarından birini MetaMask'a import edin

## 📱 Kullanım

### NFT Mint Etme
1. "NFT Mint Et" sayfasına gidin
2. Resim yükleyin
3. NFT adı ve açıklamasını girin
4. "NFT Mint Et" butonuna tıklayın

### NFT Satışa Çıkarma
1. "NFT'lerim" sayfasına gidin
2. Satmak istediğiniz NFT'de "Satışa Çıkar" butonuna tıklayın
3. Fiyat belirleyin ve onaylayın

### NFT Satın Alma
1. Ana sayfada satışa çıkarılan NFT'leri görüntüleyin
2. Beğendiğiniz NFT'de "Satın Al" butonuna tıklayın
3. İşlemi onaylayın

## 🏗 Proje Yapısı

```
nft-marketplace/
├── blockchain/
│   ├── contracts/
│   │   ├── NFT.sol
│   │   └── Marketplace.sol
│   ├── scripts/
│   │   └── deploy.js
│   └── hardhat.config.js
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.js          # Ana sayfa
    │   │   ├── mint/page.js     # NFT mint sayfası
    │   │   └── my-nfts/page.js  # Kullanıcı NFT'leri
    │   ├── components/
    │   │   ├── Navbar.js
    │   │   └── NFTCard.js
    │   └── utils/
    │       ├── constants.js     # Contract ABI'leri
    │       ├── web3.js         # Blockchain etkileşimi
    │       └── pinata.js       # IPFS işlemleri
    └── package.json
```

## 🔧 Smart Contract Detayları

### NFT Contract
- ERC721 standardında NFT oluşturma
- Metadata ve açıklama desteği
- Token sahibi sorgulamaları

### Marketplace Contract
- NFT listeleme sistemi
- Güvenli satın alma işlemleri
- %2.5 marketplace komisyonu
- Listing iptal etme

## 🚨 Güvenlik Notları

- Bu proje eğitim amaçlıdır
- Production kullanımı için ek güvenlik önlemleri alın
- Private key'lerinizi asla paylaşmayın
- Test ağında çalıştırın

## 🤝 Katkı

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## ❓ Sorun Giderme

### MetaMask bağlanmıyor
- MetaMask'ın Hardhat ağında olduğundan emin olun
- Sayfayı yenileyin ve tekrar deneyin

### Contract bulunamıyor
- Contract adreslerinin doğru olduğundan emin olun
- Hardhat node'unun çalıştığından emin olun

### IPFS yükleme başarısız
- Pinata API anahtarlarınızı kontrol edin
- İnternet bağlantınızı kontrol edin

## 🆘 Destek

Sorularınız için GitHub Issues kullanabilirsiniz. 