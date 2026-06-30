# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json .oxlintrc.json ./
COPY public ./public
COPY src ./src
COPY deployments ./deployments

ARG VITE_CHAIN_ID=84532
ARG VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ARG VITE_APP_URL=http://localhost:8080
ARG VITE_B3OS_OPERATOR_ADDRESS=0xaaf620ee9e2a805323BF7363992E33e4412be3FB

ENV VITE_CHAIN_ID=$VITE_CHAIN_ID
ENV VITE_BASE_SEPOLIA_RPC_URL=$VITE_BASE_SEPOLIA_RPC_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_B3OS_OPERATOR_ADDRESS=$VITE_B3OS_OPERATOR_ADDRESS

RUN npx vite build && cp dist/index.html dist/ipfs-404.html

FROM nginx:alpine AS web

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
