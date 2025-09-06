"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSolanaWallet, useSignAndSendTransaction } from "@web3auth/modal/react/solana"
import { useWeb3AuthUser } from "@web3auth/modal/react"
import { 
  LAMPORTS_PER_SOL, 
  PublicKey, 
  SystemProgram, 
  Transaction,
  Connection
} from "@solana/web3.js"
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  NATIVE_MINT,
  createSyncNativeInstruction,
} from "@solana/spl-token"
import { devnet } from "@bonfida/spl-name-service"
import { CheckCircle, XCircle, Loader2, User, Globe } from "lucide-react"
import { useAuthGuard } from "@/lib/useAuthGuard"
import { useSNSDatabase } from "@/lib/useSNSDatabase"

interface SNSProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SNSProfileModal({ isOpen, onClose }: SNSProfileModalProps) {
  const { accounts, connection } = useSolanaWallet()
  const { data: hash, error: txError, loading: isPending, signAndSendTransaction } = useSignAndSendTransaction()
  const { userInfo } = useWeb3AuthUser()
  const { requireAuth } = useAuthGuard()
  const { saveSNSID } = useSNSDatabase(userInfo?.email)
  
  // Fallback RPC endpoint if the default one fails
  const fallbackConnection = new Connection("https://api.devnet.solana.com", "confirmed")
  
  const [domain, setDomain] = useState("")
  const [suggestedUsername, setSuggestedUsername] = useState("")
  const [error, setError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [hasSavedToDB, setHasSavedToDB] = useState(false)

  // Generate username suggestion from email
  useEffect(() => {
    if (userInfo?.email) {
      const email = userInfo.email
      const username = email.split('@')[0] // Get part before @
        .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
        .toLowerCase() // Convert to lowercase
        .substring(0, 20) // Limit to 20 chars
      
      if (username.length >= 3) {
        setSuggestedUsername(username)
        setDomain(username) // Auto-fill the input
      }
    }
  }, [userInfo])

  // Fetch balance when accounts change
  useEffect(() => {
    const fetchBalance = async () => {
      if (connection && accounts && accounts.length > 0) {
        try {
          setIsLoadingBalance(true)
          const publicKey = new PublicKey(accounts[0])
          
          // Try to get balance with retry logic
          let balance = null
          let retries = 3
          
          while (retries > 0 && balance === null) {
            try {
              balance = await connection.getBalance(publicKey)
              break
            } catch (err) {
              console.warn(`Balance fetch attempt ${4 - retries} failed:`, err)
              retries--
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
              }
            }
          }
          
          // If main connection failed, try fallback
          if (balance === null) {
            try {
              console.log("Trying fallback RPC endpoint...")
              balance = await fallbackConnection.getBalance(publicKey)
            } catch (fallbackErr) {
              console.error("Fallback RPC also failed:", fallbackErr)
            }
          }
          
          if (balance !== null) {
            setBalance(balance)
          } else {
            console.error("All balance fetch attempts failed")
            setBalance(null)
          }
        } catch (err) {
          console.error("Failed to fetch balance:", err)
          setBalance(null)
        } finally {
          setIsLoadingBalance(false)
        }
      }
    }

    fetchBalance()
  }, [connection, accounts])

