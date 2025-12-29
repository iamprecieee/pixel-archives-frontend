import { type FC, type ReactNode } from "react";
import styles from "./RetroLayout.module.css";
import { useAuthStore } from "../../store/authStore";
import { ThemeToggle } from "../common/ThemeToggle";
import { FloatingPapers } from "../effects/FloatingPapers";

interface RetroLayoutProps {
  children: ReactNode;
  onLogoClick?: () => void;
}

export const RetroLayout: FC<RetroLayoutProps> = ({
  children,
  onLogoClick,
}) => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className={styles.container}>
      <FloatingPapers />
      <header className={styles.header}>
        <div
          className={styles.logo}
          onClick={onLogoClick}
          style={{
            cursor: onLogoClick ? "pointer" : "default",
            fontWeight: "bold",
          }}
        >
          PIXEL
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <ThemeToggle />
          <div className={styles.status}>
            STATUS:{" "}
            {isAuthenticated ? (
              <span>ONLINE</span>
            ) : (
              <span style={{ color: "#888" }}>OFFLINE</span>
            )}
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <div
        style={{
          textAlign: "center",
          padding: "0.5rem",
          color: "#888",
          fontSize: "0.8rem",
          borderTop: "1px solid #444",
        }}
      >
        ⚠️ This app is running on Solana Devnet. Tokens have no real value.
      </div>
      <footer className={styles.footer}>
        <span>
          {isAuthenticated ? "SYSTEM ONLINE_" : "SYSTEM READY_"}
        </span>
        <span style={{ marginLeft: "auto", opacity: 0.9 }}>
          built by{" "}
          <a
            href="https://github.com/iamprecieee"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-secondary)", textDecoration: "none" }}
          >
            iamprecieee
          </a>
        </span>
      </footer>
    </div>
  );
};
