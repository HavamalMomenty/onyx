# Onyx Installation Plan: Azure VM for Iterative Development

## 1. Overview

This guide details how to set up an Onyx development environment on an Azure Ubuntu Virtual Machine (VM). The primary goal is to enable **iterative code changes** to the Onyx application itself (backend, frontend, model server) with quick redeployment cycles.

To achieve this:
*   **Onyx Application Code**: Will be run directly on the Ubuntu VM from the cloned repository. This allows for direct code editing and fast server restarts to see changes.
*   **External Dependencies (PostgreSQL, Vespa, Redis)**: Will be managed using Docker Compose. These services are prerequisites for Onyx but their internal code is not typically modified during Onyx feature development. Using Docker for them simplifies their setup, configuration, and management significantly.

This approach combines the flexibility of direct code execution for the components you'll be actively developing, with the stability and ease of use of Docker for complex external services.

**Assumptions**:
*   You have an Azure account and can create/manage Ubuntu VMs.
*   `git` is pre-installed on your local machine or the VM (if cloning directly on the VM).
*   You have already cloned the Onyx repository to your development environment (e.g., your Azure VM).
    ```bash
    # If not already cloned:
    # git clone https://github.com/onyx-dot-app/onyx.git
    # cd onyx
    ```
*   You are working from the root directory of the cloned Onyx repository.

## 2. Azure VM Setup (Ubuntu)

