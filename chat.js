// Συνομιλία (chat) του portfolio.
// - Κουμπί στη γωνία που ανοίγει παράθυρο συνομιλίας.
// - Όλη η συνομιλία ζει στο chatState· αποθηκεύεται στο sessionStorage: μένει μετά από reload,
//   αλλά σβήνει όταν κλείσει η καρτέλα. Κάθε νέος επισκέπτης / νέα καρτέλα ξεκινά νέα συνομιλία,
//   ακόμη και σε κοινόχρηστο υπολογιστή. Ο server δεν κρατά καμία συνομιλία.
// - Οι ερωτήσεις πηγαίνουν στο /api/chat (functions/api/chat.js), που απαντά ΜΟΝΟ με βάση το index.html.
// - Όρια: ερώτηση έως 300 χαρακτήρες (εδώ και στον server), απάντηση έως 500 (στον server),
//   έως 10 ερωτήσεις/λεπτό και 50/ημέρα ανά IP (στον server· εδώ μόνο το μήνυμα).
(() => {
  const API_URL = '/api/chat';
  const CHAT_KEY = 'chat-history';
  const CHAT_MAX = 50;            // κρατάμε τα τελευταία 50 μηνύματα στο ιστορικό
  const MAX_QUESTION = 300;       // μέγιστο μήκος ερώτησης
  const MAX_ANSWER = 500;         // μέγιστο μήκος απάντησης (το επιβάλλει ο server)
  const HISTORY_TO_SEND = 10;     // πόσα πρόσφατα μηνύματα στέλνουμε, για ερωτήσεις συνέχειας
  const TIMEOUT_MS = 30000;

  // ---- Κείμενα σε δύο γλώσσες ----
  const chatText = {
    el: {
      welcome: 'Γεια σας! Ρωτήστε με ό,τι θέλετε για τον Χρήστο, τις σπουδές, τις δεξιότητες ή τα projects του.',
      pending: 'Γράφει...',
      tooLong: 'Η ερώτηση μπορεί να έχει έως 300 χαρακτήρες.',
      busy: 'Έχουν σταλεί πολλές ερωτήσεις. Δοκιμάστε ξανά σε λίγο.',
      limitMinute: 'Έχετε κάνει πολλές ερωτήσεις σε λίγο χρόνο. Περιμένετε ένα λεπτό και δοκιμάστε ξανά. Ευχαριστώ για την υπομονή!',
      limitDay: 'Φτάσατε το όριο των 50 ερωτήσεων για σήμερα. Ευχαριστώ πολύ για το ενδιαφέρον! Μπορείτε να ρωτήσετε ξανά αύριο ή να μου γράψετε μέσω της φόρμας επικοινωνίας.',
      unavailable: 'Η συνομιλία δεν είναι διαθέσιμη αυτή τη στιγμή. Μπορείτε να μου γράψετε μέσω της φόρμας επικοινωνίας.',
      error: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',
      placeholder: 'Γράψτε την ερώτησή σας...',
      'label-dialog-close': 'Κλείσιμο',
      'label-chat-send': 'Αποστολή ερώτησης',
      'label-chat-input': 'Ερώτηση (έως 300 χαρακτήρες)'
    },
    en: {
      welcome: 'Hi! Ask me anything about Christos, his studies, skills or projects.',
      pending: 'Typing...',
      tooLong: 'Questions can be up to 300 characters long.',
      busy: 'Too many questions have been sent. Please try again in a moment.',
      limitMinute: "You've asked a lot of questions in a short time. Please wait a minute and try again. Thanks for your patience!",
      limitDay: "You've reached the limit of 50 questions for today. Thank you so much for your interest! You can ask again tomorrow or write to me through the contact form.",
      unavailable: 'The chat is not available right now. You can reach me through the contact form.',
      error: 'Something went wrong. Please try again.',
      placeholder: 'Type your question...',
      'label-dialog-close': 'Close',
      'label-chat-send': 'Send question',
      'label-chat-input': 'Question (up to 300 characters)'
    }
  };
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'el');
  const ct = key => chatText[lang()][key];

  // ---- Στοιχεία της σελίδας ----
  const $ = id => document.getElementById(id);
  const cornerBtn = $('corner-btn');
  const dialog = $('info-dialog');
  const log = $('chat-log');
  const form = $('chat-form');
  const input = $('chat-input');
  const sendBtn = $('chat-send');
  const clearBtn = $('chat-clear');
  const counter = $('chat-count');
  input.maxLength = MAX_QUESTION;

  // ---- Κατάσταση ----
  const isValidMsg = m =>
    m && (m.role === 'user' || m.role === 'assistant') &&
    typeof m.text === 'string' && m.text.length > 0 &&
    m.text.length <= (m.role === 'user' ? MAX_QUESTION : MAX_ANSWER);

  // Σβήνουμε ό,τι είχε μείνει από την παλιά έκδοση, που κρατούσε τη συνομιλία μόνιμα στο localStorage
  try { localStorage.removeItem(CHAT_KEY); } catch (e) {}

  // Φόρτωση με έλεγχο: ό,τι χαλασμένο ή άγνωστο υπάρχει στο sessionStorage αγνοείται
  function loadChat() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CHAT_KEY));
      return Array.isArray(saved) ? saved.filter(isValidMsg).slice(-CHAT_MAX) : [];
    } catch (e) { return []; }
  }
  function saveChat() {
    try {
      if (chatState.messages.length) sessionStorage.setItem(CHAT_KEY, JSON.stringify(chatState.messages));
      else sessionStorage.removeItem(CHAT_KEY);
    } catch (e) {}
  }

  const chatState = { messages: loadChat(), pending: false };

  // Κάθε αλλαγή της κατάστασης περνάει από εδώ: αποθήκευση + νέα σχεδίαση
  function addMessage(role, text, { local = false } = {}) {
    chatState.messages.push({ role, text, ts: Date.now(), ...(local ? { local: true } : {}) });
    if (chatState.messages.length > CHAT_MAX) chatState.messages.splice(0, chatState.messages.length - CHAT_MAX);
    saveChat();
    render();
  }
  function clearChat() {
    chatState.messages = [];
    saveChat();
    render();
  }
  function setPending(value) {
    chatState.pending = value;
    render();
  }

  // ---- Σχεδίαση (textContent, όχι innerHTML: κανένα μήνυμα δεν εκτελείται ως HTML) ----
  function bubble(role, text, extra) {
    const li = document.createElement('li');
    li.className = 'chat-msg ' + role + (extra ? ' ' + extra : '');
    li.textContent = text;
    return li;
  }
  function render() {
    log.replaceChildren();
    if (!chatState.messages.length) log.append(bubble('assistant', ct('welcome')));
    for (const m of chatState.messages) log.append(bubble(m.role, m.text));
    if (chatState.pending) log.append(bubble('assistant', ct('pending'), 'pending'));
    sendBtn.disabled = chatState.pending;
    clearBtn.hidden = chatState.messages.length === 0;
    log.scrollTop = log.scrollHeight;
  }
  function updateCounter() {
    const n = input.value.length;
    counter.textContent = n + '/' + MAX_QUESTION;
    counter.classList.toggle('limit', n >= MAX_QUESTION);
  }
  function applyLanguage() {
    input.placeholder = ct('placeholder');
    // Το κουμπί στη γωνία έχει ορατό κείμενο («Θες να ρωτήσεις;»), οπότε δεν χρειάζεται aria-label
    for (const id of ['dialog-close', 'chat-send', 'chat-input']) {
      $(id).setAttribute('aria-label', ct('label-' + id));
    }
    render();
  }

  // ---- Επικοινωνία με τον server ----
  // Στέλνει τα πρόσφατα μηνύματα (όχι τα τοπικά μηνύματα σφάλματος) και επιστρέφει το κείμενο της απάντησης.
  async function getReply(history) {
    const messages = history
      .filter(m => !m.local)
      .slice(-HISTORY_TO_SEND)
      .map(m => ({ role: m.role, text: m.text }));
    while (messages.length && messages[0].role !== 'user') messages.shift();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, lang: lang() }),
        signal: controller.signal
      });
      let data = {};
      try { data = await res.json(); } catch (e) {}
      if (res.ok && typeof data.reply === 'string' && data.reply) {
        return { text: data.reply.slice(0, MAX_ANSWER) };
      }
      // Όριο ερωτήσεων ανά IP (10/λεπτό, 50/ημέρα): το κείμενο σε όποια γλώσσα είναι τώρα ενεργή
      const key = res.status === 400 && data.error === 'question_too_long' ? 'tooLong'
        : res.status === 429 && data.error === 'rate_limited' ? (data.limit === 'day' ? 'limitDay' : 'limitMinute')
        : res.status === 429 ? 'busy'
        : res.status === 503 || res.status === 404 ? 'unavailable'
        : 'error';
      return { text: ct(key), local: true };
    } catch (e) {
      return { text: ct('error'), local: true };
    } finally {
      clearTimeout(timer);
    }
  }

  async function sendMessage(text) {
    text = text.trim();
    if (!text || chatState.pending) return;
    if (text.length > MAX_QUESTION) {                 // το maxlength το εμποδίζει ήδη· διπλός έλεγχος
      addMessage('assistant', ct('tooLong'), { local: true });
      return;
    }
    addMessage('user', text);
    setPending(true);
    const reply = await getReply(chatState.messages);
    chatState.pending = false;
    addMessage('assistant', reply.text, { local: reply.local });
  }

  // ---- Συμβάντα ----
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (chatState.pending || !input.value.trim()) return;   // το κείμενο μένει στο πεδίο
    const text = input.value;
    input.value = '';
    input.style.height = '';
    updateCounter();
    sendMessage(text);
  });
  // Enter στέλνει, Shift+Enter αλλάζει γραμμή
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  // Μετρητής χαρακτήρων και αυτόματο ύψος του πεδίου
  input.addEventListener('input', () => {
    updateCounter();
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  });
  clearBtn.addEventListener('click', () => { clearChat(); input.focus(); });

  // Άνοιγμα / κλείσιμο παραθύρου
  cornerBtn.addEventListener('click', () => {
    dialog.showModal();
    render();
    input.focus();
  });
  $('dialog-close').addEventListener('click', () => dialog.close());
  // Κλείνει και με κλικ έξω από το παράθυρο (το Esc το χειρίζεται ο browser)
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  });

  // Το κουμπί μένει πάντα κάτω από το μενού, όποιο ύψος κι αν έχει (σε κινητό το μενού πιάνει 2 γραμμές)
  const nav = document.querySelector('nav');
  const setNavHeight = () => document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
  setNavHeight();
  window.addEventListener('resize', setNavHeight);

  // Όταν αλλάζει η γλώσσα της σελίδας (κουμπί EN/ΕΛ), αλλάζουν και τα κείμενα της συνομιλίας
  new MutationObserver(applyLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  applyLanguage();
  updateCounter();
})();
