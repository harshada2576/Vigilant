cd Vigilant

cp synapse/homeserver.yaml.example synapse/homeserver.yaml

docker compose up -d

docker compose ps

// verify if working from terminal
curl http://localhost:8008/_matrix/client/versions


read 

### Local Matrix Server

Prerequisites:
- Docker
- Docker Compose

Setup:

1. Create the local Synapse configuration:

   cp synapse/homeserver.yaml.example synapse/homeserver.yaml

2. Start the backend services:

   docker compose up -d

3. Verify Synapse:

   curl http://localhost:8008/_matrix/client/versions

4. Initialize the WASM bridge with:

   MatrixBridge.init("http://localhost:8008")

5. Stop the services with:

   docker compose down

Do not use `docker compose down -v` unless you intentionally want to
delete the local database and persistent Docker volumes.
