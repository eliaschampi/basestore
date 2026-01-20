FROM node:20-alpine

WORKDIR /app

# Install system dependencies and pnpm
RUN apk add --no-cache bash postgresql-client git && \
    corepack enable && \
    corepack prepare pnpm@9.15.4 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* .npmrc ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy project files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]
