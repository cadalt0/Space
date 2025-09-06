"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, Plus, MessageSquare, User } from "lucide-react"
import { type Request } from "@/lib/mock-db"
import { useEnhancedAuthGuard } from "@/lib/useEnhancedAuthGuard"
import { useEffect, useState } from "react"
import axios from "axios"
import { SNS_CONFIG } from "@/lib/sns-config"

interface RequestSectionProps {
  onItemClick: (item: Request, type: "request") => void
  onRequireAuth?: (action: string, callback?: () => void) => boolean
  spaceId: string
  userStake?: number
}

export function RequestSection({ onItemClick, onRequireAuth, spaceId, userStake = 0 }: RequestSectionProps) {
  const { requireAuth: localRequireAuth } = useEnhancedAuthGuard({ 
    requireProfile: true, 
    requireStake: true, 
    minStakeAmount: 0.001,
    userStake 
  })
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Use parent's requireAuth for enhanced staking requirements
  const requireAuth = onRequireAuth || localRequireAuth

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const url = `${SNS_CONFIG.API_BASE_URL}/api/requests?spaceId=${encodeURIComponent(spaceId)}`
        console.log("Fetching requests from:", url)
        const response = await axios.get(url)
        const apiRequests = response.data?.requests || []
        const mapped: Request[] = apiRequests.map((r: any) => ({
          id: r.request_id,
          title: r.title,
          desc: r.description || "",
          requester: r.requester || "",
          up: r.up || 0,
          down: r.down || 0,
          tags: r.tags || [],
        }))
        setRequests(mapped)
      } catch (err) {
        console.error("Failed to fetch requests:", err)
        setError("Failed to load requests")
        setRequests([])
      } finally {
        setIsLoading(false)
      }
    }
    if (spaceId) fetchRequests()
  }, [spaceId, refreshKey])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Community Requests</h2>
          <p className="text-gray-400">Help others by fulfilling their requests</p>
        </div>
        <Button 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => requireAuth("create a request")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Request
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading requests...</p>
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
          {requests.map((request) => (
            <Card
              key={request.id}
              className="bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/40 transition-all duration-300 cursor-pointer group"
              onClick={() => onItemClick(request, "request")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-white group-hover:text-purple-300 transition-colors">
                      {request.title}
                    </CardTitle>
                    <CardDescription className="text-gray-300 mt-1">{request.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-gray-400">
                      <User className="h-3 w-3" />
                      <span className="text-sm">{request.requester}</span>
                    </div>
                    <div className="flex gap-1">
                      {request.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="bg-white/10 text-gray-300 hover:bg-white/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-green-400">
                      <ArrowUp className="h-3 w-3" />
                      <span>{request.up}</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-400">
                      <ArrowDown className="h-3 w-3" />
                      <span>{request.down}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No active requests</p>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => requireAuth("create a request")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create the first request
          </Button>
        </div>
      )}
    </div>
  )
}
