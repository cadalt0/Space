"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface VotingNotificationProps {
  message: string
  isVisible: boolean
  onClose: () => void
  type?: "success" | "error"
}

export function VotingNotification({ 
  message, 
  isVisible, 
  onClose, 
  type = "success" 
}: VotingNotificationProps) {
  const [isVisibleState, setIsVisibleState] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setIsVisibleState(true)
      
      // Auto-dismiss after 2 seconds
      const timer = setTimeout(() => {
        setIsVisibleState(false)
        setTimeout(onClose, 300) // Allow fade out animation
      }, 2000)

      return () => clearTimeout(timer)
    } else {
      setIsVisibleState(false)
    }
  }, [isVisible, onClose])

  if (!isVisibleState) return null

  const isSuccess = type === "success"
  const bgColor = isSuccess ? "bg-green-600/90" : "bg-red-600/90"
  const borderColor = isSuccess ? "border-green-500" : "border-red-500"
  const hoverColor = isSuccess ? "hover:bg-green-700/50" : "hover:bg-red-700/50"

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className={`${bgColor} ${borderColor} text-white`}>
        <AlertDescription className="flex items-center justify-between">
          <span className="text-white">{message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVisibleState(false)
              setTimeout(onClose, 300)
            }}
            className={`text-white ${hoverColor} h-6 w-6 p-0`}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
