/**
 * AANG AIR CONTROL SYSTEM
 * 3D Robot Model Component
 * 
 * Render model GLB robot menggunakan React Three Fiber v8
 * Compatible with React 18
 */

import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Center } from '@react-three/drei';

// Component untuk model robot
function RobotModel({ isActive }) {
  const { scene } = useGLTF('/PreviewRobot.glb');
  
  // Clone scene untuk menghindari masalah shared state
  const clonedScene = scene.clone();
  
  return (
    <group>
      <primitive object={clonedScene} scale={10} position={[0, -2, 0]} />
    </group>
  );
}

// Loading placeholder - kotak berputar
function LoadingBox() {
  const meshRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#64748b" wireframe />
    </mesh>
  );
}

// Fallback jika WebGL tidak tersedia
function FallbackDisplay({ isActive }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative w-20 h-24">
        <div className={`w-full h-16 rounded-t-2xl ${isActive ? 'bg-gradient-to-b from-cyan-600 to-cyan-700' : 'bg-gradient-to-b from-slate-600 to-slate-700'} border-2 border-slate-500`}>
          <div className="flex justify-center gap-3 mt-3">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-white shadow-lg shadow-white/50 animate-pulse' : 'bg-slate-500'}`} />
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-white shadow-lg shadow-white/50 animate-pulse' : 'bg-slate-500'}`} />
          </div>
          <div className={`mx-auto mt-2 w-6 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
        </div>
        <div className="absolute bottom-0 left-0 w-4 h-6 bg-slate-800 rounded-lg" />
        <div className="absolute bottom-0 right-0 w-4 h-6 bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
}

// Main component
export default function Robot3D({ isActive = false }) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
      }
    } catch (e) {
      setHasWebGL(false);
    }
  }, []);

  // Fallback jika WebGL tidak tersedia atau ada error
  if (!hasWebGL || hasError) {
    return <FallbackDisplay isActive={isActive} />;
  }

  return (
    <div className="w-full h-full min-h-[120px]">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        }}
        style={{ background: 'transparent' }}
        onError={() => setHasError(true)}
      >
        <Suspense fallback={<LoadingBox />}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <pointLight 
            position={[0, 2, 3]} 
            intensity={isActive ? 1.5 : 0.5} 
            color={isActive ? "#22d3ee" : "#94a3b8"} 
          />
          <pointLight 
            position={[-2, -1, 2]} 
            intensity={0.3} 
            color="#f59e0b" 
          />
          
          {/* Model */}
          <Center>
            <RobotModel isActive={isActive} />
          </Center>
          
          {/* Environment untuk refleksi */}
          <Environment preset="city" />
          
          {/* Orbit controls - bisa lihat dari semua sudut */}
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            minDistance={5}
            maxDistance={15}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload model
useGLTF.preload('/PreviewRobot.glb');
