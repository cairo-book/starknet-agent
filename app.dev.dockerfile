FROM node:alpine

ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_HOSTED_MODE
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_HOSTED_MODE=${NEXT_PUBLIC_HOSTED_MODE}

WORKDIR /home/starknet-agent

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY packages/ui ./packages/ui

RUN npm install -g pnpm
RUN pnpm install

CMD ["pnpm", "--filter", "@starknet-agent/ui", "dev", "--hostname", "0.0.0.0"]
