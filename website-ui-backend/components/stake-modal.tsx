"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Coins, AlertCircle, CheckCircle } from "lucide-react"

interface StakeModalProps {
  isOpen: boolean
  onClose: () => void
  onStake: (amount: number) => Promise<void>
  stakeAddress: string | null
  currentStake?: number
  isLoading?: boolean
  error?: string | null
  pendingAmount?: number | null
  result?: {
    success: boolean
    message: string
    signature?: string
    error?: string
  } | null
  isUpdatingDatabase?: boolean
}

const MIN_STAKE_AMOUNT = 0.0001

export function StakeModal({ isOpen, onClose, onStake, stakeAddress, currentStake = 0, isLoading = false, error = null, pendingAmount = null, result = null, isUpdatingDatabase = false }: StakeModalProps) {
  const [amount, setAmount] = useState<string>("")
  const [isValid, setIsValid] = useState(false)
  const [validationError, setValidationError] = useState<string>("")

  useEffect(() => {
    if (isOpen) {
      // If there's a pending amount, use it; otherwise reset
      setAmount(pendingAmount ? pendingAmount.toString() : "")
      setValidationError("")
    }
  }, [isOpen, pendingAmount])

  useEffect(() => {
    const numAmount = parseFloat(amount)
    
    if (amount === "") {
      setIsValid(false)
      setValidationError("")
      return
    }

    if (isNaN(numAmount)) {
      setIsValid(false)
      setValidationError("Please enter a valid number")
      return
    }

    if (numAmount < MIN_STAKE_AMOUNT) {
      setIsValid(false)
      setValidationError(`Minimum stake amount is ${MIN_STAKE_AMOUNT} SOL`)
      return
    }

    setIsValid(true)
    setValidationError("")
  }, [amount])

  const handleStake = async () => {
    if (!isValid) return
    
    const numAmount = parseFloat(amount)
    await onStake(numAmount)
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!(result && result.success) && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-400" />
              Stake Tokens
            </DialogTitle>
            <DialogDescription>
              Stake your tokens to participate in this space. Minimum amount: {MIN_STAKE_AMOUNT} SOL
              {currentStake > 0 && (
                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                  <p className="text-sm text-green-300">
                    <strong>Current Stake:</strong> {currentStake.toFixed(6)} SOL
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        )}

        <div className="space-y-4">
          {/* Show success result prominently if successful */}
          {result && result.success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">Staking Successful!</h3>
                <p className="text-sm text-gray-300 mb-3">
                  Your {amount} SOL has been successfully staked.
                </p>
                {result.signature && (
                  <div className="bg-gray-800/50 rounded-md p-3">
                    <p className="text-xs text-gray-400 mb-1">Transaction Hash:</p>
                    <a
                      href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-green-300 break-all hover:text-green-200 hover:underline cursor-pointer block"
                    >
                      {result.signature}
                    </a>
                    <p className="text-xs text-gray-500 mt-1">Click to view on Solana Explorer</p>
                  </div>
                )}
              </div>
              
              <div className="pt-4">
                <Button
                  onClick={handleClose}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              {stakeAddress && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-sm text-blue-300">
                    <strong>Stake Address:</strong> {stakeAddress}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (SOL)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.0001"
                  min={MIN_STAKE_AMOUNT}
                  placeholder={`Minimum: ${MIN_STAKE_AMOUNT}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLoading}
                  className={validationError ? "border-red-500" : ""}
                />
                {validationError && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {validationError}
                  </p>
                )}
              </div>

              {error && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-300">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {result && !result.success && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-300">
                    <div className="space-y-2">
                      <p className="font-medium">{result.message}</p>
                      {result.error && (
                        <p className="text-xs">{result.error}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStake}
                  disabled={!isValid || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {isUpdatingDatabase ? 'Buffering...' : 'Staking...'}
                    </>
                  ) : (
                    <>
                      <Coins className="h-4 w-4 mr-2" />
                      Stake
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
