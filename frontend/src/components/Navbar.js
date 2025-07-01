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
    <>
      {/* Ultra Modern Glassmorphism Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/20">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary-accent/20 rounded-full filter blur-xl animate-blob"></div>
          <div className="absolute -top-4 right-1/4 w-32 h-32 bg-grow-green/20 rounded-full filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-tertiary-accent/20 rounded-full filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo Section - Enhanced */}
            <Link href="/" className="group flex items-center space-x-3 hover:scale-105 transition-all duration-300">
              <div className="relative">
                {/* Logo container with glassmorphism */}
                <div className="w-14 h-14 bg-gradient-to-br from-primary-accent/20 to-grow-green/20 backdrop-blur-sm rounded-2xl border border-white/30 dark:border-gray-700/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  {/* Replace this with your actual logo */}
                  <div className="text-3xl group-hover:animate-bounce">🌿</div>
                  {/* Uncomment and modify when you add your logo:
                  <Image 
                    src="/logo.png" 
                    alt="NFT Garden" 
                    width={40} 
                    height={40}
                    className="w-10 h-10 object-contain"
                  />
                  */}
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-accent/30 to-grow-green/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              <div className="hidden sm:block">
                <div className="text-2xl font-black bg-gradient-to-r from-primary-accent via-grow-green to-tertiary-accent bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                  NFT Garden
                </div>
                <div className="text-xs font-medium text-foreground/60 group-hover:text-foreground/80 transition-colors">
                  ✨ Grow Your Digital Garden
                </div>
              </div>
            </Link>

            {/* Navigation Links - Modern Pills */}
            <div className="hidden md:flex items-center space-x-2">
              {[
                { href: "/", label: "Ana Sayfa", icon: "🏠", color: "from-blue-400 to-cyan-500" },
                { href: "/profiles", label: "Profiller", icon: "🧑‍🌾", color: "from-purple-400 to-pink-500" },
                { href: "/mint", label: "Mint", icon: "🌱", color: "from-green-400 to-emerald-500" },
                { href: "/my-nfts", label: "NFT'lerim", icon: "💎", color: "from-amber-400 to-orange-500" },
                ...(account ? [{ href: `/profile/${account}`, label: "Profilim", icon: "👤", color: "from-indigo-400 to-purple-500" }] : []),
                ...(account ? [{ href: `/garden/${account}`, label: "Bahçem", icon: "🌺", color: "from-pink-400 to-rose-500" }] : []),
              ].map(link => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className="group relative px-4 py-2.5 rounded-2xl bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 hover:bg-white/20 dark:hover:bg-gray-800/30 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg group-hover:scale-125 transition-transform duration-300">{link.icon}</span>
                    <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors whitespace-nowrap">
                      {link.label}
                    </span>
                  </div>
                  {/* Hover gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${link.color} rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
                </Link>
              ))}
            </div>
            
            {/* User Section or Connect Button */}
            <div className="flex items-center space-x-4">
              {account ? (
                <div className="flex items-center space-x-4">
                  {/* Balance Card */}
                  <div className="hidden sm:block bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20 px-4 py-2 hover:bg-white/20 dark:hover:bg-gray-800/30 transition-all duration-300">
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground/90">{formatBalance(balance)} ETH</div>
                      <div className="text-xs text-foreground/60">Bakiye</div>
                    </div>
                  </div>
                  
                  {/* User Profile */}
                  <div className="relative group">
                    <div className="flex items-center space-x-3 bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20 p-2 hover:bg-white/20 dark:hover:bg-gray-800/30 transition-all duration-300 hover:scale-105 cursor-pointer">
                      {userProfile?.profile_image_url ? (
                        <Image 
                          src={userProfile.profile_image_url}
                          alt={displayName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/30 dark:ring-gray-700/30"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-accent to-grow-green rounded-xl flex items-center justify-center ring-2 ring-white/30 dark:ring-gray-700/30">
                          <span className="text-white font-bold text-sm">
                            {displayName.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="hidden sm:block text-right">
                        <div className="text-sm font-semibold text-foreground/90">{displayName}</div>
                        <div className="text-xs text-foreground/60">🟢 Bağlı</div>
                      </div>
                    </div>
                    
                    {/* User dropdown glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-accent/30 to-grow-green/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="group relative bg-gradient-to-r from-primary-accent to-grow-green text-white px-6 py-3 rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border border-white/30 backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-2">
                    {isConnecting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Bağlanıyor...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg group-hover:scale-125 transition-transform duration-300">🔗</span>
                        <span>Cüzdan Bağla</span>
                      </>
                    )}
                  </div>
                  
                  {/* Button glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-accent to-grow-green rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                </button>
              )}
              
              {/* Mobile menu button */}
              <button className="md:hidden w-12 h-12 bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20 flex items-center justify-center hover:bg-white/20 dark:hover:bg-gray-800/30 transition-all duration-300">
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                  <div className="w-6 h-0.5 bg-foreground/80 rounded-full"></div>
                  <div className="w-6 h-0.5 bg-foreground/80 rounded-full"></div>
                  <div className="w-6 h-0.5 bg-foreground/80 rounded-full"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary-accent to-transparent opacity-50"></div>
      </nav>
      
      {/* Spacer for fixed navbar */}
      <div className="h-20"></div>
    </>
  );
} 