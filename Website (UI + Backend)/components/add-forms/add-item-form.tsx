"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { mockDB } from "@/lib/mock-db"
import { useEnhancedAuthGuard } from "@/lib/useEnhancedAuthGuard"

interface AddItemFormProps {
  spaceId: string
  onClose: () => void
  onSuccess: () => void
  userStake?: number
}

export function AddItemForm({ spaceId, onClose, onSuccess, userStake = 0 }: AddItemFormProps) {
  const { requireAuth } = useEnhancedAuthGuard({ 
    requireProfile: true, 
    requireStake: true, 
    minStakeAmount: 0.001,
    userStake 
  })
  const [formData, setFormData] = useState({
    name: "",
    desc: "",
    price: "",
    tags: [] as string[],
  })
  const [newTag, setNewTag] = useState("")

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.desc.trim()) return

    if (!requireAuth("list a new item")) {
      return
    }

    const newItem = {
      id: `lend-${Date.now()}`,
      name: formData.name,
      desc: formData.desc,
      price: formData.price || "Free",
      tags: formData.tags,
      up: 0,
      down: 0,
      spaceId,
    }

    mockDB.addLendItem(newItem)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">List New Item</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Item Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="What are you lending?"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Description</label>
            <Textarea
              value={formData.desc}
              onChange={(e) => setFormData((prev) => ({ ...prev, desc: e.target.value }))}
              placeholder="Describe the item and lending terms"
              className="bg-white/10 border-white/20 text-white"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Price/Terms</label>
            <Input
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Free, $10/day, etc."
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
            <Button type="submit" className="bg-green-600 hover:bg-green-700 flex-1">
              List Item
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
