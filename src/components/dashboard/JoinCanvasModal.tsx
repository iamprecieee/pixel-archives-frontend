import { useState, type FC } from "react";
import { RetroButton } from "../common/RetroButton";
import { useCanvasStore } from "../../store/canvasStore";

interface JoinCanvasModalProps {
  onClose: () => void;
}

export const JoinCanvasModal: FC<JoinCanvasModalProps> = ({ onClose }) => {
  const [inviteCode, setInviteCode] = useState("");
  const { joinCanvas, loading, error } = useCanvasStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      await joinCanvas(inviteCode.trim().toUpperCase());
      onClose();
    } catch {
      // Error is handled in store
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
          JOIN ARCHIVE
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
              INVITE CODE
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE..."
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
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            />
          </div>

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
            >
              ABORT
            </RetroButton>
            <RetroButton
              type="submit"
              variant="primary"
              disabled={loading || !inviteCode.trim()}
              style={{ flex: 1 }}
            >
              {loading ? "JOINING..." : "JOIN"}
            </RetroButton>
          </div>
        </form>
      </div>
    </div>
  );
};
