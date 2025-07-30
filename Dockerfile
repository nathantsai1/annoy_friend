FROM node:18-alpine AS deps
WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

# Optional: attempt to fix vulnerabilities
# RUN npm audit fix || true  # Don't fail build if fixes aren't available

# # Build the app
# FROM node:18-alpine AS builder
# WORKDIR /src

# COPY --from=deps /app/node_modules ./node_modules
# COPY . .

# RUN npm run start

# Final stage: run the production server
FROM node:18-alpine AS runner
WORKDIR /src

COPY . .

EXPOSE 35295
CMD ["npm", "start"]