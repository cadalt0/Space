"use client"

import { useState } from "react"
import { useSolanaWallet, useSignAndSendTransaction } from "@web3auth/modal/react/solana"
import { PublicKey, Transaction, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { getVotingPdas, validateVoteType } from "./voting"

export function useVoting() {
  const { accounts, connection } = useSolanaWallet()
  const { data: hash, error: txError, loading: isPending, signAndSendTransaction } = useSignAndSendTransaction()
  const [isVoting, setIsVoting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)

  const vote = async (itemId: number, voteType: "upvote" | "downvote"): Promise<{
    success: boolean
    message: string
    signature?: string
    error?: string
  }> => {
    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        message: "No Solana account connected",
        error: "Please connect your wallet to vote"
      }
    }

    if (!connection) {
      return {
        success: false,
        message: "Solana connection not available",
        error: "Please try again"
      }
    }

    if (!validateVoteType(voteType)) {
      return {
        success: false,
        message: "Invalid vote type",
        error: "Vote type must be 'upvote' or 'downvote'"
      }
    }

    setIsVoting(true)
    setVoteError(null)

    try {
      console.log(`🗳️ Voting ${voteType} on item ${itemId}`)
      
      const voter = new PublicKey(accounts[0])
      
      // Get PDAs
      const { itemPda, voteTrackerPda } = getVotingPdas(itemId, voter)
      console.log("📍 Item PDA:", itemPda.toString())
      console.log("📍 Vote Tracker PDA:", voteTrackerPda.toString())

      // Create transaction using the same pattern as SNS profile creation
      const transaction = new Transaction({
        feePayer: voter,
      })

      // Create vote instruction based on type
      const instruction = createVoteInstruction(itemId, voteType, voter, itemPda, voteTrackerPda)
      transaction.add(instruction)

      // Get fresh blockhash right before sending to avoid expiration (same as SNS)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.lastValidBlockHeight = lastValidBlockHeight

      // Use the same signAndSendTransaction pattern as SNS profile creation
      console.log("⏳ Signing and sending transaction with embedded wallet...")
      
      try {
        await signAndSendTransaction(transaction)
        
        // Wait for transaction result (success or error)
        let attempts = 0
        const maxAttempts = 20 // Wait up to 10 seconds
        const checkInterval = 500 // Check every 500ms
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, checkInterval))
          
          // Check if we have an error
          if (txError) {
            console.log("❌ Transaction error detected:", txError)
            const errorString = typeof txError === 'string' ? txError : txError?.message || ''
            
            let errorMessage = "Transaction failed"
            if (errorString.includes("AlreadyVoted") || errorString.includes("Error Number: 6000") || errorString.includes("User has already voted") || errorString.includes("custom program error: 0x1770")) {
              errorMessage = "Already voted"
            } else if (errorString.includes("insufficient funds")) {
              errorMessage = "Insufficient funds for transaction"
            } else if (errorString.includes("User rejected")) {
              errorMessage = "Transaction was rejected"
            }
            
            setVoteError(errorMessage)
            return {
              success: false,
              message: errorMessage,
              error: errorMessage
            }
          }
          
          // Check if we have a successful hash
          if (hash) {
            console.log("✅ Transaction successful:", hash)
            setVoteError("")
            return {
              success: true,
              message: `Successfully ${voteType}d item ${itemId}`,
              signature: hash
            }
          }
          
          attempts++
        }
        
        // Timeout - no result after waiting
        setVoteError("Transaction timeout")
        return {
          success: false,
          message: "Transaction timeout",
          error: "No response from blockchain"
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
        
        setVoteError(errorMessage)
        return {
          success: false,
          message: errorMessage,
          error: signError.message || "Unknown signing error"
        }
      }

    } catch (err: any) {
      console.error("❌ Error voting:", err)
      
      let errorMessage = "Failed to vote"
      
      // Check for specific error patterns
      const errorString = err.message || err.toString() || ""
      
      if (errorString.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction"
      } else if (errorString.includes("AlreadyVoted") || errorString.includes("Error Number: 6000") || errorString.includes("User has already voted")) {
        errorMessage = "Already voted"
      } else if (errorString.includes("User rejected")) {
        errorMessage = "Transaction was rejected"
      } else if (errorString.includes("Blockhash not found")) {
        errorMessage = "Transaction expired. Please try again."
      } else if (errorString.includes("custom program error: 0x1770")) {
        errorMessage = "Already voted"
      } else {
        errorMessage = err.message || "Failed to vote"
      }

      setVoteError(errorMessage)
      return {
        success: false,
        message: errorMessage,
        error: err.message || "Unknown error occurred"
      }
    } finally {
      setIsVoting(false)
    }
  }

  // Helper function to create vote instruction (same pattern as SNS)
  const createVoteInstruction = (
    itemId: number, 
    voteType: "upvote" | "downvote", 
    voter: PublicKey, 
    itemPda: PublicKey, 
    voteTrackerPda: PublicKey
  ) => {
    // Discriminators from your example
    const UPVOTE_DISCRIMINATOR = Buffer.from([42, 0, 164, 246, 91, 159, 253, 153])
    const DOWNVOTE_DISCRIMINATOR = Buffer.from([8, 204, 29, 166, 78, 34, 66, 169])
    
    // Program ID from your example
    const PROGRAM_ID = new PublicKey("5zQieQbJebHJdxpURBSswrVbHWtKXZHx6EF1gEzNrXZp")
    
    // Item ID as 8-byte little-endian (matching your example)
    const itemIdBuffer = Buffer.alloc(8)
    itemIdBuffer.writeUInt32LE(itemId, 0)
    
    const discriminator = voteType === "upvote" ? UPVOTE_DISCRIMINATOR : DOWNVOTE_DISCRIMINATOR
    const instructionData = Buffer.concat([discriminator, itemIdBuffer])
    
    return new TransactionInstruction({
      keys: [
        { pubkey: itemPda, isSigner: false, isWritable: true },
        { pubkey: voteTrackerPda, isSigner: false, isWritable: true },
        { pubkey: voter, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    })
  }

  // Process txError from Web3Auth to show clean messages
  const processedError = voteError || (txError ? (() => {
    const errorString = typeof txError === 'string' ? txError : txError?.message || ''
    if (errorString.includes("AlreadyVoted") || errorString.includes("Error Number: 6000") || errorString.includes("User has already voted") || errorString.includes("custom program error: 0x1770")) {
      return "Already voted"
    } else if (errorString.includes("insufficient funds")) {
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
    vote,
    isVoting: isPending || isVoting,
    error: processedError,
    hash
  }
}
