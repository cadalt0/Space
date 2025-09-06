"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, Calendar, MapPin, User, Users } from "lucide-react"
import { type Hangout } from "@/lib/mock-db"
import { useEnhancedAuthGuard } from "@/lib/useEnhancedAuthGuard"
import { useEffect, useState } from "react"
import axios from "axios"
import { SNS_CONFIG } from "@/lib/sns-config"

interface HangoutSectionProps {
  onItemClick: (item: Hangout, type: "hangout") => void
  onRequireAuth?: (action: string, callback?: () => void) => boolean
  spaceId: string
  userStake?: number
}

export function HangoutSection({ onItemClick, onRequireAuth, spaceId, userStake = 0 }: HangoutSectionProps) {
  const { requireAuth: localRequireAuth } = useEnhancedAuthGuard({ 
    requireProfile: true, 
    requireStake: true, 
    minStakeAmount: 0.001,
    userStake 
  })
  
  // Use parent's requireAuth for enhanced staking requirements
  const requireAuth = onRequireAuth || localRequireAuth
  const [hangouts, setHangouts] = useState<Hangout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const fetchHangouts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const url = `${SNS_CONFIG.API_BASE_URL}/api/hangouts?spaceId=${encodeURIComponent(spaceId)}`
        console.log("Fetching hangouts from:", url)
        const response = await axios.get(url)
        const apiHangouts = response.data?.hangouts || []
        const mapped: Hangout[] = apiHangouts.map((h: any) => ({
          id: h.hang_id,
          title: h.title,
          desc: h.description || "",
          date: h.date,
          location: h.location || "",
          host: h.host || "",
          up: h.up || 0,
          down: h.down || 0,
          tags: h.tags || [],
        }))
        setHangouts(mapped)
      } catch (err) {
        console.error("Failed to fetch hangouts:", err)
        setError("Failed to load hangouts")
        setHangouts([])
      } finally {
        setIsLoading(false)
      }
    }
    if (spaceId) fetchHangouts()
  }, [spaceId, refreshKey])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Community Hangouts</h2>
          <p className="text-gray-400">Connect with like-minded people in your area</p>
        </div>
        <Button 
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => requireAuth("plan a hangout")}
        >
          <Users className="h-4 w-4 mr-2" />
          Plan Hangout
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading hangouts...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="text-center py-12 space-y-4">
          <p className="text-red-400">Error: {error}</p>
          <Button onClick={() => setRefreshKey((prev) => prev + 1)} className="bg-white/10 hover:bg-white/20 text-white">Retry</Button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          {hangouts.map((hangout) => (
            <Card
              key={hangout.id}
              className="bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/40 transition-all duration-300 cursor-pointer group"
              onClick={() => onItemClick(hangout, "hangout")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Users className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-white group-hover:text-green-300 transition-colors">
                      {hangout.title}
                    </CardTitle>
                    <CardDescription className="text-gray-300 mt-1">{hangout.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(hangout.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{hangout.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{hangout.host}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {hangout.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="bg-white/10 text-gray-300 hover:bg-white/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1 text-green-400">
                        <ArrowUp className="h-3 w-3" />
                        <span>{hangout.up}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-400">
                        <ArrowDown className="h-3 w-3" />
                        <span>{hangout.down}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && hangouts.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No hangouts planned yet</p>
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => requireAuth("plan a hangout")}
          >
            <Users className="h-4 w-4 mr-2" />
            Plan the first hangout
          </Button>
        </div>
      )}
    </div>
  )
}
