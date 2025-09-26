// app.js - CipherLink web client

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

async function apiFetch(path, {method="GET", qs=null, body=null, headers={}} = {}){
  let url = API_URL + path;
  if(qs){
    const qp = new URLSearchParams(qs);
    url += "?" + qp.toString();
  }
  const opts = { method, headers: { ...headers } };
  if(token) opts.headers["token"] = token;
  if(body) opts.body = JSON.stringify(body);

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
  // Fix for [object Object] error: clear status immediately
  loginStatus.innerText = "";
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if(!username || !password){ 
    loginStatus.innerText = "Please enter both username and password."; 
    return; 
  }
  loginBtn.disabled = true;

  try{
    const url = `${API_URL}/login`; 
    
    // CORRECTED: Send credentials in a JSON body
    const res = await fetch(url, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
          username: username,
          password: password
      })
    });
    
    if(!res.ok){
      const err = await res.json();
      loginStatus.innerText = err.detail || err.message || "Login failed.";
      loginBtn.disabled = false;
      return;
    }
    const data = await res.json();
    if(data.token){
      token = data.token;
      localStorage.setItem("cipher_token", token);
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
    loginStatus.innerText = "Network or server error.";
    loginBtn.disabled = false;
  }
}

async function doRegister(){
  loginStatus.innerText = "";
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if(!username || !password){ 
    loginStatus.innerText = "Please enter both username and password."; 
    return; 
  }
  registerBtn.disabled = true;
  try{
    const url = `${API_URL}/register`;
    
    // CORRECTED: Send registration data in a JSON body
    const res = await fetch(url, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username,
            password: password,
            display_name: username // Placeholder
        })
    });
    
    const data = await res.json();
    if(!res.ok){
        loginStatus.innerText = data.detail || data.message || "Registration failed.";
        return;
    }
    loginStatus.innerText = data.message || "Registered successfully. Now login.";
  }catch(err){
    console.error("register err", err);
    loginStatus.innerText = "Register error.";
  }finally{
    registerBtn.disabled = false;
  }
}

async function tryAutoLogin(){
  if(!token) return;
  try{
    await apiFetch("/me");
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

// Loading sequence (mimics loading_widget.py)
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
    const me = await apiFetch("/me");
    if(me && me.user_id){
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
  Array.from(chatList.children).forEach(n=>n.classList.remove("active"));
  if(listItemEl) listItemEl.classList.add("active");

  currentConversationId = id;
  chatHeader.innerText = `Chat: ${name || id}`;
  await loadMessages(id);

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
    // Simple logic to determine 'me' vs 'other'
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

function escapeHtml(unsafe=""){
  return unsafe
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

async function sendMessage(){
  const content = messageInput.value.trim();
  if(!content || !currentConversationId) return;
  sendBtn.disabled = true;
  try{
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

// --- New chat modal (mimics newchatdialog.py) ---
function openNewChatModal(){
  newchatStatus.innerText = "";
  chatNameEl.value = "";
  participantsEl.value = "";
  isGroupEl.checked = true;
  modal.classList.remove("hidden");
}
cancelNew.addEventListener("click", ()=> modal.classList.add("hidden"));

isGroupEl.addEventListener('change', (e) => {
    const isGroup = e.target.checked;
    // Show/hide chat name input based on group chat status
    const chatNameRow = chatNameEl.closest('.form-row');
    if (chatNameRow) {
        chatNameRow.style.display = isGroup ? '' : 'none';
    }
});
// Initial call to set visibility
isGroupEl.dispatchEvent(new Event('change'));


confirmNew.addEventListener("click", async ()=>{
  confirmNew.disabled = true;
  newchatStatus.innerText = "";
  const is_group = isGroupEl.checked;
  const conversation_name = is_group ? (chatNameEl.value || null) : null;
  const participants = participantsEl.value.split(",").map(s=>s.trim()).filter(Boolean);
  
  if(!participants.length){
    newchatStatus.innerText = "Enter at least one username.";
    confirmNew.disabled = false;
    return;
  }
  
  try{
    const url = `${API_URL}/create_conversation`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "token": token },
      body: JSON.stringify({ user_names: participants, conversation_name, is_group })
    });
    const data = await res.json();
    if(res.ok){
      newchatStatus.innerText = "Created. Refreshing...";
      await populateChatList();
      modal.classList.add("hidden");
    } else {
      newchatStatus.innerText = data.detail || data.message || "Could not create conversation.";
    }
  }catch(err){
    console.error("create_conversation error", err);
    newchatStatus.innerText = "Error creating conversation.";
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
loginStatus.innerText = ""; 

showPage(token ? "loading" : "login");
if(token){
  tryAutoLogin();
}