FROM node:18-alpine

ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /home/starknet-agent

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY packages/ui ./packages/ui

RUN npm install -g pnpm
RUN pnpm install
RUN echo "Node version: $(node -v)"
RUN echo "npm version: $(npm -v)"
RUN echo "pnpm version: $(pnpm -v)"
RUN pnpm --filter @starknet-agent/ui build
CMD ["pnpm", "--filter", "@starknet-agent/ui", "start"]
