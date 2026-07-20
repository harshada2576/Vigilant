Vigilant/         
│
├── docker-compose.yml     <-- Your Task 1 Infra (Synapse, Postgres, MinIO)
├── synapse/               
│
└── matrix-sdk-bridge/           <-- Your Rust WASM Backend Library (Tasks 2-8)
    ├── Cargo.toml         
    └── src/
        ├── lib.rs         <-- Where you export functions to JS
        ├── auth.rs        <-- Task 3 (Register, Login, Logout)
        ├── messaging.rs   <-- Task 4 & 6 (Send/Receive, DMs, History)
        ├── rooms.rs       <-- Task 5 (Create, Join, Leave)
        └── storage.rs     <-- Task 7 (MinIO/File uploads)
