"use client"

import { useState } from "react"
import { useWeb3Login } from "./web3"
import { useSNSDatabase } from "./useSNSDatabase"

export function useAuthGuard(requireProfile: boolean = false) {
  const { isConnected, userInfo } = useWeb3Login()
  const { existingSNS } = useSNSDatabase(userInfo?.email)
  const [notification, setNotification] = useState<{
    message: string
    isVisible: boolean
  }>({
    message: "",
    isVisible: false,
  })

  const requireAuth = (action: string, callback?: () => void) => {
    if (!isConnected) {
      setNotification({
        message: `You need to be logged in to ${action}`,
        isVisible: true,
      })
      return false
    }

    if (requireProfile && !existingSNS) {
      setNotification({
        message: `You need to create your SNS profile before you can ${action}`,
        isVisible: true,
      })
      return false
    }
    
    if (callback) {
      callback()
    }
    return true
  }

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }))
  }

  return {
    isConnected,
    requireAuth,
    notification,
    closeNotification,
  }
}

