# Use an official Node runtime as the parent image
FROM node:18-alpine as build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with legacy peer deps flag and ignore scripts
RUN npm ci --legacy-peer-deps --ignore-scripts

# Copy the rest of the application code
COPY . .

# Build the app
RUN npm run build

# Use Nginx to serve the app
FROM nginx:alpine

# Copy the build output to replace the default nginx contents.
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]