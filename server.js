const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");

const root = __dirname;
const port = Number(process.env.PORT || 4173);

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}

loadEnv();

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleChat(request, response) {
  if (!process.env.OLLAMA_API_KEY) {
    sendJson(response, 500, { error: "OLLAMA_API_KEY is missing from .env" });
    return;
  }
  let payload;
  try {
    payload = JSON.parse(await readBody(request));
  } catch {
    sendJson(response, 400, { error: "Request body must be valid JSON" });
    return;
  }
  const endpoint = process.env.OLLAMA_ENDPOINT || "https://ollama.com/api/chat";
  try {
    const ollamaResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` },
      body: JSON.stringify({
        model: payload.model || process.env.OLLAMA_MODEL || "llama3.2",
        messages: Array.isArray(payload.messages) ? payload.messages : [],
        stream: true,
      }),
    });
    response.writeHead(ollamaResponse.status, {
      "Content-Type": ollamaResponse.headers.get("content-type") || "application/x-ndjson",
      "Cache-Control": "no-cache",
    });
    if (ollamaResponse.body) Readable.fromWeb(ollamaResponse.body).pipe(response);
    else response.end();
  } catch (error) {
    sendJson(response, 502, { error: `Could not reach Ollama: ${error.message}` });
  }
}

function serveStatic(request, response) {
  const requestedPath = request.url === "/" ? "/index.html" : request.url;
  const filePath = path.resolve(root, `.${requestedPath.split("?")[0]}`);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
  response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
}

http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/chat") {
    handleChat(request, response);
  } else if (request.method === "GET") {
    serveStatic(request, response);
  } else {
    sendJson(response, 405, { error: "Method not allowed" });
  }
}).listen(port, () => {
  console.log(`Monkey-bot running at http://localhost:${port}`);
});