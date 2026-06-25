# Claude Office Visualizer

Game-style visualizer for Claude Code AI agent activity. Watch your Claude Code sessions come alive as pixel-art characters working in a virtual office.

## Features

- Real-time visualization of Claude Code sessions via WebSocket
- Pixel art office with animated agent characters
- Live file tracking, tool usage stats, and task progress
- Sub-agent spawning and team hierarchy display
- Command bar to send messages to active sessions
- Demo mode when no server is connected

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Open http://localhost:3456 in your browser.

The server watches `~/.claude/projects/` for active `.jsonl` session files and streams events to the browser in real time.

## Testing

```bash
npm test
```

## Project Structure

- `app.js` - Client-side application logic (canvas rendering, WebSocket client, UI)
- `server.js` - HTTP/WebSocket server, file watcher, event parser
- `session-tracker.js` - Session state tracking and JSONL event processing
- `logger.js` - Structured logger with level filtering
- `style.css` - Retro pixel art game UI theme
- `index.html` - Main HTML page
- `app.test.js` - Jest test suite
