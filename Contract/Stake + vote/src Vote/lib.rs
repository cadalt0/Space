use anchor_lang::prelude::*;

declare_id!("5zQieQbJebHJdxpURBSswrVbHWtKXZHx6EF1gEzNrXZp");

#[program]
pub mod vote {
    use super::*;

    /// Initialize a new item for voting
    /// This instruction creates a new item account with a unique ID
    pub fn initialize_item(
        ctx: Context<InitializeItem>,
        item_id: u64,
    ) -> Result<()> {
        // Get the item account from the context
        let item = &mut ctx.accounts.item;
        
        // Set the item properties
        item.item_id = item_id;
        item.upvotes = 0;
        item.downvotes = 0;
        item.creator = ctx.accounts.creator.key();
        
        msg!("Item initialized with ID: {}", item_id);
        msg!("Creator: {}", ctx.accounts.creator.key());
        
        Ok(())
    }

    /// Upvote an item
    /// Users can only vote once per item
    pub fn upvote_item(ctx: Context<VoteItem>, item_id: u64) -> Result<()> {
        // Get the item and vote tracker accounts
        let item = &mut ctx.accounts.item;
        let vote_tracker = &mut ctx.accounts.vote_tracker;
        let voter = &ctx.accounts.voter;
        
        // If this is the first time voting, initialize the vote tracker
        if vote_tracker.voter == Pubkey::default() {
            vote_tracker.item_id = item_id;
            vote_tracker.voter = voter.key();
            vote_tracker.has_voted = false;
            vote_tracker.vote_type = VoteType::None;
        }
        
        // Check if user has already voted on this item
        require!(
            !vote_tracker.has_voted,
            VoteError::AlreadyVoted
        );
        
        // Mark that the user has voted and set vote type to upvote
        vote_tracker.has_voted = true;
        vote_tracker.vote_type = VoteType::Upvote;
        
        // Increment the upvote count
        item.upvotes += 1;
        
        msg!("Item {} upvoted by {}", item.item_id, voter.key());
        msg!("New upvote count: {}", item.upvotes);
        
        Ok(())
    }

    /// Downvote an item
    /// Users can only vote once per item
    pub fn downvote_item(ctx: Context<VoteItem>, item_id: u64) -> Result<()> {
        // Get the item and vote tracker accounts
        let item = &mut ctx.accounts.item;
        let vote_tracker = &mut ctx.accounts.vote_tracker;
        let voter = &ctx.accounts.voter;
        
        // If this is the first time voting, initialize the vote tracker
        if vote_tracker.voter == Pubkey::default() {
            vote_tracker.item_id = item_id;
            vote_tracker.voter = voter.key();
            vote_tracker.has_voted = false;
            vote_tracker.vote_type = VoteType::None;
        }
        
        // Check if user has already voted on this item
        require!(
            !vote_tracker.has_voted,
            VoteError::AlreadyVoted
        );
        
        // Mark that the user has voted and set vote type to downvote
        vote_tracker.has_voted = true;
        vote_tracker.vote_type = VoteType::Downvote;
        
        // Increment the downvote count
        item.downvotes += 1;
        
        msg!("Item {} downvoted by {}", item.item_id, voter.key());
        msg!("New downvote count: {}", item.downvotes);
        
        Ok(())
    }

    /// Delete an item
    /// Only the creator of the item can delete it
    /// This will close the item account and return the rent to the creator
    pub fn delete_item(ctx: Context<DeleteItem>) -> Result<()> {
        let item = &ctx.accounts.item;
        let creator = &ctx.accounts.creator;
        
        // Verify that the signer is the original creator of the item
        require!(
            item.creator == creator.key(),
            VoteError::NotItemCreator
        );
        
        msg!("Item {} deleted by creator {}", item.item_id, creator.key());
        
        // The account will be automatically closed and rent returned to the creator
        // due to the close constraint in the DeleteItem context
        Ok(())
    }
}

/// Account struct for storing item information
#[account]
#[derive(Default)]
pub struct Item {
    /// Unique identifier for the item
    pub item_id: u64,
    /// Number of upvotes received
    pub upvotes: u64,
    /// Number of downvotes received
    pub downvotes: u64,
    /// Public key of the item creator
    pub creator: Pubkey,
}

/// Account struct for tracking user votes on items
/// This prevents users from voting multiple times on the same item
#[account]
#[derive(Default)]
pub struct VoteTracker {
    /// ID of the item being voted on
    pub item_id: u64,
    /// Public key of the voter
    pub voter: Pubkey,
    /// Whether the user has already voted on this item
    pub has_voted: bool,
    /// Type of vote cast (if any)
    pub vote_type: VoteType,
}

/// Enum to track the type of vote
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Default)]
pub enum VoteType {
    /// No vote cast yet
    #[default]
    None,
    /// Upvote
    Upvote,
    /// Downvote
    Downvote,
}

/// Context for initializing a new item
#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct InitializeItem<'info> {
    /// The item account to be initialized
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 8 + 8 + 32, // 8 (discriminator) + 32 (pubkey) + 8 (u64) + 8 (u64) + 32 (pubkey)
        seeds = [b"item", item_id.to_le_bytes().as_ref()],
        bump
    )]
    pub item: Account<'info, Item>,
    
    /// The creator of the item (pays for account creation)
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// The system program for account creation
    pub system_program: Program<'info, System>,
}

/// Context for voting on an item (both upvote and downvote)
#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct VoteItem<'info> {
    /// The item being voted on
    #[account(
        mut,
        seeds = [b"item", item_id.to_le_bytes().as_ref()],
        bump
    )]
    pub item: Account<'info, Item>,
    
    /// The vote tracker for this user and item
    #[account(
        init_if_needed,
        payer = voter,
        space = 8 + 8 + 32 + 1 + 1, // 8 (discriminator) + 8 (u64) + 32 (pubkey) + 1 (bool) + 1 (enum)
        seeds = [b"vote_tracker", item.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_tracker: Account<'info, VoteTracker>,
    
    /// The voter (must sign the transaction)
    #[account(mut)]
    pub voter: Signer<'info>,
    
    /// The system program for account creation
    pub system_program: Program<'info, System>,
}

/// Context for deleting an item
#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct DeleteItem<'info> {
    /// The item to be deleted
    #[account(
        mut,
        seeds = [b"item", item_id.to_le_bytes().as_ref()],
        bump,
        close = creator,
        has_one = creator
    )]
    pub item: Account<'info, Item>,
    
    /// The creator/owner of the item (must sign and must be the original creator)
    #[account(mut)]
    pub creator: Signer<'info>,
}

/// Custom error types for the voting program
#[error_code]
pub enum VoteError {
    #[msg("User has already voted on this item")]
    AlreadyVoted,
    #[msg("Invalid item ID in vote tracker")]
    InvalidItemId,
    #[msg("Invalid voter in vote tracker")]
    InvalidVoter,
    #[msg("Only the item creator can delete this item")]
    NotItemCreator,
}
