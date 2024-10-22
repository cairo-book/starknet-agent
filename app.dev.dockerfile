FROM node:alpine

ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_HOSTED_MODE
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_HOSTED_MODE=${NEXT_PUBLIC_HOSTED_MODE}

WORKDIR /home/starknet-agent

COPY ui/package.json ui/yarn.lock ./

RUN yarn install

COPY ui ./

CMD ["yarn", "dev", "--hostname", "0.0.0.0"]
