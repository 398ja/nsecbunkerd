# Build stage - needs the ndk/core directory for local file dependency
FROM node:20.11-bullseye AS build

WORKDIR /app

# Copy pre-built ndk/core for the local file dependency
# ndk/core must already be built locally (has dist/ directory)
# Also copy ndk/node_modules which contains ndk/core's hoisted dependencies (tseep, etc.)
COPY ndk/core /ndk/core
COPY ndk/node_modules /ndk/node_modules

# Remove the prepare script from ndk/core to prevent it from trying to rebuild
RUN sed -i 's/"prepare": "bun run build",//' /ndk/core/package.json

# Copy package files
COPY nsecbunkerd/package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY nsecbunkerd/ .

# Generate prisma client and build the application
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies to reduce image size
RUN npm prune --production

# Runtime stage
FROM node:20.11-alpine AS runtime

WORKDIR /app

RUN apk update && \
    apk add --no-cache openssl curl && \
    rm -rf /var/cache/apk/*

# Copy the ndk/core dependency and its hoisted node_modules
COPY --from=build /ndk/core /ndk/core
COPY --from=build /ndk/node_modules /ndk/node_modules

# Copy built application with production node_modules from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

# Copy scripts directory if it exists
COPY --from=build /app/scripts ./scripts

# Create config directory for runtime configuration
RUN mkdir -p /app/config

EXPOSE 3000

# No HTTP healthcheck - nsecbunkerd doesn't expose a health endpoint
# Docker Swarm will rely on process status

ENTRYPOINT [ "node", "./dist/index.js" ]
CMD ["start"]
