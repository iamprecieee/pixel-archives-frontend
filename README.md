# Frontend - Pixel Canvas Web Application

React-based single-page application.

## Purpose

The frontend provides:

- Canvas creation and collaboration interface
- Real-time pixel painting
- Solana wallet integration
- NFT minting interface

## Technology Stack

- Framework: React 19
- Build Tool: Vite 7
- Language: TypeScript 5.9
- State: Zustand 5
- Styling: Vanilla CSS
- Blockchain: Solana Wallet Adapter, @solana/web3.js 1.98
- Utilities: bs58, js-sha256

## Directory Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── auth/         # LoginForm, RegisterForm, WalletButton
│   │   ├── canvas/       # CanvasView
│   │   ├── common/       # RetroButton
│   │   ├── dashboard/    # Dashboard, CanvasCard, CreateCanvasModal, JoinCanvasModal
│   │   └── layout/       # RetroLayout
│   ├── contexts/         # WalletContextProvider
│   ├── services/         # API clients
│   │   ├── rpc.ts        # JSON-RPC client
│   │   ├── solana.ts     # Solana transaction builders
│   │   └── websocket.ts  # WebSocket service with reconnection
│   ├── store/            # Zustand stores
│   │   ├── authStore.ts  # Authentication state
│   │   └── canvasStore.ts # Canvas state
│   ├── styles/           # CSS files
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   │   └── safeError.ts  # Error sanitization for production safety
│   ├── App.tsx
│   └── main.tsx
├── docs/                 # Documentation
├── index.html
├── package.json
└── vite.config.ts
```

## Installation

### Prerequisites

- Node.js 18+

### Setup

```bash
npm install
cp .env.example .env
```

Configure `.env`:

```env
VITE_SOLANA_PROGRAM_ID=your-program-id
VITE_SOLANA_NETWORK=devnet
VITE_API_TARGET=http://127.0.0.1:8080
VITE_WS_TARGET=ws://127.0.0.1:8080
```

Run:

```bash
npm run dev
```

Application runs on `http://localhost:5173`

## Environment Variables

See `.env.example` for all variables.

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm run preview
```

### Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

Or build image directly:

```bash
docker build \
  --build-arg VITE_SOLANA_PROGRAM_ID=your-program-id \
  --build-arg VITE_SOLANA_NETWORK=devnet \
  --build-arg VITE_API_TARGET=http://your-backend:8080 \
  --build-arg VITE_WS_TARGET=ws://your-backend:8080 \
  -t pixel-frontend .

docker run -p 5173:5173 pixel-frontend
```

## Features

### Wallet Integration

Uses Solana Wallet Adapter for wallet connection and transaction signing.

### State Management

Zustand stores:

- `authStore` - Authentication state (user, isAuthenticated, setAuth, clearAuth)
- `canvasStore` - Canvas state (fetchCanvases, createCanvas, joinCanvas, publish flow)

### Real-time Updates

WebSocket service (`src/services/websocket.ts`) features:

- Authentication via HTTP cookies (automatically included with connection)
- Auto-reconnect on disconnect (2 second delay)
- Heartbeat ping/pong (20 second interval)
- Event-based handler registration
- `useWebSocket` hook for React integration

### Component Structure

Components are organized by feature:

- `auth/` - Authentication forms (LoginForm, RegisterForm, WalletButton)
- `canvas/` - Canvas rendering and controls (CanvasView)
- `dashboard/` - Canvas list and modals (Dashboard, CanvasCard, CreateCanvasModal, JoinCanvasModal)
- `layout/` - Navigation and footer (RetroLayout)
- `common/` - Shared components (RetroButton)

## Common Tasks

### Adding Component

1. Create in `src/components/{category}/{Name}.tsx`
2. Import in parent component
3. Add styles to `src/styles/` if needed

### Adding API Method

1. Add to `src/services/rpc.ts`
2. Define TypeScript types
3. Use in components

## Troubleshooting

### Wallet Not Connecting

Check wallet extension is installed and network matches backend.

### WebSocket Disconnects

Verify backend is running and CORS allows frontend origin.

### Transaction Failures

Ensure sufficient SOL in wallet, program deployed to correct network, and discriminators match.

## Build Configuration

See `vite.config.ts` for build settings.
