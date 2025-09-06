"use client"

import { useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { X, ExternalLink } from "lucide-react"

interface VoteNotificationProps {
  message: string
  isVisible: boolean
  onClose: () => void
  voteType?: "upvote" | "downvote"
  signature?: string
}

export function VoteNotification({ 
  message, 
  isVisible, 
  onClose, 
  voteType,
  signature 
}: VoteNotificationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000) // Auto-close after 5 seconds

      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  const isSuccess = message.includes("Successfully")
  const isUpvote = voteType === "upvote"
  const isDownvote = voteType === "downvote"

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert 
        className={`${
          isSuccess 
            ? "bg-green-600/90 border-green-500 text-white" 
            : "bg-red-600/90 border-red-500 text-white"
        }`}
      >
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-white">
              <span className="font-medium">
                {isUpvote && isSuccess && "👍 Upvoted!"}
                {isDownvote && isSuccess && "👎 Downvoted!"}
                {!isSuccess && "❌ Vote Failed"}
              </span>
              <br />
              <span className="text-sm opacity-90">{message}</span>
              {signature && (
                <div className="mt-1">
                  <a
                    href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-200 hover:text-blue-100 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Transaction
                  </a>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={`${
              isSuccess 
                ? "text-white hover:bg-green-700/50" 
                : "text-white hover:bg-red-700/50"
            } h-6 w-6 p-0`}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
