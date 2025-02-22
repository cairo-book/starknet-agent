FROM public.ecr.aws/docker/library/node:20.11-bullseye-slim

WORKDIR /home/starknet-agent

COPY src /home/starknet-agent/src
COPY tsconfig.json /home/starknet-agent/
COPY config.toml /home/starknet-agent/
COPY package.json /home/starknet-agent/
COPY yarn.lock /home/starknet-agent/

RUN mkdir /home/starknet-agent/data

RUN yarn install
RUN yarn build
CMD ["yarn", "start"]
