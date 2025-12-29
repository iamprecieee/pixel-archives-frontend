import { type FC } from "react";
import { useThemeStore } from "../../store/themeStore";

export const ThemeToggle: FC = () => {
    const { theme, toggleTheme } = useThemeStore();

    return (
        <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            style={{
                background: "transparent",
                border: "none",
                color: "var(--color-primary)",
                padding: "6px 10px",
                cursor: "pointer",
                fontFamily: '"Courier New", monospace',
                fontSize: "14px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                animation: "pulse 2s infinite",
            }}
        >
            {theme === "light" ? (
                <span style={{ color: "var(--color-primary)", fontSize: "35px" }}>☀</span>
            ) : (
                <span style={{ fontSize: "20px" }}>🌙</span>
            )}
        </button>
    );
};
