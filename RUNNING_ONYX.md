# Running the Onyx Development Environment (from within VM's /home/adrian_user/onyx directory)

This guide assumes you are already connected to your Azure VM via SSH and are in the `/home/adrian_user/onyx` directory. It outlines the steps to run the Onyx backend API server, model server, and frontend development server, especially after a VM restart.

## Prerequisites

1.  **Onyx Installation Complete**: You have followed `INSTALLATION_PLAN.md` and successfully set up the Onyx codebase, Python virtual environment (`onyx_dev_venv`), and Node.js dependencies on your Azure VM.
2.  **You are in the `~/onyx` directory on the VM.**

## Step 1: Ensure External Dependencies (Docker) are Running

After a VM restart, your Docker containers for PostgreSQL, Vespa, and Redis will likely be stopped. Start them first.

Open a terminal on your VM (if you don't have one ready for this):

```bash
# You should be in ~/onyx already. If not: cd ~/onyx
cd deployment/docker_compose
sudo docker compose -f docker-compose.dev.yml up -d
cd ../.. # Return to ~/onyx
#check docker containers are running
sudo docker ps -a
```

## Step 2: Start the Application Servers

You will need three separate terminal sessions on your Azure VM (all starting from `~/onyx`) to run each server process independently.

### Terminal 1: Backend API Server (Port 8080)


1.  Activate the Python virtual environment:
    ```bash
    source ../onyx_dev_venv/bin/activate
    ```
2.  Navigate to the backend directory:
    ```bash
    # Assuming you are in ~/onyx
    cd backend
    ```
3.  Start the Uvicorn server for the backend API with necessary environment variables:
    ```bash
    AUTH_TYPE=disabled \
    DISABLE_AUTH_ON_UPSERT=true \
    FASTAPI_WORKERS=1 \
    PYTHONASYNCIODEBUG=1 \
    DEBUG_API_ENDPOINTS=true \
    ENABLE_PAID_ENTERPRISE_EDITION_FEATURES=false \
    uvicorn onyx.main:app --reload --host 0.0.0.0 --port 8080
    ```
    *   **Note**: For a cleaner setup, consider moving these environment variables into a `.env` file in the `~/onyx/backend/` directory. The application should then pick them up automatically.
    *Keep this terminal open. You'll see logs from the API server here.*

### Terminal 2: Model Server (Port 9000)


1.  Activate the Python virtual environment:
    ```bash
    source ../onyx_dev_venv/bin/activate
    ```

2.  Navigate to the backend directory (if not already there from a previous step in this new terminal):
    ```bash
    # Assuming you are in ~/onyx
    cd backend
    ```

3.  Start the Uvicorn server for the model server:
    ```bash
    uvicorn model_server.main:app --reload --host 0.0.0.0 --port 9000
    ```
    *Keep this terminal open. You'll see logs from the model server here.*

### Terminal 3: Frontend Development Server (Port 3000)

1.  Navigate to the web (frontend) directory:
    ```bash
    # Assuming you are in ~/onyx
    cd web
    ```
2.  Start the Next.js development server:
    ```bash
    npm run dev -- -H 0.0.0.0
    ```
    *   The `-- -H 0.0.0.0` ensures the server is accessible from outside the VM's localhost, which is necessary for SSH tunneling.
    *Keep this terminal open. You'll see logs from the frontend server here.*

## Step 3: Access the Frontend from Your Local PC Browser

To access the Onyx frontend running on your VM from your local PC's browser, you need to set up SSH local port forwarding.

1.  **Open a terminal on your LOCAL PC** (e.g., Command Prompt or PowerShell on Windows, or Terminal on macOS/Linux).
    *Do NOT run this command on the VM itself.*

2.  Run the following SSH command to create the tunnels (replace `HavamalMomenty` with `your_username@your_vm_ip` if you don't have that SSH alias configured):
    ```bash
    ssh -L 13000:localhost:3000 -L 18080:localhost:8080 -L 19000:localhost:9000 HavamalMomenty
    ```
    *   This command forwards:
        *   Your local PC's port `13000` to the VM's port `3000` (Frontend)
        *   Your local PC's port `18080` to the VM's port `8080` (Backend API)
        *   Your local PC's port `19000` to the VM's port `9000` (Model Server)

3.  Enter your SSH password for the VM when prompted.
    *Keep this local terminal window open. Closing it will terminate the SSH tunnels.*

4.  **Open your web browser on your LOCAL PC** and navigate to:
    ```
    http://localhost:13000
    ```
    You should now see the Onyx application frontend.

## Stopping the Servers

To stop the servers:

1.  Go to each of the three terminals on your VM where the servers are running and press `Ctrl+C`.
2.  Close the local terminal window where you ran the `ssh -L ...` command to stop the port forwarding.
3.  If you want to stop the Docker dependencies:
    ```bash
    # On your VM, from ~/onyx directory
    cd deployment/docker_compose
    sudo docker compose -f docker-compose.dev.yml down
    ```

This guide should provide a clear path to running your Onyx development environment from your current state on the VM.
