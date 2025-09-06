"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUp,
  ArrowDown,
  Calendar,
  MapPin,
  User,
  Package,
  Store,
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { type Shop, type LendItem, type Request, type Hangout } from "@/lib/mock-db"
import { useAuthGuard } from "@/lib/useAuthGuard"

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  item: Shop | LendItem | Request | Hangout | null
  itemType: "shop" | "lendItem" | "request" | "hangout" | ""
  onVoteUpdate: () => void
}

export function ItemModal({ isOpen, onClose, item, itemType, onVoteUpdate }: ItemModalProps) {
  const [isVoting, setIsVoting] = useState(false)
  const { requireAuth } = useAuthGuard()

  if (!item || !itemType) return null

  const handleVote = async (voteType: "up" | "down") => {
    if (isVoting) return

    if (!requireAuth("vote on this item")) {
      return
    }

    setIsVoting(true)

    try {
      // TODO: Integrate real voting API. For now, just trigger parent refresh.
      onVoteUpdate()
    } catch (error) {
      console.error("Voting error:", error)
    } finally {
      setIsVoting(false)
    }
  }

  const getIcon = () => {
    switch (itemType) {
      case "shop":
        return <Store className="h-6 w-6 text-blue-400" />
      case "lendItem":
        return <Package className="h-6 w-6 text-green-400" />
      case "request":
        return <MessageSquare className="h-6 w-6 text-purple-400" />
      case "hangout":
        return <Users className="h-6 w-6 text-orange-400" />
      default:
        return null
    }
  }

  const getTitle = () => {
    if ("name" in item) return item.name
    if ("title" in item) return item.title
    return "Item Details"
  }

  const getDescription = () => {
    return (item as any).desc || (item as any).description || ""
  }

  const getVoteCounts = () => {
    if ("up" in item && "down" in item) {
      return { up: (item as any).up, down: (item as any).down }
    }
    if ("upvotes" in (item as any) && "downvotes" in (item as any)) {
      return { up: (item as any).upvotes, down: (item as any).downvotes }
    }
    return { up: 0, down: 0 }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const voteCounts = getVoteCounts()
  const shopLocationLink = itemType === "shop" ? ((item as any).locationLink as string | undefined) : undefined
  const locationText = itemType === "shop" ? ((item as any).location as string | undefined) : undefined
  const isGoogleMapsLink = !!shopLocationLink && /(google\.[^/]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(shopLocationLink)

  // Try to derive an embeddable query from the location_link first (preferred)
  let derivedEmbedQuery: string | undefined
  try {
    if (shopLocationLink && /google\.[^/]+\/maps/i.test(shopLocationLink)) {
      const urlObj = new URL(shopLocationLink)
      const q = urlObj.searchParams.get("q")
      if (q) {
        derivedEmbedQuery = q
      } else {
        const atMatch = shopLocationLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
        if (atMatch) {
          derivedEmbedQuery = `${atMatch[1]},${atMatch[2]}`
        }
      }
    }
  } catch {}

  // Build embed src: prefer query derived from link; otherwise fall back to plain location text
  const googleMapsEmbedSrc = derivedEmbedQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(derivedEmbedQuery)}&output=embed`
    : locationText
      ? `https://www.google.com/maps?q=${encodeURIComponent(locationText)}&output=embed`
      : undefined

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 backdrop-blur-md border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <div>
            <p className="text-gray-300 text-lg leading-relaxed">{getDescription()}</p>
          </div>

          {/* Item-specific details */}
          <div className="space-y-4">
            {itemType === "lendItem" && "owner" in item && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <User className="h-4 w-4" />
                  <span>Owner: {(item as any).owner}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(item as any).available ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Available</Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-400" />
                      <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">In Use</Badge>
                    </>
                  )}
                </div>
              </div>
            )}

            {itemType === "request" && "requester" in (item as any) && (
              <div className="flex items-center gap-2 text-gray-400">
                <User className="h-4 w-4" />
                <span>Requested by: {(item as any).requester}</span>
              </div>
            )}

            {itemType === "hangout" && "date" in (item as any) && "location" in (item as any) && "host" in (item as any) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate((item as any).date)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{(item as any).location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <User className="h-4 w-4" />
                  <span>Hosted by: {(item as any).host}</span>
                </div>
              </div>
            )}

            {itemType === "shop" && "spaceId" in (item as any) && (
              <div className="flex items-center gap-2 text-gray-400">
                <Store className="h-4 w-4" />
                <span>Space: {(item as any).spaceId}</span>
              </div>
            )}

            {itemType === "shop" && (shopLocationLink || (item as any).location) && (
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="h-4 w-4" />
                {shopLocationLink ? (
                  <a
                    href={shopLocationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
                  >
                    {(item as any).location || "Open map"}
                  </a>
                ) : (
                  <span>{(item as any).location}</span>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {(item as any).tags && (item as any).tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Tags</h4>
              <div className="flex gap-2 flex-wrap">
                {(item as any).tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="bg-white/10 text-gray-300 hover:bg-white/20">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Google Maps Embed */}
          {(isGoogleMapsLink || locationText) && googleMapsEmbedSrc && !/maps\.app\.goo\.gl/i.test(shopLocationLink || '') && (
            <div className="rounded-lg overflow-hidden border border-white/10 bg-white/5">
              <iframe
                src={googleMapsEmbedSrc}
                width="100%"
                height="240"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                style={{ border: 0 }}
                title="Shop Location Map"
              />
            </div>
          )}

          {/* Voting Section */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => handleVote("up")}
                disabled={isVoting}
                variant="outline"
                size="sm"
                className="border-green-500/50 text-green-400 hover:bg-green-500/20 hover:border-green-500"
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                {voteCounts.up}
              </Button>
              <Button
                onClick={() => handleVote("down")}
                disabled={isVoting}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500"
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                {voteCounts.down}
              </Button>
            </div>

            <div className="flex gap-2">
              {itemType === "lendItem" && "available" in (item as any) && (item as any).available && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => requireAuth("request to borrow this item")}
                >
                  Request to Borrow
                </Button>
              )}
              {itemType === "request" && (
                <Button 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => requireAuth("offer help for this request")}
                >
                  Offer Help
                </Button>
              )}
              {itemType === "hangout" && (
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => requireAuth("join this hangout")}
                >
                  Join Hangout
                </Button>
              )}
              {itemType === "shop" && (
                item && (item as any).locationLink ? (
                  <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                    <a
                      href={(item as any).locationLink as string}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit Shop
                    </a>
                  </Button>
                ) : (
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => requireAuth("visit this shop")}
                    disabled
                    title="No shop link available"
                  >
                    Visit Shop
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
