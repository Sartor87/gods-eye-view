# Runs the whole app (static build + API provider middleware) as one Node
# process via `vite preview` — see server/standalone/vite.config.js for why
# there's no separate Express server. devDependencies (vite, vite-plugin-cesium)
# are required at RUNTIME, not just build time, so they are not pruned.
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start"]
