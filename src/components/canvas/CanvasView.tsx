import { useEffect, useRef, useState, type FC } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { rpc } from "../../services/rpc";
import { RetroButton } from "../common/RetroButton";
import type { Canvas, CanvasPixel } from "../../types/canvas";
import { useWebSocket, wsService } from "../../services/websocket";
import { useAuthStore } from "../../store/authStore";
import { useCanvasStore } from "../../store/canvasStore";
import {
  buildPublishIx,
  buildBidPixelIx,
  buildPaintPixelIx,
  buildMintIx,
  buildSignMetadataIx,
  deriveMintPda,
  deriveCanvasPda,
  uuidToBytes,
} from "../../services/solana";
import toast from "react-hot-toast";

// Color palette - 64 retro colors (matching backend CANVAS_COLORS)
const COLORS = [
  // Row 1: Grayscale
  "#000000",
  "#1a1a1a",
  "#333333",
  "#4d4d4d",
  "#666666",
  "#808080",
  "#999999",
  "#b3b3b3",
  // Row 2: More grayscale + basics
  "#cccccc",
  "#e6e6e6",
  "#ffffff",
  "#A93838",
  "#F5F5DC",
  "#8B0000",
  "#DC143C",
  "#FF6347",
  // Row 3: Reds to Oranges
  "#FF4500",
  "#FF8C00",
  "#FFA500",
  "#FFD700",
  "#FFFF00",
  "#ADFF2F",
  "#7FFF00",
  "#00FF00",
  // Row 4: Greens
  "#32CD32",
  "#228B22",
  "#006400",
  "#008B8B",
  "#20B2AA",
  "#00CED1",
  "#00FFFF",
  "#00BFFF",
  // Row 5: Blues
  "#1E90FF",
  "#0000FF",
  "#0000CD",
  "#00008B",
  "#191970",
  "#4B0082",
  "#8B008B",
  "#9400D3",
  // Row 6: Purples to Pinks
  "#9932CC",
  "#BA55D3",
  "#DA70D6",
  "#FF00FF",
  "#FF69B4",
  "#FF1493",
  "#C71585",
  "#DB7093",
  // Row 7: Browns and Earth tones
  "#8B4513",
  "#A0522D",
  "#D2691E",
  "#CD853F",
  "#DEB887",
  "#F5DEB3",
  "#FAEBD7",
  "#FFE4C4",
  // Row 8: More earth + pastels
  "#FFDAB9",
  "#FFE4E1",
  "#FFF0F5",
  "#E6E6FA",
  "#D8BFD8",
  "#DDA0DD",
  "#EE82EE",
  "#FFFFE0",
];

interface CanvasViewProps {
  canvasId: string;
  onBack: () => void;
}

