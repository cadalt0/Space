"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Float, useGLTF, Stars } from "@react-three/drei"
import * as THREE from "three"

// Crypto Coin Component
function CryptoCoin({
  position,
  scale = 1,
  rotationSpeed = 1,
}: { position: [number, number, number]; scale?: number; rotationSpeed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 8]} />
        <meshStandardMaterial
          color="#f7931a"
          metalness={0.8}
          roughness={0.2}
          emissive="#f7931a"
          emissiveIntensity={0.1}
        />
      </mesh>
    </Float>
  )
}

// Ethereum Coin Component
function EthCoin({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <octahedronGeometry args={[0.4]} />
        <meshStandardMaterial
          color="#627eea"
          metalness={0.9}
          roughness={0.1}
          emissive="#627eea"
          emissiveIntensity={0.15}
        />
      </mesh>
    </Float>
  )
}

// Space Model Component
function SpaceModel({ isTyping }: { isTyping: boolean }) {
  const { scene } = useGLTF("/models/space_boi.glb")
  const modelRef = useRef<THREE.Group>(null)
  const { viewport } = useThree()

  const scale = Math.min(viewport.width / 4, viewport.height / 4, 2.5)
  const yPosition = -viewport.height * 0.45

  useFrame((state) => {
    if (modelRef.current) {
      if (isTyping) {
        // Rotate the model when typing/searching
        modelRef.current.rotation.y += 0.02
      }
      modelRef.current.position.y = yPosition + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.2}>
      <primitive ref={modelRef} object={scene} scale={scale} position={[0, yPosition, -2]} />
    </Float>
  )
}

// Nebula Particles
function NebulaParticles() {
  const points = useRef<THREE.Points>(null)

  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(1000 * 3)
    const colors = new Float32Array(1000 * 3)

    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20

      const color = new THREE.Color()
      color.setHSL(Math.random() * 0.3 + 0.5, 0.7, 0.5)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [])

  return (
    <points ref={points} geometry={particlesGeometry}>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

export function SpaceScene({ isTyping }: { isTyping: boolean }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#627eea" />

      {/* Background Stars */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />

      {/* Nebula Particles */}
      <NebulaParticles />

      {/* Space Model */}
      <SpaceModel isTyping={isTyping} />

      <EthCoin position={[3, 3, -1]} scale={0.9} />
      <EthCoin position={[-4, 0, 3]} scale={0.5} />
      <EthCoin position={[1, -2, -2]} scale={0.8} />

      {/* Additional floating elements */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh position={[5, 1, -3]} scale={0.3}>
          <dodecahedronGeometry />
          <meshStandardMaterial
            color="#9945ff"
            metalness={0.8}
            roughness={0.2}
            emissive="#9945ff"
            emissiveIntensity={0.1}
          />
        </mesh>
      </Float>

      <Float speed={0.8} rotationIntensity={0.3} floatIntensity={0.7}>
        <mesh position={[-5, -2, 1]} scale={0.4}>
          <icosahedronGeometry />
          <meshStandardMaterial
            color="#00d4aa"
            metalness={0.9}
            roughness={0.1}
            emissive="#00d4aa"
            emissiveIntensity={0.12}
          />
        </mesh>
      </Float>
    </>
  )
}
