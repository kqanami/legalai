# Use Node.js for building
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Use Nginx to serve the static files
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 5173

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
