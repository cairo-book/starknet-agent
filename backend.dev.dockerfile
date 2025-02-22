FROM node:20-bullseye-slim

WORKDIR /home/starknet-agent

# Install Python and build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace and configuration files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY config.toml ./

# Copy backend package
COPY packages/* packages/

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm --filter @starknet-agent/backend build

EXPOSE 3001

CMD ["pnpm", "--filter", "@starknet-agent/backend", "dev"]
