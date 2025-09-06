import { useState } from 'react'
import { useSolanaWallet, useSignAndSendTransaction } from '@web3auth/modal/react/solana'
import { PublicKey, Transaction, SystemProgram, TransactionInstruction, Connection } from '@solana/web3.js'

// Configuration
const PROGRAM_ID = new PublicKey("5zQieQbJebHJdxpURBSswrVbHWtKXZHx6EF1gEzNrXZp")
const RPC_URL = "https://api.devnet.solana.com"

export function useShopIdGenerator() {
  const { accounts, connection } = useSolanaWallet()
  const { data: hash, error: txError, loading: isPending, signAndSendTransaction } = useSignAndSendTransaction()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateShopId = async (): Promise<{
    success: boolean
    shopId?: string
    message: string
    error?: string
  }> => {
    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        message: "No Solana account connected",
        error: "Please connect your wallet to generate shop ID"
      }
    }

    if (!connection) {
      return {
        success: false,
        message: "Solana connection not available",
        error: "Please try again"
      }
    }

    setIsGenerating(true)
    setError(null)

    try {
      console.log("🏪 Generating shop ID on-chain...")
      
      const userPublicKey = new PublicKey(accounts[0])
      
      // Generate random item ID
      const itemId = Math.floor(Math.random() * 1000000)

      // Derive PDA for the item
      const itemIdBuffer = Buffer.alloc(8)
      itemIdBuffer.writeUInt32LE(itemId, 0)
      const itemSeeds = [Buffer.from("item"), itemIdBuffer]
      const [itemPda] = PublicKey.findProgramAddressSync(itemSeeds, PROGRAM_ID)

      // Check if item already exists
      try {
        const itemAccountInfo = await connection.getAccountInfo(itemPda)
        if (itemAccountInfo) {
          return {
            success: false,
            message: "Item already exists, please try again",
            error: "Generated ID already exists on blockchain"
          }
        }
      } catch (error) {
        // Item doesn't exist, continue
      }

      // Create instruction data for initialize_item
      const discriminator = Buffer.from([56, 205, 178, 170, 150, 105, 174, 27])
      const instructionData = Buffer.concat([discriminator, itemIdBuffer])
      
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: itemPda, isSigner: false, isWritable: true },
          { pubkey: userPublicKey, isSigner: true, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: instructionData,
      })

      // Create transaction using the same pattern as voting and staking
      const transaction = new Transaction({
        feePayer: userPublicKey,
      })
      transaction.add(instruction)

      // Get fresh blockhash right before sending to avoid expiration
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.lastValidBlockHeight = lastValidBlockHeight

      // Use the same signAndSendTransaction pattern as voting and staking
      console.log("⏳ Signing and sending transaction with embedded wallet...")
      
      try {
        const signature = await signAndSendTransaction(transaction)
        
        if (!signature) {
          return {
            success: false,
            message: "Transaction failed to send",
            error: "No signature returned from wallet"
          }
        }

        console.log("✅ Transaction sent with signature:", signature)
        
        // Wait for transaction confirmation
        let attempts = 0
        const maxAttempts = 30 // Wait up to 15 seconds
        const checkInterval = 500 // Check every 500ms
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, checkInterval))
          
          try {
            // Check if transaction is confirmed
            const status = await connection.getSignatureStatus(signature, { 
              searchTransactionHistory: true 
            })
            
            if (status?.value?.confirmationStatus) {
              console.log("✅ Transaction confirmed:", signature)
              setError("")
              const shopId = `${PROGRAM_ID.toString()}:${itemId}`
              return {
                success: true,
                shopId,
                message: `Successfully generated shop ID: ${shopId}`
              }
            }
          } catch (confirmError) {
            console.log("⏳ Still waiting for confirmation...", confirmError)
          }
          
          attempts++
        }
        
        // Timeout - no confirmation after waiting
        setError("Transaction timeout")
        return {
          success: false,
          message: "Transaction timeout - please check Solana Explorer",
          error: "Transaction may still be processing"
        }
        
      } catch (signError: any) {
        // Handle signing errors
        console.error("❌ Signing error:", signError)
        
        let errorMessage = "Failed to sign transaction"
        if (signError.message?.includes("User rejected")) {
          errorMessage = "Transaction was rejected"
        } else if (signError.message?.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for transaction"
        }
        
        setError(errorMessage)
        return {
          success: false,
          message: errorMessage,
          error: signError.message || "Unknown signing error"
        }
      }

    } catch (err: any) {
      console.error("❌ Error generating shop ID:", err)
      
      let errorMessage = "Failed to generate shop ID"
      
      // Check for specific error patterns
      const errorString = err.message || err.toString() || ""
      
      if (errorString.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction"
      } else if (errorString.includes("User rejected")) {
        errorMessage = "Transaction was rejected"
      } else if (errorString.includes("Blockhash not found")) {
        errorMessage = "Transaction expired. Please try again."
      } else {
        errorMessage = err.message || "Failed to generate shop ID"
      }

      setError(errorMessage)
      return {
        success: false,
        message: errorMessage,
        error: err.message || "Unknown error occurred"
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Process txError from Web3Auth to show clean messages
  const processedError = error || (txError ? (() => {
    const errorString = typeof txError === 'string' ? txError : txError?.message || ''
    if (errorString.includes("insufficient funds")) {
      return "Insufficient funds for transaction"
    } else if (errorString.includes("User rejected")) {
      return "Transaction was rejected"
    } else if (errorString.includes("Blockhash not found")) {
      return "Transaction expired. Please try again."
    } else {
      return "Transaction failed"
    }
  })() : null)

  return {
    generateShopId,
    isGenerating: isPending || isGenerating,
    error: processedError,
    hash,
    clearError: () => setError(null)
  }
}
