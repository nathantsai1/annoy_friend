FROM node:18-alpine AS deps
WORKDIR /src

COPY package.json package-lock.json ./
RUN npm

# Final stage: run the production server
FROM node:18-alpine AS runner
WORKDIR /src

COPY . .

EXPOSE 8081
CMD ["npm", "start"]