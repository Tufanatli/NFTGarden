'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function TestFruit({ position = [0, 0, 0], stage = 0, onClick }) {
  const groupRef = useRef();
  
  // Animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1;
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  // Different stages of growth
  const getStageModel = () => {
    switch (stage) {
      case 0: // Seed
        return (
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
        );
      
      case 1: // Sprout
        return (
          <group>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
              <meshStandardMaterial color="#228b22" />
            </mesh>
            <mesh position={[0, 0.25, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color="#32cd32" />
            </mesh>
          </group>
        );
      
      case 2: // Sapling
        return (
          <group>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
              <meshStandardMaterial color="#8b4513" />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.15, 12, 12]} />
              <meshStandardMaterial color="#228b22" />
            </mesh>
            <mesh position={[0.1, 0.4, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#32cd32" />
            </mesh>
            <mesh position={[-0.1, 0.4, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#32cd32" />
            </mesh>
          </group>
        );
      
      case 3: // Bloom
        return (
          <group>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.1, 0.12, 0.6, 8]} />
              <meshStandardMaterial color="#8b4513" />
            </mesh>
            <mesh position={[0, 0.7, 0]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color="#228b22" />
            </mesh>
            {/* Flowers */}
            <mesh position={[0.15, 0.6, 0.1]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#ff69b4" />
            </mesh>
            <mesh position={[-0.15, 0.65, -0.1]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#ff69b4" />
            </mesh>
            <mesh position={[0.1, 0.75, -0.15]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#ffb6c1" />
            </mesh>
          </group>
        );
      
      case 4: // Fruit
        return (
          <group>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.12, 0.15, 0.8, 8]} />
              <meshStandardMaterial color="#8b4513" />
            </mesh>
            <mesh position={[0, 0.9, 0]}>
              <sphereGeometry args={[0.25, 16, 16]} />
              <meshStandardMaterial color="#228b22" />
            </mesh>
            {/* Fruits */}
            <mesh position={[0.2, 0.7, 0.1]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial color="#ff4500" />
            </mesh>
            <mesh position={[-0.18, 0.75, -0.12]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial color="#ff6347" />
            </mesh>
            <mesh position={[0.1, 0.85, -0.2]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial color="#ff4500" />
            </mesh>
            <mesh position={[-0.1, 0.65, 0.18]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial color="#ff6347" />
            </mesh>
          </group>
        );
      
      default:
        return (
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
        );
    }
  };

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {getStageModel()}
      
      {/* Ground patch */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshStandardMaterial color="#8b4513" transparent opacity={0.7} />
      </mesh>
    </group>
  );
} 