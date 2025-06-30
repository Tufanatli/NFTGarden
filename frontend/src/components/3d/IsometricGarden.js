'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Text, Box, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import TestFruit from './TestFruit';
import { EVOLVING_NFT_CONTRACT_ADDRESS } from '../../utils/constants';

// Natural Sky Background Component
function NaturalSkyBackground() {
  const skyRef = useRef();
  
  useFrame((state) => {
    if (skyRef.current) {
      // Slow rotation for subtle movement
      skyRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });
  
  // Create gradient sky colors
  const skyColors = [
    '#87CEEB', // Sky blue (top)
    '#98D8E8', // Light blue
    '#B8E6B8', // Light green-blue
    '#D4F1D4', // Very light green
    '#F0F8E8'  // Almost white-green (horizon)
  ];
  
  return (
    <group ref={skyRef}>
      {/* Large sphere as sky dome */}
      <mesh position={[0, 0, 0]} scale={[100, 100, 100]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial 
          color="#87CEEB"
          side={THREE.BackSide}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Floating clouds */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh 
          key={`cloud-${i}`}
          position={[
            (Math.random() - 0.5) * 80,
            15 + Math.random() * 20,
            (Math.random() - 0.5) * 80
          ]}
          scale={[
            2 + Math.random() * 3,
            1 + Math.random() * 2,
            2 + Math.random() * 3
          ]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial 
            color="#ffffff"
            transparent
            opacity={0.3 + Math.random() * 0.4}
          />
        </mesh>
      ))}
      
      {/* Distant mountains silhouette */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh 
          key={`mountain-${i}`}
          position={[
            (i - 4) * 15,
            -5 + Math.random() * 8,
            -60 - Math.random() * 20
          ]}
          scale={[
            3 + Math.random() * 4,
            8 + Math.random() * 12,
            2
          ]}
        >
          <coneGeometry args={[1, 1, 8]} />
          <meshBasicMaterial 
            color="#2E5266"
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
      
      {/* Distant trees - more natural */}
      {Array.from({ length: 40 }).map((_, i) => {
        const angle = (i / 40) * Math.PI * 2; // Distribute around circle
        const radius = 20 + Math.random() * 40; // Distance from center
        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 10;
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 10;
        const treeHeight = 2 + Math.random() * 4;
        const trunkWidth = 0.3 + Math.random() * 0.4;
        const crownSize = 1.5 + Math.random() * 2;
        
        return (
          <group key={`tree-${i}`}>
            {/* Tree trunk */}
            <mesh 
              position={[x, treeHeight/2 - 2, z]}
              scale={[trunkWidth, treeHeight, trunkWidth]}
            >
              <cylinderGeometry args={[1, 1.2, 1, 8]} />
              <meshBasicMaterial 
                color={`hsl(30, 40%, ${20 + Math.random() * 20}%)`}
                transparent
                opacity={0.6}
              />
            </mesh>
            
            {/* Tree crown - multiple layers for natural look */}
            <mesh 
              position={[x, treeHeight - 1, z]}
              scale={[crownSize, crownSize * 0.8, crownSize]}
            >
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial 
                color={`hsl(120, 60%, ${15 + Math.random() * 20}%)`}
                transparent
                opacity={0.7}
              />
            </mesh>
            
            {/* Additional crown layer for volume */}
            <mesh 
              position={[x + (Math.random() - 0.5) * 0.5, treeHeight - 0.5, z + (Math.random() - 0.5) * 0.5]}
              scale={[crownSize * 0.7, crownSize * 0.6, crownSize * 0.7]}
            >
              <sphereGeometry args={[1, 6, 4]} />
              <meshBasicMaterial 
                color={`hsl(120, 50%, ${20 + Math.random() * 15}%)`}
                transparent
                opacity={0.5}
              />
            </mesh>
          </group>
                 );
       })}
       
       {/* Additional inner ring of trees for density */}
       {Array.from({ length: 25 }).map((_, i) => {
         const angle = (i / 25) * Math.PI * 2 + 0.3; // Offset for variety
         const radius = 15 + Math.random() * 10; // Closer inner ring
         const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 5;
         const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 5;
         const treeHeight = 1.5 + Math.random() * 3;
         const trunkWidth = 0.2 + Math.random() * 0.3;
         const crownSize = 1 + Math.random() * 1.5;
         
         return (
           <group key={`inner-tree-${i}`}>
             {/* Tree trunk */}
             <mesh 
               position={[x, treeHeight/2 - 2, z]}
               scale={[trunkWidth, treeHeight, trunkWidth]}
             >
               <cylinderGeometry args={[1, 1.2, 1, 8]} />
               <meshBasicMaterial 
                 color={`hsl(30, 40%, ${20 + Math.random() * 20}%)`}
                 transparent
                 opacity={0.7}
               />
             </mesh>
             
             {/* Tree crown */}
             <mesh 
               position={[x, treeHeight - 1, z]}
               scale={[crownSize, crownSize * 0.8, crownSize]}
             >
               <sphereGeometry args={[1, 8, 6]} />
               <meshBasicMaterial 
                 color={`hsl(120, 60%, ${15 + Math.random() * 20}%)`}
                 transparent
                 opacity={0.8}
               />
             </mesh>
           </group>
         );
       })}
    </group>
  );
}

// 3D NFT Garden Logo Component (GLB Model)
function NFTGardenLogo({ position = [0, 2, -4] }) {
  const groupRef = useRef();
  const { scene, error } = useGLTF('/models/nft-garden-logo.glb');
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    if (error) {
      console.log('GLB logo not found, using fallback text');
      setFallbackMode(true);
    }
  }, [error]);

  useFrame((state) => {
    if (groupRef.current) {
      // Smooth floating animation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.05;
      
      // Subtle scale pulsing
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      groupRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position} ref={groupRef}>
      {!fallbackMode && scene ? (
        // GLB 3D Model
        <primitive 
          object={scene.clone()} 
          scale={[2, 2, 2]}
          position={[0, 0, 0]}
        />
      ) : (
        // Fallback Text Logo
        <group>
          <Text
            position={[0, 0, 0]}
            fontSize={0.8}
            color="#52b788"
            anchorX="center"
            anchorY="middle"
            font="/fonts/bold-font.woff"
            outlineWidth={0.02}
            outlineColor="#2d5016"
          >
            NFT GARDEN
          </Text>
          <Text
            position={[0, 0, -0.1]}
            fontSize={0.8}
            color="#2d5016"
            anchorX="center"
            anchorY="middle"
            font="/fonts/bold-font.woff"
          >
            NFT GARDEN
          </Text>
        </group>
      )}
      
      {/* Particle effects around logo */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh 
          key={`particle-${i}`}
          position={[
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 2
          ]}
        >
          <sphereGeometry args={[0.03]} />
          <meshStandardMaterial 
            color="#90EE90"
            transparent
            opacity={0.4 + Math.random() * 0.6}
            emissive="#90EE90"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
      
      {/* Floating leaves effect */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh 
          key={`leaf-${i}`}
          position={[
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 3
          ]}
          rotation={[
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          ]}
        >
          <planeGeometry args={[0.1, 0.15]} />
          <meshStandardMaterial 
            color="#7CB342"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Individual Grass Tile Component with Distance Fade
function GrassTile({ position, colorIndex, distanceFromCenter }) {
  const grassColors = [
    '#4CAF50', // Standard green
    '#43A047', // Medium green
    '#388E3C', // Medium dark green
    '#2E7D32', // Dark green
    '#1B5E20', // Very dark green
    '#558B2F', // Olive green
    '#689F38', // Forest green
    '#33691E'  // Deep forest green
  ];
  
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle breathing animation
      const wave = Math.sin(state.clock.elapsedTime * 2 + position[0] + position[2]) * 0.005;
      meshRef.current.position.y = -0.005 + wave;
    }
  });
  
  // Calculate opacity based on distance from center
  const maxDistance = 3; // Maximum distance for full opacity
  const fadeDistance = 1.5; // Distance where fading starts
  let opacity = 1;
  
  if (distanceFromCenter > fadeDistance) {
    opacity = Math.max(0.1, 1 - (distanceFromCenter - fadeDistance) / (maxDistance - fadeDistance));
  }
  
  // Debug: log some values
  if (Math.random() < 0.01) { // Only log 1% to avoid spam
    console.log(`Tile at distance ${distanceFromCenter.toFixed(2)}, opacity: ${opacity.toFixed(2)}`);
  }

  return (
    <mesh 
      ref={meshRef}
      position={[position[0], -0.005, position[2]]}
    >
      <boxGeometry args={[0.25, 0.01, 0.25]} />
      <meshStandardMaterial 
        color={grassColors[colorIndex % grassColors.length]}
        roughness={0.8}
        metalness={0.1}
        transparent={true}
        opacity={opacity}
      />
    </mesh>
  );
}

// Checkered Grass Ground with Individual Tiles
function CheckeredGrassGround({ size = 20 }) {
  const tiles = [];
  const tilesPerSide = size;
  
  // Create grid of grass tiles
  for (let x = 0; x < tilesPerSide; x++) {
    for (let z = 0; z < tilesPerSide; z++) {
      const posX = (x - tilesPerSide / 2 + 0.5) * 0.25;
      const posZ = (z - tilesPerSide / 2 + 0.5) * 0.25;
      
      // Calculate distance from center for fade effect
      const distanceFromCenter = Math.sqrt(posX * posX + posZ * posZ);
      
      // Create organic-looking color variation
      const colorIndex = ((x * 3 + z * 5) + Math.floor((x + z) / 2)) % 8;
      
      tiles.push(
        <GrassTile
          key={`${x}-${z}`}
          position={[posX, 0, posZ]}
          colorIndex={colorIndex}
          distanceFromCenter={distanceFromCenter}
        />
      );
    }
  }
  
  return <>{tiles}</>;
}

// Soil Tile Component  
function SoilTile({ position, isOccupied = false, isSelected = false, onClick }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.position.y = 0.05 + Math.sin(state.clock.elapsedTime * 4) * 0.02;
    }
  });

  return (
    <group>
      {/* Soil tile */}
      <mesh 
        ref={meshRef}
        position={[position[0], 0.05, position[2]]} 
        onClick={onClick}
      >
        <boxGeometry args={[0.9, 0.1, 0.9]} />
        <meshStandardMaterial 
          color={isOccupied ? "#8b4513" : isSelected ? "#a0522d" : "#6b4226"}
          roughness={0.8}
        />
      </mesh>
      
      {/* Soil tile border */}
      <mesh position={[position[0], 0.11, position[2]]}>
        <boxGeometry args={[0.95, 0.02, 0.95]} />
        <meshStandardMaterial 
          color="#5d3317"
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* Selection glow effect */}
      {isSelected && (
        <mesh position={[position[0], 0.12, position[2]]}>
          <boxGeometry args={[1.1, 0.02, 1.1]} />
          <meshStandardMaterial 
            color="#90EE90"
            transparent
            opacity={0.5}
            emissive="#90EE90"
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

// NFT Card Component for 3D
function NFTCard3D({ position = [0, 0, 0], nft, onClick }) {
  const meshRef = useRef();
  const planeRef = useRef();
  const [texture, setTexture] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const { camera } = useThree();
  
  // Load NFT image as texture
  useEffect(() => {
    if (nft?.image && !imageError) {
      setImageLoading(true);
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      
      loader.load(
        nft.image,
        (loadedTexture) => {
          loadedTexture.flipY = true;
          loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
          loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
          loadedTexture.minFilter = THREE.LinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          
          setTexture(loadedTexture);
          setImageLoading(false);
        },
        (progress) => {
          console.log(`Loading progress: ${(progress.loaded / progress.total * 100)}%`);
        },
        (error) => {
          console.warn('Failed to load NFT image:', error);
          setImageError(true);
          setImageLoading(false);
        }
      );
    }
  }, [nft?.image, imageError]);
  
  // Animate the card and billboard effect
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime + position[0]) * 0.05;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.02;
    }
    
    // Billboard effect
    if (planeRef.current && camera) {
      planeRef.current.lookAt(camera.position);
    }
  });

  const getStageFromNFT = () => {
    if (nft?.details?.currentStage !== undefined) {
      return nft.details.currentStage;
    }
    return 0;
  };

  const stage = getStageFromNFT();
  const stageNames = ['Seed', 'Sprout', 'Sapling', 'Bloom', 'Fruiting'];
  const stageName = stageNames[stage] || 'Unknown';

  return (
    <group position={position} onClick={() => onClick && onClick(nft)}>
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
        <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshStandardMaterial color="#cccccc" transparent opacity={0.7} />
        </mesh>
      ) : (
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
    </group>
  );
}

