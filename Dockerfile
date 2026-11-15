# ==============================================================================
# Stage 1: Build React Frontend Assets
# ==============================================================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first for optimal Docker layer caching
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source files and compile production bundle
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Unified Python Production Runtime
# ==============================================================================
FROM python:3.11-slim AS runner

# Optimize Python execution environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=10000

WORKDIR /app

# Install minimal OS dependencies for health check & geospatial libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase, database, and runtime datasets
COPY backend/ ./backend/
COPY data/ ./data/

# Copy public static assets for DATA_DIR fallback
COPY frontend/public ./frontend/public

# Copy compiled frontend distribution from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose Render default web port
EXPOSE 10000

# Container health check against backend API status endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/api/data-status || exit 1

# Start the unified backend server
CMD ["python", "backend/server.py"]
