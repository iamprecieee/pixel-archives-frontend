import React, { type ButtonHTMLAttributes } from "react";
import styles from "./RetroButton.module.css";

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export const RetroButton: React.FC<RetroButtonProps> = ({
  children,
  variant = "primary",
  className = "",
  ...props
}) => {
  return (
    <button
      className={`${styles.retroButton} ${styles[variant]} ${className}`}
      {...props}
    >
      <span className={styles.text}>{children}</span>
      <div className={styles.glow} />
    </button>
  );
};
