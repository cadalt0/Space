"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { useEnhancedAuthGuard } from "@/lib/useEnhancedAuthGuard"
import { useShopIdGenerator } from "@/lib/useShopIdGenerator"
import { buildShopsUrl } from "@/lib/sns-config"
import axios from "axios"

interface AddShopFormProps {
  spaceId: string
  onClose: () => void
  onSuccess: () => void
  userStake?: number
}

export function AddShopForm({ spaceId, onClose, onSuccess, userStake = 0 }: AddShopFormProps) {
  const { requireAuth } = useEnhancedAuthGuard({ 
    requireProfile: true, 
    requireStake: true, 
    minStakeAmount: 0.001,
    userStake 
  })
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    spaceId: spaceId,
    location: "",
    location_link: "",
    tags: [] as string[],
  })
  const [newTag, setNewTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { generateShopId, isGenerating, error: generationError, clearError } = useShopIdGenerator()

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.description.trim()) return

    if (!requireAuth("add a shop")) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Step 1: Generate shop ID on-chain first
      console.log("🏪 Step 1: Generating shop ID on-chain...")
      const shopIdResult = await generateShopId()
      
      if (!shopIdResult.success || !shopIdResult.shopId) {
        setError(shopIdResult.error || "Failed to generate shop ID")
        return
      }

      console.log("✅ Shop ID generated:", shopIdResult.shopId)

      // Step 2: Create shop in database with the generated ID
      console.log("🏪 Step 2: Creating shop in database...")
      const shopData = {
        shopId: shopIdResult.shopId,
        name: formData.name,
        description: formData.description,
        spaceId: formData.spaceId,
        up: 0,
        down: 0,
        tags: formData.tags,
        location: formData.location || "",
        location_link: formData.location_link || "",
      }

      console.log("Creating shop with data:", shopData)
      
      const response = await axios.post(buildShopsUrl(), shopData, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log("✅ Shop created successfully:", response.data)

      // Refresh the shop section
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error("Failed to create shop:", err)
      console.error("Error response:", err.response?.data)
      console.error("Error status:", err.response?.status)

      let errorMessage = "Failed to create shop"
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Add New Shop</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {(error || generationError) && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300 text-sm">{error || generationError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Shop Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter shop name"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your shop"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Location</label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., New York, NY or Online"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Location Link (optional)</label>
            <Input
              value={formData.location_link}
              onChange={(e) => setFormData((prev) => ({ ...prev, location_link: e.target.value }))}
              placeholder="https://maps.google.com/..."
              className="bg-white/10 border-white/20 text-white"
            />
          </div>


          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Tags</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                className="bg-white/10 border-white/20 text-white flex-1"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-white/10 text-gray-300">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
                        <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 flex-1"
              disabled={isSubmitting || isGenerating}
            >
              {isSubmitting ? (isGenerating ? "Generating Shop ID..." : "Creating Shop...") : "Add Shop"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
