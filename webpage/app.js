// app.js - CipherLink web client (works with your FastAPI endpoints)
// Assumes backend at http://localhost:8000 ; change API_URL if different.

const API_URL = "http://localhost:8000";
let token = localStorage.getItem("cipher_token") || null;
let currentConversationId = null;
let pollIntervalHandle = null;

// UI refs
const pages = {
  login: document.getElementById("login-page"),
  loading: document.getElementById("loading-page"),
  chat: document.getElementById("chat-page"),
};

const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const loginStatus = document.getElementById("login-status");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const loadingLabel = document.getElementById("loading-label");
const loadingProgress = document.getElementById("loading-progress");

const userDisplay = document.getElementById("user-display");
const chatList = document.getElementById("chat-list");
const chatHeader = document.getElementById("chat-header");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const logoutBtn = document.getElementById("logout-btn");

const modal = document.getElementById("newchat-modal");
const confirmNew = document.getElementById("confirm-newchat");
const cancelNew = document.getElementById("cancel-newchat");
const isGroupEl = document.getElementById("is-group");
const chatNameEl = document.getElementById("chat-name");
const participantsEl = document.getElementById("participants");
const newchatStatus = document.getElementById("newchat-status");

// --- Helpers ---
function showPage(name){
  Object.values(pages).forEach(p => p.classList.add("hidden"));
  pages[name].classList.remove("hidden");
  pages[name].classList.add("active");
}

function setLoading(stepText, pct){
  loadingLabel.innerText = stepText || loadingLabel.innerText;
  loadingProgress.value = pct || loadingProgress.value;
}

// small wrapper to call backend with token header
async function apiFetch(path, {method="GET", body=null, qs=null, headers={}} = {}){
  let url = API_URL + path;
  if(qs){
    const qp = new URLSearchParams(qs);
    url += "?" + qp.toString();
  }
  const opts = { method, headers: { ...headers } };
  if(token) opts.headers["token"] = token;
  if(body){
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const contentType = res.headers.get("content-type") || "";
  let data = null;
  if(contentType.includes("application/json")){
    data = await res.json();
  } else {
    data = await res.text();
  }
  if(!res.ok){
    throw { status: res.status, data };
  }
  return data;
}

// --- Auth ---
loginBtn.addEventListener("click", doLogin);
registerBtn.addEventListener("click", doRegister);
passwordInput.addEventListener("keypress", (e)=>{ if(e.key==="Enter") doLogin(); });
usernameInput.addEventListener("keypress", (e)=>{ if(e.key==="Enter") doLogin(); });

async function doLogin(){
  loginStatus.innerText = "";
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if(!username || !password){ loginStatus.innerText = "Please enter both username and password."; return; }
  loginBtn.disabled = true;

  try{
    const res = await fetch(API_URL + "/login", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ username, password })
    });
    if(!res.ok){
      const err = await res.json();
      loginStatus.innerText = err.detail || err.message || "Login failed.";
      loginBtn.disabled = false;
      return;
    }
    const data = await res.json();
    if(data.success && data.token){
      token = data.token;
      localStorage.setItem("cipher_token", token);
      // show loading and then open main UI
      showLoadingSequence(async () => {
        await loadProfileAndConversations();
        showPage("chat");
      });
    } else {
      loginStatus.innerText = data.message || "Login failed.";
      loginBtn.disabled = false;
    }
  }catch(err){
    console.error("Login error", err);
    loginStatus.innerText = (err.data && err.data.detail) || "Network or server error.";
    loginBtn.disabled = false;
  }
}

async function doRegister(){
  loginStatus.innerText = "";
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if(!username || !password){ loginStatus.innerText = "Please enter both username and password."; return; }
  registerBtn.disabled = true;
  try{
    const res = await apiFetch("/register", {
      method: "POST",
      body: { username, password, display_name: username }
    });
    loginStatus.innerText = res.message || "Registered successfully. Now login.";
  }catch(err){
    console.error("register err", err);
    loginStatus.innerText = (err.data && err.data.detail) || (err.data && err.data.message) || "Register error.";
  }finally{
    registerBtn.disabled = false;
  }
}

// validate token on load
async function tryAutoLogin(){
  if(!token) return;
  try{
    // call /me to confirm token valid
    await apiFetch("/me");
    // token valid => load UI
    showLoadingSequence(async ()=> {
      await loadProfileAndConversations();
      showPage("chat");
    });
  }catch(err){
    console.warn("auto-login invalid", err);
    localStorage.removeItem("cipher_token");
    token = null;
    showPage("login");
  }
}

// Loading simulation similar to your LoadingWidget
function showLoadingSequence(callback){
  showPage("loading");
  const steps = [
    ["Connecting to server...", 15],
    ["Loading user data...", 45],
    ["Preparing interface...", 75],
    ["Finalizing setup...", 95],
    ["Done!", 100]
  ];
  let idx = 0;
  setLoading(steps[idx][0], steps[idx][1]);
  const t = setInterval(()=>{
    idx++;
    if(idx >= steps.length){
      clearInterval(t);
      setTimeout(()=>{ callback(); }, 250);
      return;
    }
    setLoading(steps[idx][0], steps[idx][1]);
  }, 300);
}

