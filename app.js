const SITE_PASSWORD = "717115";
const unlockForm = document.querySelector("#unlock-form");
const lockScreen = document.querySelector("#lock-screen");
const chatScreen = document.querySelector("#chat-screen");
const passwordInput = document.querySelector("#site-password");
const unlockError = document.querySelector("#unlock-error");
const status = document.querySelector("#connection-status");
const messages = document.querySelector("#messages");
const chatForm = document.querySelector("#chat-form");
const promptInput = document.querySelector("#prompt");
const sendButton = document.querySelector("#send-button");
const modelInput = document.querySelector("#model");
let conversation = [];

function unlock() {
  lockScreen.classList.add("is-hidden");
  chatScreen.classList.remove("is-hidden");
  status.textContent = "READY";
  modelInput.value = sessionStorage.getItem("monkey-bot-model") || "llama3.2";
  promptInput.focus();
}

unlockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (passwordInput.value === SITE_PASSWORD) {
    unlock();
  } else {
    unlockError.textContent = "That passcode does not match.";
    passwordInput.select();
  }
});

document.querySelector("#lock-button").addEventListener("click", () => {
  chatScreen.classList.add("is-hidden");
  lockScreen.classList.remove("is-hidden");
  status.textContent = "LOCKED";
  passwordInput.value = "";
  passwordInput.focus();
});

document.querySelector("#new-chat").addEventListener("click", () => {
  conversation = [];
  messages.innerHTML = `<div class="welcome-message"><span class="welcome-glyph">✳</span><h2>What are we thinking about?</h2><p>Ask anything. Your first message will start the conversation.</p></div>`;
  document.querySelector("#session-id").textContent = String(Date.now()).slice(-4);
  promptInput.focus();
});

function addMessage(role, content) {
  const item = document.createElement("article");
  item.className = `message ${role}`;
  item.innerHTML = `<div class="message-role">${role === "user" ? "YOU" : "OLLAMA"}</div><div class="message-body"></div>`;
  item.querySelector(".message-body").textContent = content;
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
  return item.querySelector(".message-body");
}

function saveSettings() {
  sessionStorage.setItem("monkey-bot-model", modelInput.value.trim());
  document.querySelector("#model-label").textContent = modelInput.value.trim().toUpperCase();
}

async function streamReply(bodyElement) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelInput.value.trim(), messages: conversation, stream: true }),
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}. Check the endpoint, model, and API key.`);
  if (!response.body) throw new Error("This browser does not support streamed responses.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = pending.split("\n");
    pending = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line);
      const token = chunk.message?.content || chunk.response || "";
      bodyElement.textContent += token;
      messages.scrollTop = messages.scrollHeight;
    }
    if (done) break;
  }
  return bodyElement.textContent;
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt || sendButton.disabled) return;
  saveSettings();
  document.querySelector(".welcome-message")?.remove();
  promptInput.value = "";
  promptInput.style.height = "auto";
  conversation.push({ role: "user", content: prompt });
  addMessage("user", prompt);
  const responseBody = addMessage("assistant", "");
  sendButton.disabled = true;
  status.textContent = "THINKING";
  try {
    const reply = await streamReply(responseBody);
    conversation.push({ role: "assistant", content: reply });
  } catch (error) {
    responseBody.textContent = error.message;
    responseBody.style.color = "var(--orange)";
    conversation.pop();
  } finally {
    sendButton.disabled = false;
    status.textContent = "READY";
    promptInput.focus();
  }
});

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); chatForm.requestSubmit(); }
});
promptInput.addEventListener("input", () => { promptInput.style.height = "auto"; promptInput.style.height = `${Math.min(promptInput.scrollHeight, 150)}px`; });