// Main Isometric Garden Component
export default function IsometricGarden({ userNFTs = [], onNFTClick }) {
  const [selectedCell, setSelectedCell] = useState(null);
  
  // Filter only evolving NFTs for 3D garden display
  const evolvingNFTs = userNFTs.filter(nft => {
    // Check if it's an evolving NFT based on contract address or stage indicators
    return nft?.contractAddress?.toLowerCase() === EVOLVING_NFT_CONTRACT_ADDRESS.toLowerCase() ||
           nft?.name?.includes('🌰') || nft?.name?.includes('🌱') || nft?.name?.includes('🌿') || 
           nft?.name?.includes('🌸') || nft?.name?.includes('🍎') ||
           (nft?.metadata?.attributes && nft.metadata.attributes.some(attr => 
             attr.trait_type === 'Stage Number' || attr.trait_type === 'Stage'
           )) ||
           nft?.details?.currentStage !== undefined; // Has evolution details
  });
  
  // Calculate grid based on evolving NFT count - only create soil tiles for evolving NFTs
  const nftCount = evolvingNFTs.length;
  const gridCols = Math.ceil(Math.sqrt(nftCount)) || 1;
  const gridRows = Math.ceil(nftCount / gridCols) || 1;
  
  // Create positions only for the number of NFTs we have
  const soilPositions = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (soilPositions.length < nftCount) {
        soilPositions.push([
          col - gridCols/2 + 0.5, 
          0, 
          row - gridRows/2 + 0.5
        ]);
      }
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
      {/* Checkered Grass Ground */}
      <CheckeredGrassGround size={24} />
      
      {/* 3D NFT Garden Logo */}
      <NFTGardenLogo position={[0, 2.5, -Math.max(gridRows, gridCols) - 2]} />

      {/* Soil Tiles - Only for NFTs */}
      {soilPositions.map((pos, index) => {
        const key = `${pos[0]},${pos[2]}`;
        const isSelected = selectedCell === key;
        
        return (
          <SoilTile
            key={`soil-${index}`}
            position={pos}
            isOccupied={true}
            isSelected={isSelected}
            onClick={() => handleCellClick(pos)}
          />
        );
      })}

      {/* NFT Cards - Only Evolving NFTs */}
      {evolvingNFTs.map((nft, index) => {
        if (index < soilPositions.length) {
          const position = soilPositions[index];
        
        return (
            <NFTCard3D
              key={`nft-${nft.tokenId || index}`}
              position={[position[0], 0, position[2]]}
              nft={nft}
              onClick={handleNFTClick}
            />
          );
        }
        return null;
      })}

      {/* Stats info */}
      <Text
        position={[0, 1.8, -Math.max(gridRows, gridCols) - 2]}
        fontSize={0.2}
        color="#6b7c6b"
        anchorX="center"
        anchorY="middle"
      >
        {nftCount > 0 ? `${nftCount} evrim NFT bahçende büyüyor` : 'Bahçende henüz evrim NFT yok'}
      </Text>

      {/* Empty state message */}
      {nftCount === 0 && (
        <>
      <Text
            position={[0, 1, 0]}
            fontSize={0.4}
            color="#999"
        anchorX="center"
        anchorY="middle"
      >
            🏜️ Bahçe Boş
      </Text>
        <Text
            position={[0, 0.5, 0]}
            fontSize={0.2}
            color="#666"
          anchorX="center"
          anchorY="middle"
        >
            İlk evrim NFT nizi mint edin!
        </Text>
        </>
      )}



      {/* Ambient lighting enhancement */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight 
        position={[-10, 10, -5]} 
        intensity={0.4}
        color="#b3d9ff"
      />
      
      {/* Natural Sky Background */}
      <NaturalSkyBackground />
    </group>
  );
}

IsometricGarden.defaultProps = {
  userNFTs: [],
  onNFTClick: null
}; 