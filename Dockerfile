# Stage 1: build the Vite app
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Build the application
COPY . .
RUN npm run build

# Stage 2: serve the built app with nginx
FROM nginx:1.27-alpine

# Copy build output to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose default nginx port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
