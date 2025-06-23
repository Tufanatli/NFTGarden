'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Text, Box, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import TestFruit from './TestFruit';

// NFT Card Component for 3D
function NFTCard3D({ position = [0, 0, 0], nft, onClick }) {
  const meshRef = useRef();
  const planeRef = useRef();
  const [texture, setTexture] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const { camera } = useThree(); // Get camera for billboard effect
  
  // Load NFT image as texture
  useEffect(() => {
    console.log(`🎨 NFTCard3D for ${nft?.name || nft?.tokenId}:`, {
      hasImage: !!nft?.image,
      imageUrl: nft?.image,
      imageError,
      nft: nft
    });
    
    if (nft?.image && !imageError) {
      console.log(`🔄 Starting to load image for NFT ${nft?.name || nft?.tokenId}:`, nft.image);
      setImageLoading(true);
      const loader = new THREE.TextureLoader();
      
      // Set cross origin for IPFS images
      loader.setCrossOrigin('anonymous');
      
      loader.load(
        nft.image,
        (loadedTexture) => {
          console.log(`✅ Successfully loaded texture for NFT ${nft?.name || nft?.tokenId}`);
          loadedTexture.flipY = true;  // Fixed: flipY true for correct orientation with billboard effect
          loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
          loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
          loadedTexture.minFilter = THREE.LinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          
          // Apply texture immediately for better UX
          setTexture(loadedTexture);
          setImageLoading(false);
          console.log(`🖼️ Texture applied for NFT ${nft?.name || nft?.tokenId}`, {
            texture: loadedTexture,
            width: loadedTexture.image?.width,
            height: loadedTexture.image?.height
          });
        },
        (progress) => {
          // Loading progress
          console.log(`📊 Loading progress for NFT ${nft?.name || nft?.tokenId}:`, (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
          console.warn(`❌ Failed to load NFT image for ${nft?.name || nft?.tokenId}:`, nft.image, error);
          setImageError(true);
          setImageLoading(false);
        }
      );
    } else if (!nft?.image) {
      console.log(`⚠️ No image URL found for NFT ${nft?.name || nft?.tokenId}, using fallback`);
    }
  }, [nft?.image, imageError]);
  
  // Animate the card and billboard effect
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.02;
    }
    
    // Billboard effect: NFT image always faces the camera
    if (planeRef.current && camera) {
      planeRef.current.lookAt(camera.position);
    }
  });

  // Get stage info from NFT
  const getStageFromNFT = () => {
    if (nft?.details?.currentStage !== undefined) {
      return nft.details.currentStage;
    }
    return 0; // Default to seed stage
  };

  const stage = getStageFromNFT();
  const stageNames = ['Seed', 'Sprout', 'Sapling', 'Bloom', 'Fruiting'];
  const stageName = stageNames[stage] || 'Unknown';

  // Debug render condition (removed for performance)

  return (
    <group position={position} onClick={() => onClick && onClick(nft)}>
      {/* Base platform */}
      <mesh position={[0, 0.05, 0]} ref={meshRef}>
        <boxGeometry args={[0.9, 0.1, 0.9]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      
      {/* NFT Image Plane or Fallback */}
      {texture && !imageError && !imageLoading ? (
        <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0]} ref={planeRef}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial 
            map={texture} 
            transparent={true}
            alphaTest={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : imageLoading ? (
        // Loading indicator
        <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshStandardMaterial color="#cccccc" transparent opacity={0.7} />
        </mesh>
      ) : (
        // Fallback fruit model if image fails or not available
        <TestFruit position={[0, 0.1, 0]} stage={stage} />
      )}
      
      {/* Loading indicator ring */}
      {imageLoading && (
        <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.35, 8]} />
          <meshStandardMaterial color="#ffaa00" transparent opacity={0.8} />
        </mesh>
      )}
      
      {/* NFT Info Text */}
      <Text
        position={[0, 0.9, 0]}
        fontSize={0.08}
        color="#2d4a2b"
        anchorX="center"
        anchorY="middle"
        maxWidth={1}
      >
        {nft?.name || `NFT #${nft?.tokenId}`}
      </Text>
      
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.06}
        color="#6b7c6b"
        anchorX="center"
        anchorY="middle"
      >
        {stageName} ({stage}/4)
      </Text>
      
      {/* Stage progress indicator */}
      {nft?.details && (
        <Text
          position={[0, 0.7, 0]}
          fontSize={0.05}
          color="#52b788"
          anchorX="center"
          anchorY="middle"
        >
          💧 {nft.details.wateringCount}/{nft.details.currentStageEvolutionThreshold}
        </Text>
      )}
      
      {/* Hover effect border */}
      <mesh position={[0, 0.05, 0]} visible={false}>
        <boxGeometry args={[1, 0.12, 1]} />
        <meshStandardMaterial color="#90EE90" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// Grid Cell Component
