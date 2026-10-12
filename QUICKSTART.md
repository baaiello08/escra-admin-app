# Quick Start Guide

## Important: Database Architecture

**This admin portal connects to the Escra app's MongoDB database.** For local development/testing, you can use a separate test database, but in production this should point to the Escra app's actual database. See `ARCHITECTURE.md` for details.

## Prerequisites

- Docker and Docker Compose installed
- Python 3.10+ (for running seed script)
- Node.js 18+ and npm (for frontend)

## Step 1: Start MongoDB

```bash
docker-compose up mongodb -d
```

Wait a few seconds for MongoDB to be ready.

## Step 2: Install Python Dependencies

First, install the required Python packages:

```bash
cd backend
pip install -r requirements.txt
```

Or if you're using a virtual environment (recommended):

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Step 3: Seed Initial Data

This creates the default admin tenant and super admin user:

```bash
cd backend
python -m scripts.seed_data
```

**Default Credentials:**
- Email: `admin@escra.io`
- Password: `admin123`

## Step 4: Start Backend

**Option A: Using Docker Compose (Recommended)**
```bash
docker-compose up backend -d
```

**Option B: Direct Python (for development)**
```bash
cd backend
# Install dependencies if needed
pip install -r requirements.txt

# Set environment variables
export SECRET_KEY=changeme-in-production
export PERSONA_API_KEY=your-persona-key  # Can be dummy for now
export PERSONA_WEBHOOK_SECRET=your-secret  # Can be dummy for now
# Note: For local dev, using escra_admin test database. In production, point to Escra app's database.
export MONGODB_URL=mongodb://admin:changeme@localhost:27017/escra_admin?authSource=admin
export MONGODB_DB_NAME=escra_admin  # Production should use Escra app's database name (likely "escra")

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend is running:
```bash
curl http://localhost:8000/health
```

Should return: `{"status":"healthy","service":"escra-admin-api"}`

## Step 4: Configure Frontend

Create a `.env.local` file in the `frontend` directory:

```bash
cd frontend
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_USE_MOCKS=false
EOF
```

## Step 5: Start Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

## Step 7: Login

1. Open http://localhost:3000/login
2. Use credentials:
   - Email: `admin@escra.io`
   - Password: `admin123`

## Troubleshooting

### "Failed to fetch" or "Cannot connect to backend"

1. **Check if backend is running:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check backend logs:**
   ```bash
   docker-compose logs backend
   # or if running directly:
   # Check the terminal where uvicorn is running
   ```

3. **Verify MongoDB is running:**
   ```bash
   docker-compose ps mongodb
   ```

4. **Check environment variables:**
   - Make sure `NEXT_PUBLIC_API_URL` is set correctly in `.env.local`
   - Make sure `NEXT_PUBLIC_USE_MOCKS=false` if you want to use real backend

### "Invalid email or password"

1. Make sure you installed dependencies and ran the seed script:
   ```bash
   cd backend
   pip install -r requirements.txt  # If not already installed
   python -m scripts.seed_data
   ```

2. Verify the user exists in MongoDB:
   ```bash
   docker-compose exec mongodb mongosh -u admin -p changeme --authenticationDatabase admin escra_admin
   # Then in mongosh:
   db.users.find({email: "admin@escra.io"})
   ```

### CORS Errors

Make sure `CORS_ORIGINS` in backend includes `http://localhost:3000`. Check `docker-compose.yaml` or backend environment variables.

### Port Already in Use

If port 8000 is already in use:
- Change the port in `docker-compose.yaml` or
- Use a different port: `uvicorn app.main:app --reload --port 8001`
- Update `NEXT_PUBLIC_API_URL` accordingly

## Development Workflow

1. **Backend changes:** Restart backend or use `--reload` flag
2. **Frontend changes:** Next.js hot-reloads automatically
3. **Database changes:** Restart MongoDB or run migrations

## Using Mock Data (No Backend Required)

If you want to use the frontend without the backend:

1. Create `frontend/.env.local`:
   ```
   NEXT_PUBLIC_USE_MOCKS=true
   ```

2. Note: Login won't work with mocks, but you can browse the UI with mock data.
