"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSolanaWallet, useSignAndSendTransaction } from "@web3auth/modal/react/solana"
import { 
  LAMPORTS_PER_SOL, 
  PublicKey, 
  SystemProgram, 
  Transaction
} from "@solana/web3.js"
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  NATIVE_MINT,
  createSyncNativeInstruction,
} from "@solana/spl-token"
import { devnet } from "@bonfida/spl-name-service"
import { CheckCircle, XCircle, Loader2, User, Globe, Coins } from "lucide-react"
import { useAuthGuard } from "@/lib/useAuthGuard"

export function CreateSNSProfileForm() {
  const { accounts, connection } = useSolanaWallet()
  const { data: hash, error: txError, loading: isPending, signAndSendTransaction } = useSignAndSendTransaction()
  const { requireAuth } = useAuthGuard()
  
  const [domain, setDomain] = useState("")
  const [space, setSpace] = useState("1024")
  const [error, setError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  // SNS Program ID for devnet
  const SNS_PROGRAM_ID = new PublicKey("58BWFsn3qJ1si7uZh8Q5qpE6mJpPkqqwLJ9wY5q7KqX")

  // Fetch balance when accounts change (same pattern as wallet section)
  useEffect(() => {
    const fetchBalance = async () => {
      if (connection && accounts && accounts.length > 0) {
        try {
          setIsLoadingBalance(true)
          const publicKey = new PublicKey(accounts[0])
          const balance = await connection.getBalance(publicKey)
          setBalance(balance)
        } catch (err) {
          console.error("Failed to fetch balance:", err)
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

    // Remove .sol if user includes it
    const cleanDomain = domain.replace(/\.sol$/, "")
    
    if (cleanDomain.length < 3 || cleanDomain.length > 32) {
      setError("Domain must be between 3 and 32 characters")
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      const buyer = new PublicKey(accounts[0])
      const spaceBytes = parseInt(space)
      
      // Check balance (need more SOL for SNS registration)
      const balance = await connection.getBalance(buyer)
      const estimatedCost = 0.2 * LAMPORTS_PER_SOL // SNS registration costs more
      
      if (balance < estimatedCost) {
        setError(`Insufficient SOL balance. You need at least ${(estimatedCost / LAMPORTS_PER_SOL).toFixed(4)} SOL for SNS registration`)
        return
      }

      // Try with USDC first; fallback to SOL if Pyth feed missing (same as your script)
      let mint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU") // USDC devnet
      let buyerTokenAccount = getAssociatedTokenAddressSync(mint, buyer, true)
      const preIxs = [
        createAssociatedTokenAccountIdempotentInstruction(buyer, buyerTokenAccount, buyer, mint),
      ]

      // Build registration instructions using the real SNS program
      let instructions
      try {
        instructions = await devnet.bindings.registerDomainNameV2(
          connection,
          cleanDomain,
          spaceBytes,
          buyer,
          buyerTokenAccount,
          mint,
        )
      } catch (e: any) {
        const msg = e?.message || ""
        if (e?.type === "PythFeedNotFound" || msg.includes("Pyth account")) {
          console.log("USDC Pyth feed not found on devnet; falling back to SOL.")
          // Switch to SOL (WSOL) path
          mint = NATIVE_MINT
          buyerTokenAccount = getAssociatedTokenAddressSync(mint, buyer, true)
          preIxs.length = 0
          preIxs.push(
            createAssociatedTokenAccountIdempotentInstruction(buyer, buyerTokenAccount, buyer, mint),
            SystemProgram.transfer({ 
              fromPubkey: buyer, 
              toPubkey: buyerTokenAccount, 
              lamports: Math.floor(Math.max(0.2 * LAMPORTS_PER_SOL, 0.05 * LAMPORTS_PER_SOL)) 
            }),
            createSyncNativeInstruction(buyerTokenAccount),
          )
          instructions = await devnet.bindings.registerDomainNameV2(
            connection,
            cleanDomain,
            spaceBytes,
            buyer,
            buyerTokenAccount,
            mint,
          )
        } else {
          throw e
        }
      }

      // Create transaction with all instructions
      const transaction = new Transaction({
        feePayer: buyer,
      })

      // Add all instructions: pre-instructions + SNS registration
      for (const ix of preIxs) transaction.add(ix)
      for (const ix of instructions) transaction.add(ix)

      // Get fresh blockhash right before sending to avoid expiration
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.lastValidBlockHeight = lastValidBlockHeight

      // Use the same signAndSendTransaction pattern as wallet section
      signAndSendTransaction(transaction)
      
      // Clear any previous errors
      setError("")
      
    } catch (err: any) {
      console.error("SNS Profile Creation Error:", err)
      
      // Handle specific Solana errors
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

  if (!accounts || accounts.length === 0) {
    return (
      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Create SNS Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Please connect your Solana wallet to create an SNS profile</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wallet Status Card (same pattern as wallet section) */}
      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-400" />
            Solana Wallet Connected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-2">Address: <span className="font-mono text-purple-400">{accounts?.[0]}</span></p>
          <p className="text-purple-400 mt-2">Network: Solana Devnet</p>
          {balance !== null && (
            <p className="text-green-400 mt-2">Balance: {(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL</p>
          )}
          {isLoadingBalance && (
            <p className="text-gray-400 mt-2">Loading balance...</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5 text-purple-400" />
            Create SNS Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-4">
            Register a .sol domain on Solana Devnet to create your unique profile
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Domain Name</label>
              <div className="flex items-center gap-2">
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="yourname"
                />
                <span className="text-purple-400 font-medium">.sol</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">3-32 characters, letters and numbers only</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Storage Space (bytes)</label>
              <select
                value={space}
                onChange={(e) => setSpace(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2"
              >
                <option value="1024">1 KB - Basic Profile</option>
                <option value="2048">2 KB - Extended Profile</option>
                <option value="4096">4 KB - Rich Profile</option>
                <option value="8192">8 KB - Premium Profile</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">More space = higher cost</p>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Coins className="h-4 w-4" />
                <span className="font-medium">Estimated Cost</span>
              </div>
              <p className="text-sm text-gray-300">
                Domain registration: ~0.05 SOL<br />
                Storage ({space} bytes): ~0.01 SOL<br />
                Token account creation: ~0.01 SOL<br />
                <span className="text-purple-400 font-medium">Total: ~0.07 SOL</span>
              </p>
              {balance !== null && (
                <div className="mt-3 pt-3 border-t border-purple-500/20">
                  <p className="text-sm text-gray-300">
                    Your Balance: <span className="text-green-400 font-medium">{(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL</span>
                  </p>
                  <p className={`text-xs ${balance >= 0.07 * LAMPORTS_PER_SOL ? 'text-green-400' : 'text-red-400'}`}>
                    {balance >= 0.07 * LAMPORTS_PER_SOL ? '✅ Sufficient balance' : '❌ Insufficient balance'}
                  </p>
                </div>
              )}
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
            
            {/* Balance Check Warning */}
            {balance !== null && balance < 0.07 * LAMPORTS_PER_SOL && (
              <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">
                  ⚠️ Insufficient balance. You need at least 0.07 SOL to create a profile.
                </p>
              </div>
            )}
            
            {/* Transaction Tips */}
            <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400 text-sm">
                💡 Tip: If you get "Blockhash not found" error, just try again - the system automatically gets fresh blockhashes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Status (same style as wallet section) */}
      {hash && (
        <Card className="bg-green-500/10 backdrop-blur-md border-green-500/20">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Profile Creation Initiated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-300 mb-2">Transaction Hash:</p>
            <p className="font-mono text-xs text-green-200 break-all mb-2">{hash}</p>
            <p className="text-green-300 text-xs">
              View on <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer" className="underline">Solana Explorer</a>
            </p>
            <p className="text-green-300 text-xs mt-2">
              🎉 Your SNS profile transaction has been submitted to the Solana network!
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

      {/* Info Card */}
      <Card className="bg-blue-500/10 backdrop-blur-md border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-400">About SNS Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-blue-300">
            <p>• SNS (.sol domains) are unique identifiers on Solana</p>
            <p>• Your profile will be stored on-chain and accessible globally</p>
            <p>• This uses the real SNS program on Solana Devnet</p>
            <p>• Costs are estimates for Solana Devnet</p>
            <p>• Registration creates a real .sol domain on the blockchain</p>
            <p>• Automatic blockhash refresh prevents transaction expiration</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
