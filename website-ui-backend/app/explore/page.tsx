"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NavigationSidebar } from "@/components/navigation-sidebar"
import { CreateSpaceForm } from "@/components/create-space-form"
import { ItemModal } from "@/components/item-modal"
import { GalaxyBackground } from "@/components/galaxy-background"
import { TransactionSigner } from "@/components/transaction-signer"
import { useWeb3Login } from "@/lib/web3"
import { useAuthGuard } from "@/lib/useAuthGuard"
import { AuthNotification } from "@/components/auth-notification"
import { type Shop, type LendItem, type Request, type Hangout, type Space } from "@/lib/mock-db"
import { ArrowUp, ArrowDown, ExternalLink, Rocket, Plus } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import axios from "axios"
import { buildSpacesUrl, buildAssetUrl } from "@/lib/sns-config"

export default function ExplorePage() {
  const [activeSection, setActiveSection] = useState("explore")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { login, logout, isConnected, isBusy, displayName, avatar } = useWeb3Login()
  const { requireAuth, notification, closeNotification } = useAuthGuard()

  const [selectedItem, setSelectedItem] = useState<Shop | LendItem | Request | Hangout | null>(null)
  const [selectedItemType, setSelectedItemType] = useState<"shop" | "lendItem" | "request" | "hangout" | "">("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [spaces, setSpaces] = useState<Space[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchSpaces = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const url = buildSpacesUrl()
        console.log("Fetching spaces from:", url)
        const response = await axios.get(url)
        const apiSpaces = response.data?.spaces || []
        const mapped: Space[] = apiSpaces.map((s: any) => ({
          spaceId: s.space_id,
          title: s.title,
          description: s.description || "",
          date: s.date || "",
          location: s.location || "",
          featuresEnabled: s.features_enabled || [],
          admins: s.admins || [],
          artwork: s.artwork || "",
          tags: s.tags || [],
          upvotes: s.upvotes ?? 0,
          downvotes: s.downvotes ?? 0,
        }))
        if (!isMounted) return
        setSpaces(mapped)
      } catch (err) {
        console.error("Failed to fetch spaces:", err)
        if (!isMounted) return
        setError("Failed to load spaces")
        setSpaces([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchSpaces()
    return () => { isMounted = false }
  }, [refreshKey])

  const handleItemClick = (
    item: Shop | LendItem | Request | Hangout,
    type: "shop" | "lendItem" | "request" | "hangout",
  ) => {
    setSelectedItem(item)
    setSelectedItemType(type)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
    setSelectedItemType("")
  }

  const handleVoteUpdate = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleSpaceCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const renderContent = () => {
    switch (activeSection) {
      case "explore":
        return (
          <div className="space-y-6">
            {isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading spaces...</p>
              </div>
            )}
            {!isLoading && error && (
              <div className="text-center py-12 space-y-4">
                <p className="text-red-400">Error: {error}</p>
                <Button onClick={() => setRefreshKey((prev) => prev + 1)} className="bg-white/10 hover:bg-white/20 text-white">Retry</Button>
              </div>
            )}
            {!isLoading && !error && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {spaces.map((space) => (
                  <Link key={space.spaceId} href={`/spaces/${space.spaceId}`}>
                    <Card className="bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 cursor-pointer group h-full animate-fade-in-up overflow-hidden">
                      <div className="relative h-32 overflow-hidden">
                        <img
                          src={buildAssetUrl(space.artwork) || "/placeholder.svg?height=128&width=400&query=space+event+background"}
                          alt={`${space.title} artwork`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-white group-hover:text-blue-300 transition-colors duration-300">
                              {space.title}
                            </CardTitle>
                            <CardDescription className="text-gray-300 mt-1">{space.description}</CardDescription>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-white transition-all duration-300 group-hover:scale-110" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="text-sm text-gray-400">
                            <div>
                              {space.date} • {space.location}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 flex-wrap">
                              {space.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="bg-white/10 text-gray-300 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-1 text-green-400 hover:scale-110 transition-transform duration-200">
                                <ArrowUp className="h-3 w-3" />
                                <span>{space.upvotes}</span>
                              </div>
                              <div className="flex items-center gap-1 text-red-400 hover:scale-110 transition-transform duration-200">
                                <ArrowDown className="h-3 w-3" />
                                <span>{space.downvotes}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      case "create":
        return <CreateSpaceForm onSpaceCreated={handleSpaceCreated} />
      case "wallet":
        return <TransactionSigner />
      default:
        return (
          <div className="text-center py-20">
            <div className="animate-pulse">
              <h3 className="text-2xl font-bold text-white mb-4">Welcome to Space</h3>
              <p className="text-gray-400">Select "Explore" to discover spaces, "Create" to make your own, or "Wallet" to test transactions</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <GalaxyBackground />
      <AuthNotification
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={closeNotification}
      />

      <div className="relative z-10 flex flex-col md:flex-row">
        <NavigationSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        <div className="flex-1 w-full md:w-4/5 min-h-screen">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b border-white/10 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              {activeSection === "explore" && (
                <div className="sm:ml-8">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Explore Spaces</h2>
                  <p className="text-xs sm:text-sm text-gray-400">Discover active spaces and communities</p>
                </div>
              )}
              {activeSection === "wallet" && (
                <div className="sm:ml-8">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Wallet Testing</h2>
                  <p className="text-xs sm:text-sm text-gray-400">Test transaction signing with your Web3Auth wallet</p>
                </div>
              )}

            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => requireAuth("create a space", () => setActiveSection("create"))}
                className="bg-green-600 hover:bg-green-700 text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Space
              </Button>
              <Button
                disabled={isBusy}
                onClick={async () => {
                  if (isConnected) {
                    await logout()
                    setIsLoggedIn(false)
                  } else {
                    await login()
                    setIsLoggedIn(true)
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 w-full sm:w-auto"
              >
                {isConnected ? "Logout" : "Login"}
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-6 pb-24 md:pb-6">{renderContent()}</div>
        </div>
      </div>

      <ItemModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        item={selectedItem}
        itemType={selectedItemType}
        onVoteUpdate={handleVoteUpdate}
      />
    </div>
  )
}
