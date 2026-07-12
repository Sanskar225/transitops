FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate

# Copy source
COPY . .

RUN mkdir -p uploads logs

EXPOSE 4000

# Run migrations then start server. In production prefer running migrations
# as a separate release step (see docker-compose.yml `migrate` service).
CMD ["node", "src/server.js"]
