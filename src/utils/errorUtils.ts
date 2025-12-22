/**
 * Parse Solana/Anchor errors into user-friendly messages.
 */

// Common Anchor error codes
const ANCHOR_ERRORS: Record<number, string> = {
    100: "Instruction data is invalid.",
    101: "Instruction processed too many accounts.",
    102: "Account discriminator mismatch.",
    103: "Incorrect program ID.",
    1000: "Require equal check failed.",
    2000: "Require greater than check failed.",
    2500: "Account constraint was violated.",
    2501: "An address constraint was violated.",
    2006: "Incorrect authority provided.",
    3000: "Account is not initialized.",
    3001: "Account is already initialized.",
    3012: "Account is not initialized.",
};

// Custom program error codes (0xbc4 = 3012)
const PROGRAM_ERRORS: Record<number, string> = {
    3012: "Canvas account not found on-chain. Please try creating a new canvas.",
    3001: "This canvas already exists on-chain.",
    6000: "Insufficient funds for this transaction.",
    6001: "Unauthorized - you don't have permission for this action.",
    6002: "Invalid canvas state for this operation.",
    6003: "Pixel coordinates out of bounds.",
    6004: "Bid amount too low.",
};

/**
 * Parse a Solana error message into a user-friendly string.
 */
export function parseSolanaError(error: unknown): string {
    const errorStr = error instanceof Error ? error.message : String(error);

    // Check for user rejection
    if (
        errorStr.includes("User rejected") ||
        errorStr.includes("rejected the request")
    ) {
        return "Transaction was cancelled.";
    }

    // Check for wallet not connected
    if (
        errorStr.includes("Wallet not connected") ||
        errorStr.includes("not connected")
    ) {
        return "Please connect your wallet first.";
    }

    // Check for insufficient funds
    if (
        errorStr.includes("insufficient funds") ||
        errorStr.includes("Insufficient")
    ) {
        return "Insufficient SOL balance. Please add funds to your wallet.";
    }

    // Parse Anchor/custom program errors from logs
    const customMatch = errorStr.match(/Error Code: (\w+)\. Error Number: (\d+)/);
    if (customMatch) {
        const errorCode = parseInt(customMatch[2], 10);
        const friendlyMsg =
            PROGRAM_ERRORS[errorCode] || ANCHOR_ERRORS[errorCode] || null;
        if (friendlyMsg) {
            return friendlyMsg;
        }
    }

    // Parse InstructionError format: {"InstructionError":[0,{"Custom":3012}]}
    const instructionMatch = errorStr.match(/"Custom":(\d+)/);
    if (instructionMatch) {
        const errorCode = parseInt(instructionMatch[1], 10);
        const friendlyMsg =
            PROGRAM_ERRORS[errorCode] || ANCHOR_ERRORS[errorCode] || null;
        if (friendlyMsg) {
            return friendlyMsg;
        }
        return `Transaction failed (error code: ${errorCode}). Please try again.`;
    }

    // Parse simulation failure
    if (
        errorStr.includes("Transaction simulation failed") ||
        errorStr.includes("Simulation failed")
    ) {
        // Check for specific issues in the message
        if (errorStr.includes("AccountNotInitialized")) {
            return "Canvas account not found on-chain. The canvas may need to be initialized first.";
        }
        if (errorStr.includes("already initialized")) {
            return "This canvas already exists on-chain.";
        }
        return "Transaction simulation failed. Please check your wallet balance and try again.";
    }

    // Parse blockhash errors
    if (errorStr.includes("blockhash") || errorStr.includes("Blockhash")) {
        return "Transaction expired. Please try again.";
    }

    // Timeout errors
    if (errorStr.includes("timeout") || errorStr.includes("Timeout")) {
        return "Request timed out. Please check your connection and try again.";
    }

    // Network errors
    if (errorStr.includes("Network") || errorStr.includes("fetch")) {
        return "Network error. Please check your connection and try again.";
    }

    // If we have a very long technical error, shorten it
    if (errorStr.length > 100 && errorStr.includes("{")) {
        return "Transaction failed. Please try again or contact support if the issue persists.";
    }

    // Return the original message if it's already short/readable
    if (errorStr.length < 80) {
        return errorStr;
    }

    // Fallback
    return "Transaction failed. Please try again.";
}

/**
 * Log full error details for debugging, return friendly message.
 */
export function handleSolanaError(
    error: unknown,
    context: string,
): { friendlyMessage: string; shouldLog: boolean } {
    const friendlyMessage = parseSolanaError(error);

    // Log full error for debugging (but not to console.error to avoid scary red messages)
    console.log(`[${context}] Full error:`, error);

    return {
        friendlyMessage,
        shouldLog: true,
    };
}
