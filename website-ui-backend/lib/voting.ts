import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js"
import { Connection } from "@solana/web3.js"

// Configuration
const PROGRAM_ID = new PublicKey("5zQieQbJebHJdxpURBSswrVbHWtKXZHx6EF1gEzNrXZp")
const RPC_URL = "https://api.devnet.solana.com"

// Discriminator for upvote instruction (from your example)
const UPVOTE_DISCRIMINATOR = Buffer.from([42, 0, 164, 246, 91, 159, 253, 153])

// Discriminator for downvote instruction (from your example)
const DOWNVOTE_DISCRIMINATOR = Buffer.from([8, 204, 29, 166, 78, 34, 66, 169])

// Helper function to convert number to 8-byte little-endian buffer (matching your example)
function u64LE(value: number): Buffer {
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32LE(value, 0) // Use writeUInt32LE like in your example
  return buffer
}

// Get Program Derived Addresses (matching your example exactly)
export function getVotingPdas(itemId: number, voterPublicKey: PublicKey) {
  // Item PDA: [b"item", item_id] - using anchor.BN like in your example
  const itemSeeds = [Buffer.from("item"), u64LE(itemId)]
  const [itemPda] = PublicKey.findProgramAddressSync(itemSeeds, PROGRAM_ID)
  
  // Vote Tracker PDA: [b"vote_tracker", item_pda, voter_public_key]
  const voteTrackerSeeds = [Buffer.from("vote_tracker"), itemPda.toBuffer(), voterPublicKey.toBuffer()]
  const [voteTrackerPda] = PublicKey.findProgramAddressSync(voteTrackerSeeds, PROGRAM_ID)
  
  return { itemPda, voteTrackerPda }
}

// Create upvote transaction
export function createUpvoteTransaction(
  itemId: number,
  voterPublicKey: PublicKey,
  itemPda: PublicKey,
  voteTrackerPda: PublicKey
): Transaction {
  const transaction = new Transaction()
  
  // Upvote instruction
  const upvoteInstruction = new TransactionInstruction({
    keys: [
      { pubkey: itemPda, isSigner: false, isWritable: true },
      { pubkey: voteTrackerPda, isSigner: false, isWritable: true },
      { pubkey: voterPublicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.concat([
      UPVOTE_DISCRIMINATOR,
      u64LE(itemId)
    ])
  })
  
  transaction.add(upvoteInstruction)
  return transaction
}

// Create downvote transaction
export function createDownvoteTransaction(
  itemId: number,
  voterPublicKey: PublicKey,
  itemPda: PublicKey,
  voteTrackerPda: PublicKey
): Transaction {
  const transaction = new Transaction()
  
  // Downvote instruction
  const downvoteInstruction = new TransactionInstruction({
    keys: [
      { pubkey: itemPda, isSigner: false, isWritable: true },
      { pubkey: voteTrackerPda, isSigner: false, isWritable: true },
      { pubkey: voterPublicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.concat([
      DOWNVOTE_DISCRIMINATOR,
      u64LE(itemId)
    ])
  })
  
  transaction.add(downvoteInstruction)
  return transaction
}

// Validate vote type
export function validateVoteType(voteType: string): boolean {
  return voteType === "upvote" || voteType === "downvote"
}

// Get connection
export function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed")
}
