"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { mockDB, type Space } from "@/lib/mock-db"
import { Calendar, MapPin, Users, Tag, ImageIcon, Rocket, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEnhancedAuthGuard } from "@/lib/useEnhancedAuthGuard"

interface CreateSpaceFormProps {
  onSpaceCreated: () => void
  userStake?: number
}

export function CreateSpaceForm({ onSpaceCreated, userStake = 0 }: CreateSpaceFormProps) {
  const router = useRouter()
  const { requireAuth } = useEnhancedAuthGuard({ 
    requireProfile: true, 
    requireStake: true, 
    minStakeAmount: 0.001,
    userStake 
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    spaceId: "",
    title: "",
    description: "",
    date: "",
    location: "",
    featuresEnabled: [] as string[],
    admins: "",
    tags: "",
    artwork: "",
  })
  const [tagInput, setTagInput] = useState("")
  const [adminInput, setAdminInput] = useState("")
  const [parsedTags, setParsedTags] = useState<string[]>([])
  const [parsedAdmins, setParsedAdmins] = useState<string[]>([])

  const availableFeatures = [
    { id: "shops", label: "Onchain Shops", description: "Allow shops to be listed in this space" },
    { id: "lend", label: "Lend IRL Items", description: "Enable item lending functionality" },
    { id: "request", label: "Requests", description: "Allow community requests" },
    { id: "hangout", label: "Hangouts", description: "Enable hangout planning" },
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Auto-generate spaceId from title
    if (field === "title") {
      const spaceId = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
      setFormData((prev) => ({ ...prev, spaceId }))
    }
  }

  const handleFeatureToggle = (featureId: string) => {
    setFormData((prev) => ({
      ...prev,
      featuresEnabled: prev.featuresEnabled.includes(featureId)
        ? prev.featuresEnabled.filter((f) => f !== featureId)
        : [...prev.featuresEnabled, featureId],
    }))
  }

  const addTag = () => {
    if (!requireAuth("add tags")) return
    
    if (tagInput.trim() && !parsedTags.includes(tagInput.trim())) {
      const newTags = [...parsedTags, tagInput.trim()]
      setParsedTags(newTags)
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setParsedTags(parsedTags.filter((tag) => tag !== tagToRemove))
  }

  const addAdmin = () => {
    if (!requireAuth("add admins")) return
    
    if (adminInput.trim() && !parsedAdmins.includes(adminInput.trim())) {
      const newAdmins = [...parsedAdmins, adminInput.trim()]
      setParsedAdmins(newAdmins)
      setAdminInput("")
    }
  }

  const removeAdmin = (adminToRemove: string) => {
    setParsedAdmins(parsedAdmins.filter((admin) => admin !== adminToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!requireAuth("create a space")) {
      return
    }
    
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.date || !formData.location) {
        alert("Please fill in all required fields")
        return
      }

      if (formData.featuresEnabled.length === 0) {
        alert("Please select at least one feature")
        return
      }

      if (parsedAdmins.length === 0) {
        alert("Please add at least one admin")
        return
      }

      // Check if spaceId already exists
      const existingSpace = mockDB.getSpace(formData.spaceId)
      if (existingSpace) {
        alert("A space with this ID already exists. Please choose a different title.")
        return
      }

      const newSpace: Space = {
        spaceId: formData.spaceId,
        title: formData.title,
        description: formData.description,
        date: formData.date,
        location: formData.location,
        featuresEnabled: formData.featuresEnabled,
        admins: parsedAdmins,
        artwork: formData.artwork || "/placeholder.svg?height=200&width=400",
        tags: parsedTags,
        upvotes: 0,
        downvotes: 0,
      }

      mockDB.addSpace(newSpace)
      onSpaceCreated()

      // Navigate to the new space
      router.push(`/spaces/${formData.spaceId}`)
    } catch (error) {
      console.error("Error creating space:", error)
      alert("Failed to create space. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Create New Space</h2>
        <p className="text-gray-400">Set up a new community space with custom features</p>
      </div>

      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Rocket className="h-5 w-5" />
            Space Details
          </CardTitle>
          <CardDescription className="text-gray-300">Basic information about your space</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title and Space ID */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Solana Breakpoint"
                  className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spaceId" className="text-white">
                  Space ID (auto-generated)
                </Label>
                <Input
                  id="spaceId"
                  value={formData.spaceId}
                  onChange={(e) => handleInputChange("spaceId", e.target.value)}
                  placeholder="solana-breakpoint"
                  className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">
                Description *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe your space and what it's about..."
                className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                required
              />
            </div>

            {/* Date and Location */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  className="bg-black/20 border-white/20 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location *
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="e.g., Lisbon, Portugal"
                  className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <Label className="text-white">Enabled Features *</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {availableFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-black/20 border border-white/10"
                  >
                    <Checkbox
                      id={feature.id}
                      checked={formData.featuresEnabled.includes(feature.id)}
                      onCheckedChange={() => handleFeatureToggle(feature.id)}
                      className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor={feature.id} className="text-white font-medium cursor-pointer">
                        {feature.label}
                      </Label>
                      <p className="text-xs text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admins */}
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Admins *
              </Label>
              <div className="flex gap-2">
                <Input
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  placeholder="Enter admin username"
                  className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAdmin())}
                />
                <Button
                  type="button"
                  onClick={addAdmin}
                  variant="outline"
                  className="border-white/20 text-white bg-transparent"
                >
                  Add
                </Button>
              </div>
              {parsedAdmins.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {parsedAdmins.map((admin) => (
                    <Badge
                      key={admin}
                      variant="secondary"
                      className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                    >
                      {admin}
                      <button type="button" onClick={() => removeAdmin(admin)} className="ml-1 hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Enter tag"
                  className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button
                  type="button"
                  onClick={addTag}
                  variant="outline"
                  className="border-white/20 text-white bg-transparent"
                >
                  Add
                </Button>
              </div>
              {parsedTags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {parsedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-white/10 text-gray-300 hover:bg-white/20">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Artwork URL */}
            <div className="space-y-2">
              <Label htmlFor="artwork" className="text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Artwork URL (optional)
              </Label>
              <Input
                id="artwork"
                value={formData.artwork}
                onChange={(e) => handleInputChange("artwork", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                {isSubmitting ? "Creating Space..." : "Create Space"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                onClick={() => window.location.reload()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
