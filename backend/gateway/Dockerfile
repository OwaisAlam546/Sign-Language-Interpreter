# ── SignSpeak AI · gateway (Express API) ─────────────────────
# Production image: deps only, no devtools, non-root.
FROM node:20-alpine

WORKDIR /app

# Install prod deps first (layer caching) — devDeps like
# mongodb-memory-server are NOT needed in production.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 5000

# Seed runs once on first boot (gestures dictionary + first admin).
# `npm run seed` is idempotent (upserts), so a restart is harmless.
CMD ["sh", "-c", "npm run seed && npm start"]