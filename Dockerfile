FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# Build the client
FROM base AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
ARG VITE_CORE_API_BASE
ENV VITE_CORE_API_BASE=$VITE_CORE_API_BASE
RUN npm run build

# Build the server
FROM base AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma
RUN npm install
COPY server/ ./
RUN npx prisma generate
RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy server dist and modules
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/package*.json ./server/
COPY --from=server-builder /app/server/prisma ./server/prisma

# Copy client dist (served by Express)
COPY --from=client-builder /app/client/dist ./client/dist

# Set working directory to server where package.json is located
WORKDIR /app/server
EXPOSE 3000
CMD ["npm", "run", "start"]
