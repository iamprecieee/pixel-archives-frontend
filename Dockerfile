FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for node-gyp and usb native module
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    linux-headers \
    eudev-dev \
    libusb-dev

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build args for Vite env vars
ARG VITE_SOLANA_PROGRAM_ID
ARG VITE_SOLANA_NETWORK=devnet
ARG VITE_API_TARGET
ARG VITE_WS_TARGET

# Build
RUN npm run build


# ---- Production stage ----
FROM node:22-alpine

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy only the built dist
COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
