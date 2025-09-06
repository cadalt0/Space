"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, Plus, Package, CheckCircle, XCircle } from "lucide-react"
import { type LendItem } from "@/lib/mock-db"
import { useState, useEffect } from "react"
import axios from "axios"
import { SNS_CONFIG } from "@/lib/sns-config"
import { AddItemForm } from "@/components/add-forms/add-item-form"
import { useEnhancedAuthGuard } from "@/lib/useEnhancedAuthGuard"

interface LendSectionProps {
  onItemClick: (item: LendItem, type: "lendItem") => void
  onRequireAuth?: (action: string, callback?: () => void) => boolean
  spaceId: string
  userStake?: number
}

export function LendSection({ onItemClick, onRequireAuth, spaceId, userStake = 0 }: LendSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [lendItems, setLendItems] = useState<LendItem[]>([])
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

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const url = `${SNS_CONFIG.API_BASE_URL}/api/lend-items?spaceId=${encodeURIComponent(spaceId)}`
        console.log("Fetching lend items from:", url)
        const response = await axios.get(url)
        const apiItems = response.data?.items || []
        const mapped: LendItem[] = apiItems.map((it: any) => ({
          id: it.item_id,
          name: it.name,
          desc: it.description || "",
          owner: it.owner || "",
          available: !!it.available,
          up: it.up || 0,
          down: it.down || 0,
          tags: it.tags || [],
        }))
        setLendItems(mapped)
      } catch (err) {
        console.error("Failed to fetch lend items:", err)
        setError("Failed to load items")
        setLendItems([])
      } finally {
        setIsLoading(false)
      }
    }
    if (spaceId) fetchItems()
  }, [spaceId, refreshKey])

  const handleAddSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Lend IRL Items</h2>
          <p className="text-gray-400">Share physical items with the community</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white" 
          onClick={() => requireAuth("list a new item", () => setShowAddForm(true))}
        >
          <Plus className="h-4 w-4 mr-2" />
          List New Item
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading items...</p>
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
          {lendItems.map((item) => (
            <Card
              key={item.id}
              className="bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/40 transition-all duration-300 cursor-pointer group"
              onClick={() => onItemClick(item, "lendItem")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Package className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-white group-hover:text-blue-300 transition-colors">
                        {item.name}
                      </CardTitle>
                      <CardDescription className="text-gray-300 mt-1">{item.desc}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.available ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">by {item.owner}</span>
                    <Badge
                      variant={item.available ? "default" : "destructive"}
                      className={
                        item.available
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      }
                    >
                      {item.available ? "Available" : "In Use"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-green-400">
                      <ArrowUp className="h-3 w-3" />
                      <span>{item.up}</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-400">
                      <ArrowDown className="h-3 w-3" />
                      <span>{item.down}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && lendItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No items available for lending</p>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={() => requireAuth("list a new item", () => setShowAddForm(true))}
          >
            <Plus className="h-4 w-4 mr-2" />
            Be the first to list an item
          </Button>
        </div>
      )}

      {showAddForm && (
        <AddItemForm spaceId={spaceId} userStake={userStake} onClose={() => setShowAddForm(false)} onSuccess={handleAddSuccess} />
      )}
    </div>
  )
}
