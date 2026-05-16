const API_KEY = "fw_5WoV4ado7paYZtJtbBsCB9";
const TEXT_MODEL = "accounts/fireworks/models/kimi-k2p5";
const IMAGE_MODEL = "accounts/fireworks/models/flux-dev";

let mode = "text";
let chatHistory = [];

function setMode(m) {
  mode = m;
  document.getElementById("tab-text").classList.toggle("active", m === "text");
  document
    .getElementById("tab-image")
    .classList.toggle("active", m === "image");
  document.getElementById("mode-hint").textContent =
    m === "text"
      ? "Mode: Text chat — ask me anything"
      : "Mode: Image generation — describe an image";
  document.getElementById("user-input").placeholder =
    m === "text"
      ? "Type a message..."
      : "Describe an image (e.g. a cat on the moon)...";
}

function addMsg(role, content, type = "text") {
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user" : "ai");

  if (role === "ai") {
    const label = document.createElement("div");
    label.className = "msg-label";
    label.textContent = "AI";
    div.appendChild(label);
  }

  if (type === "image") {
    const img = document.createElement("img");
    img.src = content;
    img.alt = "Generated image";
    img.style.maxWidth = "100%";
    img.style.borderRadius = "8px";
    img.style.marginTop = "8px";
    img.style.display = "block";
    div.appendChild(img);
  } else {
    const span = document.createElement("span");
    span.textContent = content;
    div.appendChild(span);
  }

  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addTyping() {
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg ai";
  div.id = "typing-indicator";
  div.innerHTML = `
    <div class="msg-label">AI</div>
    <div class="typing">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById("typing-indicator");
  if (t) t.remove();
}

function addToHistory(text, type) {
  const list = document.getElementById("history-list");
  const item = document.createElement("div");
  item.className = "history-item";
  item.title = text;
  item.innerHTML = `
    <div class="hi-type">${type === "image" ? "Image" : "Chat"}</div>
    ${text.slice(0, 28)}${text.length > 28 ? "..." : ""}`;
  list.insertBefore(item, list.firstChild);
}

async function generateImage(prompt) {
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg ai";
  div.innerHTML =
    '<div class="msg-label">AI</div><span style="color:#888;font-size:13px;">Generating image...</span>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;

  const img = new Image();

  img.onload = function () {
    div.innerHTML = '<div class="msg-label">AI</div>';
    img.style.maxWidth = "100%";
    img.style.borderRadius = "8px";
    img.style.marginTop = "8px";
    img.style.display = "block";
    div.appendChild(img);
    msgs.scrollTop = msgs.scrollHeight;
    addToHistory(prompt, "image");
  };

  img.onerror = function () {
    div.innerHTML =
      '<div class="msg-label">AI</div><span>Failed to generate image.</span>';
  };

  img.src = `/generate-image?prompt=${encodeURIComponent(prompt)}`;
}

async function handleSend() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  input.style.height = "auto";
  document.getElementById("send-btn").disabled = true;

  addMsg("user", text);
  addToHistory(text, mode);
  addTyping();

  try {
    if (mode === "text") {
      chatHistory.push({ role: "user", content: text });

      const res = await fetch(
        "https://api.fireworks.ai/inference/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + API_KEY,
          },
          body: JSON.stringify({
            model: TEXT_MODEL,
            messages: chatHistory,
            max_tokens: 512,
          }),
        },
      );

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "No response.";
      chatHistory.push({ role: "assistant", content: reply });
      removeTyping();
      addMsg("ai", reply);
    } else {
      // بنبعت للـ AI عشان يفهم إيه الـ image من سياق المحادثة
      const contextMessages = [
        ...chatHistory,
        {
          role: "user",
          content: `The user wants to generate an image related to: "${text}". Based on the conversation history, reply with ONLY 3-5 words describing what to draw. No explanation. No sentences. Examples: "cat wearing red hat", "sunset over ocean". Reply with the image description only.`,
        },
      ];

      const res = await fetch(
        "https://api.fireworks.ai/inference/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + API_KEY,
          },
          body: JSON.stringify({
            model: TEXT_MODEL,
            messages: contextMessages,
            max_tokens: 100,
          }),
        },
      );

      const data = await res.json();
      const imagePrompt = data.choices?.[0]?.message?.content || text;

      console.log("Image prompt:", imagePrompt);

      removeTyping();
      await generateImage(imagePrompt);
    }
  } catch (e) {
    removeTyping();
    addMsg("ai", "Error: " + e.message);
  }

  document.getElementById("send-btn").disabled = false;
}

document.getElementById("user-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 100) + "px";
});
