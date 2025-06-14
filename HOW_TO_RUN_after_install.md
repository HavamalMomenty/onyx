# How to Run Onyx After Installation

Follow these steps **exactly** (copied from `INSTALLATION_PLAN.md`) to start all required services and run the application from a fresh terminal session.

---

## 1. Start External Dependencies (Docker Compose)

Open **Terminal A** and run the database/index/cache containers.

```bash
# From any directory – change into the repo’s docker-compose folder
cd ~/onyx/deployment/docker_compose

# (Optional) Verify required ports are free; stop host services if they are running
sudo lsof -i :5432     # PostgreSQL
sudo lsof -i :6379     # Redis
sudo systemctl stop postgresql || true
sudo systemctl stop redis-server || true

# Launch Postgres, Vespa, and Redis containers in detached mode
sudo docker compose -f docker-compose.dev.yml -p onyx-stack up -d index relational_db cache

# (OPTIONAL) Confirm the three containers are running
sudo docker ps

# Return to repository root for the next steps
cd ../..
```

> You should see `onyx-stack-index-1`, `onyx-stack-relational_db-1`, and `onyx-stack-cache-1` listed.

---

## 2. Run the Application Servers (3 terminals)

You will need **three additional terminals** (B, C, D). Ensure your Python virtual environment is active in each (`source onyx_dev_venv_2/bin/activate`).

### Terminal B – Model Server
```bash
cd ~/onyx/backend
uvicorn model_server.main:app --reload --port 9000
```

### Terminal C – API Server
```bash
cd ~/onyx/backend
# Run DB migrations (may need to run twice if Redis not yet ready)

    ```bash
    alembic upgrade head
    ```

    ```bash
    AUTH_TYPE=disabled \
    DISABLE_AUTH_ON_UPSERT=true \
    FASTAPI_WORKERS=1 \
    PYTHONASYNCIODEBUG=1 \
    DEBUG_API_ENDPOINTS=true \
    ENABLE_PAID_ENTERPRISE_EDITION_FEATURES=false \
    uvicorn onyx.main:app --reload --port 8080
    ```
    The API server will listen on `http://localhost:8080` on your VM.

### Terminal D – Frontend Dev Server
```bash
cd ~/onyx/web
npm run dev
```
The frontend will be served at `http://localhost:3000` and will proxy to the API on port 8080.

---

## 3. (Optional) Access from Your Local Machine
If running headless in the VM, create an SSH tunnel from your local computer:

```bash
ssh -L 3000:localhost:3000 -L 8080:localhost:8080 -L 9000:localhost:9000 <vm_user>@<vm_ip>
```

Example:
```bash
ssh -L 3000:localhost:3000 -L 8080:localhost:8080 -L 9000:localhost:9000 adrian_user@20.13.128.14
```
Then open `http://localhost:3000` in your local browser.

---

## 4. Hot-Reload & Iteration
* Backend / Model Server – saving Python files triggers automatic reload (`--reload`).
* Frontend – saving files in `onyx/web` triggers Vite HMR (`npm run dev`).

You are now ready to develop and test Onyx 