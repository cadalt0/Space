use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("HiTfqcaU6XwKVYcudqCLAZKzCFjCyXQxZ1LQkn2PcEks");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = admin;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn init_vault(ctx: Context<InitVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.bump = ctx.bumps.vault;
        vault.cooldown_started_at = 0;
        vault.cooldown_active = false;
        vault.pending_recipient = Pubkey::default();
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount >= MIN_DEPOSIT_LAMPORTS, VaultError::DepositTooSmall);

        let ix = system_program::Transfer {
            from: ctx.accounts.owner.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), ix);
        system_program::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn slash(ctx: Context<Slash>, recipient: Pubkey) -> Result<()> {
        // Only admin can call (enforced in accounts)
        require!(ctx.accounts.recipient.key() == recipient, VaultError::RecipientMismatch);
        let amount = available_withdrawable_lamports(&ctx.accounts.vault)?;
        if amount == 0 { return Ok(()); }

        // Move lamports directly since vault is program-owned (cannot CPI transfer from data account)
        transfer_from_vault(
            &ctx.accounts.vault.to_account_info(),
            &ctx.accounts.recipient.to_account_info(),
            amount,
        )?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, recipient: Pubkey) -> Result<()> {
        let clock = Clock::get()?;
        let vault = &mut ctx.accounts.vault;

        // First call: start cooldown and bind recipient
        if !vault.cooldown_active {
            vault.cooldown_active = true;
            vault.cooldown_started_at = clock.unix_timestamp;
            vault.pending_recipient = recipient;
            return Ok(());
        }

        // Second (or later) call: must satisfy cooldown and recipient must match
        require!(vault.pending_recipient == recipient, VaultError::RecipientMismatch);
        require!(
            clock.unix_timestamp - vault.cooldown_started_at >= COOLDOWN_SECS as i64,
            VaultError::CooldownNotElapsed
        );

        // Enforce that the passed recipient account matches the param
        require!(ctx.accounts.recipient.key() == recipient, VaultError::RecipientMismatch);

        // Compute amount and move lamports out of the program-owned vault directly
        let amount = available_withdrawable_lamports(&ctx.accounts.vault)?;
        if amount > 0 {
            transfer_from_vault(
                &ctx.accounts.vault.to_account_info(),
                &ctx.accounts.recipient.to_account_info(),
                amount,
            )?;
        }

        // reset cooldown
        let vault = &mut ctx.accounts.vault;
        vault.cooldown_active = false;
        vault.cooldown_started_at = 0;
        vault.pending_recipient = Pubkey::default();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = Config::SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = Vault::SPACE,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        constraint = vault.owner == owner.key()
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        constraint = vault.owner == owner.key()
    )]
    pub vault: Account<'info, Vault>,
    /// CHECK: recipient can be any system account
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Slash<'info> {
    pub admin: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key()
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.owner.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    /// CHECK: recipient can be any system account
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub bump: u8,
}

impl Config {
    pub const SPACE: usize = 8 + 32 + 1;
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub bump: u8,
    pub cooldown_started_at: i64,
    pub cooldown_active: bool,
    pub pending_recipient: Pubkey,
}

impl Vault {
    pub const SPACE: usize = 8  // discriminator
        + 32 // owner
        + 1  // bump
        + 8  // cooldown_started_at
        + 1  // cooldown_active
        + 32 // pending_recipient
    ;
}

const VAULT_SEED: &[u8] = b"vault";
const CONFIG_SEED: &[u8] = b"config";
const MIN_DEPOSIT_LAMPORTS: u64 = 10_000; // 0.00001 SOL
const COOLDOWN_SECS: u64 = 10; // 10 seconds
const RENT_BUFFER_LAMPORTS: u64 = 5_000; // safety buffer to avoid rent edge cases

#[error_code]
pub enum VaultError {
    #[msg("Deposit too small")] 
    DepositTooSmall,
    #[msg("Cooldown has not yet elapsed")] 
    CooldownNotElapsed,
    #[msg("Recipient does not match pending recipient")] 
    RecipientMismatch,
    #[msg("Insufficient funds in vault")] 
    InsufficientFunds,
}

fn available_withdrawable_lamports(vault: &Account<Vault>) -> Result<u64> {
    let rent = Rent::get()?;
    let info = vault.to_account_info();
    let data_len = info.data_len();
    let min_balance = rent.minimum_balance(data_len).saturating_add(RENT_BUFFER_LAMPORTS);
    let current = info.lamports();
    if current <= min_balance { return Ok(0); }
    Ok(current.saturating_sub(min_balance))
}

fn transfer_from_vault(from_vault: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
    require!(**from_vault.lamports.borrow() >= amount, VaultError::InsufficientFunds);
    // Decrease lamports from vault and increase recipient
    **from_vault.try_borrow_mut_lamports()? -= amount;
    **to.try_borrow_mut_lamports()? += amount;
    Ok(())
}
