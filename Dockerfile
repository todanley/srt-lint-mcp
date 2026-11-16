# Stdio MCP server image (Glama and local `docker run -i`).
# Glama's admin Dockerfile form can also generate its own image; use
# build steps `npm ci`, `npm run build`, `npm prune --omit=dev` and
# CMD arguments `["node", "dist/index.js"]` if the form does not use this file.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY src ./src

RUN npm ci && npm run build && npm prune --omit=dev

USER node
ENTRYPOINT ["node", "dist/index.js"]
