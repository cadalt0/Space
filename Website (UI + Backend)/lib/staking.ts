import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import crypto from "crypto"

// Deployed program address (must match declare_id!)
const PROGRAM_ID = new PublicKey("HiTfqcaU6XwKVYcudqCLAZKzCFjCyXQxZ1LQkn2PcEks")
const VAULT_SEED = Buffer.from("vault")
const MIN_LAMPORTS = 100_000n // 0.0001 SOL in lamports

export function discriminator(ixName: string) {
  // Anchor discriminator = sha256("global:" + ix)[0..8]
  return crypto.createHash("sha256").update("global:" + ixName).digest().slice(0, 8)
}

export function u64LE(valueBigInt: bigint) {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(valueBigInt)
  return buf
}

export async function getVaultPda(owner: PublicKey) {
  const [vault] = await PublicKey.findProgramAddress(
    [VAULT_SEED, owner.toBuffer()],
    PROGRAM_ID
  )
  return vault
}

export async function createStakeTransaction(
  userPublicKey: PublicKey,
  amount: number
): Promise<Transaction> {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed")
  const owner = userPublicKey
  const vault = await getVaultPda(owner)
  
  // Convert SOL to lamports
  const lamports = BigInt(Math.floor(amount * 1_000_000_000))
  
  // Check if vault exists, if not create init_vault instruction
  const vaultInfo = await connection.getAccountInfo(vault)
  const instructions: TransactionInstruction[] = []
  
  if (!vaultInfo) {
    // Create init_vault instruction
    const initData = Buffer.concat([
      discriminator("init_vault"),
      // no args
    ])
    const initKeys = [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]
    const initIx = new TransactionInstruction({ programId: PROGRAM_ID, keys: initKeys, data: initData })
    instructions.push(initIx)
  }
  
  // Create deposit instruction
  const depositData = Buffer.concat([
    discriminator("deposit"),
    u64LE(lamports),
  ])
  const depositKeys = [
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]
  const depositIx = new TransactionInstruction({ programId: PROGRAM_ID, keys: depositKeys, data: depositData })
  instructions.push(depositIx)
  
  const transaction = new Transaction().add(...instructions)
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = owner
  
  return transaction
}

export function validateStakeAmount(amount: number): { isValid: boolean; error?: string } {
  if (isNaN(amount)) {
    return { isValid: false, error: "Please enter a valid number" }
  }
  
  if (amount < 0.0001) {
    return { isValid: false, error: "Minimum stake amount is 0.0001 SOL" }
  }
  
  return { isValid: true }
}
