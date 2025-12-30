# Stage 1: Build
FROM node:20-slim AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim AS runtime

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy build artifacts from build stage
COPY --from=build /app/dist ./dist

# The index.ts imports files from the root or other places. 
# Looking at the project structure, it seems all .ts files are in the root.
# tsconfig says rootDir is ./ and outDir is ./dist.
# So dist will contain index.js, server-instance.js, etc.

# Expose the port (Cloud Run sets PORT env var, but this is good practice)
EXPOSE 8080

# Run the server
CMD ["node", "dist/index.js"]