// --- Conversations & Messages ---
newChatBtn.addEventListener("click", ()=>{ openNewChatModal(); });
logoutBtn.addEventListener("click", doLogout);
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("input", ()=>{ sendBtn.disabled = !messageInput.value.trim(); });

async function loadProfileAndConversations(){
  try{
    // Fetch minimal user info by /me
    const me = await apiFetch("/me");
    if(me && me.success){
      userDisplay.innerText = `User: ${me.user_id}`;
    }

    await populateChatList();
  }catch(err){
    console.error("load profile error", err);
  }
}

async function populateChatList(){
  try{
    const convs = await apiFetch("/get_conversation");
    chatList.innerHTML = "";
    convs.forEach(c=>{
      const li = document.createElement("li");
      li.innerText = c.name || `Conversation ${c.id}`;
      li.dataset.convId = c.id;
      li.addEventListener("click", ()=>{ selectConversation(c.id, c.name, li); });
      chatList.appendChild(li);
    });
  }catch(err){
    console.error("get_conversation error", err);
  }
}

async function selectConversation(id, name, listItemEl){
  // highlight
  Array.from(chatList.children).forEach(n=>n.classList.remove("active"));
  if(listItemEl) listItemEl.classList.add("active");

  currentConversationId = id;
  chatHeader.innerText = `Chat: ${name || id}`;
  await loadMessages(id);

  // start polling for new messages in selected conversation
  if(pollIntervalHandle) clearInterval(pollIntervalHandle);
  pollIntervalHandle = setInterval(async ()=> {
    await loadMessages(currentConversationId, true);
  }, 3000);
}

async function loadMessages(conversationId, silent=false){
  if(!conversationId) return;
  try{
    const res = await apiFetch("/get_messages", { qs: { conversation_id: conversationId, limit: 100 } });
    const messages = res.messages || [];
    renderMessages(messages);
    if(!silent){
      // scroll to bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }catch(err){
    console.error("get_messages error", err);
  }
}

function renderMessages(messages){
  chatMessages.innerHTML = "";
  messages.forEach(m=>{
    const div = document.createElement("div");
    div.classList.add("message");
    // Determine "me" vs other: sender_id compared to /me user id
    // We called /me earlier and stored user_id as me.user_id in userDisplay, fallback unknown
    const meText = userDisplay.innerText.replace("User: ","");
    const meId = parseInt(meText) || null;
    const senderId = m.sender_id;
    if(senderId === meId){
      div.classList.add("me");
      div.innerHTML = `<div><strong>You</strong></div><div>${escapeHtml(m.content)}</div><div class="meta">${m.timestamp || ''}</div>`;
    } else {
      div.classList.add("other");
      div.innerHTML = `<div><strong>User ${senderId}</strong></div><div>${escapeHtml(m.content)}</div><div class="meta">${m.timestamp || ''}</div>`;
    }
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(unsafe){
  return unsafe
       .replaceAll("&","&amp;")
       .replaceAll("<","&lt;")
       .replaceAll(">","&gt;");
}

async function sendMessage(){
  const content = messageInput.value.trim();
  if(!content || !currentConversationId) return;
  sendBtn.disabled = true;
  try{
    // send via POST with query params as backend expects conversation_id and content as query params
    const qs = new URLSearchParams({ conversation_id: currentConversationId, content }).toString();
    const url = `${API_URL}/send_message?${qs}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "token": token }
    });
    if(!res.ok){
      const err = await res.json();
      console.error("send error", err);
    } else {
      messageInput.value = "";
      await loadMessages(currentConversationId);
    }
  }catch(err){
    console.error("sendMessage error", err);
  }finally{
    sendBtn.disabled = false;
  }
}

// --- New chat modal ---
function openNewChatModal(){
  newchatStatus.innerText = "";
  chatNameEl.value = "";
  participantsEl.value = "";
  isGroupEl.checked = true;
  modal.classList.remove("hidden");
}
cancelNew.addEventListener("click", ()=> modal.classList.add("hidden"));

confirmNew.addEventListener("click", async ()=>{
  confirmNew.disabled = true;
  newchatStatus.innerText = "";
  const is_group = isGroupEl.checked;
  const conversation_name = chatNameEl.value || null;
  const participants = participantsEl.value.split(",").map(s=>s.trim()).filter(Boolean);
  if(!participants.length){
    newchatStatus.innerText = "Enter at least one username.";
    confirmNew.disabled = false;
    return;
  }
  try{
    const res = await apiFetch("/create_conversation", {
      method: "POST",
      body: { user_names: participants, conversation_name, is_group }
    });
    if(res.success){
      newchatStatus.innerText = "Created. Refreshing...";
      await populateChatList();
      modal.classList.add("hidden");
    } else {
      newchatStatus.innerText = res.message || "Could not create conversation.";
    }
  }catch(err){
    console.error("create_conversation error", err);
    newchatStatus.innerText = (err.data && err.data.detail) || "Error creating conversation.";
  }finally{
    confirmNew.disabled = false;
  }
});

// --- Logout ---
async function doLogout(){
  try{
    await apiFetch("/logout", { method: "POST" });
  }catch(err){ console.warn("logout issue", err); }
  localStorage.removeItem("cipher_token");
  token = null;
  if(pollIntervalHandle) clearInterval(pollIntervalHandle);
  showPage("login");
}

// --- Boot ---
showPage(token ? "loading" : "login");
if(token){
  tryAutoLogin();
}
