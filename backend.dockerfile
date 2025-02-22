FROM public.ecr.aws/docker/library/node:20.11-bullseye-slim

WORKDIR /home/starknet-agent

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY config.toml ./

COPY packages/backend ./packages/backend

RUN mkdir /home/starknet-agent/data

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm --filter @starknet-agent/backend build

CMD ["pnpm", "--filter", "@starknet-agent/backend", "start"]