export const CanvasView: FC<CanvasViewProps> = ({ canvasId, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [pixels, setPixels] = useState<CanvasPixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(11); // Default to maroon (#A93838)
  const [selectedPixel, setSelectedPixel] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [scale, setScale] = useState(15);
  const [cooldown, setCooldown] = useState<number>(0); // Cooldown in ms
  const [publishStatus, setPublishStatus] = useState<string | null>(null); // For publish flow
  const [bidAmount, setBidAmount] = useState<number>(0); // Bid amount in SOL
  const [mintStatus, setMintStatus] = useState<boolean>(false); // Track minting progress
  const [mintCountdown, setMintCountdown] = useState<number | null>(null); // Countdown before minting (seconds)
  const [verifyingCreator, setVerifyingCreator] = useState<boolean>(false); // Track creator verification

  const { user } = useAuthStore();
  const { initiatePublish, confirmPublish } = useCanvasStore();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();

  // Derived state
  const isOwner = canvas?.owner_id === user?.id;

  // Timer effect for cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // Timer effect for mint countdown
  useEffect(() => {
    if (mintCountdown !== null && mintCountdown > 0) {
      const timer = setInterval(() => {
        setMintCountdown((prev) => {
          if (prev === null) return null;
          const newValue = prev - 1;
          if (newValue <= 0) {
            // Countdown complete - if owner, trigger mint
            return 0;
          }
          return newValue;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mintCountdown]);

  useWebSocket(canvasId);

  // Listen for real-time updates
  useEffect(() => {
    const handlePixelUpdate = (update: CanvasPixel) => {
      setPixels((current) => {
        const newPixels = [...current];
        const index = newPixels.findIndex(
          (p) => p.x === update.x && p.y === update.y,
        );
        if (index >= 0) {
          newPixels[index] = { ...newPixels[index], ...update };
        } else {
          newPixels.push(update);
        }
        return newPixels;
      });
    };

    const handlePublished = (update: { pda: string }) => {
      setCanvas((current) =>
        current
          ? { ...current, state: "published", canvas_pda: update.pda }
          : null,
      );
      toast.success("Canvas was just PUBLISHED!");
    };

    const handleMinted = (update: { mint_address: string }) => {
      setCanvas((current) =>
        current
          ? { ...current, state: "minted", mint_address: update.mint_address }
          : null,
      );
      setMintCountdown(null);
      toast.success("Canvas was just MINTED! Verify your creator status.");
    };

    const handleMintCountdown = (update: { seconds: number }) => {
      setMintCountdown(update.seconds);
      setCanvas((current) =>
        current ? { ...current, state: "mint_pending" } : null,
      );
      toast(`Minting countdown started: ${update.seconds} seconds`, {
        icon: "⏱️",
      });
    };

    const handleMintCountdownCancelled = () => {
      setMintCountdown(null);
      setCanvas((current) =>
        current ? { ...current, state: "published" } : null,
      );
      toast("Mint countdown cancelled", { icon: "❌" });
    };

    const handleMintingStarted = () => {
      setCanvas((current) =>
        current ? { ...current, state: "minting" } : null,
      );
      toast("Minting in progress...", { icon: "⏳" });
    };

    const handleMintingFailed = (update: { reason: string }) => {
      setMintCountdown(null);
      setMintStatus(false);
      setCanvas((current) =>
        current ? { ...current, state: "published" } : null,
      );
      toast.error(`Minting failed: ${update.reason}`);
    };

    wsService.on("Pixel", handlePixelUpdate);
    wsService.on("Published", handlePublished);
    wsService.on("Minted", handleMinted);
    wsService.on("MintCountdown", handleMintCountdown);
    wsService.on("MintCountdownCancelled", handleMintCountdownCancelled);
    wsService.on("MintingStarted", handleMintingStarted);
    wsService.on("MintingFailed", handleMintingFailed);

    return () => {
      wsService.off("Pixel", handlePixelUpdate);
      wsService.off("Published", handlePublished);
      wsService.off("Minted", handleMinted);
      wsService.off("MintCountdown", handleMintCountdown);
      wsService.off("MintCountdownCancelled", handleMintCountdownCancelled);
      wsService.off("MintingStarted", handleMintingStarted);
      wsService.off("MintingFailed", handleMintingFailed);
    };
  }, []);

  // Calculate responsive scale based on viewport
  useEffect(() => {
    const calculateScale = () => {
      const GRID_SIZE = 32;
      const padding = 100; // Account for header, palette, margins
      const maxWidth = window.innerWidth - padding;
      const maxHeight = window.innerHeight - 250; // Header + palette height
      const maxDimension = Math.min(maxWidth, maxHeight);
      // On mobile, prioritize touch target size over fitting everything
      const isMobile = window.innerWidth < 768;
      const minScale = isMobile ? 18 : 10;

      // Allow scale to go up to 24 for larger screens
      const calculatedScale = Math.floor(maxDimension / GRID_SIZE);
      const newScale = Math.max(minScale, Math.min(30, calculatedScale));

      setScale(newScale);
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, []);

  // Fetch canvas data
  useEffect(() => {
    const fetchCanvas = async () => {
      try {
        setLoading(true);

        interface OwnedPixelInfo {
          x: number;
          y: number;
          owner_id: string;
          price_lamports: number;
        }

        interface CompactCanvasResponse {
          canvas: Canvas;
          pixel_colors: string; // base64 encoded
          owned_pixels: OwnedPixelInfo[];
        }

        const response = await rpc<CompactCanvasResponse>("canvas.get", {
          canvas_id: canvasId,
        });

        setCanvas(response.canvas);

        setCanvas(response.canvas);

        const colorBytes = Uint8Array.from(atob(response.pixel_colors), (c) =>
          c.charCodeAt(0),
        );

        // Reconstruct pixel array
        const decodedPixels: CanvasPixel[] = [];
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 32; x++) {
            const index = y * 32 + x;
            const color = colorBytes[index] || 0;

            const owned = response.owned_pixels.find(
              (p) => p.x === x && p.y === y,
            );

            decodedPixels.push({
              x,
              y,
              color,
              owner_id: owned?.owner_id,
              price_lamports: owned?.price_lamports || 0,
            });
          }
        }

        setPixels(decodedPixels);
      } catch (err) {
        setError((err as Error).message || "Failed to load canvas");
      } finally {
        setLoading(false);
      }
    };
    fetchCanvas();
  }, [canvasId]);

  // Render canvas
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl || loading) return;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    // Reset transform to avoid stacking scales on re-renders
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Canvas grid dimensions (from backend config)
    const GRID_SIZE = 32;

    // Clear with cream background
    ctx.fillStyle = "#F5F5DC";
    // Note: We use logical dimensions here because we scaled the context
    ctx.fillRect(0, 0, 32 * scale, 32 * scale);

    // Draw pixels
    pixels.forEach((pixel) => {
      const x = pixel.x * scale;
      const y = pixel.y * scale;
      ctx.fillStyle = COLORS[pixel.color] || "#000000";
      ctx.fillRect(x, y, scale, scale);
      // Note: pending state is tracked internally but no visual indicator shown
    });

    // Draw grid lines - use contrasting color based on canvas background
    // If first pixel is white (color 10), use black lines, otherwise white
    const isWhiteBackground = pixels.length > 0 && pixels[0].color === 10;
    ctx.strokeStyle = isWhiteBackground
      ? "rgba(0, 0, 0, 0.2)"
      : "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * scale, 0);
      ctx.lineTo(i * scale, GRID_SIZE * scale);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * scale);
      ctx.lineTo(GRID_SIZE * scale, i * scale);
      ctx.stroke();
    }

    // Draw selected pixel highlight
    if (selectedPixel) {
      const x = selectedPixel.x * scale;
      const y = selectedPixel.y * scale;
      ctx.strokeStyle = "#A93838";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1, y + 1, scale - 2, scale - 2);
    }
  }, [pixels, scale, loading, selectedPixel]);

  // Track pointer for reliable tap detection (vs scroll)
  const pointerRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerRef.current) return;

    const dx = Math.abs(e.clientX - pointerRef.current.x);
    const dy = Math.abs(e.clientY - pointerRef.current.y);
    const dt = Date.now() - pointerRef.current.time;

    // If moved less than 10px and faster than 500ms, consider it a tap
    if (dx < 10 && dy < 10 && dt < 500) {
      handleCanvasClick(e);
    }
    pointerRef.current = null;
  };

  const handleCanvasClick = (e: React.PointerEvent | React.MouseEvent) => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pixelX = Math.floor(clickX / scale);
    const pixelY = Math.floor(clickY / scale);

    if (pixelX >= 0 && pixelX < 32 && pixelY >= 0 && pixelY < 32) {
      setSelectedPixel({ x: pixelX, y: pixelY });
      // Update default bid amount based on pixel
      const pixel = pixels.find((p) => p.x === pixelX && p.y === pixelY);
      if (pixel && pixel.price_lamports) {
        setBidAmount((pixel.price_lamports + 10000000) / 1e9); // Current + 0.01 SOL
      } else {
        setBidAmount(0.01); // Default 0.01 SOL
      }
    }
  };

  const handlePublish = async () => {
    if (!canvas || !publicKey) return;

    // Prevent double click
    if (publishStatus) return;

    if (canvas.owner_id !== user?.id) {
      alert("Only the owner can publish.");
      return;
    }

    try {
      setPublishStatus("INITIATING...");

      // Get pixel_colors_packed from backend (contains draft pixels)
      const publishInfo = await initiatePublish(canvas.id);

      setPublishStatus("SIGNING...");

      // Decode base64 pixel_colors to Uint8Array
      const pixelColorsBase64 = publishInfo.pixel_colors_packed;
      const pixelColors = Uint8Array.from(atob(pixelColorsBase64), (c) =>
        c.charCodeAt(0),
      );

      const ix = buildPublishIx(publicKey, canvas.id, pixelColors);

      const transaction = new Transaction().add(ix);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      if (!signTransaction) {
        throw new Error("Wallet does not support signTransaction");
      }
      const signedTx = await signTransaction(transaction);

      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
        },
      );

      setPublishStatus("CONFIRMING...");

      const confirmation = await connection.confirmTransaction(
        signature,
        "confirmed",
      );

      if (confirmation.value.err) {
        // Get transaction logs for debugging
        const txDetails = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });
        console.error("Transaction failed on-chain:", confirmation.value.err);
        console.error("Transaction logs:", txDetails?.meta?.logMessages);
        throw new Error(
          `On-chain error: ${JSON.stringify(confirmation.value.err)}\nLogs: ${txDetails?.meta?.logMessages?.join("\n")}`,
        );
      }

      const [canvasPda] = deriveCanvasPda(uuidToBytes(canvas.id));
      await confirmPublish(canvas.id, signature, canvasPda.toBase58());

      setPublishStatus("PUBLISHED!");
      toast.success("Canvas PUBLISHED!");
      // Refresh canvas state
      setCanvas((prev) => (prev ? { ...prev, state: "published" } : null));

      setTimeout(() => setPublishStatus(""), 2000);
    } catch (err: unknown) {
      console.error("Publish failed:", err);

      // Extract logs if available
      let errorMsg = (err as Error).message || "Unknown error";
      if ((err as any).logs) {
        console.error("Simulation Logs:", (err as any).logs);
        errorMsg += `\nLogs: ${(err as any).logs.join("\n")}`;
      }

      toast.error(`Publish failed: ${errorMsg}`);
      setPublishStatus("");

      toast.error(`Publish failed: ${errorMsg}`);
      setPublishStatus("");

      try {
        await rpc("canvas.cancelPublish", { canvas_id: canvas.id });
      } catch (cleanupErr) {
        console.error("Failed to cancel publish state:", cleanupErr);
      }
    }
  };

  const handlePlacePixel = async () => {
    if (!selectedPixel || !canvas) return;

    // DRAFT MODE - Fully Optimistic
    if (canvas.state === "draft") {
      // Store previous state for rollback
      const previousPixels = [...pixels];
      const { x, y } = selectedPixel;

      // Optimistic update: Immediate UI response before server confirmation.
      // This makes the canvas feel responsive (zero latency), similar to local drawing tools.
      setPixels((prev) => {
        const newPixels = [...prev];
        const index = newPixels.findIndex((p) => p.x === x && p.y === y);
        if (index !== -1) {
          newPixels[index] = { ...newPixels[index], color: selectedColor };
        } else {
          newPixels.push({
            x,
            y,
            color: selectedColor,
            owner_id: undefined,
            price_lamports: 0,
          });
        }
        return newPixels;
      });

      // 2. Clear selection and set cooldown immediately (optimistic)
      setSelectedPixel(null);
      setCooldown(5000);

      rpc("pixel.place", {
        canvas_id: canvas.id,
        x,
        y,
        color: selectedColor,
      }).catch((error: any) => {
        console.error("Failed to place pixel:", error);

        setPixels(previousPixels);

        // Handle Cooldown Error
        if (error.data && error.data.remaining_ms) {
          setCooldown(error.data.remaining_ms);
          toast.error(
            `Cooldown active! Wait ${Math.ceil(error.data.remaining_ms / 1000)}s`,
          );
        } else if (error.message?.includes("Cooldown")) {
          setCooldown(5000);
          toast.error("Cooldown active!");
        } else {
          toast.error(`Paint failed: ${error.message}`);
        }
      });

      return;
    }

    // PUBLISHED MODE
    if (canvas.state === "published") {
      const pixel = pixels.find(
        (p) => p.x === selectedPixel.x && p.y === selectedPixel.y,
      );
      // If I own it, I can paint
      if (pixel?.owner_id === user?.id) {
        await handlePublishPaint();
        return;
      }

      // If I don't own it, I must BID
      await handleBid();
    }
  };

  const handlePublishPaint = async () => {
    if (!selectedPixel || !canvas || !publicKey || !signTransaction) {
      toast.error("Please connect wallet to paint");
      return;
    }

    try {
      setPublishStatus("INITIALIZING...");

      setPublishStatus("INITIALIZING...");

      const ix = buildPaintPixelIx(
        publicKey,
        canvas.id,
        selectedPixel.x,
        selectedPixel.y,
        selectedColor,
      );

      const transaction = new Transaction().add(ix);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      setPublishStatus("SIGNING PAINT...");

      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
        },
      );

      setPublishStatus("CONFIRMING...");

      setPublishStatus("CONFIRMING...");

      const response = await rpc<{ success: boolean }>("pixel.paint", {
        canvas_id: canvas.id,
        x: selectedPixel.x,
        y: selectedPixel.y,
        color: selectedColor,
        signature: signature,
      });

      if (response.success) {
        // Update pixel color in state
        setPixels((prev) =>
          prev.map((p) =>
            p.x === selectedPixel.x && p.y === selectedPixel.y
              ? { ...p, color: selectedColor }
              : p,
          ),
        );
        setPublishStatus("PAINTED!");
        toast.success("Pixel painted successfully!");
        setTimeout(() => setPublishStatus(null), 2000);
        setSelectedPixel(null);
      } else {
        throw new Error("Backend failed to confirm paint");
      }
    } catch (error: unknown) {
      console.error("Paint Error:", error);
      setPublishStatus("FAILED");
      setTimeout(() => setPublishStatus(null), 3000);

      // Extract meaningful error
      let msg = (error as Error).message || "Unknown error";
      if ((error as any).logs) {
        msg = "Transaction failed. See console.";
      }
      toast.error(`Paint Failed: ${msg}`);
    }
  };

  const handleBid = async () => {
    if (!selectedPixel || !canvas || !publicKey) {
      toast.error("Please connect wallet to bid");
      return;
    }

    const lamports = Math.floor(bidAmount * 1e9);
    if (lamports <= 0) {
      toast.error("Bid amount must be greater than 0.");
      return;
    }

    const { x, y } = selectedPixel;

    // Store original pixel state for potential rollback
    const originalPixels = [...pixels];

    // Set pending state immediately for visual feedback
    setPixels((prev) =>
      prev.map((p) => (p.x === x && p.y === y ? { ...p, pending: true } : p)),
    );

    try {
      setPublishStatus("BIDDING..."); // Re-use status for feedback

      // 1. Prepare Bid (Backend check + lock)
      // This RPC call will also return the previous owner's wallet address if needed
      const bidInfo = await rpc<{ previous_owner_wallet: string | null }>(
        "pixel.place",
        {
          canvas_id: canvas.id,
          x,
          y,
          color: selectedColor,
          bid_lamports: lamports,
        },
      );

      setPublishStatus("SIGNING BID...");

      // 2. Build Instructions
      // For fresh pixels (no previous owner), use bidder's key as placeholder
      // The Anchor program skips refund logic if current_price == 0 anyway
      const previousOwnerKey = bidInfo.previous_owner_wallet
        ? new PublicKey(bidInfo.previous_owner_wallet)
        : publicKey;

      const transactions = new Transaction();

      const bidIx = buildBidPixelIx(
        publicKey,
        previousOwnerKey,
        canvas.id,
        x,
        y,
        BigInt(lamports),
      );
      transactions.add(bidIx);

      const paintIx = buildPaintPixelIx(
        publicKey,
        canvas.id,
        x,
        y,
        selectedColor,
      );
      transactions.add(paintIx);

      // Send Transaction
      // Use sendRawTransaction with skipPreflight to bypass simulation errors
      // and get better on-chain logs if it fails
      const [latestBlockhash] = await Promise.all([
        connection.getLatestBlockhash(),
      ]);

      transactions.recentBlockhash = latestBlockhash.blockhash;
      transactions.feePayer = publicKey;

      // Sign locally
      if (!signTransaction) {
        throw new Error("Wallet does not support transaction signing!");
      }
      const signedTx = await signTransaction(transactions);
      const rawTx = signedTx.serialize();

      const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      });

      setPublishStatus("CONFIRMING BID...");

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );

      if (confirmation.value.err) {
        console.error("Bid Confirmation Error:", confirmation.value.err);
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        );
      }

      if (confirmation.value.err) {
        console.error("Bid Confirmation Error:", confirmation.value.err);
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        );
      }

      await rpc("pixel.confirm", {
        canvas_id: canvas.id,
        x,
        y,
        color: selectedColor,
        bid_lamports: lamports,
        signature,
      });

      // Clear pending state and update ownership + color on success
      setPixels((prev) =>
        prev.map((p) =>
          p.x === x && p.y === y
            ? { ...p, pending: false, owner_id: user?.id, price_lamports: lamports, color: selectedColor }
            : p,
        ),
      );

      setPublishStatus("BID PLACED!");
      toast.success("Bid placed successfully!");
      setCooldown(5000); // Apply cooldown
      setSelectedPixel(null); // Clear selection
      setTimeout(() => setPublishStatus(""), 2000);
    } catch (err: unknown) {
      console.error("Bid failed:", err);

      // Clear pending state and rollback on failure
      setPixels(originalPixels);

      // Cancel the pending pixel claim to unlock it for other users
      if (canvas) {
        try {
          await rpc("pixel.cancel", {
            canvas_id: canvas.id,
            x,
            y,
          });
        } catch (cancelErr) {
          console.error("Failed to cancel pixel claim:", cancelErr);
        }
      }

      toast.error(`Bid failed: ${(err as Error).message}`);
      setPublishStatus("");
      if ((err as any).data && (err as any).data.remaining_ms) {
        setCooldown((err as any).data.remaining_ms);
      }
    }
  };

  const handleMint = async () => {
    if (!canvas || !publicKey) return;
    if (mintStatus) return;

    try {
      setPublishStatus("PREPARING METADATA...");
      setMintStatus(true);
      toast.success("Preparing NFT metadata...");

      // 1. Prepare metadata (generate image, upload to IPFS, get creators)
      const metadataResult = (await rpc("nft.prepareMetadata", {
        canvas_id: canvas.id,
      })) as {
        metadata_uri: string;
        image_gateway_url: string;
        creators: Array<{ address: string; share: number }>;
      };

      setPublishStatus("MINTING...");

      // 2. Initiate Mint (Backend - sets state to minting)
      await rpc("nft.mint", { canvas_id: canvas.id });

      // 3. Build Mint Instruction with real IPFS URI and creators
      const mintIx = buildMintIx(
        publicKey,
        canvas.id,
        canvas.name,
        "PIXEL",
        metadataResult.metadata_uri,
        metadataResult.creators || [], // Pass creators for on-chain royalties
      );

      const transaction = new Transaction().add(mintIx);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Simulate first to get detailed error
      try {
        const simulation = await connection.simulateTransaction(transaction);
        if (simulation.value.err) {
          console.error("Simulation error:", simulation.value.err);
          console.error("Simulation logs:", simulation.value.logs);
          throw new Error(
            `Simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join("\n")}`,
          );
        }
      } catch (simErr) {
        console.error("Simulation threw:", simErr);
        throw simErr;
      }

      // 3. Send Transaction using signTransaction + sendRawTransaction for wallet compatibility
      if (!signTransaction) {
        throw new Error("Wallet does not support transaction signing!");
      }
      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      });

      setPublishStatus("CONFIRMING MINT...");
      await connection.confirmTransaction(signature, "confirmed");

      const [mintPda] = deriveMintPda(uuidToBytes(canvas.id));

      await rpc("nft.confirmMint", {
        canvas_id: canvas.id,
        signature,
        mint_address: mintPda.toBase58(),
      });

      setPublishStatus("MINTED!");
      setCanvas((prev) =>
        prev
          ? { ...prev, state: "minted", mint_address: mintPda.toBase58() }
          : null,
      );
      setTimeout(() => {
        setPublishStatus("");
        setMintStatus(false);
      }, 3000);
    } catch (err: unknown) {
      console.error("Mint failed:", err);

      // Cancel minting on backend to revert state to 'published'
      if (canvas) {
        try {
          await rpc("nft.cancelMint", { canvas_id: canvas.id });
          setCanvas((prev) => (prev ? { ...prev, state: "published" } : null));
        } catch (cancelErr) {
          console.error("Failed to cancel mint:", cancelErr);
        }
      }

      const errorMsg = (err as Error).message || "Mint failed";
      if (
        errorMsg.includes("User rejected") ||
        errorMsg.includes("Unexpected error")
      ) {
        toast.error("Transaction rejected. Minting cancelled.");
      } else {
        toast.error(`Mint failed: ${errorMsg}`);
      }

      setPublishStatus("");
      setMintStatus(false);
    }
  };

  // Announce mint (starts 30-second countdown)
  const handleAnnounceMint = async () => {
    if (!canvas || !publicKey) return;

    // Optimistically lock canvas immediately
    setCanvas((current) =>
      current ? { ...current, state: "mint_pending" } : null,
    );
    setMintCountdown(30);

    try {
      await rpc("nft.announceMint", { canvas_id: canvas.id });
      // WebSocket will handle setting mintCountdown and state for other users
      toast.success("Mint announced! Countdown started.");
    } catch (err: unknown) {
      console.error("Announce mint failed:", err);
      // Revert optimistic update on failure
      setCanvas((current) =>
        current ? { ...current, state: "published" } : null,
      );
      setMintCountdown(null);
      toast.error((err as Error).message || "Failed to announce mint");
    }
  };

  // Cancel mint countdown
  const handleCancelMintCountdown = async () => {
    if (!canvas) return;

    try {
      await rpc("nft.cancelMintCountdown", { canvas_id: canvas.id });
      // WebSocket will handle clearing countdown and state
      toast.success("Mint countdown cancelled.");
    } catch (err: unknown) {
      console.error("Cancel mint countdown failed:", err);
      toast.error((err as Error).message || "Failed to cancel countdown");
    }
  };

  // Auto-trigger mint when countdown reaches 0 (only if still in mint_pending state)
  useEffect(() => {
    if (
      mintCountdown === 0 &&
      isOwner &&
      !mintStatus &&
      canvas?.state === "mint_pending"
    ) {
      setMintCountdown(null); // Clear countdown to prevent re-triggers
      handleMint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintCountdown, isOwner, mintStatus, canvas?.state]);

  // Handle creator verification for minted canvases
  const handleVerifyCreator = async () => {
    if (!canvas?.mint_address || !publicKey) return;
    if (verifyingCreator) return;

    try {
      setVerifyingCreator(true);
      toast.success("Verifying creator status...");

      const mintAddress = new PublicKey(canvas.mint_address);
      const signMetadataIx = buildSignMetadataIx(publicKey, mintAddress);

      const transaction = new Transaction().add(signMetadataIx);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      toast.success(
        "Creator verification successful! Your creator status is now verified on-chain.",
      );
    } catch (err: any) {
      console.error("Creator verification failed:", err);
      const errorMsg = err.message || "Verification failed";
      if (errorMsg.includes("User rejected")) {
        toast.error("Transaction rejected.");
      } else if (errorMsg.includes("Creator not found")) {
        toast.error("You are not listed as a creator on this NFT.");
      } else {
        toast.error(`Verification failed: ${errorMsg}`);
      }
    } finally {
      setVerifyingCreator(false);
    }
  };

  const currentPixel = selectedPixel
    ? pixels.find((p) => p.x === selectedPixel.x && p.y === selectedPixel.y)
    : null;
  const isOwnerOfSelectedPixel = currentPixel?.owner_id === user?.id;
  const isPublishedCanvas = canvas?.state === "published";

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
        }}
      >
        <span style={{ color: "#888" }}>RETRIEVING ARCHIVE DATA...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          padding: "2rem",
        }}
      >
        <div style={{ color: "var(--color-error)", fontSize: "1.2rem" }}>
          ERROR: {error}
        </div>
        <RetroButton onClick={onBack} variant="secondary">
          GO BACK
        </RetroButton>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: "1rem",
      }}
      onClick={(e) => {
        // Close pixel dialog when clicking outside canvas
        const target = e.target as HTMLElement;
        if (
          !target.closest("canvas") &&
          !target.closest("[data-pixel-controls]")
        ) {
          setSelectedPixel(null);
        }
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-md">
        <div className="flex items-center gap-md">
          <RetroButton
            onClick={onBack}
            variant="secondary"
            style={{ padding: "4px 12px" }}
          >
            BACK
          </RetroButton>
          <h2 style={{ margin: 0, color: "var(--color-success)" }}>
            {canvas?.name}
          </h2>
          <span
            style={{
              fontSize: "0.8rem",
              color:
                canvas?.state === "published"
                  ? "var(--color-success)"
                  : "var(--color-neutral)",
            }}
          >
            [{canvas?.state.toUpperCase()}]
          </span>
        </div>

        {/* Publish Button for Owner */}
        {canvas?.owner_id === user?.id && canvas?.state === "draft" && (
          <div className="flex gap-sm items-center">
            {publishStatus && (
              <span
                style={{
                  color: "#888",
                  fontSize: "0.8rem",
                  marginRight: "0.5rem",
                }}
              >
                {publishStatus}
              </span>
            )}
            <RetroButton
              onClick={handlePublish}
              variant="primary"
              disabled={!!publishStatus}
            >
              PUBLISH ON-CHAIN
            </RetroButton>
          </div>
        )}

        {/* Announce Mint Button for Owner (Published canvas) */}
        {isOwner && canvas?.state === "published" && !canvas.mint_address && (
          <div className="flex gap-sm items-center">
            {publishStatus && (
              <span
                style={{
                  color: "#888",
                  fontSize: "0.8rem",
                  marginRight: "0.5rem",
                }}
              >
                {publishStatus}
              </span>
            )}
            <RetroButton
              onClick={handleAnnounceMint}
              variant="primary"
              disabled={!!publishStatus}
            >
              ANNOUNCE MINT
            </RetroButton>
          </div>
        )}

        {/* Cancel Mint Countdown Button for Owner (MintPending state) */}
        {isOwner && canvas?.state === "mint_pending" && (
          <div className="flex gap-sm items-center">
            <span
              style={{
                color: "#888",
                fontSize: "0.8rem",
                marginRight: "0.5rem",
              }}
            >
              {mintCountdown !== null && mintCountdown > 0
                ? `MINTING IN ${mintCountdown}s...`
                : mintStatus
                  ? "PREPARING MINT..."
                  : "STARTING MINT..."}
            </span>
            <RetroButton
              onClick={handleCancelMintCountdown}
              variant="secondary"
              disabled={mintStatus}
            >
              CANCEL
            </RetroButton>
          </div>
        )}

        {/* Verify Creator Button for minted canvases - show for all collaborators with wallet */}
        {canvas?.mint_address && publicKey && (
          <RetroButton
            onClick={handleVerifyCreator}
            variant="secondary"
            disabled={verifyingCreator}
          >
            {verifyingCreator ? "VERIFYING..." : "VERIFY AS CREATOR"}
          </RetroButton>
        )}
      </div>

      {/* Canvas + Palette Container */}
      <div
        className="canvas-palette-container"
        style={{
          flex: 1,
          display: "flex",
          gap: "1rem",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Canvas Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            overflow: "auto",
            padding: "1rem",
          }}
        >
          <div style={{ margin: "auto", position: "relative" }}>
            <canvas
              ref={canvasRef}
              width={32 * scale * (window.devicePixelRatio || 1)}
              height={32 * scale * (window.devicePixelRatio || 1)}
              style={{
                width: `${32 * scale}px`,
                height: `${32 * scale}px`,
                display: "block",
                border: "3px solid var(--color-primary)",
                borderRadius: "5px",
                cursor: "crosshair",
                touchAction: "manipulation",
                imageRendering: "pixelated",
              }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
            />
          </div>
        </div>

        {/* Color Palette - Vertical on desktop, horizontal on mobile */}
        <div
          className="card color-palette-panel"
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            overflow: "auto",
            maxHeight: "100%",
            minWidth: "140px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 28px)",
              gap: "8px",
            }}
          >
            {COLORS.map((color, index) => (
              <div
                key={index}
                onClick={() => setSelectedColor(index)}
                style={{
                  width: "28px",
                  height: "28px",
                  backgroundColor: color,
                  border:
                    selectedColor === index
                      ? "3px solid var(--color-primary)"
                      : "1px solid var(--color-neutral)",
                  cursor: "pointer",
                  borderRadius: "2px",
                  boxShadow:
                    selectedColor === index
                      ? "2px 2px 0px var(--color-primary)"
                      : "none",
                }}
                title={`Color ${index}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar - Fixed Bottom */}
      {selectedPixel && (
        <div
          data-pixel-controls
          className="card fade-in"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: "400px",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1000,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            border: "2px solid var(--color-primary)",
            background: "var(--color-background)",
          }}
        >
          <div
            style={{
              color: "var(--color-primary)",
              fontWeight: "bold",
              fontFamily: '"Courier New", monospace',
            }}
          >
            COORD: ({selectedPixel.x}, {selectedPixel.y})
          </div>
          {cooldown > 0 ? (
            <div style={{ color: "var(--color-warning)", fontWeight: "bold" }}>
              WAIT {Math.ceil(cooldown / 1000)}s
            </div>
          ) : (
            <>
              {isPublishedCanvas && !isOwnerOfSelectedPixel && (
                <div className="flex items-center gap-sm">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseFloat(e.target.value))}
                    style={{
                      width: "80px",
                      padding: "4px",
                      backgroundColor: "var(--color-background-dark)",
                      border: "1px solid var(--color-neutral)",
                      color: "var(--color-primary)",
                    }}
                  />
                  <RetroButton onClick={handleBid} variant="primary">
                    BID {bidAmount} SOL
                  </RetroButton>
                </div>
              )}
              {(!isPublishedCanvas || isOwnerOfSelectedPixel) && (
                <RetroButton onClick={handlePlacePixel} variant="primary">
                  PAINT
                </RetroButton>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
