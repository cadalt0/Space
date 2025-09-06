"use client"

import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react"
import { useAccount } from "wagmi"
import { Transaction, Connection } from "@solana/web3.js"

export function useWeb3Login() {
  const { connect, isConnected, connectorName, loading: connectLoading, error: connectError } = useWeb3AuthConnect()
  const { disconnect, loading: disconnectLoading, error: disconnectError } = useWeb3AuthDisconnect()
  const { userInfo } = useWeb3AuthUser()
  const { address } = useAccount()

  const displayName =
    (userInfo as any)?.name || (userInfo as any)?.email || (address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "")
  const avatar = (userInfo as any)?.profileImage as string | undefined

  const login = async () => {
    if (isConnected) return address
    await connect()
    return address
  }

  const logout = async () => {
    await disconnect()
  }

  return {
    login,
    logout,
    address,
    isConnected,
    isBusy: connectLoading || disconnectLoading,
    userInfo,
    displayName,
    avatar,
    connectorName,
    connectError,
    disconnectError,
  }
}

export async function signAndSendTransaction(transaction: Transaction): Promise<string> {
  // This function will be implemented to use Web3Auth's embedded wallet
  // For now, we'll throw an error to indicate it needs implementation
  throw new Error("signAndSendTransaction not implemented yet. Please implement using Web3Auth embedded wallet.")
}


