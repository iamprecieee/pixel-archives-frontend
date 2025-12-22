import { useState, type FC } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import toast from "react-hot-toast";
import { RetroButton } from "../common/RetroButton";
import { useCanvasStore } from "../../store/canvasStore";
import { buildInitializeIx } from "../../services/solana";
import { rpc } from "../../services/rpc";

interface CreateCanvasModalProps {
  onClose: () => void;
}

export const CreateCanvasModal: FC<CreateCanvasModalProps> = ({ onClose }) => {
  const [name, setName] = useState("");
  const [initialColor, setInitialColor] = useState<number>(0); // 0 = black, 10 = white
  const [status, setStatus] = useState<string>("");
  const {
    createCanvas,
    fetchCanvases,
    loading: storeLoading,
    error: storeError,
  } = useCanvasStore();
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [localLoading, setLocalLoading] = useState(false);
  const loading = storeLoading || localLoading;
  const error = storeError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!publicKey) {
      toast.error("Please connect wallet first");
      return;
    }

    setStatus("INITIALIZING METADATA...");
    setLocalLoading(true);

    let canvasId: string | undefined;

    try {
      const canvas = await createCanvas(name, initialColor);
      canvasId = canvas.id;

      setStatus("PREPARING ON-CHAIN DATA...");

      const ix = buildInitializeIx(publicKey, canvas.id);

      const transaction = new Transaction();
      transaction.add(ix);

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      setStatus("WAITING FOR SIGNATURE...");

      if (!signTransaction) {
        throw new Error("Wallet does not support transaction signing");
      }

      const signedTx = await signTransaction(transaction);

      setStatus("SENDING TRANSACTION...");

      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      });

      setStatus("CONFIRMING TRANSACTION...");

      const confirmation = await connection.confirmTransaction(
        signature,
        "confirmed",
      );

      if (confirmation.value.err) {
        throw new Error("Transaction failed on-chain");
      }

      setStatus("SUCCESS!");
      toast.success("Canvas Initialized!");
      onClose();
    } catch (err: any) {
      console.error(err);

      // ROLLBACK: Delete the Draft canvas if chain interaction failed
      if (canvasId) {
        setStatus("ROLLING BACK...");
        try {
          await rpc("canvas.delete", { canvas_id: canvasId });
          await fetchCanvases(); // Remove from list
        } catch (delErr) {
          console.error("Rollback failed:", delErr);
        }
      }

      const errorMsg = err.message || "Failed to initialize";
      if (errorMsg.includes("User rejected")) {
        toast.error("Transaction rejected. Canvas creation cancelled.");
      } else {
        toast.error(`Failed: ${errorMsg}`);
      }
    } finally {
      setLocalLoading(false);
      setStatus("");
    }
  };

  return (
    <div
      className="wallet-adapter-modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        background: "rgba(169, 56, 56, 0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="card fade-in"
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--color-background)",
          backgroundImage:
            "linear-gradient(rgba(169, 56, 56, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(169, 56, 56, 0.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          backgroundPosition: "center",
          position: "relative",
          border: "2px solid var(--color-primary)",
          boxShadow: "var(--shadow-card)",
          padding: "2rem",
        }}
      >
        <h3
          style={{
            color: "var(--color-primary)",
            borderBottom: "2px solid var(--color-primary)",
            paddingBottom: "0.5rem",
            textAlign: "center",
            marginBottom: "2rem",
            fontFamily: '"Courier New", monospace',
            textTransform: "uppercase",
            fontSize: "1.5rem",
            letterSpacing: "1.5px",
          }}
        >
          INITIALIZE ARCHIVE
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <div className="flex flex-col gap-sm">
            <label
              style={{
                color: "var(--color-primary)",
                fontWeight: "bold",
                letterSpacing: "1px",
              }}
            >
              ARCHIVE DESIGNATION
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER NAME..."
              disabled={loading}
              autoFocus
              style={{
                background: "transparent",
                border: "none",
                borderBottom: "2px solid var(--color-primary)",
                color: "var(--color-primary)",
                fontFamily: '"Courier New", monospace',
                fontSize: "1.2rem",
                padding: "0.5rem",
                outline: "none",
                width: "100%",
              }}
            />
          </div>

          {/* Initial Color Toggle */}
          <div className="flex flex-col gap-sm">
            <label
              style={{
                color: "var(--color-primary)",
                fontWeight: "bold",
                letterSpacing: "1px",
              }}
            >
              INITIAL BACKGROUND
            </label>
            <div className="flex gap-md">
              <button
                type="button"
                onClick={() => setInitialColor(0)}
                style={{
                  flex: 1,
                  padding: "0.5rem 1rem",
                  background: initialColor === 0 ? "#000000" : "transparent",
                  color:
                    initialColor === 0 ? "#FFFFFF" : "var(--color-primary)",
                  border: "2px solid var(--color-primary)",
                  fontFamily: '"Courier New", monospace',
                  fontWeight: "bold",
                  cursor: "pointer",
                  letterSpacing: "1px",
                }}
              >
                BLACK
              </button>
              <button
                type="button"
                onClick={() => setInitialColor(10)}
                style={{
                  flex: 1,
                  padding: "0.5rem 1rem",
                  background: initialColor === 10 ? "#FFFFFF" : "transparent",
                  color:
                    initialColor === 10 ? "#000000" : "var(--color-primary)",
                  border: "2px solid var(--color-primary)",
                  fontFamily: '"Courier New", monospace',
                  fontWeight: "bold",
                  cursor: "pointer",
                  letterSpacing: "1px",
                }}
              >
                WHITE
              </button>
            </div>
          </div>

          {status && (
            <div
              style={{
                color: "#888",
                fontSize: "0.8rem",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              STATUS: {status}
            </div>
          )}

          {error && (
            <div
              style={{
                color: "var(--color-primary)",
                fontSize: "0.8rem",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              ERROR: {error}
            </div>
          )}

          <div className="flex gap-md" style={{ marginTop: "1rem" }}>
            <RetroButton
              type="button"
              onClick={onClose}
              variant="secondary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              ABORT
            </RetroButton>
            <RetroButton
              type="submit"
              variant="primary"
              disabled={loading || !name.trim() || !publicKey}
              style={{ flex: 1 }}
            >
              {loading ? "PROCESSING..." : "INITIALIZE"}
            </RetroButton>
          </div>
        </form>
      </div>
    </div>
  );
};
