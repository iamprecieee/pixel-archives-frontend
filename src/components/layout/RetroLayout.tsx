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
      <footer className={styles.footer}>
        {isAuthenticated ? (
          <span>SYSTEM ONLINE_</span>
        ) : (
          <span>SYSTEM READY_</span>
        )}
      </footer>
    </div>
  );
};
