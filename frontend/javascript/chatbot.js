const CHATBOT_API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api'
  : 'https://koda-meubles.onrender.com/api';

const chatbotHTML = `
  <style>
    .chatbot-popup-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      border-radius: inherit;
    }
    .chatbot-popup-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .chatbot-popup-box {
      background: var(--bg-color, #ffffff);
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      text-align: center;
      width: 80%;
      max-width: 300px;
      transform: translateY(20px);
      transition: transform 0.3s ease;
      color: var(--text-color, #333);
    }
    .chatbot-popup-overlay.active .chatbot-popup-box {
      transform: translateY(0);
    }
    .chatbot-popup-title {
      font-weight: 600;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .chatbot-popup-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .chatbot-popup-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    .chatbot-popup-btn:hover { opacity: 0.9; }
    .chatbot-popup-btn-cancel {
      background: #f1f5f9;
      color: #475569;
    }
    .chatbot-popup-btn-confirm {
      background: #ef4444;
      color: white;
    }
  </style>
  <button class="chatbot-fab" id="chatbot-fab" aria-label="Ouvrir l'assistant">
    <div class="chatbot-fab-pulse"></div>
    <svg class="chatbot-fab-icon-open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <svg class="chatbot-fab-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>
  </button>

  <div class="chatbot-window" id="chatbot-window">
    <div class="chatbot-header">
      <div class="chatbot-header-avatar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div class="chatbot-header-info">
        <div class="chatbot-header-name">KODA Assistant</div>
      </div>
      <button class="chatbot-header-close" id="chatbot-close" aria-label="Fermer le chat">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
    </div>

    <div class="chatbot-messages" id="chatbot-messages">
      <div class="chatbot-msg chatbot-msg-bot">
        <div class="chatbot-msg-avatar">K</div>
        <div>
          <div class="chatbot-msg-bubble">Bonjour ! 👋 Bienvenue chez KODA. Comment puis-je vous aider aujourd'hui ?</div>
        </div>
      </div>
    </div>

    <div class="chatbot-input-area">
      <input type="text" class="chatbot-input" id="chatbot-input" placeholder="Écrivez votre message..." autocomplete="off">
      <button class="chatbot-send-btn" id="chatbot-send" aria-label="Envoyer" disabled>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m22 2-7 20-4-9-9-4z"/>
          <path d="m22 2-11 11"/>
        </svg>
      </button>
    </div>

    <div class="chatbot-popup-overlay" id="chatbot-popup">
      <div class="chatbot-popup-box">
        <div class="chatbot-popup-title">Confirmation Required</div>
        <div class="chatbot-popup-desc">Are you sure you want to delete all your orders? This action cannot be undone.</div>
        <div class="chatbot-popup-actions">
          <button class="chatbot-popup-btn chatbot-popup-btn-cancel" id="chatbot-popup-cancel">Cancel</button>
          <button class="chatbot-popup-btn chatbot-popup-btn-confirm" id="chatbot-popup-confirm">Confirm</button>
        </div>
      </div>
    </div>
  </div>
`;