1.  **Create an Azure Ubuntu VM**:
    *   Go to the [Azure Portal](https://portal.azure.com/).
    *   Create a new Virtual Machine.
    *   **Recommended VM Specs** (for small-mid sized development/testing, adjust as needed):
        *   **OS**: Ubuntu Server (e.g., 22.04 LTS or newer).
        *   **Size**: At least 16GB RAM, 4-8 vCPUs (e.g., D4s_v3 series or similar).
        *   **Disk**: At least 100GB of SSD storage (500GB recommended if handling large datasets with Vespa).
    *   **Networking**: Ensure your VM's network security group allows inbound traffic on necessary ports:
        *   SSH (typically port 22) for access.
        *   HTTP (port 80) and HTTPS (port 443) if you plan to expose Onyx publicly later (not strictly needed for basic local dev access).
        *   Ports for Onyx services if accessing them directly from your local machine (e.g., 3000 for web, 8080 for API).

2.  **Connect to your VM**: Use SSH to connect to your newly created Azure VM.

## 3. Install System-Level Dependencies on the VM

Once connected to your Ubuntu VM via SSH:

1.  **Update Package Lists and Upgrade System**:
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

2.  **Install Docker and Docker Compose** (for managing PostgreSQL, Vespa, Redis):
    *   Install Docker Engine:
        ```bash
        sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt update
        sudo apt install docker-ce docker-ce-cli containerd.io -y
        sudo usermod -aG docker ${USER} # Add current user to docker group
        ```
        **(Important: Log out and log back in, or run `newgrp docker` in your current shell session, for the group change to take effect.)**
    *   Install Docker Compose (V2 recommended):
        ```bash
        sudo apt install docker-compose-v2 -y
        ```
        Verify with `docker compose version`.

3.  **Install Python 3.11** (for Onyx backend):
    ```bash
    sudo apt install software-properties-common -y # Ensures add-apt-repository is available
    sudo add-apt-repository ppa:deadsnakes/ppa -y
    sudo apt update
    sudo apt install python3.11 python3.11-venv python3.11-dev build-essential -y
    ```
    Verify: `python3.11 --version`.

4.  **Install Node.js and npm** (for Onyx frontend, using NVM):
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
    Close and reopen your terminal, or source NVM scripts in your current session:
    ```bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    ```
    Install the latest LTS version of Node.js:
    ```bash
    nvm install --lts
    nvm use --lts
    nvm alias default 'lts/*' # Optional: set LTS as default for new shells
    ```
    Verify: `node -v` and `npm -v`.

## 4. Setup External Dependencies using Docker Compose

These services (PostgreSQL, Vespa, Redis) are prerequisites for Onyx. We will run them using Docker Compose from the Onyx repository.

1.  Navigate to the Docker Compose directory within your cloned Onyx repository on the VM:
    ```bash
    cd deployment/docker_compose 
    # If your repo is not named 'onyx', adjust the path accordingly.

    # Check that redis and postgress is not running (occupying ports)
    sudo lsof -i :5432
    sudo lsof -i :6379
    
    # If they are running, stop them:
    sudo systemctl stop postgresql
    sudo systemctl stop redis-server
    ```
2.  Start the dependency containers (Postgres as `relational_db`, Vespa as `index`, Redis as `cache`):
    ```bash
    sudo docker compose -f docker-compose.dev.yml -p onyx-stack up -d index relational_db cache
    ```
    *   This uses the development-focused Docker Compose file.
    *   The containers will run in the background (`-d`).
3.  Verify the containers are running:
    ```bash
    sudo docker ps
    ```
    You should see containers for `onyx-stack-index-1`, `onyx-stack-relational_db-1`, and `onyx-stack-cache-1`.
4.  Navigate back to the root of the Onyx repository:
    ```bash
    cd ../.. 
    ```

## 5. Setup Onyx Application Components (Direct Execution)

(Ensure you are in the root directory of the Onyx repository on your VM)

### 5.1. Backend Setup (Python)

1.  **Create and Activate Python Virtual Environment**:
    It's good practice to create this outside the main project directory if you encounter issues with IDEs/MyPy, or inside if preferred.
    ```bash
    # Example: creating it one level up from project root
    python3.11 -m venv ../onyx_dev_venv 
    source ../onyx_dev_venv/bin/activate
    
    # Or, inside the project as .venv:
    # python3.11 -m venv .venv
    # source .venv/bin/activate
    ```

2.  **Install Python Dependencies** (ensure virtual environment is active):
    ```bash
    pip install -r backend/requirements/default.txt
    pip install -r backend/requirements/dev.txt
    pip install -r backend/requirements/ee.txt  # For enterprise features if developing them
    pip install -r backend/requirements/model_server.txt
    ```

3.  **Install Playwright for Python** (for Web Connector):
    ```bash
    playwright install
    ```
    If `playwright` command isn't found, deactivate and reactivate your virtual environment.

### 5.2. Frontend Setup (Node.js)

1.  Navigate to the `web` directory:
    ```bash
    cd web
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```
3.  Navigate back to the root of the Onyx repository:
    ```bash
    cd ..
    ```

## 6. Running Onyx Application (Directly on VM)

Ensure your Python virtual environment is active (e.g., `source ../onyx_dev_venv/bin/activate`).
Ensure the Docker containers for Postgres, Vespa, and Redis are running (from Step 4).

Open separate terminal sessions on your VM for each server component.

1.  **Start the Model Server**:
    *   Terminal 1: Navigate to `onyx/backend` (with venv active).
    ```bash
    uvicorn model_server.main:app --reload --port 9000
    ```

2.  **Start the API Server**:
    *   Terminal 2: Navigate to `onyx/backend` (with venv active).
    *   Do the database migration
    *   Had to run this twice, with first time FAILING. Particularly because of REDIS docker container. 
    *   Set necessary environment variables (as per `CONTRIBUTING.md` for development):

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

3.  **Start the Frontend Development Server**:
    *   Terminal 3: Navigate to `onyx/web`.
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000` on your VM. It will connect to the API server at port 8080.

**Accessing Onyx**: 
Setup via tunnel: Run this in LOCAL (local PC) terminal, NOT on VM. 
```bash
ssh -L 13000:localhost:3000 -L 18080:localhost:8080 -L 19000:localhost:9000 HavamalMomenty
```
If you are running a desktop environment on your Azure VM, you can open a browser to `http://localhost:3000`. If you are headless, you might need to set up SSH port forwarding or an SSH tunnel to access `localhost:3000` on your VM from your local machine's browser.
Example SSH local port forwarding (run on your local machine, not the VM):
`ssh -L 3000:localhost:3000 -L 8080:localhost:8080 -L 9000:localhost:9000 your_username@your_azure_vm_ip`
Then open `http://localhost:3000` in your local browser.

## 7. Iterative Development

*   **Backend/Model Server**: When you save changes to Python files in `onyx/backend` or `onyx/model_server`, `uvicorn` with `--reload` should automatically restart the respective server.
*   **Frontend**: When you save changes to files in `onyx/web`, the `npm run dev` process (Vite) should automatically update the application in your browser (Hot Module Replacement) or reload the page.

This setup allows for rapid iteration on the Onyx application code.

## 8. Formatting and Linting (For Contributors)

If you plan to contribute code, adhere to project standards:

*   **Backend (from `onyx/backend`, venv active)**:
    ```bash
    pip install pre-commit # If not already installed
    pre-commit install
    python -m mypy .
    ```
*   **Frontend (from `onyx/web`)**:
    ```bash
    npx prettier --write .
    ```

## 9. Troubleshooting Common Issues

*   **Docker Permissions**: Ensure your user is in the `docker` group. Log out/in after adding.
*   **Port Conflicts**: If services fail to start, check if ports (3000, 8080, 9000, 5432, 6379, 8081 for Vespa's app port) are already in use on the VM.
*   **Virtual Environment**: Always activate the Python venv before running backend commands.
*   **Logs**: Check terminal output for Onyx servers and Docker logs (`docker logs <container_name>`) for dependencies.

## 10. Further Help

*   **Official Documentation**: [docs.onyx.app](https://docs.onyx.app/)
*   **GitHub Issues**: [Onyx GitHub Issues](https://github.com/onyx-dot-app/onyx/issues)
*   **Community**: Slack, Discord (links in project `README.md`).
