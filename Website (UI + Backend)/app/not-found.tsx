"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft } from "lucide-react"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
                 <div className="flex items-center space-x-4">
           <div className="relative">
             <div className="w-24 h-24 flex items-center justify-center">
               <Image
                 src="/logo.png"
                 alt="SPACE Logo"
                 width={96}
                 height={96}
                 className="object-contain drop-shadow-lg"
               />
             </div>
             <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl blur-md -z-10"></div>
           </div>
         </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-8 px-6">
        {/* 404 Text */}
        <div className="space-y-4">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Space Not Found
          </h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            The space you're looking for doesn't exist in this galaxy. 
            It might have been moved or deleted.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
          
          <Link href="/explore">
            <Button variant="outline" className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all duration-300">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Explore Spaces
            </Button>
          </Link>
        </div>

        {/* Decorative Elements */}
        <div className="flex justify-center space-x-2 mt-12">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
        </div>
      </div>
    </div>
  )
}