function initChatbot() {
  document.body.insertAdjacentHTML('beforeend', chatbotHTML);

  const fab = document.getElementById('chatbot-fab');
  const chatWindow = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close');
  const input = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send');
  const messagesContainer = document.getElementById('chatbot-messages');
  const suggestionsContainer = document.getElementById('chatbot-suggestions');

  const popupOverlay = document.getElementById('chatbot-popup');
  const popupCancel = document.getElementById('chatbot-popup-cancel');
  const popupConfirm = document.getElementById('chatbot-popup-confirm');

  let threadId = null;
  let currentAbortController = null;
  let isStreaming = false;
  let popupPollInterval = null;

  const startPopupPolling = () => {
    if (popupPollInterval) clearInterval(popupPollInterval);
    popupPollInterval = setInterval(async () => {
      if (!threadId) return;
      try {
        const res = await fetch(`${CHATBOT_API_BASE}/chat/popup?thread_id=${threadId}`);
        const data = await res.json();
        if (data.has_popup && data.type === 'confirm_delete') {
          clearInterval(popupPollInterval);
          popupPollInterval = null;
          popupOverlay.classList.add('active');
        }
      } catch (err) {
        console.error('Error polling popup:', err);
      }
    }, 1000);
  };

  const stopPopupPolling = () => {
    if (popupPollInterval) {
      clearInterval(popupPollInterval);
      popupPollInterval = null;
    }
  };

  const handlePopupResponse = async (result) => {
    popupOverlay.classList.remove('active');
    try {
      await fetch(`${CHATBOT_API_BASE}/chat/popup_respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, result })
      });
    } catch (err) {
      console.error('Error responding to popup:', err);
    }
    startPopupPolling();
  };

  popupCancel.addEventListener('click', () => handlePopupResponse('cancel'));
  popupConfirm.addEventListener('click', () => handlePopupResponse('confirm'));

  const toggleChat = () => {
    const isOpen = chatWindow.classList.toggle('open');
    fab.classList.toggle('active', isOpen);
    if (isOpen) {
      setTimeout(() => input.focus(), 350);
    }
  };

  fab.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  let userInitial = "U";
  let userId = null;

  const getInitial = async () => {
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();

      if (session?.user) {
        const user = session.user;
        userId = user.id;
        // Check user_metadata first, then fallback to email or 'U'
        const firstName = user.user_metadata?.first_name || user.email || 'U';
        userInitial = firstName.charAt(0).toUpperCase();
        return;
      }
    } catch (err) {
      console.error('Failed to get Supabase session:', err);
    }

    userId = null;
    messagesContainer.innerHTML = `
      <div class="chatbot-msg chatbot-msg-bot">
        <div class="chatbot-msg-avatar">K</div>
        <div>
          <div class="chatbot-msg-bubble">Vous devez être connecté pour parler au chatbot.</div>
        </div>
      </div>
    `;
    suggestionsContainer.style.display = 'none';
    input.disabled = true;
    input.placeholder = "Connexion requise...";
    sendBtn.disabled = true;
  };

  getInitial()

  const getTimeStr = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const parseMarkdown = (text) => {
    if (!text) return '';
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Bold and Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    // Lists
    html = html.replace(/^\- (.*$)/gim, '• $1');
    // Newlines
    html = html.replace(/\n/g, '<br>');
    return html;
  };

  const addMessage = (text, isUser) => {
    const msg = document.createElement('div');
    msg.className = `chatbot-msg ${isUser ? 'chatbot-msg-user' : 'chatbot-msg-bot'}`;

    // Display userInitial if it's a user message, or 'K' if it's the bot
    const avatarContent = isUser ? userInitial : 'K';

    const formattedText = isUser ? text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') : parseMarkdown(text);

    msg.innerHTML = `
      <div class="chatbot-msg-avatar">${avatarContent}</div>
      <div>
        <div class="chatbot-msg-bubble">${formattedText}</div>
      </div>
    `;
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return msg;
  };

  const createStreamingBotMessage = () => {
    const msg = document.createElement('div');
    msg.className = 'chatbot-msg chatbot-msg-bot';
    msg.innerHTML = `
      <div class="chatbot-msg-avatar">K</div>
      <div>
        <div class="chatbot-msg-bubble chatbot-msg-streaming"></div>
      </div>
    `;
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return msg.querySelector('.chatbot-msg-bubble');
  };

  const setInputEnabled = (enabled) => {
    input.disabled = !enabled;
    sendBtn.disabled = !enabled || !input.value.trim();
    if (enabled) input.focus();
  };

  const streamBotReply = async (userText) => {
    setInputEnabled(false);
    isStreaming = true;
    startPopupPolling();

    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    // Immediately create the message bubble showing the blinking cursor
    const bubbleEl = createStreamingBotMessage();
    let accumulatedContent = '';

    try {
      const response = await fetch(`${CHATBOT_API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          thread_id: threadId,
          user_id: userId,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.slice(6);
          let payload;
          try {
            payload = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (payload.error) {
            accumulatedContent = "Désolé, une erreur s'est produite. Veuillez réessayer.";
            bubbleEl.innerHTML = parseMarkdown(accumulatedContent);
            break;
          }

          if (payload.done) {
            if (payload.thread_id) threadId = payload.thread_id;
            break;
          }

          if (payload.type === 'node_start') {
            const nodeNames = {
              'router': 'Analyse de la demande',
              'semantic_search': 'Recherche dans les documents',
              'web_search': 'Recherche sur le web',
              'database': 'Génération de la réponse',
              'grade_documents': 'Évaluation des documents',
              'generator': 'Génération de la réponse',
              'fallback': 'Traitement',
            };
            if (nodeNames[payload.node] && !accumulatedContent) {
              bubbleEl.classList.remove('chatbot-msg-streaming');
              bubbleEl.classList.add('chatbot-msg-status');
              bubbleEl.innerHTML = `<span style="font-style: italic; color: var(--color-text-tertiary);">${nodeNames[payload.node]}</span><span class="chatbot-status-dots"><span class="chatbot-msg-status-dot">.</span><span class="chatbot-msg-status-dot">.</span><span class="chatbot-msg-status-dot">.</span></span>`;
            }
            continue;
          }

          if (payload.type === 'message' || payload.content) {
            if (payload.thread_id) threadId = payload.thread_id;
            accumulatedContent = payload.content;
            bubbleEl.classList.remove('chatbot-msg-status');
            bubbleEl.classList.add('chatbot-msg-streaming');
            bubbleEl.innerHTML = parseMarkdown(accumulatedContent);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        if (bubbleEl && !accumulatedContent) {
          bubbleEl.closest('.chatbot-msg').remove();
        }
      } else {
        console.error('Chatbot stream error:', err);
        bubbleEl.innerHTML = parseMarkdown("Désolé, je ne parviens pas à me connecter au serveur. Veuillez réessayer plus tard.");
      }
    } finally {
      stopPopupPolling();
      if (bubbleEl) {
        // Remove the cursor once streaming finishes or fails
        bubbleEl.classList.remove('chatbot-msg-streaming');
      }
      isStreaming = false;
      currentAbortController = null;
      setInputEnabled(true);
    }
  };

  const handleSend = () => {
    if (isStreaming) return;
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, true);
    input.value = '';
    sendBtn.disabled = true;

    if (suggestionsContainer.style.display !== 'none') {
      suggestionsContainer.style.display = 'none';
    }

    streamBotReply(text);
  };

  sendBtn.addEventListener('click', handleSend);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  input.addEventListener('input', () => {
    sendBtn.disabled = isStreaming || !input.value.trim();
  });

  suggestionsContainer.querySelectorAll('.chatbot-suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isStreaming) return;
      const text = btn.textContent;
      addMessage(text, true);
      suggestionsContainer.style.display = 'none';
      streamBotReply(text);
    });
  });

  document.addEventListener('click', (e) => {
    if (!chatWindow.contains(e.target) && !fab.contains(e.target) && chatWindow.classList.contains('open')) {
      chatWindow.classList.remove('open');
      fab.classList.remove('active');
    }
  });
}