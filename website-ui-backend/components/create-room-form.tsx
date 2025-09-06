"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { mockDB } from "@/lib/mock-db"
import { Plus, X, Store, Package, MessageSquare, Users } from "lucide-react"
import { useEnhancedAuthGuard } from "@/lib/useEnhancedAuthGuard"

interface CreateRoomFormProps {
  spaceId: string
  onRoomCreated: () => void
  userStake?: number
}

const roomTypes = [
  { id: "shop", label: "Shop", icon: Store, description: "Create an onchain shop to sell items" },
  { id: "lend", label: "Lend Item", icon: Package, description: "Offer an item for lending" },
  { id: "request", label: "Request", icon: MessageSquare, description: "Request something from the community" },
  { id: "hangout", label: "Hangout", icon: Users, description: "Organize a hangout or meetup" },
]

export function CreateRoomForm({ spaceId, onRoomCreated, userStake = 0 }: CreateRoomFormProps) {
  const { requireAuth } = useEnhancedAuthGuard({ 
    requireProfile: true, 
    requireStake: true, 
    minStakeAmount: 0.001,
    userStake 
  })
  const [roomType, setRoomType] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    tags: [] as string[],
    location: "",
    date: "",
    time: "",
    maxParticipants: "",
  })
  const [currentTag, setCurrentTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (!requireAuth("add tags")) return
    
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()],
      }))
      setCurrentTag("")
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
    if (!roomType || !formData.title || !formData.description) return

    if (!requireAuth("create a room")) {
      return
    }

    setIsSubmitting(true)

    try {
      const roomData = {
        id: `${roomType}-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        spaceId,
        createdBy: "current-user", // In real app, get from auth
        createdAt: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        tags: formData.tags,
        ...(roomType === "shop" && {
          price: Number.parseFloat(formData.price) || 0,
          category: formData.category,
          inStock: true,
        }),
        ...(roomType === "lend" && {
          category: formData.category,
          available: true,
        }),
        ...(roomType === "hangout" && {
          location: formData.location,
          date: formData.date,
          time: formData.time,
          maxParticipants: Number.parseInt(formData.maxParticipants) || 10,
          currentParticipants: 0,
        }),
      }

      // Add to mock database based on room type
      switch (roomType) {
        case "shop":
          mockDB.addShop(roomData as any)
          break
        case "lend":
          mockDB.addLendItem(roomData as any)
          break
        case "request":
          mockDB.addRequest(roomData as any)
          break
        case "hangout":
          mockDB.addHangout(roomData as any)
          break
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        price: "",
        category: "",
        tags: [],
        location: "",
        date: "",
        time: "",
        maxParticipants: "",
      })
      setRoomType("")
      onRoomCreated()
    } catch (error) {
      console.error("Error creating room:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Create Room</h2>
        <p className="text-gray-400">Add a new room to this space</p>
      </div>

      {!roomType ? (
        <div className="grid gap-4 md:grid-cols-2">
          {roomTypes.map((type) => {
            const Icon = type.icon
            return (
              <Card
                key={type.id}
                className="glass-card hover:glass-card-hover cursor-pointer transition-all duration-300 hover:scale-105"
                onClick={() => setRoomType(type.id)}
              >
                <CardHeader className="text-center">
                  <Icon className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                  <CardTitle className="text-white">{type.label}</CardTitle>
                  <CardDescription className="text-gray-300">{type.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = roomTypes.find((t) => t.id === roomType)?.icon || Store
                  return <Icon className="h-6 w-6 text-blue-400" />
                })()}
                <CardTitle className="text-white">Create {roomTypes.find((t) => t.id === roomType)?.label}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRoomType("")}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="title" className="text-white">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    className="glass-input text-white"
                    placeholder="Enter title"
                    required
                  />
                </div>

                {roomType === "shop" && (
                  <div>
                    <Label htmlFor="price" className="text-white">
                      Price (ETH)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.001"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", e.target.value)}
                      className="glass-input text-white"
                      placeholder="0.1"
                    />
                  </div>
                )}

                {(roomType === "shop" || roomType === "lend") && (
                  <div>
                    <Label htmlFor="category" className="text-white">
                      Category
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                      <SelectTrigger className="glass-input text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="glass-modal">
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="books">Books</SelectItem>
                        <SelectItem value="tools">Tools</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {roomType === "hangout" && (
                  <>
                    <div>
                      <Label htmlFor="location" className="text-white">
                        Location
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        className="glass-input text-white"
                        placeholder="Enter location"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date" className="text-white">
                        Date
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange("date", e.target.value)}
                        className="glass-input text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="time" className="text-white">
                        Time
                      </Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => handleInputChange("time", e.target.value)}
                        className="glass-input text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxParticipants" className="text-white">
                        Max Participants
                      </Label>
                      <Input
                        id="maxParticipants"
                        type="number"
                        value={formData.maxParticipants}
                        onChange={(e) => handleInputChange("maxParticipants", e.target.value)}
                        className="glass-input text-white"
                        placeholder="10"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-white">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="glass-input text-white min-h-[100px]"
                  placeholder="Describe your room..."
                  required
                />
              </div>

              <div>
                <Label className="text-white">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    className="glass-input text-white flex-1"
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} className="glass-button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-white/10 text-gray-300 hover:bg-white/20 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoomType("")}
                  className="flex-1 glass-button border-gray-600 text-gray-300"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.title || !formData.description}
                  className="flex-1 glass-button bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
