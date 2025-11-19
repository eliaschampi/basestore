FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache bash postgresql-client git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install tsx globally for database migrations
RUN npm install -g tsx

# Copy project files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
