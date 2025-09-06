"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ExternalLink, Plus } from "lucide-react"
import { type Shop } from "@/lib/mock-db"
import { useState, useEffect } from "react"
import axios from "axios"
import { buildSpacesUrl } from "@/lib/sns-config"
import { AddShopForm } from "@/components/add-forms/add-shop-form"
import { useEnhancedAuthGuard } from "@/lib/useEnhancedAuthGuard"

interface ExploreSectionProps {
  onItemClick: (item: Shop, type: "shop") => void
  onRequireAuth?: (action: string, callback?: () => void) => boolean
  spaceId: string
  userStake?: number
}

export function ExploreSection({ onItemClick, onRequireAuth, spaceId, userStake = 0 }: ExploreSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [shops, setShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { requireAuth: localRequireAuth } = useEnhancedAuthGuard({ 
    requireProfile: true, 
    requireStake: true, 
    minStakeAmount: 0.001,
    userStake 
  })
  
  // Use parent's requireAuth for enhanced staking requirements
  const requireAuth = onRequireAuth || localRequireAuth

  // Fetch shops from API
  useEffect(() => {
    const fetchShops = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const url = `${buildSpacesUrl(spaceId)}/shops`
        console.log("Fetching shops from:", url)
        const response = await axios.get(url)
        const apiShops = response.data?.shops || []
        
        // Map API response to Shop type
        const mappedShops: Shop[] = apiShops.map((apiShop: any) => ({
          id: apiShop.shop_id,
          name: apiShop.name,
          desc: apiShop.description || "",
          spaceId: apiShop.space_id,
          up: apiShop.up || 0,
          down: apiShop.down || 0,
          tags: apiShop.tags || [],
          location: apiShop.location || undefined,
          locationLink: apiShop.location_link || undefined,
        }))
        
        setShops(mappedShops)
      } catch (err) {
        console.error("Failed to fetch shops:", err)
        setError("Failed to load shops")
        setShops([])
      } finally {
        setIsLoading(false)
      }
    }
    
    if (spaceId) {
      fetchShops()
    }
  }, [spaceId, refreshKey])

  const handleAddSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Explore Onchain Shops</h2>
          <p className="text-gray-400">Discover verified shops and services in the ecosystem</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white" 
            onClick={() => requireAuth("add a shop (requires profile)", () => setShowAddForm(true))}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Shop
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
            <ExternalLink className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading shops...</p>
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
          {shops.map((shop) => (
            <Card
              key={shop.id}
              className="bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/40 transition-all duration-300 cursor-pointer group"
              onClick={() => onItemClick(shop, "shop")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white group-hover:text-blue-300 transition-colors">{shop.name}</CardTitle>
                    <CardDescription className="text-gray-300 mt-1">{shop.desc}</CardDescription>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {shop.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-white/10 text-gray-300 hover:bg-white/20">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-green-400">
                      <ArrowUp className="h-3 w-3" />
                      <span>{shop.up}</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-400">
                      <ArrowDown className="h-3 w-3" />
                      <span>{shop.down}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && shops.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No shops available at the moment</p>
        </div>
      )}

      {showAddForm && (
        <AddShopForm spaceId={spaceId} userStake={userStake} onClose={() => setShowAddForm(false)} onSuccess={handleAddSuccess} />
      )}
    </div>
  )
}
