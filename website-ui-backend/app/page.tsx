"use client"

import type React from "react"

import { Suspense, useState, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment } from "@react-three/drei"
import { SpaceScene } from "@/components/space-scene"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingText, setTypingText] = useState("")
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const phrases = [
    "explore local onchain crypto shops",
    "lend or sell anything onchain",
    "plan hangout with onchain security",
  ]

  const suggestions = [
    "solana-breakpoint",
  ]

  // Typing animation effect
  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex]
    
    if (!isDeleting) {
      if (typingText.length < currentPhrase.length) {
        const timer = setTimeout(() => {
          setTypingText(currentPhrase.slice(0, typingText.length + 1))
        }, 100)
        return () => clearTimeout(timer)
      } else {
        // Wait before starting to delete
        const timer = setTimeout(() => {
          setIsDeleting(true)
        }, 2000)
        return () => clearTimeout(timer)
      }
    } else {
      if (typingText.length > 0) {
        const timer = setTimeout(() => {
          setTypingText(typingText.slice(0, -1))
        }, 50)
        return () => clearTimeout(timer)
      } else {
        // Move to next phrase
        setIsDeleting(false)
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length)
      }
    }
  }, [typingText, currentPhraseIndex, isDeleting, phrases])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Redirect to the space page
      window.location.href = `/spaces/${searchQuery.trim()}`
    }
  }

  const filteredSuggestions = suggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(searchQuery.toLowerCase()),
  )

        return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 75 }}
          style={{ background: "radial-gradient(ellipse at center, #1a1a2e 0%, #000000 100%)" }}
        >
          <Suspense fallback={null}>
            <SpaceScene isTyping={isTyping} />
            <Environment preset="night" />
            <OrbitControls enableZoom={false} enablePan={false} enableRotate={true} autoRotate={false} />
          </Suspense>
        </Canvas>
              </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="flex justify-between items-center p-6 md:p-8">
                      <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-18 h-18 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="SPACE Logo"
                  width={72}
                  height={72}
                  className="object-contain drop-shadow-lg"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl blur-md -z-10"></div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-orbitron)] tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
              SPACE
            </h1>
          </div>

          <Link href="/explore">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40">
              Explore Spaces
            </Button>
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center items-center px-6 md:px-8 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Headline */}
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent drop-shadow-2xl">
                Make new crypto frens
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-200 bg-clip-text text-transparent drop-shadow-2xl">
                anywhere
              </span>
            </h2>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative group">
                  <div className="relative w-full">
                    <Input
                      type="text"
                      placeholder=""
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setShowSuggestions(e.target.value.length > 0)
                        setIsTyping(true)
                        // Clear typing state after 1 second of no typing
                        setTimeout(() => setIsTyping(false), 1000)
                      }}
                      onFocus={() => {
                        setShowSuggestions(searchQuery.length > 0)
                        setSearchQuery("")
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full h-14 pl-6 pr-14 text-lg bg-black/40 backdrop-blur-md border-2 border-cyan-500/30 rounded-2xl text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 shadow-lg shadow-cyan-500/10 group-hover:shadow-cyan-500/20"
                    />
                                         {/* Custom placeholder with static and animated text */}
                     {!searchQuery && (
                       <div className="absolute inset-0 flex items-center pointer-events-none">
                         <div className="pl-6 text-lg text-gray-400">
                           Search events or city...&nbsp;&nbsp;&nbsp;&nbsp;
                           <span className="bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent">
                             {typingText}
                           </span>
              </div>
                </div>
              )}
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-2 top-2 h-10 w-10 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 border-0 rounded-xl transition-all duration-300"
                  >
                    <Search className="h-5 w-5" />
                  </Button>

                  {/* Animated glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                </div>
              </form>

              {/* Search Suggestions */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(suggestion)
                        setShowSuggestions(false)
                        // Redirect to the space page
                        window.location.href = `/spaces/${suggestion}`
                      }}
                      className="w-full px-6 py-4 text-left text-white hover:bg-cyan-500/20 transition-colors duration-200 border-b border-cyan-500/10 last:border-b-0"
                    >
                      <div className="flex items-center space-x-3">
                        <Search className="h-4 w-4 text-cyan-400" />
                        <span>{suggestion}</span>
            </div>
                    </button>
                  ))}
                </div>
              )}


            </div>
          </div>
        </main>
      </div>

    </div>
  )
}
