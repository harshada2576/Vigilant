# Vigilant

> An experimental secure messaging platform built around the Matrix ecosystem using Rust, WebAssembly, and modern web technologies.

Vigilant is an ongoing engineering project exploring how secure messaging systems can be built on top of the Matrix protocol without reinventing the underlying communication stack. Rather than implementing a custom messaging protocol, Vigilant focuses on understanding, extending, and integrating established infrastructure while building a modular, maintainable application.

The project serves both as a long-term learning initiative and as a foundation for future experimentation in backend systems, secure application design, distributed messaging, and systems programming.

---

# Why Vigilant?

This project began with a simple ambition: build a secure messaging application, similar in spirit to platforms like WhatsApp or Telegram.

Early iterations attempted to solve too many problems independently. As the project evolved, it became clear that modern messaging platforms involve significantly more than message exchange—covering synchronization, federation, encryption, reliability, storage, and identity.

Vigilant therefore shifted toward the Matrix ecosystem, allowing development to focus on application architecture and engineering rather than reimplementing an entire messaging protocol.

---

# Current Status

| Component                     | Status                        |
| ----------------------------- | ----------------------------- |
| Backend                       | Backend Cycle 1 Complete      |
| Frontend                      | Active Development            |
| Matrix SDK Bridge             | Functional                    |
| Rust → WebAssembly Bridge     | Published as an npm package   |
| Matrix Synapse Infrastructure | Operational                   |
| Documentation                 | In Progress                   |

This project remains under active development and should currently be considered an engineering prototype rather than a production-ready application.

---

# Architecture Overview

```text
┌─────────────────────┐
│     Frontend        │
│   Next.js + React   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ matrix-sdk-bridge   │
│    Rust → WASM      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Matrix SDK       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Matrix Synapse     │
└──────┬────────┬─────┘
       │        │
       ▼        ▼
 PostgreSQL   MinIO
```

---

# Repository Structure

```text
Vigilant/
├── frontend/              # Next.js application?
├── matrix-sdk-bridge/     # Rust WebAssembly bridge
├── synapse/               # Synapse configuration
├── docker-compose.yml     # Development infrastructure
├── docs/                  # Project documentation (coming soon?)
└── README.md
```

---

# Technology Stack

| Area           | Technologies                             |
| -------------- | ---------------------------------------- |
| Frontend       | Next.js, React, TypeScript, Tailwind CSS |
| Backend        | Rust, WebAssembly, Matrix SDK            |
| Messaging      | Matrix Synapse                           |
| Database       | PostgreSQL                               |
| Object Storage | MinIO                                    |
| Infrastructure | Docker, Docker Compose                   |

---

# Team

This project is being developed collaboratively.

**Frontend**

* User interface
* User experience
* Client-side application
* Integration with backend services

**Backend**

* Rust WebAssembly bridge
* Matrix SDK integration
* Backend architecture
* Infrastructure

---

# Design Principles

* Build on established open standards instead of reinventing protocols.
* Keep components modular and loosely coupled.
* Prioritize understanding over unnecessary complexity.
* Learn through implementation and iteration.
* Document architectural decisions as the project evolves.

---

# Roadmap

### Current

* Improve frontend stability and user experience.
* Continue backend refinement.
* Expand project documentation.

### Next

* Complete integration testing.
* Improve deployment workflow.
* Expand application features.

### Future

* Continue exploring secure messaging concepts.
* Improve developer experience.
* Evaluate long-term deployment and scalability options.

---

# Documentation

Detailed documentation will gradually move into the `docs/` directory.

Planned documentation includes:

```text
docs/
├── architecture.md
├── backend.md
├── frontend.md
├── api.md
├── deployment.md
├── decisions.md
├── roadmap.md
└── contributing.md
```

---

# Contributing

The project is currently under active development and is not yet ready for external contributions.

Once the architecture stabilizes, contribution guidelines and development documentation will be published.

---

# License

A project license will be added once the project reaches a stable public milestone.

