# @seucra/matrix-sdk-bridge

> Rust → WebAssembly bindings for Matrix SDK.

## Overview

`@seucra/matrix-sdk-bridge` provides a JavaScript-friendly interface around the Rust Matrix SDK using WebAssembly.

It is originally developed as the backend bridge for Vigilant but is also maintained as an independent library to encourage reuse across Matrix-based web applications.

---

## Why?

Instead of interacting directly with Matrix SDK from JavaScript, this library exposes a higher-level API through WebAssembly, allowing frontend applications to leverage Rust while keeping browser integration straightforward.

---

## Features as of yet ~

- Authentication
- Session Management
- Rooms
- Direct Messages
- Timeline
- History
- Notifications

---

## Installation

`
npm install @seucra/matrix-sdk-bridge
`

---

## Status

Current Status

- Functional

- Used by Vigilant

- API evolving

- Documentation in progress

---

## Used by

- Vigilant

> Unauthorized use is not appreciated. please formally request first.

---

## Repository Structure

src/
pkg/
examples/ (future?)
docs/ (future?)

---

## Roadmap

- Stabilize API
- Improve documentation
- Publish examples
- Expand Matrix coverage

---

## License

yet to decide.

...
