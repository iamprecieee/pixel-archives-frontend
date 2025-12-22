import { useState, type FC } from "react";
import type { Canvas } from "../../types/canvas";
import { RetroButton } from "../common/RetroButton";

interface CanvasCardProps {
  canvas: Canvas;
  onOpen: (id: string) => void;
}

export const CanvasCard: FC<CanvasCardProps> = ({ canvas, onOpen }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        minHeight: "200px",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div
          style={{
            borderBottom: "1px solid var(--color-primary)",
            paddingBottom: "0.5rem",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1.1rem",
              color: "var(--color-success)",
            }}
          >
            {canvas.name}
          </h3>
          <span
            style={{
              fontSize: "0.7rem",
              color:
                canvas.state === "published"
                  ? "var(--color-success)"
                  : "var(--color-neutral)",
            }}
          >
            [{canvas.state.toUpperCase()}]
          </span>
        </div>

        <div
          className="flex flex-col gap-sm"
          style={{ fontSize: "0.75rem", color: "var(--color-neutral)" }}
        >
          <div
            onClick={() => copyToClipboard(canvas.id, "id")}
            style={{ cursor: "pointer" }}
            title="Click to copy ID"
          >
            {copiedField === "id" ? (
              <span style={{ color: "var(--color-success)" }}>COPIED</span>
            ) : (
              <>
                ID:{" "}
                <code
                  style={{
                    color: "var(--color-primary)",
                    background: "transparent",
                    fontSize: "0.7rem",
                  }}
                >
                  {canvas.id.substring(0, 8)}...
                </code>
              </>
            )}
          </div>
          <div
            className="flex items-center gap-sm"
            onClick={() => copyToClipboard(canvas.invite_code, "code")}
            style={{ cursor: "pointer" }}
            title="Click to copy code"
          >
            {copiedField === "code" ? (
              <span style={{ color: "var(--color-success)" }}>COPIED</span>
            ) : (
              <>
                <span>CODE:</span>
                <code
                  style={{
                    color: "var(--color-secondary)",
                    background: "var(--color-primary)",
                    padding: "1px 4px",
                    fontWeight: "bold",
                    fontSize: "0.7rem",
                    borderRadius: "2px",
                  }}
                >
                  {canvas.invite_code}
                </code>
              </>
            )}
          </div>
        </div>
      </div>

      <RetroButton
        onClick={() => onOpen(canvas.id)}
        variant="primary"
        style={{ width: "100%" }}
      >
        ACCESS TERMINAL
      </RetroButton>
    </div>
  );
};
