# Monkey-bot

A small browser client for chatting with an Ollama model.

## Run locally

Create a `.env` file from the included example and add your Ollama API key:

```bash
cp .env.example .env
```

Then start the app:

```bash
node server.js
```

Then open `http://localhost:4173`.

Unlock the console with the requested passcode `717115` and choose a model. The default endpoint is Ollama Cloud's `/api/chat`. To use a local Ollama installation, set `OLLAMA_ENDPOINT=http://localhost:11434/api/chat` in `.env`.

The passcode is a client-side UI gate, not server-side authentication. The API key is loaded by the server from `.env` and is never sent to the browser.