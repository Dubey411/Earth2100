# 🌍 Earth 2100

An interactive 3-D Earth intelligence platform that visualises real-world climate signals, regional hotspots, and planetary scenarios.

This repository is organized as a monorepo containing both the frontend client and the backend server.

## 📂 Project Structure

```
Earth 2100/
├── client/          # Frontend React + Vite application
│   ├── src/         # React components, GLSL shaders, hooks, state
│   ├── geojson/     # Geographic map datasets
│   └── README.md    # Detailed frontend documentation and setup
│
└── server/          # Backend REST API
    └── .gitkeep     # Placeholder for backend codebase
```

## 🚀 Getting Started

### Client (Frontend)

To run the client application:

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install      # or: bun install
   ```
3. Run the development server:
   ```bash
   npm run dev      # starts on http://localhost:5173
   ```

Refer to [client/README.md](file:///d:/Chakra/Code/Earth%202100/client/README.md) for full details on the client features, shaders, and UI controls.

### Server (Backend)

The server directory is ready for the backend REST API implementation.