  const handleCreateProfile = async () => {
    if (!requireAuth("create a profile", () => {})) return
    
    if (!accounts || accounts.length === 0) {
      setError("Please connect your Solana wallet first")
      return
    }

    if (!connection) {
      setError("Solana connection not available")
      return
    }

    if (!domain.trim()) {
      setError("Please enter a domain name")
      return
    }

    const cleanDomain = domain.replace(/\.sol$/, "")
    
    if (cleanDomain.length < 3 || cleanDomain.length > 32) {
      setError("Domain must be between 3 and 32 characters")
      return
    }

    setIsProcessing(true)
    setError("")
    setHasSavedToDB(false) // Reset save flag when starting new profile creation


    try {
      const buyer = new PublicKey(accounts[0])
      const spaceBytes = 1024 // Fixed size for simplicity
      
      const balance = await connection.getBalance(buyer)
      const estimatedCost = 0.2 * LAMPORTS_PER_SOL
      
      if (balance < estimatedCost) {
        setError(`Insufficient SOL balance. You need at least ${(estimatedCost / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
        return
      }

      // Try USDC first, fallback to SOL
      let mint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
      let buyerTokenAccount = getAssociatedTokenAddressSync(mint, buyer, true)
      const preIxs = [
        createAssociatedTokenAccountIdempotentInstruction(buyer, buyerTokenAccount, buyer, mint),
      ]

      let instructions
      try {
        instructions = await devnet.bindings.registerDomainNameV2(
          connection, cleanDomain, spaceBytes, buyer, buyerTokenAccount, mint
        )
      } catch (e: any) {
        if (e?.type === "PythFeedNotFound" || e?.message?.includes("Pyth account")) {
          mint = NATIVE_MINT
          buyerTokenAccount = getAssociatedTokenAddressSync(mint, buyer, true)
          preIxs.length = 0
          preIxs.push(
            createAssociatedTokenAccountIdempotentInstruction(buyer, buyerTokenAccount, buyer, mint),
            SystemProgram.transfer({ 
              fromPubkey: buyer, 
              toPubkey: buyerTokenAccount, 
              lamports: Math.floor(0.2 * LAMPORTS_PER_SOL)
            }),
            createSyncNativeInstruction(buyerTokenAccount),
          )
          instructions = await devnet.bindings.registerDomainNameV2(
            connection, cleanDomain, spaceBytes, buyer, buyerTokenAccount, mint
          )
        } else {
          throw e
        }
      }

      const transaction = new Transaction({ feePayer: buyer })
      for (const ix of preIxs) transaction.add(ix)
      for (const ix of instructions) transaction.add(ix)

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.lastValidBlockHeight = lastValidBlockHeight

      signAndSendTransaction(transaction)
      setError("")
      
      // Close our modal so Web3Auth transaction modal can be focused
      setTimeout(() => {
        onClose()
      }, 500) // Wait 500ms for transaction to be submitted
      
    } catch (err: any) {
      console.error("SNS Profile Creation Error:", err)
      
      if (err.message?.includes("Blockhash not found")) {
        setError("Transaction expired. Please try again.")
      } else if (err.message?.includes("Insufficient funds")) {
        setError("Insufficient SOL balance for transaction fees.")
      } else if (err.message?.includes("already registered")) {
        setError("This domain name is already registered. Try a different name.")
      } else {
        setError(err.message || "Failed to create SNS profile")
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setError("")
    setDomain(suggestedUsername) // Reset to suggested username
    setHasSavedToDB(false) // Reset save flag
    onClose()
  }

  // Update minted domain when transaction succeeds and reopen modal
  useEffect(() => {
    console.log('SNS Modal useEffect triggered:', { hash, domain, isPending, userEmail: userInfo?.email, hasSavedToDB })
    
    if (hash && domain && !isPending && userInfo?.email && !hasSavedToDB) {
      const cleanDomain = domain.replace(/\.sol$/, "")
      const fullDomain = cleanDomain + ".sol"
      
      console.log('SNS Modal - Saving to database:', { email: userInfo.email, domain: fullDomain })
      
      // Set flag to prevent multiple saves
      setHasSavedToDB(true)
      
      // Save SNS ID to database
      saveSNSID(userInfo.email, fullDomain)
        .then((result) => {
          if (result.success) {
            console.log('SNS ID saved to database successfully')
          } else {
            console.error('Failed to save SNS ID to database:', result.error)
            // Reset flag if save failed
            setHasSavedToDB(false)
          }
        })
        .catch((error) => {
          console.error('Error in saveSNSID promise:', error)
          // Reset flag if save failed
          setHasSavedToDB(false)
        })
      
      // Reopen our modal after transaction is confirmed
      setTimeout(() => {
        // Force reopen the modal by triggering a state change
        const event = new CustomEvent('reopen-sns-modal', { 
          detail: { domain: fullDomain } 
        })
        window.dispatchEvent(event)
      }, 1000) // Wait 1 second for Web3Auth modal to close
    }
  }, [hash, domain, isPending, userInfo?.email, saveSNSID, hasSavedToDB])

  if (!accounts || accounts.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-black/90 backdrop-blur-md border-white/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create SNS Profile</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-gray-400">Please connect your Solana wallet to create an SNS profile</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 backdrop-blur-md border-white/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5 text-purple-400" />
            Create SNS Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Balance Display */}
          {balance !== null && (
            <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 font-medium">
                Balance: {(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL
              </p>
            </div>
          )}
          {isLoadingBalance && (
            <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400">Loading balance...</p>
            </div>
          )}
          {balance === null && !isLoadingBalance && (
            <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ Unable to fetch balance. RPC endpoint may be overloaded.
              </p>
              <p className="text-yellow-400 text-xs mt-1">
                You can still create a profile if you have sufficient SOL.
              </p>
            </div>
          )}

          {/* Profile Creation Form */}
          <Card className="bg-black/30 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Profile Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                Create your unique .sol domain profile
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Domain Name</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder={suggestedUsername || "yourname"}
                    />
                    <span className="text-purple-400 font-medium">.sol</span>
                  </div>
                  {suggestedUsername && (
                    <p className="text-xs text-purple-400 mt-1">
                      💡 Suggested from your email: {suggestedUsername}.sol
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">3-32 characters, letters and numbers only</p>
                </div>

                <Button 
                  onClick={handleCreateProfile}
                  disabled={isPending || isProcessing}
                  className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                >
                  {isPending || isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isPending ? 'Confirming...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      Create Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Status */}
          {hash && (
            <Card className="bg-blue-500/10 backdrop-blur-md border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing Transaction...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-300 text-xs">
                  Transaction submitted! Please wait for confirmation...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {(error || txError) && (
            <Card className="bg-red-500/10 backdrop-blur-md border-red-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Error: {error || txError?.message}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
