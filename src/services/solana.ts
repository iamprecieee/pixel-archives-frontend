import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";

import { Buffer } from "buffer";

const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_SOLANA_PROGRAM_ID || "null",
);
// Standard Solana program IDs (same on all networks)
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);
const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

import { sha256 } from "js-sha256";

// Calculate discriminators dynamically (Anchor format)
// sha256("global:<instruction_name>") -> first 8 bytes
const getDiscriminator = (instructionName: string): Uint8Array => {
  const preimage = `global:${instructionName}`;
  const hash = sha256.digest(preimage);
  return new Uint8Array(hash.slice(0, 8));
};

const DISCRIMINATORS = {
  INITIALIZE: getDiscriminator("initialize"),
  PUBLISH: getDiscriminator("publish"),
  BID_PIXEL: getDiscriminator("bid_pixel"),
  PAINT_PIXEL: getDiscriminator("paint_pixel"),
  MINT: getDiscriminator("mint"),
};

export const uuidToBytes = (uuidStr: string): Uint8Array => {
  const hex = uuidStr.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
};

const writeString = (buffer: Buffer, str: string, offset: number): number => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const len = bytes.length;
  buffer.writeUInt32LE(len, offset);
  offset += 4;
  buffer.set(bytes, offset);
  return offset + len;
};

export const deriveCanvasPda = (canvasIdBytes: Uint8Array) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("canvas"), canvasIdBytes],
    PROGRAM_ID,
  );
};

const derivePixelPda = (
  canvasIdBytes: Uint8Array,
  x: number,
  y: number,
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pixel"), canvasIdBytes, Buffer.from([x]), Buffer.from([y])],
    PROGRAM_ID,
  );
};

export const deriveMintPda = (canvasIdBytes: Uint8Array) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), canvasIdBytes],
    PROGRAM_ID,
  );
};

