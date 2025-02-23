FROM public.ecr.aws/docker/library/node:20.11-bullseye-slim

WORKDIR /app

# Copy root workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY turbo.json ./

# Copy backend package
COPY packages/backend ./packages/backend
COPY packages/agents ./packages/agents

# Copy shared TypeScript config
COPY packages/typescript-config ./packages/typescript-config

RUN mkdir /app/data

RUN npm install -g pnpm@9.10.0
RUN pnpm install --frozen-lockfile

# Build the backend package using Turbo
RUN pnpm turbo run build --filter=@starknet-agent/backend

WORKDIR /app/packages/backend
CMD ["pnpm", "start"]