function GridCell({ position, isOccupied = false, isSelected = false, onClick }) {
  const color = isOccupied ? "#8b4513" : isSelected ? "#90EE90" : "#654321";
  const height = isOccupied ? 0.1 : 0.05;

  return (
    <mesh position={[position[0], height/2, position[2]]} onClick={onClick}>
      <boxGeometry args={[0.9, height, 0.9]} />
      <meshStandardMaterial 
        color={color} 
        transparent 
        opacity={isOccupied ? 1 : 0.7}
      />
    </mesh>
  );
}

// Main Isometric Garden Component
export default function IsometricGarden({ userNFTs = [], onNFTClick }) {
  const [selectedCell, setSelectedCell] = useState(null);
  
  // Calculate optimal grid size based on NFT count
  const calculateGridSize = (nftCount) => {
    if (nftCount === 0) return 4; // Minimum grid
    const sideLength = Math.ceil(Math.sqrt(nftCount));
    return Math.max(4, Math.min(8, sideLength + 1)); // Between 4-8 grid size
  };
  
  const gridSize = calculateGridSize(userNFTs.length);
  
  // Create grid positions
  const gridPositions = [];
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      gridPositions.push([x - gridSize/2 + 0.5, 0, z - gridSize/2 + 0.5]);
    }
  }

  const handleCellClick = (position) => {
    const key = `${position[0]},${position[2]}`;
    setSelectedCell(selectedCell === key ? null : key);
  };

  const handleNFTClick = (nft) => {
    if (onNFTClick) {
      onNFTClick(nft);
    } else {
      alert(`🌱 ${nft.name || `NFT #${nft.tokenId}`} tıklandı!\nStage: ${nft.details?.currentStage || 0}\nBurada sulama ve evrim işlemleri yapılabilir.`);
    }
  };

  return (
    <group>
      {/* Grid Cells */}
      {gridPositions.map((pos, index) => {
        const isOccupied = index < userNFTs.length;
        const key = `${pos[0]},${pos[2]}`;
        const isSelected = selectedCell === key;
        
        return (
          <GridCell
            key={index}
            position={pos}
            isOccupied={isOccupied}
            isSelected={isSelected}
            onClick={() => handleCellClick(pos)}
          />
        );
      })}

      {/* NFT Cards */}
      {userNFTs.slice(0, gridPositions.length).map((nft, index) => {
        const position = gridPositions[index];
        
        return (
          <NFTCard3D
            key={nft.tokenId || index}
            position={[position[0], 0, position[2]]}
            nft={nft}
            onClick={handleNFTClick}
          />
        );
      })}

      {/* Info Text */}
      <Text
        position={[0, 3, -gridSize/2 - 1]}
        fontSize={0.5}
        color="#2d4a2b"
        anchorX="center"
        anchorY="middle"
      >
        🌱 3D NFT Garden
      </Text>

      <Text
        position={[0, 2.5, -gridSize/2 - 1]}
        fontSize={0.3}
        color="#6b7c6b"
        anchorX="center"
        anchorY="middle"
      >
        {userNFTs.length > 0 ? `${userNFTs.length} NFT görüntüleniyor` : 'Henüz NFT bulunmuyor'}
      </Text>

      {/* Empty state message */}
      {userNFTs.length === 0 && (
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.4}
          color="#999"
          anchorX="center"
          anchorY="middle"
        >
          🏜️ Bahçe Boş
        </Text>
      )}

      {/* Decorative elements */}
      <mesh position={[-gridSize/2 - 0.5, 0.5, -gridSize/2 - 0.5]}>
        <boxGeometry args={[0.3, 1, 0.3]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      
      <mesh position={[gridSize/2 + 0.5, 0.5, -gridSize/2 - 0.5]}>
        <boxGeometry args={[0.3, 1, 0.3]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
    </group>
  );
}

// Error boundary for texture loading
IsometricGarden.defaultProps = {
  userNFTs: [],
  onNFTClick: null
}; 