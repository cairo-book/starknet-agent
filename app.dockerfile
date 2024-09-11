FROM node:18-alpine

ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /home/starknet-agent
COPY ui ./

RUN yarn install
RUN echo "Node version: $(node -v)"
RUN echo "NPM version: $(npm -v)"
RUN echo "Yarn version: $(yarn -v)"
RUN yarn build
CMD ["yarn", "start"]
