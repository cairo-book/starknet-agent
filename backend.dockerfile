FROM node:slim

ARG SEARXNG_API_URL

WORKDIR /home/starknet-agent

COPY src /home/starknet-agent/src
COPY tsconfig.json /home/starknet-agent/
COPY config.toml /home/starknet-agent/
COPY drizzle.config.ts /home/starknet-agent/
COPY package.json /home/starknet-agent/
COPY yarn.lock /home/starknet-agent/

RUN sed -i "s|SEARXNG = \".*\"|SEARXNG = \"${SEARXNG_API_URL}\"|g" /home/starknet-agent/config.toml

RUN mkdir /home/starknet-agent/data

RUN yarn install
RUN yarn build
CMD ["yarn", "start"]
