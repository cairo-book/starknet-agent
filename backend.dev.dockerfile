FROM node:20-bullseye-slim

WORKDIR /home/starknet-agent

# Install Python and build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy source code
COPY . .

# Build TypeScript
RUN yarn build

EXPOSE 3001

CMD ["yarn", "run", "dev"]
