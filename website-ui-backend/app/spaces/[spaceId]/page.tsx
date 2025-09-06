"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NavigationSidebar } from "@/components/navigation-sidebar"
import { ExploreSection } from "@/components/content-sections/explore-section"
import { LendSection } from "@/components/content-sections/lend-section"
import { RequestSection } from "@/components/content-sections/request-section"
import { HangoutSection } from "@/components/content-sections/hangout-section"
import { ItemModal } from "@/components/item-modal"
import { GalaxyBackground } from "@/components/galaxy-background"
import { CreateRoomForm } from "@/components/create-room-form"
import { SNSProfileModal } from "@/components/sns-profile-modal"
import { type Space, type Shop, type LendItem, type Request, type Hangout } from "@/lib/mock-db"
import axios from "axios"
import { buildSpacesUrl, buildAssetUrl } from "@/lib/sns-config"
import { ArrowLeft, Calendar, MapPin, Users, ArrowUp, ArrowDown, Rocket, User, Shield, Coins, CheckCircle, XCircle } from "lucide-react"
import { useWeb3Login } from "@/lib/web3"
import Image from "next/image"
import { useAuthGuard } from "@/lib/useAuthGuard"
import { useSNSDatabase } from "@/lib/useSNSDatabase"
import { AuthNotification } from "@/components/auth-notification"
import { VotingNotification } from "@/components/voting-notification"
import { StakeModal } from "@/components/stake-modal"
import { useStaking } from "@/lib/useStaking"
import { useVoting } from "@/lib/useVoting"
import { VoteNotification } from "@/components/vote-notification"

