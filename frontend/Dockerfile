FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

EXPOSE 5173

# Vite dev server — binds to 0.0.0.0 so Docker can expose the port
CMD ["npm", "run", "dev"]
