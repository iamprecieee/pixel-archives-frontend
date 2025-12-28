/**
 * Sanitize error messages for user display.
 * Prevents leaking sensitive internal details like transaction logs, program IDs, etc.
 */

// Safe error messages that can be shown directly to users
// These match the user-facing messages from backend's to_user_error()
const SAFE_ERROR_PATTERNS = [
    // Wallet/Transaction
    "User rejected",
    "rejected the request",
    "Wallet does not support",
    "Transaction rejected",
    "Transaction failed",
    "Network error",

    // Auth
    "Please login",
    "session has expired",
    "signature verification failed",
    "Please register first",

    // Canvas
    "canvas owner",
    "Canvas not found",
    "already been published",
    "must join this canvas",
    "choose a different name",
    "already exists",

    // Pixel/Bidding
    "Bid too low",
    "Minimum is",
    "Please wait",
    "currently being edited",
    "Cooldown",

    // Rate limiting
    "Too many requests",
    "slow down",

    // Generic safe patterns
    "not found",
    "Invalid",
    "Unauthorized",
    "expired",
    "required",
    "must be",
    "cannot",
];

// Map internal error patterns to user-friendly messages
const ERROR_MAPPINGS: Record<string, string> = {
    "Transaction failed on-chain": "Transaction failed. Please try again.",
    "On-chain error": "Transaction failed on-chain. Please try again.",
    "Simulation failed": "Transaction simulation failed. Please try again.",
    "insufficient funds": "Insufficient SOL balance.",
    "blockhash not found": "Network congestion. Please try again.",
    "0x1": "Transaction failed. Please try again.",
};

/**
 * Get a safe, user-friendly error message.
 */
export const getSafeErrorMessage = (error: unknown, fallback = "An error occurred. Please try again."): string => {
    const message = error instanceof Error ? error.message : String(error);

    // Check if the message is already safe to show
    if (SAFE_ERROR_PATTERNS.some(pattern => message.includes(pattern))) {
        // Still sanitize - remove any logs or technical details after newline
        return message.split("\n")[0];
    }

    // Check for mapped error patterns
    for (const [pattern, safeMessage] of Object.entries(ERROR_MAPPINGS)) {
        if (message.toLowerCase().includes(pattern.toLowerCase())) {
            return safeMessage;
        }
    }

    // Default: return fallback to avoid leaking details
    return fallback;
};

/**
 * Development-only console logging.
 * Only logs in development mode to prevent leaking info in production.
 */
export const devLog = {
    error: (...args: unknown[]) => {
        if (import.meta.env.DEV) {
            console.error(...args);
        }
    },
    warn: (...args: unknown[]) => {
        if (import.meta.env.DEV) {
            console.warn(...args);
        }
    },
    log: (...args: unknown[]) => {
        if (import.meta.env.DEV) {
            console.log(...args);
        }
    },
};
