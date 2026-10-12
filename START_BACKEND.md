# How to Start the Backend

## Quick Start

1. **Make sure MongoDB is running:**
   ```bash
   docker-compose up mongodb -d
   ```

2. **Start the backend (choose one method):**

   **Option A: Using Docker (if Docker is running)**
   ```bash
   docker-compose up backend -d
   ```

   **Option B: Direct Python (recommended for development)**
   ```bash
   cd backend
   source venv/bin/activate  # Activate virtual environment
   
   # Set environment variables (or use .env file)
   export SECRET_KEY=changeme-in-production-use-random-string-here
   export PERSONA_API_KEY=dummy-persona-api-key-for-development
   export PERSONA_WEBHOOK_SECRET=dummy-persona-webhook-secret-for-development
   export MONGODB_URL=mongodb://admin:changeme@localhost:27017/escra_admin?authSource=admin
   export MONGODB_DB_NAME=escra_admin
   
   # Start the server
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Verify backend is running:**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status":"healthy","service":"escra-admin-api"}`

4. **Check backend logs:**
   - If using Docker: `docker-compose logs -f backend`
   - If using Python directly: Check the terminal where uvicorn is running

## Troubleshooting

### Port 8000 already in use
- Change the port: `uvicorn app.main:app --reload --port 8001`
- Update `NEXT_PUBLIC_API_URL` in frontend `.env.local` to match

### MongoDB connection errors
- Make sure MongoDB is running: `docker-compose ps mongodb`
- Check MongoDB URL in `.env` file matches docker-compose settings

### Module not found errors
- Make sure virtual environment is activated: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`
