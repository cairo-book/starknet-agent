FROM node:slim

ARG SEARXNG_API_URL

WORKDIR /home/perplexica

# Copy package.json and yarn.lock first to leverage Docker cache
COPY package.json yarn.lock ./


# Copy the rest of the application code
COPY . .

RUN sed -i "s|SEARXNG = \".*\"|SEARXNG = \"${SEARXNG_API_URL}\"|g" /home/perplexica/config.toml

RUN mkdir -p /home/perplexica/data

# Install dependencies including development ones
RUN yarn install
# Use the existing dev command
CMD ["yarn", "run", "dev"]
