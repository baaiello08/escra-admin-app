# Docker Setup Explained

## Current Running State

### MongoDB
- **Running in:** Docker container
- **Container name:** `escra-admin-mongodb`
- **Image:** `mongo:7.0` (official MongoDB image)
- **Port:** `27017` (exposed to host)
- **Status:** ✅ Running and healthy
- **Started via:** `docker-compose up mongodb -d`

### Backend API
- **Currently running in:** Direct Python (NOT in Docker)
- **Process:** `uvicorn app.main:app` running on your Mac
- **Port:** `8000`
- **Status:** ✅ Running
- **Started via:** `uvicorn app.main:app --reload`

## Docker Configuration

### docker-compose.yaml
Defines **two services**:

1. **mongodb** (lines 4-24)
   - Uses official `mongo:7.0` image (no Dockerfile needed)
   - Runs on port 27017
   - Has persistent volumes for data

2. **backend** (lines 26-59)
   - Uses the Dockerfile in `./backend/Dockerfile`
   - Would run on port 8000
   - Currently **NOT running** in Docker (we're using direct Python instead)

### backend/Dockerfile
- **Purpose:** Builds a Docker image for the backend API
- **Multi-stage build:** Optimizes image size
- **Base:** Python 3.11-slim
- **Installs:** All Python dependencies
- **Runs:** `uvicorn app.main:app` with 4 workers

## Why Two Ways to Run?

### Current Setup (Development)
- **MongoDB:** Docker (easy, no setup needed)
- **Backend:** Direct Python (faster iteration, easier debugging)

### Production Setup (Future)
- **MongoDB:** Docker (same)
- **Backend:** Docker (consistent, isolated, scalable)

## How to Switch to Docker for Backend

If you want to run the backend in Docker instead:

```bash
# Stop the current Python process (if running)
# Then:
docker-compose up backend -d
```

Or run both together:
```bash
docker-compose up -d  # Starts both MongoDB and backend
```

## Current Architecture

```
┌─────────────────────────────────────────┐
│  Your Mac                                │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Frontend (Next.js)              │   │
│  │  Port: 3000                     │   │
│  └──────────────────────────────────┘   │
│           │                              │
│           │ HTTP                          │
│           ▼                              │
│  ┌──────────────────────────────────┐   │
│  │  Backend (Python/FastAPI)        │   │
│  │  Port: 8000                      │   │
│  │  Running: Direct Python          │   │
│  └──────────────────────────────────┘   │
│           │                              │
│           │ MongoDB Connection            │
│           ▼                              │
│  ┌──────────────────────────────────┐   │
│  │  MongoDB (Docker Container)      │   │
│  │  Port: 27017                     │   │
│  │  Container: escra-admin-mongodb   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Summary

- **Dockerfile:** For the backend API (Python/FastAPI)
- **MongoDB:** Running in Docker (using official image, no Dockerfile)
- **Backend:** Currently running directly via Python (not in Docker)
- **Both can run in Docker:** Use `docker-compose up -d` to run both
