# Claude Office Visualizer - AI Assistant Guide

## Project Overview

This is a game-style visualizer for Claude Code AI agent activity. It displays Claude Code sessions as pixel-art characters working in a virtual office environment.

The project has been refactored into modular components to improve maintainability and testability.

## Project Structure

- **app.js** - Main entry point, initializes state, simulation, and WebSockets.
- **agent-manager.js** - Handles agent creation, lookup, and UI card generation.
- **renderer.js** - Pixel art rendering engine for the canvas.
- **event-handler.js** - Processes WebSocket messages from the server.
- **session-tracker.js** - (Server-side) Tracks Claude session states and parse JSONL logs.
- **ui.js** - Manages DOM updates, toasts, and logging UI.
- **constants.js** - Game constants, visual templates, and static data.
- **server.js** - Node.js backend for serving files and relaying WebSocket events.
- **logger.js** - Structured logging utility.
- **index.html** - Main application UI.
- **style.css** - Retro pixel art styles.

## Build and Test Commands

### Running Locally

```bash
npm install
npm start
```

The application will be available at `http://localhost:3456`.

### Running Tests

```bash
npm test
```

The project uses Jest for unit testing. Tests cover both client-side logic (via VM mocking) and server-side utilities.

## Development Standards

- **Module Pattern**: Keep modules under 800 lines.
- **Naming**: Use camelCase for variables and PascalCase for constants (where appropriate).
- **CSS**: Use CSS Custom Properties defined in `:root`.
- **Testing**: Add unit tests for all new logic. Use `vm` mocks for DOM-dependent code in tests.
- **No Console Logs**: Use the provided `logger.js` for structured logging.
- **No Commented Code**: Remove any disabled logic before committing.
