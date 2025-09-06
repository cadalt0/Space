"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWeb3Login } from "@/lib/web3"
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from "wagmi"
import { parseEther, formatEther } from "viem"
import { ArrowRight, CheckCircle, XCircle, Loader2, Coins, Zap } from "lucide-react"
import { SolanaTransactionSigner } from "./solana-transaction-signer"

export function TransactionSigner() {
  const { isConnected, address, displayName, avatar } = useWeb3Login()
  const [recipient, setRecipient] = useState("0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6")
  const [amount, setAmount] = useState("0.001")
  const [error, setError] = useState("")
  const [activeNetwork, setActiveNetwork] = useState<"ethereum" | "solana">("ethereum")

  // Wagmi hooks for blockchain interactions
  const { data: balance, isLoading: balanceLoading } = useBalance({ address })
  const { data: hash, error: txError, isPending, sendTransaction } = useSendTransaction()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  const handleSendTransaction = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first")
      return
    }

    setError("")
    try {
      sendTransaction({ 
        to: recipient as `0x${string}`, 
        value: parseEther(amount) 
      })
    } catch (err: any) {
      setError(err.message || "Failed to send transaction")
    }
  }

  if (!isConnected) {
    return (
      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Transaction Signer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Please connect your wallet to test transaction signing</p>
        </CardContent>
      </Card>
    )
  }

  // Network switching UI
  const NetworkSwitcher = () => (
    <Card className="bg-black/30 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Select Network</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveNetwork("ethereum")}
            variant={activeNetwork === "ethereum" ? "default" : "outline"}
            className={`flex-1 ${activeNetwork === "ethereum" ? "bg-blue-600 hover:bg-blue-700" : "border-white/20 text-white hover:bg-white/10"}`}
          >
            <Zap className="h-4 w-4 mr-2" />
            Ethereum
          </Button>
          <Button
            onClick={() => setActiveNetwork("solana")}
            variant={activeNetwork === "solana" ? "default" : "outline"}
            className={`flex-1 ${activeNetwork === "solana" ? "bg-purple-600 hover:bg-purple-700" : "border-white/20 text-white hover:bg-white/10"}`}
          >
            <Coins className="h-4 w-4 mr-2" />
            Solana
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Return Solana component if Solana network is selected
  if (activeNetwork === "solana") {
    return (
      <div className="space-y-6">
        <NetworkSwitcher />
        <SolanaTransactionSigner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <NetworkSwitcher />
      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Wallet Connected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-2">Address: <span className="font-mono text-blue-400">{address}</span></p>
          <p className="text-gray-300 mb-2">Connector: <span className="font-mono text-blue-400">{displayName}</span></p>
          <p className="text-blue-400 mt-2">Network: Ethereum</p>
          {balance && (
            <p className="text-green-400 mt-2">Balance: {formatEther(balance.value)} {balance.symbol}</p>
          )}
          {balanceLoading && (
            <p className="text-gray-400 mt-2">Loading balance...</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Send Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Recipient Address</label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
              placeholder="0x..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Amount (ETH)</label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
              placeholder="0.001"
              type="number"
              step="0.001"
            />
          </div>
          <Button 
            onClick={handleSendTransaction} 
            disabled={isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white w-full"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isPending ? 'Confirming...' : 'Send Transaction'}
          </Button>
          
          {hash && (
            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-purple-400 text-sm font-medium mb-2">Transaction Hash:</p>
              <p className="font-mono text-xs text-purple-300 break-all">{hash}</p>
            </div>
          )}
          
          {isConfirming && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400 text-sm">Waiting for confirmation...</p>
            </div>
          )}
          
          {isConfirmed && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">Transaction confirmed!</p>
            </div>
          )}
        </CardContent>
      </Card>

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
  )
}
