FROM node:14-alpine

RUN apk add --no-cache --virtual .gyp python make g++

WORKDIR /mgfx/analyzer-kit

COPY package.json .

RUN yarn install --prod

COPY dist .

ENTRYPOINT ["/usr/local/bin/node", "index.js"]