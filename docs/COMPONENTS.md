# Component Architecture

## Overview

Component organization in React frontend.

## Pages

### Home

Landing page with wallet connection and authentication forms.

### Dashboard

Canvas list (owned and collaborating). Create/join canvas modals.

### CanvasView

Canvas rendering, pixel painting, bidding, minting, and WebSocket connection.

## Component Categories

### auth/

Authentication and wallet connection components.

- **LoginForm.tsx** - Username/password login form with wallet verification
- **RegisterForm.tsx** - User registration with wallet address binding
- **WalletButton.tsx** - Solana wallet connect/disconnect button

### canvas/

Canvas grid, color palette, pixel controls.

- **CanvasView.tsx** - Main canvas component with pixel grid, color palette, bidding, minting, and real-time updates via WebSocket

### dashboard/

Canvas cards, filters, and modals.

- **Dashboard.tsx** - Lists owned and collaborating canvases
- **CanvasCard.tsx** - Canvas preview card with status and actions
- **CreateCanvasModal.tsx** - Modal for creating new canvas with name and initial color
- **JoinCanvasModal.tsx** - Modal for joining canvas via invite code

### layout/

Navbar, Footer.

- **RetroLayout.tsx** - Main layout wrapper with retro styling
- **RetroLayout.module.css** - Layout-specific CSS module

### common/

Reusable components (Button, Modal, etc).

- **RetroButton.tsx** - Styled button component with primary/secondary variants
- **RetroButton.module.css** - Button-specific CSS module

## State Flow

```
User Action → Handler → Store Update → API/WebSocket → Store Update → Re-render
```

## Utilities

### utils/safeError.ts

Error handling utilities for production safety:

- **`getSafeErrorMessage(error, fallback)`** - Sanitizes error messages for user display. Passes through safe backend messages (like "Bid too low") while hiding internal errors.
- **`devLog`** - Development-only console logging (`devLog.error`, `devLog.warn`, `devLog.log`). Silent in production builds.

## Patterns

- Hooks: `useState`, `useEffect`, Zustand hooks, `useWebSocket`
- Props: TypeScript interfaces
- Styling: CSS modules and vanilla CSS
- Error handling: `devLog` for dev-only logging, `getSafeErrorMessage` for user toasts
