import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import "@solana/wallet-adapter-react-ui/styles.css";
import { RetroLayout } from "./components/layout/RetroLayout";
import { RetroButton } from "./components/common/RetroButton";
import { WalletButton } from "./components/auth/WalletButton";
import { LoginForm } from "./components/auth/LoginForm";
import { RegisterForm } from "./components/auth/RegisterForm";
import { useAuthStore } from "./store/authStore";
import { Dashboard } from "./components/dashboard/Dashboard";
import { CanvasView } from "./components/canvas/CanvasView";

import { Toaster } from "react-hot-toast";

function App() {
  const [view, setView] = useState<"intro" | "select" | "login" | "register">(
    "intro",
  );
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const { isAuthenticated, user, clearAuth } = useAuthStore();

  const { publicKey } = useWallet();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (!publicKey || publicKey.toBase58() !== user.wallet_address) {
        // Call auth.logout to blacklist the token before clearing local state
        import("./services/rpc").then(({ rpc }) => {
          rpc("auth.logout", {}).catch(() => {
            // Ignore errors - we're logging out anyway
          });
        });
        clearAuth();
        setView("select");
        setActiveCanvasId(null);
      }
    }
  }, [publicKey, isAuthenticated, user, clearAuth]);

  // Retro Toast Styles
  const toastOptions = {
    duration: 3000,
    style: {
      border: "var(--border-width) solid var(--color-primary)",
      padding: "16px",
      color: "var(--color-primary)",
      fontWeight: "bold",
      borderRadius: "0",
      boxShadow: "var(--shadow-card)",
      background: "var(--color-secondary)",
      fontFamily: '"Courier New", monospace',
      fontSize: "14px",
      zIndex: 9999,
    },
    success: {
      style: {
        background: "var(--color-background)",
        border: "var(--border-width) solid var(--color-success)",
        color: "var(--color-success)",
      },
      iconTheme: {
        primary: "var(--color-success)",
        secondary: "var(--color-background)",
      },
    },
    error: {
      style: {
        background: "var(--color-background)",
        border: "var(--border-width) solid var(--color-primary)",
        color: "var(--color-primary)",
      },
      iconTheme: {
        primary: "var(--color-primary)",
        secondary: "var(--color-background)",
      },
    },
  };

  if (isAuthenticated && user) {
    // Canvas View
    if (activeCanvasId) {
      return (
        <>
          <Toaster
            position="top-right"
            toastOptions={toastOptions}
            containerStyle={{ zIndex: 99999 }}
          />
          <RetroLayout onLogoClick={() => setActiveCanvasId(null)}>
            <CanvasView
              canvasId={activeCanvasId}
              onBack={() => setActiveCanvasId(null)}
            />
          </RetroLayout>
        </>
      );
    }

    // Dashboard View
    return (
      <>
        <Toaster
          position="top-right"
          toastOptions={toastOptions}
          containerStyle={{ zIndex: 99999 }}
        />
        <RetroLayout>
          <div className="flex flex-col gap-lg" style={{ width: "100%" }}>
            <div
              className="flex justify-between items-center"
              style={{ width: "100%" }}
            >
              <h2>WELCOME, {user.username}</h2>
              <div className="flex gap-sm">
                <WalletButton />
              </div>
            </div>

            <Dashboard onOpenCanvas={setActiveCanvasId} />
          </div>
        </RetroLayout>
      </>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={toastOptions}
        containerStyle={{ zIndex: 99999 }}
      />
      <RetroLayout onLogoClick={() => setView("intro")}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: "10vh",
            flex: 1,
            minHeight: 0,
            gap: "2rem",
            textAlign: "center",
          }}
        >
          {view === "intro" && (
            <div className="fade-in">
              <div style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                  THE PIXEL ARCHIVES
                </h2>
                <p
                  style={{
                    color: "var(--color-primary)",
                    letterSpacing: "1px",
                    fontWeight: "bold",
                  }}
                >
                  EST. 202X
                </p>
              </div>

              <RetroButton
                onClick={() => setView("select")}
                variant="secondary"
              >
                ACCESS ARCHIVES
              </RetroButton>
            </div>
          )}

          {view === "select" && (
            <div
              className="fade-in card"
              style={{ maxWidth: "600px", width: "100%" }}
            >
              <h3
                style={{
                  borderBottom: "2px solid var(--color-primary)",
                  paddingBottom: "0.5rem",
                }}
              >
                AUTHENTICATION REQUIRED
              </h3>
              <p style={{ marginBottom: "2rem" }}>
                Please identify yourself to access the collaborative grid.
              </p>

              <div className="flex flex-col gap-md items-center">
                <WalletButton />

                <div className="flex gap-md justify-center w-full">
                  <RetroButton
                    onClick={() => setView("register")}
                    variant="primary"
                  >
                    REGISTER
                  </RetroButton>
                  <RetroButton
                    onClick={() => setView("login")}
                    variant="secondary"
                  >
                    LOGIN
                  </RetroButton>
                </div>
              </div>
            </div>
          )}

          {view === "login" && (
            <div
              className="card fade-in"
              style={{ maxWidth: "500px", width: "100%" }}
            >
              <LoginForm />
              <div style={{ marginTop: "1rem" }}>
                <RetroButton
                  onClick={() => setView("select")}
                  variant="secondary"
                  style={{ fontSize: "0.8rem" }}
                >
                  BACK
                </RetroButton>
              </div>
            </div>
          )}

          {view === "register" && (
            <div
              className="card fade-in"
              style={{ maxWidth: "500px", width: "100%" }}
            >
              <RegisterForm />
              <div style={{ marginTop: "1rem" }}>
                <RetroButton
                  onClick={() => setView("select")}
                  variant="secondary"
                  style={{ fontSize: "0.8rem" }}
                >
                  BACK
                </RetroButton>
              </div>
            </div>
          )}
        </div>
      </RetroLayout>
    </>
  );
}

export default App;
