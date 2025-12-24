import { type FC, type ReactNode } from "react";
import styles from "./RetroLayout.module.css";
import { useAuthStore } from "../../store/authStore";

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
        <div className={styles.status}>
          STATUS:{" "}
          {isAuthenticated ? (
            <span>ONLINE</span>
          ) : (
            <span style={{ color: "#888" }}>OFFLINE</span>
          )}
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
