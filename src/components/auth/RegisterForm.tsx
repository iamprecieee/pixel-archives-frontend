import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { RetroButton } from "../common/RetroButton";
import { rpc } from "../../services/rpc";
import { useAuthStore } from "../../store/authStore";
import bs58 from "bs58";

export const RegisterForm: React.FC = () => {
  const { publicKey, signMessage } = useWallet();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!publicKey || !signMessage) {
      setError("Please connect your wallet first.");
      return;
    }
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = crypto.randomUUID();
      const messageStr = `pixel:${publicKey.toBase58()}:${timestamp}:${nonce}`;
      const message = new TextEncoder().encode(messageStr);
      const signature = await signMessage(message);

      const response = await rpc<{ token: string; user: any }>(
        "auth.register",
        {
          wallet: publicKey.toBase58(),
          username,
          message: messageStr,
          signature: bs58.encode(signature),
        },
      );

      setAuth(response.user);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-md items-center fade-in">
      <h3 style={{ borderBottom: "2px solid var(--color-primary)" }}>
        REGISTER
      </h3>

      {!publicKey ? (
        <p>Please connect your wallet first.</p>
      ) : (
        <div className="flex flex-col gap-sm" style={{ width: "100%" }}>
          <input
            type="text"
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: "var(--spacing-md)",
              background: "transparent",
              border: "2px solid var(--color-primary)",
              color: "var(--color-primary)",
              fontFamily: "inherit",
              fontWeight: "bold",
              fontSize: "1rem",
              outline: "none",
            }}
          />
          <RetroButton onClick={handleRegister} disabled={loading}>
            {loading ? "SIGNING..." : "REGISTER & SIGN"}
          </RetroButton>
        </div>
      )}

      {error && <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>}
    </div>
  );
};
