'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { web3Service } from '../utils/web3';
import { getProfileByWallet } from '../utils/profileService';

export default function Navbar() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
    // İstemci tarafında temanın açık mı koyu mu olduğunu kontrol et
    setIsDark(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    const darkModeListener = (e) => setIsDark(e.matches);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', darkModeListener);
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', darkModeListener);
    };
  }, []);

  useEffect(() => {
    if (account) {
      loadProfile(account);
      web3Service.getBalance(account).then(setBalance);
    }
  }, [account]);

  const loadProfile = async (currentAccount) => {
    const profile = await getProfileByWallet(currentAccount);
    setUserProfile(profile);
  };

  const checkConnection = async () => {
    const result = await web3Service.checkConnection();
    if (result.connected) {
      setAccount(result.account);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const result = await web3Service.connectWallet();
      if (result.success) {
        setAccount(result.account);
      } else {
        alert('Cüzdan bağlantısı başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Cüzdan bağlantısı sırasında hata oluştu');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    // Clear any stored connection data if needed
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance) => {
    return parseFloat(balance).toFixed(4);
  };

  const displayName = userProfile?.username || (account ? formatAddress(account) : 'Kullanıcı');

  return (
    <nav style={{backgroundColor: 'var(--navbar-bg)'}} className="shadow-lg border-b border-green-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-green-200 to-green-100 rounded-lg flex items-center justify-center">
                🌿
              </div>
              <div className="text-xl font-bold text-white">
                NFT Garden
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-1">
            {[
              { href: "/", label: "🏠 Ana Sayfa" },
              { href: "/profiles", label: "👥 Profiller" },
              { href: "/mint", label: "🌱 Mint" },
              { href: "/my-nfts", label: "💎 NFT'lerim" },
              ...(account ? [{ href: `/profile/${account}`, label: "👤 Profilim" }] : []),
              ...(account ? [{ href: `/garden/${account}`, label: "🌺 Bahçem" }] : []),
            ].map(link => (
              <Link 
                key={link.href}
                href={link.href} 
                className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/20 hover:text-white transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
            
            {account ? (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-green-200">
                <div className="text-sm text-right">
                  <div className="font-semibold text-white">{displayName}</div>
                  <div className="text-xs text-green-200">{formatBalance(balance)} ETH</div>
                </div>
                {userProfile?.profile_image_url ? (
                  <Image 
                    src={userProfile.profile_image_url}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-green-200/20"
                  />
                ) : (
                  <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                    <span className="text-green-800 font-bold text-sm">
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md ml-4"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"></div>
                    <span>Bağlanıyor...</span>
                  </>
                ) : (
                  <>
                    <span>🔗</span>
                    <span>Cüzdan Bağla</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 