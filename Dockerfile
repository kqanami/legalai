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

# Use a lightweight server for serving the build
FROM node:20-slim

WORKDIR /app

# Install 'serve' package
RUN npm install -g serve

# Copy build from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Command to serve the build
CMD ["serve", "-s", "dist", "-l", "5173"]
