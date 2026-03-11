FROM node:20-alpine AS builder

# Build arguments for Vite environment variables
ARG VITE_SERVER_URL=http://localhost:8597
ARG VITE_AI_SERVER_URL=http://localhost:8000

# Set as environment variables for build
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_AI_SERVER_URL=$VITE_AI_SERVER_URL

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
