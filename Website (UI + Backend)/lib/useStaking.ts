"use client"

import { useState } from "react"
import { useSolanaWallet, useSignAndSendTransaction } from "@web3auth/modal/react/solana"
import { PublicKey, Connection } from "@solana/web3.js"
import { createStakeTransaction } from "./staking"

export function useStaking() {
  const { accounts, connection } = useSolanaWallet()
  const { data: hash, error: txError, loading: isPending, signAndSendTransaction } = useSignAndSendTransaction()
  const [isStaking, setIsStaking] = useState(false)
  const [stakeError, setStakeError] = useState<string | null>(null)

  const stake = async (amount: number): Promise<string> => {
    if (!accounts || accounts.length === 0) {
      throw new Error("No Solana account connected")
    }

    if (!connection) {
      throw new Error("Solana connection not available")
    }

    setIsStaking(true)
    setStakeError(null)

    try {
      const userPublicKey = new PublicKey(accounts[0])
      
      // Create the staking transaction
      const transaction = await createStakeTransaction(userPublicKey, amount)
      
      // Sign and send the transaction
      const signature = await signAndSendTransaction(transaction)
      
      if (!signature) {
        throw new Error("Transaction failed to send")
      }

      return signature
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Staking failed"
      setStakeError(errorMessage)
      throw error
    } finally {
      setIsStaking(false)
    }
  }

  return {
    stake,
    isStaking: isPending || isStaking,
    error: txError || stakeError,
    hash
  }
}
