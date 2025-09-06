"use client"

import { useState } from "react"
import { useWeb3Login } from "./web3"
import { useSNSDatabase } from "./useSNSDatabase"

interface EnhancedAuthGuardProps {
  requireProfile?: boolean
  requireStake?: boolean
  minStakeAmount?: number
  userStake?: number
}

export function useEnhancedAuthGuard({ 
  requireProfile = false, 
  requireStake = false, 
  minStakeAmount = 0.001,
  userStake = 0 
}: EnhancedAuthGuardProps = {}) {
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
    console.log('Enhanced Auth Guard Check:', {
      action,
      isConnected,
      requireProfile,
      existingSNS: !!existingSNS,
      requireStake,
      userStake,
      minStakeAmount
    })

    // Check login requirement
    if (!isConnected) {
      console.log('Auth Guard: Login required')
      setNotification({
        message: `You need to be logged in to ${action}`,
        isVisible: true,
      })
      return false
    }

    // Check SNS profile requirement
    if (requireProfile && !existingSNS) {
      console.log('Auth Guard: SNS profile required')
      setNotification({
        message: `You need to create your SNS profile before you can ${action}`,
        isVisible: true,
      })
      return false
    }

    // Check staking requirement
    if (requireStake && userStake < minStakeAmount) {
      console.log('Auth Guard: Staking required', { userStake, minStakeAmount })
      setNotification({
        message: `You need to stake at least ${minStakeAmount} SOL to ${action}`,
        isVisible: true,
      })
      return false
    }
    
    console.log('Auth Guard: All requirements met')
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
    hasProfile: !!existingSNS,
    hasStake: userStake >= minStakeAmount,
  }
}
