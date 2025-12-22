import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { RetroButton } from "../common/RetroButton";
import { rpc } from "../../services/rpc";
import { useAuthStore } from "../../store/authStore";
import bs58 from "bs58";

export const LoginForm: React.FC = () => {
  const { publicKey, signMessage } = useWallet();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!publicKey || !signMessage) {
      setError("Please connect your wallet first.");
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

      const response = await rpc<{ token: string; user: any }>("auth.login", {
        wallet: publicKey.toBase58(),
        message: messageStr,
        signature: bs58.encode(signature),
      });

      setAuth(response.user);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-md items-center fade-in">
      <h3 style={{ borderBottom: "2px solid var(--color-primary)" }}>LOGIN</h3>

      {!publicKey ? (
        <p>Please connect your wallet to continue.</p>
      ) : (
        <div className="flex flex-col gap-sm items-center">
          <p>
            Wallet connected: {publicKey.toBase58().slice(0, 6)}...
            {publicKey.toBase58().slice(-4)}
          </p>
          <RetroButton onClick={handleLogin} disabled={loading}>
            {loading ? "SIGNING..." : "SIGN TO LOGIN"}
          </RetroButton>
        </div>
      )}

      {error && <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>}
    </div>
  );
};
