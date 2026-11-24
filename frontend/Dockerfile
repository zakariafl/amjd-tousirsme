# Development only: Docker Compose mounts the local frontend directory.
FROM node:22-alpine
WORKDIR /app/frontend
EXPOSE 5173
CMD ["sh", "-c", "if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi && npm run dev -- --host 0.0.0.0"]
