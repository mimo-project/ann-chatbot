(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const sidebar = $('#sidebar');
  const welcome = $('#welcome');
  const messagesEl = $('#messages');
  const scroller = $('#chatScroller');
  const input = $('#messageInput');
  const sendBtn = $('#sendBtn');
  const historyList = $('#historyList');
  let messages = [];
  let history = [];
  let activeHistoryId = null;
  let isLoading = false;
  const pageMeta = {
    chat: ['INTERACTION MODULE', 'NEURAL CHAT INTERFACE'],
    neural: ['MODEL OVERVIEW', 'NEURAL NETWORK OVERVIEW']
  };
  const NO_SESSIONS = '<div class="history-item" style="color:#666874;cursor:default">No saved sessions yet</div>';
  const escapeHTML = (str) => String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  } [ch]));
  const clock = () => new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  function switchPage(page) {
    $$('.page').forEach(el => el.classList.toggle('active', el.id === `page-${page}`));
    $$('.nav-btn').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    $('#crumb').textContent = pageMeta[page][0];
    $('#topTitle').textContent = pageMeta[page][1];
    if (window.innerWidth <= 650) sidebar.classList.add('closed');
  }

  function renderHistory() {
    if (!history.length) {
      historyList.innerHTML = NO_SESSIONS;
      return;
    }
    historyList.innerHTML = history.map(item =>
      `<button class="history-item ${item.id === activeHistoryId ? 'selected' : ''}" data-history-id="${item.id}" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</button>`
    ).join('');
  }

  function saveCurrentConversation() {
    if (!messages.length) return;
    const title = (messages.find(m => m.role === 'user')?.content || 'Untitled session').replace(/\s+/g, ' ').slice(0, 34);
    const id = activeHistoryId || String(Date.now());
    activeHistoryId = id;
    const item = {
      id,
      title,
      messages: messages.map(m => ({
        ...m
      }))
    };
    const existing = history.findIndex(h => h.id === id);
    if (existing >= 0) history[existing] = item;
    else history.unshift(item);
    history = history.slice(0, 12);
    renderHistory();
  }

  function showMessages() {
    const hasMessages = messages.length > 0;
    welcome.hidden = hasMessages;
    messagesEl.hidden = !hasMessages;
    if (!hasMessages) {
      messagesEl.innerHTML = '';
      return;
    }
    const userIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const botIcon = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 3 4.8 7v10L12 21l7.2-4V7L12 3Z" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.3"/></svg>';
    messagesEl.innerHTML = messages.map(m => {
      const user = m.role === 'user';
      return `<article class="message ${user ? 'user' : 'assistant'}"><div class="avatar" aria-hidden="true">${user ? userIcon : botIcon}</div><div class="message-main"><div class="message-label">${user ? 'YOU' : 'HELPDESK BOT'}</div><div class="bubble">${escapeHTML(m.content)}</div><div class="message-meta">${escapeHTML(m.time || '')}</div></div></article>`;
    }).join('');
    if (isLoading) {
      messagesEl.insertAdjacentHTML('beforeend', '<div class="typing" id="typingIndicator"><span class="typing-dots"><i></i><i></i><i></i></span> THINKING...</div>');
    }
    requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight;
    });
  }

  async function getReply(text) {
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      return data.reply || "Sorry, I didn't get that.";
    } catch (err) {
      return 'Sorry, I could not reach the server. Please make sure app.py is running.';
    }
  }

  async function sendMessage(text) {
    const content = (text ?? input.value).trim();
    if (!content || isLoading) return;
    if (!activeHistoryId) activeHistoryId = String(Date.now());
    messages.push({
      role: 'user',
      content,
      time: clock()
    });
    input.value = '';
    isLoading = true;
    resizeInput();
    showMessages();
    const reply = await getReply(content);
    messages.push({
      role: 'assistant',
      content: reply,
      time: clock()
    });
    isLoading = false;
    resizeInput();
    showMessages();
    saveCurrentConversation();
  }

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    sendBtn.disabled = !input.value.trim() || isLoading;
  }

  function newChat() {
    if (messages.length) saveCurrentConversation();
    messages = [];
    activeHistoryId = null;
    isLoading = false;
    input.value = '';
    resizeInput();
    showMessages();
    renderHistory();
    switchPage('chat');
    input.focus();
  }

  $('#chatForm').addEventListener('submit', event => {
    event.preventDefault();
    sendMessage();
  });
  input.addEventListener('input', resizeInput);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  });
  $$('.prompt-card').forEach(button => button.addEventListener('click', () => sendMessage(button.dataset.prompt)));
  $$('.nav-btn').forEach(button => button.addEventListener('click', () => switchPage(button.dataset.page)));
  $('#newChat').addEventListener('click', newChat);
  $('#sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('closed'));
  $('#clearHistory').addEventListener('click', () => {
    history = [];
    activeHistoryId = null;
    renderHistory();
  });
  historyList.addEventListener('click', event => {
    const button = event.target.closest('[data-history-id]');
    if (!button) return;
    const item = history.find(h => h.id === button.dataset.historyId);
    if (!item) return;
    messages = item.messages.map(m => ({
      ...m
    }));
    activeHistoryId = item.id;
    showMessages();
    renderHistory();
    switchPage('chat');
  });

  function drawNetwork() {
    const svg = $('#networkVisual');
    const groups = [{
      x: 80,
      ys: [55, 95, 135, 175, 215],
      color: '#ff515d'
    }, {
      x: 245,
      ys: [35, 75, 115, 155, 195, 235],
      color: '#b65ee5'
    }, {
      x: 410,
      ys: [75, 135, 195],
      color: '#ffa35e'
    }, {
      x: 525,
      ys: [105, 165],
      color: '#ffa35e'
    }];
    let markup = '<defs><filter id="glow"><feGaussianBlur stdDeviation="2.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    groups.slice(0, -1).forEach((group, gi) => {
      const next = groups[gi + 1];
      group.ys.forEach(y1 => next.ys.forEach(y2 => {
        markup += `<line x1="${group.x}" y1="${y1}" x2="${next.x}" y2="${y2}" stroke="#91404a" stroke-width=".7" opacity=".46"/>`;
      }));
    });
    groups.forEach(group => group.ys.forEach(y => {
      markup += `<circle cx="${group.x}" cy="${y}" r="7" fill="#17121a" stroke="${group.color}" stroke-width="1.5" filter="url(#glow)"/><circle cx="${group.x}" cy="${y}" r="2.1" fill="${group.color}"/>`;
    }));
    markup += '<g fill="#797684" font-family="ui-monospace, Consolas, monospace" font-size="10" text-anchor="middle"><text x="80" y="255">INPUT</text><text x="245" y="255">HIDDEN</text><text x="410" y="255">HIDDEN</text><text x="525" y="255">OUTPUT</text></g>';
    svg.innerHTML = markup;
  }

  drawNetwork();
  renderHistory();
  resizeInput();
  if (window.innerWidth <= 650) sidebar.classList.add('closed');
})();
