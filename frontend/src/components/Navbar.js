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
    setLoading(true);
    try {
      const result = await web3Service.connectWallet();
      if (result.success) {
        setAccount(result.account);
      } else {
        alert('Cüzdan bağlantısı başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Bağlantı hatası:', error);
      alert('Bir hata oluştu');
    }
    setLoading(false);
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance) => {
    return parseFloat(balance).toFixed(4);
  };

  const displayName = userProfile?.username || (account ? formatAddress(account) : 'Kullanıcı');

  const navLinkClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors hover:brightness-110";
  const navTextColor = isDark ? "text-dark-fg" : "text-light-fg";
  const navAccentTextColor = isDark ? "hover:text-dark-primary" : "hover:text-light-primary";
  const buttonBg = isDark ? "bg-dark-primary" : "bg-light-primary";
  const buttonText = isDark ? "text-dark-bg" : "text-light-bg";
  const buttonHoverBg = isDark ? "hover:bg-dark-primary/90" : "hover:bg-light-primary/90";
  const profilePlaceholderBg = isDark ? "bg-dark-secondary" : "bg-light-secondary";
  const profilePlaceholderText = isDark ? "text-dark-primary" : "text-light-primary";

  return (
    <nav className={`shadow-lg bg-light-secondary dark:bg-dark-secondary`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className={`${navTextColor} text-xl font-bold`}>
                🌿 NFT Garden
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {[
              { href: "/", label: "Ana Sayfa" },
              { href: "/mint", label: "NFT Mint Et" },
              { href: "/my-nfts", label: "NFT'lerim" },
              ...(account ? [{ href: `/profile/${account}`, label: "Profilim" }] : []),
              ...(account ? [{ href: `/garden/${account}`, label: "Bahçem 🪴" }] : []),
            ].map(link => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`${navTextColor} ${navAccentTextColor} ${navLinkClasses}`}
              >
                {link.label}
              </Link>
            ))}
            
            {account ? (
              <div className="flex items-center space-x-3">
                <div className={`${navTextColor} text-sm text-right`}>
                  <div className="font-semibold">{displayName}</div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formatBalance(balance)} ETH</div>
                </div>
                {userProfile?.profile_image_url ? (
                  <Image 
                    src={userProfile.profile_image_url}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover bg-white dark:bg-gray-700"
                  />
                ) : (
                  <div className={`w-8 h-8 ${profilePlaceholderBg} rounded-full flex items-center justify-center`}>
                    <span className={`${profilePlaceholderText} font-bold text-sm`}>
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading}
                className={`${buttonBg} ${buttonText} ${buttonHoverBg} px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50`}
              >
                {loading ? 'Bağlanıyor...' : 'Cüzdan Bağla'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 