export const buildInitializeIx = (
  user: PublicKey,
  canvasId: string,
  initialColor: number = 10, // Default to white (color index 10)
): TransactionInstruction => {
  const idBytes = uuidToBytes(canvasId);
  const [canvasPda] = deriveCanvasPda(idBytes);

  // Data: Discriminator (8) + ID (16) + initial_color (1)
  const data = Buffer.alloc(25);
  data.set(DISCRIMINATORS.INITIALIZE, 0);
  data.set(idBytes, 8);
  data.writeUInt8(initialColor, 24); // initial_color for all pixels

  return new TransactionInstruction({
    keys: [
      { pubkey: canvasPda, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
};

export const buildPublishIx = (
  user: PublicKey,
  canvasId: string,
  pixelColors: Uint8Array, // 768 bytes - 6-bit packed (4 pixels per 3 bytes)
): TransactionInstruction => {
  const idBytes = uuidToBytes(canvasId);
  const [canvasPda] = deriveCanvasPda(idBytes);

  // Data: Discriminator (8) + ID (16) + pixel_colors (768)
  const data = Buffer.alloc(8 + 16 + 768);
  data.set(DISCRIMINATORS.PUBLISH, 0);
  data.set(idBytes, 8);
  data.set(pixelColors, 24); // pixel_colors at offset 24

  return new TransactionInstruction({
    keys: [
      { pubkey: canvasPda, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
};

export const buildBidPixelIx = (
  bidder: PublicKey,
  previousOwner: PublicKey,
  canvasId: string,
  x: number,
  y: number,
  bidAmountLamports: bigint,
): TransactionInstruction => {
  const idBytes = uuidToBytes(canvasId);
  const [canvasPda] = deriveCanvasPda(idBytes);
  const [pixelPda] = derivePixelPda(idBytes, x, y);

  const data = Buffer.alloc(34);
  data.set(DISCRIMINATORS.BID_PIXEL, 0);
  data.set(idBytes, 8);
  data.writeUInt8(x, 24);
  data.writeUInt8(y, 25);
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  dataView.setBigUint64(26, bidAmountLamports, true); // true for little-endian

  return new TransactionInstruction({
    keys: [
      { pubkey: canvasPda, isSigner: false, isWritable: true },
      { pubkey: pixelPda, isSigner: false, isWritable: true },
      { pubkey: bidder, isSigner: true, isWritable: true },
      { pubkey: previousOwner, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
};

export const buildPaintPixelIx = (
  user: PublicKey,
  canvasId: string,
  x: number,
  y: number,
  color: number,
): TransactionInstruction => {
  const idBytes = uuidToBytes(canvasId);
  const [canvasPda] = deriveCanvasPda(idBytes);
  const [pixelPda] = derivePixelPda(idBytes, x, y);

  const data = Buffer.alloc(27);
  data.set(DISCRIMINATORS.PAINT_PIXEL, 0);
  data.set(idBytes, 8);
  data.writeUInt8(x, 24);
  data.writeUInt8(y, 25);
  data.writeUInt8(color, 26);

  return new TransactionInstruction({
    keys: [
      { pubkey: canvasPda, isSigner: false, isWritable: true }, // Now writable - updates pixel_colors
      { pubkey: pixelPda, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
};

export interface CreatorInput {
  address: string;
  share: number;
}

export const buildMintIx = (
  user: PublicKey,
  canvasId: string,
  name: string,
  symbol: string,
  uri: string,
  creators: CreatorInput[] = [],
): TransactionInstruction => {
  const idBytes = uuidToBytes(canvasId);
  const [canvasPda] = deriveCanvasPda(idBytes);
  const [mintPda] = deriveMintPda(idBytes);

  // Derive associated token account for user
  const [tokenAccount] = PublicKey.findProgramAddressSync(
    [user.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPda.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  // Derive metadata PDA
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mintPda.toBuffer(),
    ],
    METADATA_PROGRAM_ID,
  );

  // Data: Disc (8) + ID (16) + Name (4 + len) + Symbol (4 + len) + URI (4 + len) + Creators vec (4 + N*(32+1))
  // Borsh Vec<T> format: 4-byte length prefix + serialized elements
  const encoder = new TextEncoder();
  const nameLen = encoder.encode(name).length;
  const symbolLen = encoder.encode(symbol).length;
  const uriLen = encoder.encode(uri).length;

  const creatorsSize = 4 + creators.length * (32 + 1); // 32 bytes pubkey + 1 byte share
  const size = 8 + 16 + 4 + nameLen + 4 + symbolLen + 4 + uriLen + creatorsSize;
  const data = Buffer.alloc(size);

  let offset = 0;
  data.set(DISCRIMINATORS.MINT, offset);
  offset += 8;
  data.set(idBytes, offset);
  offset += 16;
  offset = writeString(data, name, offset);
  offset = writeString(data, symbol, offset);
  offset = writeString(data, uri, offset);

  // Write creators vec: 4-byte length prefix + elements
  data.writeUInt32LE(creators.length, offset);
  offset += 4;
  for (const creator of creators) {
    const pubkeyBytes = new PublicKey(creator.address).toBuffer();
    data.set(pubkeyBytes, offset);
    offset += 32;
    data.writeUInt8(creator.share, offset);
    offset += 1;
  }

  return new TransactionInstruction({
    keys: [
      { pubkey: canvasPda, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: mintPda, isSigner: false, isWritable: true },
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: metadataPda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
};

/**
 * Build a SignMetadata instruction for creator verification.
 * This allows a creator listed on an NFT to verify themselves on-chain.
 * Uses Metaplex Token Metadata Program's sign_metadata instruction.
 */
export const buildSignMetadataIx = (
  creator: PublicKey,
  mintAddress: PublicKey,
): TransactionInstruction => {
  // Derive metadata PDA from mint
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mintAddress.toBuffer(),
    ],
    METADATA_PROGRAM_ID,
  );

  // SignMetadata instruction discriminator (instruction #7 in Token Metadata Program)
  // https://docs.metaplex.com/programs/token-metadata/instructions#sign-metadata
  const data = Buffer.from([7]); // Instruction discriminator for SignMetadata

  return new TransactionInstruction({
    keys: [
      { pubkey: metadataPda, isSigner: false, isWritable: true }, // metadata account
      { pubkey: creator, isSigner: true, isWritable: false }, // creator signing to verify
    ],
    programId: METADATA_PROGRAM_ID,
    data,
  });
};