export default function SpaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const spaceId = params.spaceId as string

  const [space, setSpace] = useState<Space | null>(null)
  const [isLoadingSpace, setIsLoadingSpace] = useState(true)
  const [activeSection, setActiveSection] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { login, logout, isConnected, isBusy, displayName, avatar, userInfo } = useWeb3Login()
  // Two guards: login-only and profile-required
  const { requireAuth: requireAuthLogin, notification: notifLogin, closeNotification: closeNotifLogin } = useAuthGuard(false)
  const { requireAuth: requireAuthProfile, notification: notifProfile, closeNotification: closeNotifProfile } = useAuthGuard(true)
  const { existingSNS, isLoading: isCheckingSNS, checkExistingSNS } = useSNSDatabase(userInfo?.email)
  const { stake, isStaking: isStakingTransaction, error: stakingError } = useStaking()
  const { vote, isVoting, error: votingError, hash: votingHash } = useVoting()
  
  // Stake functionality - fetch user stake data from SNS API
  const [userStake, setUserStake] = useState<number>(0)
  
  // Debug logging
  useEffect(() => {
    console.log('Space page - userInfo changed:', userInfo)
    console.log('Space page - userInfo.email:', userInfo?.email)
    console.log('Space page - existingSNS:', existingSNS)
    console.log('Space page - isCheckingSNS:', isCheckingSNS)
    console.log('Space page - userStake:', userStake)
  }, [userInfo, existingSNS, isCheckingSNS, userStake])
  const [selectedItem, setSelectedItem] = useState<Shop | LendItem | Request | Hangout | null>(null)
  const [selectedItemType, setSelectedItemType] = useState<"shop" | "lendItem" | "request" | "hangout" | "">("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isLoadingStake, setIsLoadingStake] = useState(false)
  const [isUpdatingDatabase, setIsUpdatingDatabase] = useState(false)
  const [stakeAddress, setStakeAddress] = useState<string | null>(null)
  const [showStakeModal, setShowStakeModal] = useState(false)
  const [pendingStakeAmount, setPendingStakeAmount] = useState<number | null>(null)
  const [stakeResult, setStakeResult] = useState<{
    success: boolean
    message: string
    signature?: string
    error?: string
  } | null>(null)
  
  // Enhanced auth guard notification state
  const [enhancedAuthNotification, setEnhancedAuthNotification] = useState<{
    message: string
    isVisible: boolean
  }>({
    message: "",
    isVisible: false,
  })

  // Voting state
  const [voteNotification, setVoteNotification] = useState<{
    message: string
    isVisible: boolean
    voteType?: "upvote" | "downvote"
    signature?: string
  }>({
    message: "",
    isVisible: false,
  })

  // Custom enhanced auth guard for this page
  const requireEnhancedAuth = (action: string, callback?: () => void) => {
    console.log('Enhanced Auth Guard Check:', {
      action,
      isConnected,
      existingSNS: !!existingSNS,
      userStake,
      minStakeAmount: 0.001
    })

    // Check login requirement
    if (!isConnected) {
      console.log('Auth Guard: Login required')
      setEnhancedAuthNotification({
        message: `You need to be logged in to ${action}`,
        isVisible: true,
      })
      return false
    }

    // Check SNS profile requirement
    if (!existingSNS) {
      console.log('Auth Guard: SNS profile required')
      setEnhancedAuthNotification({
        message: `You need to create your SNS profile before you can ${action}`,
        isVisible: true,
      })
      return false
    }

    // Check staking requirement
    if (userStake < 0.001) {
      console.log('Auth Guard: Staking required', { userStake, minStakeAmount: 0.001 })
      setEnhancedAuthNotification({
        message: `You need to stake at least 0.001 SOL to ${action}`,
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

  const closeEnhancedAuthNotification = () => {
    setEnhancedAuthNotification(prev => ({ ...prev, isVisible: false }))
  }
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Listen for reopen SNS modal event
  useEffect(() => {
    const handleReopenModal = (event: CustomEvent) => {
      setShowProfileModal(true)
      // Refresh SNS data from database after profile creation
      if (event.detail?.domain && userInfo?.email) {
        // Refresh SNS data without reloading the page
        setTimeout(() => {
          if (userInfo?.email) {
            checkExistingSNS(userInfo.email)
          }
        }, 1000) // Wait 1 second for database to update
      }
    }
    
    window.addEventListener('reopen-sns-modal', handleReopenModal as EventListener)
    
    return () => {
      window.removeEventListener('reopen-sns-modal', handleReopenModal as EventListener)
    }
  }, [userInfo?.email, checkExistingSNS])

  // Listen for reopen stake modal event
  useEffect(() => {
    const handleReopenStakeModal = (event: CustomEvent) => {
      setShowStakeModal(true)
      
      // If there's a pending stake amount, restore it
      if (event.detail?.amount) {
        setPendingStakeAmount(event.detail.amount)
      }
      
      // If there's a result (success or error), set it
      if (event.detail?.success !== undefined) {
        setStakeResult({
          success: event.detail.success,
          message: event.detail.message,
          signature: event.detail.signature,
          error: event.detail.error
        })
      }
    }
    
    window.addEventListener('reopen-stake-modal', handleReopenStakeModal as EventListener)
    
    return () => {
      window.removeEventListener('reopen-stake-modal', handleReopenStakeModal as EventListener)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    const fetchSpaceWithRetry = async () => {
      setIsLoadingSpace(true)
      const maxRetries = 2 // retry 2 times after the first attempt
      let attempt = 0

      while (attempt <= maxRetries) {
        try {
          const url = buildSpacesUrl(encodeURIComponent(spaceId))
          console.log(`Fetching space (attempt ${attempt + 1}) from:`, url)
          const response = await axios.get(url)
          const apiSpace = response.data?.space
          if (apiSpace) {
            const mapped: Space = {
              spaceId: apiSpace.space_id,
              title: apiSpace.title,
              description: apiSpace.description,
              date: apiSpace.date,
              location: apiSpace.location,
              locationLink: apiSpace.location_link || undefined,
              featuresEnabled: apiSpace.features_enabled || [],
              admins: apiSpace.admins || [],
              artwork: apiSpace.artwork || "",
              background: apiSpace.background || undefined,
              tags: apiSpace.tags || [],
              upvotes: apiSpace.upvotes ?? 0,
              downvotes: apiSpace.downvotes ?? 0,
              space_contract_id: apiSpace.space_contract_id || undefined,
            }
            if (!isMounted) return
            setSpace(mapped)
            
            // Set stake address from space data
            setStakeAddress(apiSpace.stake_address || null)
            
            if (mapped.featuresEnabled.length > 0) {
              const firstFeature = mapped.featuresEnabled[0]
              const sectionMap: Record<string, string> = {
                shops: "explore",
                lend: "lend",
                request: "request",
                hangout: "hangout",
              }
              setActiveSection(sectionMap[firstFeature] || "explore")
            }
            break // success
          } else {
            throw new Error("No space field in response")
          }
        } catch (err) {
          console.warn(`Fetch space failed (attempt ${attempt + 1})`, err)
          attempt += 1
          if (attempt > maxRetries) {
            if (!isMounted) return
            setSpace(null)
            break
          }
          await delay(2000) // wait 2 seconds before retry
        }
      }
      if (isMounted) setIsLoadingSpace(false)
    }

    fetchSpaceWithRetry()

    return () => {
      isMounted = false
    }
  }, [spaceId])

  // Fetch user stake data from SNS API
  useEffect(() => {
    if (!isConnected || !userInfo?.email) {
      setUserStake(0)
      return
    }

    const fetchUserStake = async () => {
      setIsLoadingStake(true)
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SNS_API_URL || 'http://localhost:3000'
        const snsUrl = `${baseUrl}/api/sns/${encodeURIComponent(userInfo.email || '')}`
        console.log('Fetching user stake data from:', snsUrl)
        
        const response = await axios.get(snsUrl)
        const userData = response.data?.user
        
        if (userData) {
          setUserStake(parseFloat(userData.stake) || 0)
        } else {
          setUserStake(0)
        }
      } catch (err) {
        console.error('Failed to fetch user stake data:', err)
        setUserStake(0)
      } finally {
        setIsLoadingStake(false)
      }
    }

    fetchUserStake()
  }, [isConnected, userInfo?.email, refreshKey])

  const handleItemClick = (
    item: Shop | LendItem | Request | Hangout,
    type: "shop" | "lendItem" | "request" | "hangout",
  ) => {
    setSelectedItem(item)
    setSelectedItemType(type)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
    setSelectedItemType("")
  }

  const handleVoteUpdate = () => {
    setRefreshKey((prev) => prev + 1)
    // Optionally re-fetch the space to update vote counts if backend persists votes
  }

  const handleSpaceVote = async (voteType: "up" | "down") => {
    if (!space || !space.space_contract_id) return

    // Extract item ID from space_contract_id (format: "contract:itemId")
    const itemId = parseInt(space.space_contract_id.split(":")[1])
    if (isNaN(itemId)) {
      console.error("Invalid space contract ID format:", space.space_contract_id)
      return
    }

    const voteTypeString = voteType === "up" ? "upvote" : "downvote"
    
    try {
      console.log(`🗳️ Voting ${voteTypeString} on space ${space.title} (Item ID: ${itemId})`)
      
      const result = await vote(itemId, voteTypeString as "upvote" | "downvote")
      
      // Only update UI and database if vote actually succeeded on blockchain
      if (result.success) {
        // Update local vote counts
        const delta = voteType === "up" 
          ? { upvotes: space.upvotes + 1 } 
          : { downvotes: space.downvotes + 1 }
        setSpace({ ...space, ...delta } as Space)
        
        // Update database with new vote count
        await updateSpaceVoteCount(voteType, space.spaceId)
      } else {
        // Vote failed (e.g., already voted) - don't update anything
        console.log("Vote failed on blockchain, not updating UI or database")
      }
    } catch (error) {
      console.error("Error voting:", error)
    }
  }

  // Function to update space vote count in database
  const updateSpaceVoteCount = async (voteType: "up" | "down", spaceId: string) => {
    if (!space) return

    const currentCount = voteType === "up" ? space.upvotes : space.downvotes
    const newCount = currentCount + 1
    
    const updateData = voteType === "up" 
      ? { upvotes: newCount }
      : { downvotes: newCount }

    let attempts = 0
    const maxAttempts = 2
    const retryDelay = 2000 // 2 seconds

    while (attempts < maxAttempts) {
      try {
        console.log(`📊 Updating ${voteType}vote count to ${newCount} (attempt ${attempts + 1}/${maxAttempts})`)
        
        const response = await axios.patch(
          `${buildSpacesUrl()}/${spaceId}`,
          updateData,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        if (response.status === 200) {
          console.log(`✅ Successfully updated ${voteType}vote count to ${newCount}`)
          return
        }
      } catch (error) {
        console.error(`❌ Error updating ${voteType}vote count (attempt ${attempts + 1}):`, error)
        
        if (attempts === maxAttempts - 1) {
          console.error(`❌ Failed to update ${voteType}vote count after ${maxAttempts} attempts`)
          // You could show a notification here if needed
          return
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      
      attempts++
    }
  }

  const handleStake = async () => {
    if (!isConnected) {
      requireAuthLogin("stake tokens", () => {})
      return
    }
    
    // Clear any previous result when opening modal
    setStakeResult(null)
    setShowStakeModal(true)
  }

  const handleCloseStakeModal = () => {
    setShowStakeModal(false)
    // Clear result after a delay to allow user to see it
    setTimeout(() => {
      setStakeResult(null)
      setPendingStakeAmount(null)
    }, 1000)
  }

  const updateUserStakeAmount = async (stakedAmount: number) => {
    if (!userInfo?.email) {
      console.error('No user email available for stake update')
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_SNS_API_URL || 'http://localhost:3000'
    const updateUrl = `${baseUrl}/api/sns/${encodeURIComponent(userInfo.email)}`
    
    // Retry logic with 2 attempts and 2 second gap
    const maxRetries = 2
    let lastError = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Database update attempt ${attempt + 1}/${maxRetries + 1}`)
        
        // Get current stake amount
        const currentResponse = await axios.get(updateUrl)
        const currentStake = parseFloat(currentResponse.data?.user?.stake) || 0
        
        // Calculate new total stake amount
        const newTotalStake = currentStake + stakedAmount
        
        // Update the stake amount using the correct API format
        const updateResponse = await axios.patch(updateUrl, {
          stake: newTotalStake // Send as number, not string
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        console.log('Stake amount updated successfully:', {
          previous: currentStake,
          added: stakedAmount,
          newTotal: newTotalStake,
          attempt: attempt + 1
        })
        
        return // Success, exit retry loop
        
      } catch (err: any) {
        lastError = err
        console.error(`Database update attempt ${attempt + 1} failed:`, err.response?.data || err.message)
        
        // If this is not the last attempt, wait 2 seconds before retry
        if (attempt < maxRetries) {
          console.log('Waiting 2 seconds before retry...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }
    
    // If all retries failed, log the final error
    console.error('All database update attempts failed:', (lastError as any)?.response?.data || (lastError as any)?.message)
  }

  const handleStakeSubmit = async (amount: number) => {
    if (!isConnected) {
      return
    }

    // Store the pending stake amount and close modal first
    setPendingStakeAmount(amount)
    setShowStakeModal(false)
    
    // Wait for modal to close, then execute transaction
    setTimeout(async () => {
      try {
        console.log('Staking amount:', amount)
        console.log('Stake address:', stakeAddress)
        
        // Use the staking hook to perform the actual staking
        const signature = await stake(amount)
        
        console.log('Staking transaction successful:', signature)
        
        // Update user's stake amount in database with loading state
        setIsUpdatingDatabase(true)
        try {
          await updateUserStakeAmount(amount)
        } finally {
          setIsUpdatingDatabase(false)
        }
        
        // Clear pending amount and refresh stake data
        setPendingStakeAmount(null)
        setRefreshKey((prev) => prev + 1)
        
        // Reopen modal to show success
        const successEvent = new CustomEvent('reopen-stake-modal', {
          detail: { 
            amount, 
            success: true, 
            signature: signature,
            message: 'Staking successful!'
          }
        })
        window.dispatchEvent(successEvent)
        
      } catch (err) {
        console.error('Staking failed:', err)
        // Clear pending amount on error
        setPendingStakeAmount(null)
        
        // Reopen modal to show error
        const errorEvent = new CustomEvent('reopen-stake-modal', {
          detail: { 
            amount, 
            success: false, 
            error: err instanceof Error ? err.message : 'Staking failed',
            message: 'Staking failed. Please try again.'
          }
        })
        window.dispatchEvent(errorEvent)
      }
    }, 500) // Wait 500ms for modal to close
  }

  const getEnabledSections = () => {
    if (!space) return []

    const sectionMap = [
      {
        id: "explore",
        feature: "shops",
        label: "Explore onchain shops",
        enabled: space.featuresEnabled.includes("shops"),
      },
      { id: "lend", feature: "lend", label: "Lend IRL items", enabled: space.featuresEnabled.includes("lend") },
      { id: "request", feature: "request", label: "Request", enabled: space.featuresEnabled.includes("request") },
      { id: "hangout", feature: "hangout", label: "Hangout", enabled: space.featuresEnabled.includes("hangout") },
    ]

    return sectionMap.filter((section) => section.enabled)
  }

  const renderContent = () => {
    if (!space) return null

    switch (activeSection) {
      case "explore":
        if (!space.featuresEnabled.includes("shops")) return null
        return <ExploreSection key={refreshKey} onItemClick={handleItemClick} onRequireAuth={requireEnhancedAuth} spaceId={spaceId} userStake={userStake} />
      case "lend":
        if (!space.featuresEnabled.includes("lend")) return null
        return <LendSection key={refreshKey} onItemClick={handleItemClick} onRequireAuth={requireEnhancedAuth} spaceId={spaceId} userStake={userStake} />
      case "request":
        if (!space.featuresEnabled.includes("request")) return null
        return <RequestSection key={refreshKey} onItemClick={handleItemClick} onRequireAuth={requireEnhancedAuth} spaceId={spaceId} userStake={userStake} />
      case "hangout":
        if (!space.featuresEnabled.includes("hangout")) return null
        return <HangoutSection key={refreshKey} onItemClick={handleItemClick} onRequireAuth={requireEnhancedAuth} spaceId={spaceId} userStake={userStake} />
      case "create-room":
        return <CreateRoomForm spaceId={spaceId} userStake={userStake} onRoomCreated={handleVoteUpdate} />
      default:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Welcome to {space.title}</h2>
            <p className="text-gray-400">Select a feature from the sidebar to get started</p>
          </div>
        )
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Date TBA"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Date TBA"
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (isLoadingSpace) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <GalaxyBackground />
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-bold mb-4">Loading space…</h1>
          <p className="text-gray-400 mb-6">Please wait while we fetch details.</p>
        </div>
      </div>
    )
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <GalaxyBackground />
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-bold mb-4">Space Not Found</h1>
          <p className="text-gray-400 mb-6">The space "{spaceId}" does not exist.</p>
          <Button onClick={() => router.push("/")} className="glass-button text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <GalaxyBackground />
      {/* Notifications for login-only and profile-required guards */}
      <AuthNotification message={notifLogin.message} isVisible={notifLogin.isVisible} onClose={closeNotifLogin} />
      <AuthNotification message={notifProfile.message} isVisible={notifProfile.isVisible} onClose={closeNotifProfile} />
      <AuthNotification message={enhancedAuthNotification.message} isVisible={enhancedAuthNotification.isVisible} onClose={closeEnhancedAuthNotification} />
      
      {/* Voting Notifications - Dynamic bottom notifications with auto-dismiss */}
      {votingHash && (
        <VotingNotification 
          message={`Vote transaction submitted! View on Solana Explorer: ${votingHash}`} 
          isVisible={true} 
          onClose={() => {}} 
          type="success"
        />
      )}
      {votingError && (
        <VotingNotification 
          message={votingError} 
          isVisible={true} 
          onClose={() => {}} 
          type="error"
        />
      )}
      
      <VoteNotification 
        message={voteNotification.message} 
        isVisible={voteNotification.isVisible} 
        onClose={() => setVoteNotification(prev => ({ ...prev, isVisible: false }))}
        voteType={voteNotification.voteType}
        signature={voteNotification.signature}
      />

      <div className="relative z-10">
        <div className="glass-sidebar">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="SPACE Logo"
                    width={56}
                    height={56}
                    className="object-contain drop-shadow-lg"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl blur-md -z-10"></div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button
                onClick={() => router.push("/")}
                className="glass-button text-gray-400 hover:text-white flex-1 sm:flex-none"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Button>
              {isConnected && (
                <div className="hidden sm:flex items-center gap-2">
                  {existingSNS ? (
                    <div 
                      onClick={() => setShowProfileModal(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-md cursor-pointer hover:bg-green-500/30 transition-colors"
                    >
                      <User className="h-3 w-3 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">{existingSNS.sns_id}</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowProfileModal(true)}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white backdrop-blur-sm"
                      disabled={isCheckingSNS}
                    >
                      {isCheckingSNS ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                      <User className="h-3 w-3 mr-1" />
                          Create Profile
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Stake Button */}
                  <div className="flex items-center">
                    {isLoadingStake ? (
                      <div className="flex items-center justify-center px-3 py-2 bg-gray-500/20 border border-gray-500/30 rounded-md">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      </div>
                    ) : userStake > 0.001 ? (
                      <Button
                        onClick={handleStake}
                        size="sm"
                        className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 hover:text-green-300 backdrop-blur-sm"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Staked
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStake}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white backdrop-blur-sm"
                      >
                        <Coins className="h-3 w-3 mr-1" />
                        Stake
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <Button
                disabled={isBusy}
                onClick={async () => {
                  if (isConnected) {
                    await logout()
                    setIsLoggedIn(false)
                  } else {
                    await login()
                    setIsLoggedIn(true)
                  }
                }}
                className="glass-button text-white flex-1 sm:flex-none"
              >
                {isConnected ? "Logout" : "Login"}
              </Button>
            </div>
          </div>
        </div>

        <div
          className="relative h-[15vh] sm:h-[22vh] bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${buildAssetUrl(space.background) || "/vibrant-tech-art.png"}')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="relative -mt-8 sm:-mt-16 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {space.artwork ? (
              <img
                src={buildAssetUrl(space.artwork) as string}
                alt={space.title || "Space"}
                className="w-20 h-20 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl object-cover border-2 sm:border-4 border-white/30 shadow-2xl flex-shrink-0 bg-black/50 backdrop-blur-sm mx-auto sm:mx-0"
              />
            ) : null}

            <div className="flex-1 pt-4 sm:pt-8 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">{space.title || space.spaceId}</h1>
                  {space.description && (
                    <p className="text-gray-300 text-base sm:text-lg max-w-2xl">{space.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">

                  <Button
                    onClick={() => handleSpaceVote("up")}
                    variant="outline"
                    size="sm"
                    disabled={isVoting}
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20 hover:border-green-500 backdrop-blur-sm disabled:opacity-50"
                  >
                    {isVoting ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400 mr-1" />
                    ) : (
                    <ArrowUp className="h-3 w-3 mr-1" />
                    )}
                    {space.upvotes}
                  </Button>
                  <Button
                    onClick={() => handleSpaceVote("down")}
                    variant="outline"
                    size="sm"
                    disabled={isVoting}
                    className="border-green-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 backdrop-blur-sm disabled:opacity-50"
                  >
                    {isVoting ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400 mr-1" />
                    ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                    )}
                    {space.downvotes}
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="glass-sidebar">
          <div className="p-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 text-sm text-gray-400">
                {space.date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">{formatDate(space.date)}</span>
                  </div>
                )}
                {space.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {space.locationLink ? (
                      <a
                        href={space.locationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm text-blue-300 hover:text-blue-200 underline underline-offset-2"
                      >
                        {space.location}
                      </a>
                    ) : (
                      <span className="text-xs sm:text-sm">{space.location}</span>
                    )}
                  </div>
                )}
                {space.admins?.length ? (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Admins: {space.admins.join(", ")}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex gap-1 flex-wrap">
                {(space.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-white/10 text-gray-300 hover:bg-white/20 text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          <NavigationSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            enabledSections={getEnabledSections()}
            isSpacePage={true}
          />

          <div className="flex-1 w-full min-h-screen">
            <div className="p-4 sm:p-6 pb-24 md:pb-6">{renderContent()}</div>
          </div>
        </div>
      </div>

      <ItemModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        item={selectedItem}
        itemType={selectedItemType}
        onVoteUpdate={handleVoteUpdate}
      />

      {/* SNS Profile Creation Modal */}
      <SNSProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Stake Modal */}
      <StakeModal
        isOpen={showStakeModal}
        onClose={handleCloseStakeModal}
        onStake={handleStakeSubmit}
        stakeAddress={stakeAddress}
        currentStake={userStake}
        isLoading={isStakingTransaction || isUpdatingDatabase}
        error={typeof stakingError === 'string' ? stakingError : (stakingError as any)?.message || null}
        pendingAmount={pendingStakeAmount}
        result={stakeResult}
        isUpdatingDatabase={isUpdatingDatabase}
      />
    </div>
  )
}
