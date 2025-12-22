# Solana Integration

## Overview

Solana blockchain integration for wallet connection and transactions.

## Wallet Adapter

**Location**: `src/contexts/WalletContextProvider.tsx`

**Features**:

- Auto-detection of installed wallets (via Wallet Standard protocol)
- Network selection (devnet/testnet/mainnet-beta)
- Custom RPC endpoint support
- Auto-connect on page load

**Environment**:

- `VITE_SOLANA_NETWORK` - devnet/testnet/mainnet-beta
- `VITE_SOLANA_RPC_URL` - Optional custom RPC

**Context Provides**:

- `wallet` - Connected wallet
- `connect()` - Connect wallet
- `disconnect()` - Disconnect
- `signTransaction()` - Sign transaction
- `publicKey` - User's public key

## Transaction Building

**Location**: `src/services/solana.ts`

**Instruction Builders**:

- `buildInitializeIx` - Initialize canvas on-chain
- `buildPublishIx` - Publish canvas with pixel data
- `buildBidPixelIx` - Bid on pixel instruction
- `buildPaintPixelIx` - Paint pixel instruction
- `buildMintIx` - Mint canvas as NFT instruction
- `buildSignMetadataIx` - Creator verification for NFT metadata

**PDA Derivation**:

- `deriveCanvasPda` - Canvas account PDA
- `derivePixelPda` - Pixel account PDA
- `deriveMintPda` - NFT mint PDA
- `deriveMetadataPda` - Metaplex metadata PDA

**Utility Functions**:

- `uuidToBytes` - Convert UUID string to bytes
- `writeString` - Write Borsh-encoded string to buffer
- `getDiscriminator` - Calculate Anchor instruction discriminator

### Discriminators

Dynamically derived using `js-sha256`:

```typescript
const discriminator = sha256.array(`global:${instructionName}`).slice(0, 8);
```

### PDAs

Canvas PDA:

```typescript
const [canvasPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("canvas"), canvasIdBytes],
  PROGRAM_ID,
);
```

Pixel PDA:

```typescript
const [pixelPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("pixel"), canvasIdBytes, new Uint8Array([x, y])],
  PROGRAM_ID,
);
```

Mint PDA:

```typescript
const [mintPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("mint"), canvasIdBytes],
  PROGRAM_ID,
);
```

## Transaction Flow

1. Build instruction using `solana.ts` builders
2. Create transaction with recent blockhash
3. Sign with wallet using `signTransaction()`
4. Serialize to base64
5. Submit via backend API

## Error Handling

- Wallet not connected: Prompt connection
- Insufficient SOL: Display balance error
- Rejected: User declined in wallet
- Simulation failed: Invalid instruction

## Security

Private keys managed by wallet extension. Application never accesses private keys.

## Testing

Test on devnet with devnet SOL from faucet. Verify on Solana Explorer.
