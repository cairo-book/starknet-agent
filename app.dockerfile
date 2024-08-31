FROM node:alpine

ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /home/starknet-agent

COPY ui /home/starknet-agent/

RUN yarn install
RUN yarn build

CMD ["yarn", "start"]
