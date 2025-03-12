# Use the official Node.js image as the base image
FROM node:20 AS builder 

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN npm run build

# Use a lightweight Node.js runtime for the final image
FROM node:20-alpine AS runner

# Set the working directory
WORKDIR /usr/src/app

# Copy only the necessary files from the builder stage
COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 3001

# Command to run the application
CMD ["npm", "run", "start:prod"]