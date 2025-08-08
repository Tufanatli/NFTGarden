# NFT Garden — Evolving NFT Marketplace

A full‑stack web3 application where NFTs grow and evolve through stages over time. Create seed NFTs, water them to progress through 5 evolution stages (Seed → Sprout → Sapling → Bloom → Fruiting), and trade them on a built‑in marketplace. Includes a modern Next.js frontend, robust smart contracts, IPFS (Pinata) integration for metadata, and Supabase profiles.

## ✨ Features
- Evolving NFTs with 5 stages, per‑token stage URIs and evolution thresholds
- Watering and evolve mechanics secured on‑chain
- Marketplace: list, buy, cancel; 2.5% fee to marketplace owner
- Standard NFT minting (non‑evolving) with name/description support
- Admin panel for batch minting evolving NFTs and auto‑listing
- IPFS/Pinata media + metadata upload
- Supabase‑backed user profiles and community profiles page
- 3D isometric garden view (React Three Fiber) to visualize your evolving NFTs

## 🧱 Architecture
- Smart Contracts (Hardhat, Solidity, OpenZeppelin)
  - `NFT.sol`: Simple ERC721 with URI storage, name/description, burn
  - `Marketplace.sol`: Listings, purchases, cancel; fee split
  - `EvolvingNFT.sol`: Stage data per token, watering counter, stage thresholds, evolution
- Frontend (Next.js, React, Tailwind CSS, Ethers v6)
- Storage: IPFS via Pinata (images + metadata)
- Profiles: Supabase (public anon key in development; move to env for production)

## 📂 Project Structure
```
NFTGarden/
  blockchain/                 # Hardhat workspace
    contracts/                # NFT, Marketplace, EvolvingNFT
    scripts/                  # Deploy & helper scripts
    test/                     # Evolving NFT tests
  frontend/                   # Next.js app (App Router)
    src/app/                  # Pages (Home, Mint, My NFTs, Admin, Garden, Profiles)
    src/components/           # UI & 3D components
    src/utils/                # Web3, ABIs, services, constants
```

## ⚙️ Prerequisites
- Node.js 18+ (recommended)
- npm or yarn
- MetaMask (browser extension)

## 🔧 Setup
1) Install dependencies
```
cd blockchain && npm install
cd ../frontend && npm install
```

2) Configure Pinata API (for IPFS uploads)
Create `frontend/.env.local`:
```
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
```

3) (Optional) Configure Supabase
- Current demo uses a hardcoded anon key in `frontend/src/utils/supabaseClient.js`. For production, move URL/key to environment variables.

## 🚀 Local Development
1) Start Hardhat local node
```
cd blockchain
npm run node
```

2) Compile & Deploy contracts (saves addresses to frontend automatically)
```
npm run compile
npm run deploy
```
The deploy script writes addresses to `frontend/src/utils/contractAddresses.json`, which the frontend reads at runtime.

3) Start the frontend
```
cd ../frontend
npm run dev
```
Open http://localhost:3000 and connect MetaMask (Hardhat network).

## 🧪 Running Tests
```
cd blockchain
npm run test
```
Notes:
- `EvolvingNFT` includes a watering cooldown check. In this repo, `WATERING_COOLDOWN` is currently set to `0` for easier local testing. If you enable a non‑zero cooldown, adjust tests accordingly.

## 🕹️ How to Use
- Home (Marketplace): Browse active listings, filter/sort, and purchase
- Mint: Create standard NFTs with image/name/description (IPFS upload)
- My NFTs: View your owned NFTs (standard + evolving), list them, cancel listings, transfer
- Admin: Batch mint evolving NFTs, set per‑stage URIs and thresholds, auto‑list
- Garden: Water and evolve your EvolvingNFTs, visualize progress in 2D/3D
- Profiles: View shared community profiles (Supabase)

## 📜 Smart Contracts Overview
- `NFT.sol`
  - `mint(tokenURI, name, description)`
  - `burnNFT(tokenId)`
  - `getTokensByOwner(owner)` and metadata getters
- `Marketplace.sol`
  - `listNFT(nftContract, tokenId, price)`
  - `buyNFT(listingId)` (payable)
  - `cancelListing(listingId)`
  - `getActiveListings()`, `getListingsByUser(user)`
- `EvolvingNFT.sol`
  - `mintNFT(recipient, initialSeedURI)`
  - `setStageDetails(tokenId, stage, uri, threshold)` (or `batchSetStageDetails`)
  - `water(tokenId)`, `evolve(tokenId)`
  - `getNFTDetails(tokenId)` returns current stage, watering count, thresholds, URIs, and evolve readiness

## 🧩 Scripts
From `blockchain/package.json`:
- `npm run compile` → `npx hardhat compile`
- `npm run node` → `npx hardhat node`
- `npm run deploy` → `npx hardhat run scripts/deploy.js --network localhost`

Helper scripts:
- `scripts/list-seeds.js` (example for minting & listing seeds) — prefer parsing `Transfer` events for token IDs instead of reading private counters.

## 🔐 Security & Notes
- Demo project; review and harden before production
- Store keys (Pinata, Supabase) in environment variables
- Validate/limit on‑chain approvals (Marketplace uses approval/approvalForAll semantics)
- If you change evolution cooldowns/thresholds, align UI/UX and tests

## 📄 License
MIT 