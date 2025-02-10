# Stage 1: Build Stage
FROM node:22-alpine as build

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the entire project
COPY . .

# Build the TypeScript files
RUN npm run build

# Stage 2: Production Stage
FROM node:22-alpine

# Set the working directory
WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the built files from the build stage
COPY --from=build /usr/src/app/dist ./dist

# Expose the port the app runs on
EXPOSE 5000

# Command to run the app
CMD ["node", "dist/server.js"]
