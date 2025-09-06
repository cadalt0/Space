"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSolanaWallet, useSignAndSendTransaction, useSignMessage } from "@web3auth/modal/react/solana"
import { 
  LAMPORTS_PER_SOL, 
  PublicKey, 
  SystemProgram, 
  Transaction
} from "@solana/web3.js"
import { CheckCircle, XCircle, Loader2, Coins, QrCode, Download, MessageSquare } from "lucide-react"

export function SolanaTransactionSigner() {
  const { accounts, connection } = useSolanaWallet()
  const { data: hash, error: txError, loading: isPending, signAndSendTransaction } = useSignAndSendTransaction()
  const { data: messageHash, error: messageError, loading: isMessagePending, signMessage } = useSignMessage()
  const [recipient, setRecipient] = useState("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM")
  const [amount, setAmount] = useState("0.1")
  const [message, setMessage] = useState("Hello Solana! Sign this message to test your wallet.")
  const [error, setError] = useState("")
  const [balance, setBalance] = useState<number | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrUrl, setQrUrl] = useState("")

  // Fetch balance when accounts change
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

  const handleSendSolana = async () => {
    if (!accounts || accounts.length === 0) {
      setError("Please connect your wallet first")
      return
    }

    if (!connection) {
      setError("Solana connection not available")
      return
    }

    try {
      const senderPublicKey = new PublicKey(accounts[0])
      const recipientPublicKey = new PublicKey(recipient)
      const amountInLamports = parseFloat(amount) * LAMPORTS_PER_SOL

      // Create Solana transaction (following the example pattern)
      const block = await connection.getLatestBlockhash()
      const transaction = new Transaction({
        blockhash: block.blockhash,
        lastValidBlockHeight: block.lastValidBlockHeight,
        feePayer: senderPublicKey,
      }).add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: recipientPublicKey,
          lamports: amountInLamports,
        })
      )

      // Sign and send transaction using the hook
      signAndSendTransaction(transaction)
    } catch (err: any) {
      setError(err.message || "Failed to send Solana transaction")
    }
  }

  const generateSolanaPayQR = async () => {
    if (!accounts || accounts.length === 0) {
      setError("Please connect your wallet first")
      return
    }

    try {
      // Create a Solana Pay URL for the specified amount
      const recipientPublicKey = new PublicKey(recipient)
      const amountInLamports = parseFloat(amount) * LAMPORTS_PER_SOL
      
      // Generate a unique reference
      const reference = accounts[0].slice(0, 16)
      
      // Create Solana Pay URL
      const url = `solana:${recipientPublicKey.toBase58()}?amount=${amountInLamports}&reference=${reference}&label=Web3Auth%20Demo&message=Payment%20via%20Web3Auth`
      
      setQrUrl(url)
      setShowQR(true)
      setError("")
    } catch (err: any) {
      setError(err.message || "Failed to generate Solana Pay QR")
    }
  }

  const hasAccounts = accounts && accounts.length > 0
  const displayName = accounts?.[0] ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` : "Unknown"

  if (!hasAccounts) {
    return (
      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Solana Transaction Signer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Please connect your wallet to test Solana transactions</p>
        </CardContent>
      </Card>
    )
  }

  // Check if Solana connection is available
  if (!connection) {
    return (
      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Solana Connection Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Please ensure you're connected with Web3Auth Solana wallet.</p>
          <p className="text-gray-400 mt-2">Connection: {connection ? "Available" : "Missing"}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-400" />
            Solana Wallet Connected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-2">Address: <span className="font-mono text-purple-400">{accounts?.[0]}</span></p>
          <p className="text-gray-300 mb-2">Connector: <span className="font-mono text-purple-400">{displayName}</span></p>
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
          <CardTitle className="text-white">Send SOL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Recipient Address</label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
              placeholder="Solana address..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Amount (SOL)</label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
              placeholder="0.1"
              type="number"
              step="0.01"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSendSolana} 
              disabled={isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPending ? 'Confirming...' : 'Send SOL'}
            </Button>
            <Button 
              onClick={generateSolanaPayQR}
              disabled={isPending}
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-700/10"
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
          
          {hash && (
            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-purple-400 text-sm font-medium mb-2">Transaction Hash:</p>
              <p className="font-mono text-xs text-purple-300 break-all">{hash}</p>
              <p className="text-purple-400 text-xs mt-2">
                View on <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer" className="underline">Solana Explorer</a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Signing Card */}
      <Card className="bg-black/30 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-400" />
            Sign Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Message to Sign</label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
              placeholder="Enter message to sign..."
            />
          </div>
          <Button 
            onClick={() => signMessage(message)}
            disabled={isMessagePending}
            className="bg-green-600 hover:bg-green-700 text-white w-full"
          >
            {isMessagePending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isMessagePending ? 'Signing...' : 'Sign Message'}
          </Button>
          
          {messageHash && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm font-medium mb-2">Message Signed Successfully!</p>
              <p className="font-mono text-xs text-green-300 break-all">Hash: {messageHash}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solana Pay QR Code Modal */}
      {showQR && (
        <Card className="bg-black/30 backdrop-blur-md border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-purple-400" />
              Solana Pay QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg flex justify-center">
              <div className="text-center">
                <div className="text-2xl mb-2">📱</div>
                <p className="text-gray-600 text-sm mb-2">Scan with Solana wallet</p>
                <p className="text-gray-800 font-mono text-xs break-all">{qrUrl}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowQR(false)}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl)
                  setError("QR URL copied to clipboard!")
                  setTimeout(() => setError(""), 2000)
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(error || txError || messageError) && (
        <Card className="bg-red-500/10 backdrop-blur-md border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error || txError?.message || messageError?.message}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
