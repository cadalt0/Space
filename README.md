# 🌌 SPACE - Decentralized Social Network Platform

<div align="center">
  <img src="website-ui-backend/public/logo.png" alt="SPACE Logo" width="200" height="200" />
  
  <h3>Make new crypto frens anywhere</h3>
  
  <p align="center">
    <strong>A Web3-powered social platform built on Solana with Web3Auth integration and SNS (Solana Name Service) support</strong>
  </p>
  
  [![Solana](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com/)
  [![Web3Auth](https://img.shields.io/badge/Web3Auth-0364FF?style=for-the-badge&logo=web3auth&logoColor=white)](https://web3auth.io/)
  [![SNS](https://img.shields.io/badge/SNS-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://sns.id/)
  [![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

## 🚀 About SPACE

**SPACE** is a revolutionary decentralized social networking platform that brings together crypto enthusiasts, developers, and blockchain communities in immersive 3D virtual spaces. Built specifically for the Web3Auth and SNS (Solana Name Service) tracks, SPACE enables users to:

- **Explore** local onchain crypto shops and communities
- **Lend or sell** anything onchain with smart contract security
- **Plan hangouts** with onchain security and verification
- **Stake and vote** on community decisions using Solana smart contracts
- **Connect** with like-minded crypto enthusiasts through Web3Auth authentication

### 🎯 Core Features

- **🔐 Web3Auth Integration**: Seamless wallet connection and user authentication
- **🏷️ SNS (Solana Name Service) Support**: Human-readable names for Solana addresses
- **💰 Onchain Staking**: Stake SOL with cooldown periods and admin slashing capabilities
- **🗳️ Decentralized Voting**: Community-driven decision making with onchain voting
- **🛍️ Crypto Shops**: Create and manage onchain marketplaces
- **🎮 3D Virtual Spaces**: Immersive 3D environments for social interaction
- **📱 Modern UI/UX**: Built with Next.js, TypeScript, and Tailwind CSS

---

## 🧠 System Architecture Mind Map

```
                    🌌 SPACE Platform
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    🔐 Web3Auth   🏷️ SNS (Solana Name Service)   💰 Smart Contracts
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ Wallet  │      │ Solana  │      │ Staking │
   │ Connect │      │ Names   │      │ Program │
   │ Modal   │      │ Service │      │         │
   └─────────┘      └─────────┘      └─────────┘
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ User    │      │ Profile │      │ Voting  │
   │ Auth    │      │ Mgmt    │      │ Program │
   │ System  │      │ System  │      │         │
   └─────────┘      └─────────┘      └─────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                    🎮 Frontend App
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    🎨 3D Spaces    🛍️ Crypto Shops   📱 Modern UI
        │                │                │
        └────────────────┼────────────────┘
                         │
                    🖥️ Backend Services
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    📊 SNS API (Solana Name Service)   🗄️ Database   🔗 Blockchain
        │                │                │
        └────────────────┼────────────────┘

Flow Direction:
Web3Auth → User Auth → Frontend → Backend → Smart Contracts
SNS (Solana Name Service) → Profile Mgmt → Frontend → Backend → Database
Smart Contracts → Onchain Data → Frontend → User Interface
```

---

## 🏗️ Architecture Overview

### Smart Contracts (Deployed on Solana Devnet)

#### 1. **Staking Contract** 
- **Program ID**: `HiTfqcaU6XwKVYcudqCLAZKzCFjCyXQxZ1LQkn2PcEks`
- **Deployed Contract**: [View on Solana Devnet Explorer](https://explorer.solana.com/address/HiTfqcaU6XwKVYcudqCLAZKzCFjCyXQxZ1LQkn2PcEks?cluster=devnet)
- **Features**:
  - Initialize vaults for users
  - Deposit SOL with minimum amount validation
  - Withdraw with cooldown period (prevents immediate withdrawals)
  - Admin slashing capabilities
  - Program-derived addresses for secure vault management

#### 2. **Voting Contract**
- **Program ID**: `5zQieQbJebHJdxpURBSswrVbHWtKXZHx6EF1gEzNrXZp`
- **Deployed Contract**: [View on Solana Devnet Explorer](https://explorer.solana.com/address/5zQieQbJebHJdxpURBSswrVbHWtKXZHx6EF1gEzNrXZp?cluster=devnet)
- **Features**:
  - Initialize items for voting
  - Upvote/downvote functionality
  - Vote tracking to prevent double voting
  - Community-driven decision making

### Backend Services

#### **SNS (Solana Name Service) Server** (`Server/`)
- **Technology**: Node.js + Express + PostgreSQL
- **Features**:
  - SNS user management and registration
  - Space and shop data management
  - Payment processing integration
  - Database operations for user profiles

### Frontend Application

#### **Website UI Backend** (`website-ui-backend/`)
- **Technology**: Next.js 15 + TypeScript + Tailwind CSS
- **Features**:
  - Web3Auth modal integration
  - SNS profile management
  - 3D space visualization with Three.js
  - Real-time transaction signing
  - Responsive design with modern UI components

---

## 🔗 System Integration

### Web3Auth Integration
- **Purpose**: Provides seamless wallet connection and user authentication
- **Implementation**: Modal-based authentication with multiple wallet support
- **Location**: `components/web3auth-provider.tsx`, `lib/web3authContext.ts`

### SNS (Solana Name Service) Integration
- **Purpose**: Enables human-readable names for Solana addresses
- **Implementation**: API integration with SNS database server
- **Location**: `lib/sns-config.ts`, `components/sns-profile-modal.tsx`

### Smart Contract Integration
- **Staking**: Direct interaction with Solana staking program
- **Voting**: Community voting system with onchain verification
- **Location**: `lib/staking.ts`, `lib/voting.ts`

---

## 📊 Project Structure

```
SPACE/
├── Contract/                    # Solana Smart Contracts
│   └── Stake + vote/
│       ├── src Stake/          # Staking contract (Rust/Anchor)
│       └── src Vote/           # Voting contract (Rust/Anchor)
├── Server/                     # Backend API Server
│   ├── server.js              # Express server with SNS endpoints
│   └── package.json           # Node.js dependencies
└── website-ui-backend/        # Frontend Application
    ├── app/                   # Next.js app router
    ├── components/            # React components
    ├── lib/                   # Utility libraries
    └── public/                # Static assets
```

---

## 🎨 Key Components

### Frontend Components
- **SpaceScene**: 3D virtual environment with floating crypto elements
- **Web3AuthProvider**: Authentication wrapper for wallet connections
- **SNSProfileModal**: SNS name management interface
- **StakeModal**: Staking interface with transaction signing
- **TransactionSigner**: Solana transaction handling

### Backend Services
- **SNS API**: User registration and profile management
- **Spaces API**: Virtual space data management
- **Shops API**: Onchain marketplace management

---

## 🌟 Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **3D Graphics**: Three.js + React Three Fiber
- **Web3**: Solana Web3.js + Web3Auth
- **State Management**: React Query + Context API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Blockchain**: Solana (Devnet)

### Smart Contracts
- **Language**: Rust
- **Framework**: Anchor
- **Network**: Solana Devnet

---

<div align="center">
  <p><strong>Built with  Web3Auth and SNS ❤️
  <p>Making crypto social, one space at a time 🌌</p>
</div>
