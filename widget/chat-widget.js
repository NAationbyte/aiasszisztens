/**
 * AI Asszisztens — Embeddable Chat Widget v2
 * Smart demo mode + optimized chat UI
 */
(function() {
    'use strict';

    const scriptTag = document.currentScript;
    const CONFIG = {
        botId: scriptTag?.getAttribute('data-bot-id') || 'demo',
        apiUrl: scriptTag?.getAttribute('data-api') || 'https://aiasszisztens.hu/api/chat',
        color: scriptTag?.getAttribute('data-color') || '#0071e3',
        title: scriptTag?.getAttribute('data-title') || 'AI Asszisztens',
        greeting: scriptTag?.getAttribute('data-greeting') || 'Üdvözlöm! 👋 Miben segíthetek?',
        position: scriptTag?.getAttribute('data-position') || 'right',
        avatar: scriptTag?.getAttribute('data-avatar') || '',
        lang: scriptTag?.getAttribute('data-lang') || 'hu',
    };

    const SESSION_ID = 'aia_' + Math.random().toString(36).substr(2, 12);
    let isOpen = false;
    let messages = [];
    let demoStep = 0; // track conversation flow in demo

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        #aia-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        
        #aia-bubble {
            position: fixed; bottom: 24px; ${CONFIG.position}: 24px;
            width: 60px; height: 60px; border-radius: 50%;
            background: ${CONFIG.color}; color: white;
            border: none; cursor: pointer; z-index: 99998;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            transition: all 0.3s cubic-bezier(.4,0,.2,1);
        }
        #aia-bubble:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(0,0,0,0.2); }
        #aia-bubble.open { transform: scale(0.9) rotate(90deg); }
        #aia-bubble svg { width: 28px; height: 28px; fill: white; }

        #aia-bubble .aia-dot {
            position: absolute; top: -3px; right: -3px;
            width: 20px; height: 20px; border-radius: 50%;
            background: #ef4444; border: 2.5px solid white;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; color: white;
            animation: aia-pulse 2s infinite;
        }
        @keyframes aia-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }

        #aia-chat {
            position: fixed; bottom: 96px; ${CONFIG.position}: 24px;
            width: 380px; max-width: calc(100vw - 32px);
            height: 540px; max-height: calc(100vh - 120px);
            background: #fff; border-radius: 20px;
            box-shadow: 0 16px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
            z-index: 99999; display: flex; flex-direction: column;
            overflow: hidden;
            opacity: 0; visibility: hidden; transform: translateY(20px) scale(0.95);
            transition: all 0.35s cubic-bezier(.4,0,.2,1);
        }
        #aia-chat.open { opacity:1; visibility:visible; transform:translateY(0) scale(1); }

        .aia-header {
            background: linear-gradient(135deg, ${CONFIG.color}, ${CONFIG.color}dd);
            color: white; padding: 18px 20px;
            display: flex; align-items: center; gap: 12px; flex-shrink: 0;
        }
        .aia-header-avatar {
            width: 40px; height: 40px; border-radius: 50%;
            background: rgba(255,255,255,0.2); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
        }
        .aia-header-info { flex: 1; }
        .aia-header-title { font-size: 15px; font-weight: 600; }
        .aia-header-status {
            font-size: 11px; opacity: 0.85;
            display: flex; align-items: center; gap: 5px; margin-top: 2px;
        }
        .aia-header-status::before {
            content:''; width:7px; height:7px; border-radius:50%;
            background:#4ade80; display:inline-block;
            box-shadow: 0 0 6px #4ade80;
        }
        .aia-header-close {
            background:rgba(255,255,255,0.15); border:none; color:white;
            cursor:pointer; font-size:16px; padding:6px 10px;
            border-radius:8px; transition:background 0.2s;
        }
        .aia-header-close:hover { background:rgba(255,255,255,0.25); }

        .aia-messages {
            flex: 1; overflow-y: auto; padding: 16px;
            display: flex; flex-direction: column; gap: 10px;
            background: #f8fafc;
            scroll-behavior: smooth;
        }
        .aia-messages::-webkit-scrollbar { width: 4px; }
        .aia-messages::-webkit-scrollbar-thumb { background:#ddd; border-radius:4px; }

        .aia-msg {
            max-width: 82%; padding: 11px 15px;
            border-radius: 18px; font-size: 14px; line-height: 1.55;
            animation: aia-fadeIn 0.3s ease;
            word-wrap: break-word;
        }
        @keyframes aia-fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        .aia-msg.bot {
            background: white; color: #1e293b;
            border-bottom-left-radius: 6px; align-self: flex-start;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .aia-msg.user {
            background: ${CONFIG.color}; color: white;
            border-bottom-right-radius: 6px; align-self: flex-end;
        }
        .aia-msg .aia-msg-time { font-size:10px; opacity:0.45; margin-top:4px; }

        .aia-typing {
            display:flex; gap:5px; padding:14px 16px;
            background:white; border-radius:18px; border-bottom-left-radius:6px;
            align-self:flex-start; box-shadow:0 1px 3px rgba(0,0,0,0.06);
        }
        .aia-typing span {
            width:8px; height:8px; border-radius:50%; background:#cbd5e1;
            animation:aia-bounce 1.4s infinite;
        }
        .aia-typing span:nth-child(2){animation-delay:.15s}
        .aia-typing span:nth-child(3){animation-delay:.3s}
        @keyframes aia-bounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-8px);opacity:1} }

        .aia-input-area {
            padding: 14px 16px; background: white;
            border-top: 1px solid #f1f5f9;
            display: flex; gap: 10px; flex-shrink: 0;
        }
        .aia-input {
            flex:1; border:1.5px solid #e2e8f0; border-radius:24px;
            padding:11px 18px; font-size:14px; font-family:inherit;
            outline:none; transition:border-color 0.2s, box-shadow 0.2s;
            color:#1e293b;
        }
        .aia-input::placeholder { color:#94a3b8; }
        .aia-input:focus { border-color:${CONFIG.color}; box-shadow: 0 0 0 3px ${CONFIG.color}22; }

        .aia-send {
            width:42px; height:42px; border-radius:50%;
            background:${CONFIG.color}; color:white; border:none;
            cursor:pointer; display:flex; align-items:center; justify-content:center;
            transition:all 0.2s; flex-shrink:0;
        }
        .aia-send:hover { transform:scale(1.08); }
        .aia-send:disabled { opacity:0.35; cursor:not-allowed; transform:none; }
        .aia-send svg { width:18px; height:18px; fill:white; }

        .aia-powered {
            text-align:center; padding:8px; background:white;
            font-size:10px; color:#94a3b8; border-top: 1px solid #f8fafc;
        }
        .aia-powered a { color:#64748b; text-decoration:none; font-weight:500; }
        .aia-powered a:hover { color:${CONFIG.color}; }

        .aia-quick-replies { display:flex; flex-wrap:wrap; gap:6px; padding:6px 0; }
        .aia-quick-btn {
            padding:7px 14px; border-radius:20px; background:white;
            color:${CONFIG.color}; border:1.5px solid ${CONFIG.color};
            font-size:13px; cursor:pointer; transition:all 0.2s; font-family:inherit;
            font-weight: 500;
        }
        .aia-quick-btn:hover { background:${CONFIG.color}; color:white; }

        @media (max-width: 480px) {
            #aia-chat {
                bottom:0; right:0; left:0; top:0;
                width:100%; max-width:100%;
                height:100%; max-height:100%;
                border-radius:0;
            }
            #aia-bubble { bottom:16px; right:16px; width:56px; height:56px; }
            .aia-header { padding: 16px; }
            .aia-messages { padding: 12px; }
            .aia-input-area { padding: 10px 12px; }
        }
    `;
    document.head.appendChild(style);

    // Widget HTML
    const widget = document.createElement('div');
    widget.id = 'aia-widget';
    widget.innerHTML = `
        <button id="aia-bubble" onclick="window.__aiaToggle()">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            <span class="aia-dot" id="aia-dot">1</span>
        </button>
        <div id="aia-chat">
            <div class="aia-header">
                <div class="aia-header-avatar">🤖</div>
                <div class="aia-header-info">
                    <div class="aia-header-title">${CONFIG.title}</div>
                    <div class="aia-header-status">Online — válaszol azonnal</div>
                </div>
                <button class="aia-header-close" onclick="window.__aiaToggle()">✕</button>
            </div>
            <div class="aia-messages" id="aia-messages"></div>
            <div class="aia-input-area">
                <input class="aia-input" id="aia-input" placeholder="Írjon üzenetet..." autocomplete="off">
                <button class="aia-send" id="aia-send" onclick="window.__aiaSend()">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
            <div class="aia-powered">
                Működteti: <a href="https://aiasszisztens.hu" target="_blank">AI Asszisztens</a>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // Helpers
    function addMessage(text, type = 'bot', quickReplies = null) {
        const container = document.getElementById('aia-messages');
        const time = new Date().toLocaleTimeString('hu-HU', {hour:'2-digit',minute:'2-digit'});
        const msgDiv = document.createElement('div');
        msgDiv.className = `aia-msg ${type}`;
        msgDiv.innerHTML = `${text}<div class="aia-msg-time">${time}</div>`;
        container.appendChild(msgDiv);

        if (quickReplies?.length) {
            const qrDiv = document.createElement('div');
            qrDiv.className = 'aia-quick-replies';
            quickReplies.forEach(qr => {
                const btn = document.createElement('button');
                btn.className = 'aia-quick-btn';
                btn.textContent = qr;
                btn.onclick = () => { qrDiv.remove(); sendMessage(qr); };
                qrDiv.appendChild(btn);
            });
            container.appendChild(qrDiv);
        }
        container.scrollTop = container.scrollHeight;
        messages.push({ role: type === 'user' ? 'user' : 'assistant', content: text });
    }

    function showTyping() {
        const c = document.getElementById('aia-messages');
        const t = document.createElement('div');
        t.className = 'aia-typing'; t.id = 'aia-typing';
        t.innerHTML = '<span></span><span></span><span></span>';
        c.appendChild(t); c.scrollTop = c.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('aia-typing');
        if (el) el.remove();
    }

    // API call
    async function sendMessage(text) {
        addMessage(text, 'user');
        const input = document.getElementById('aia-input');
        const sendBtn = document.getElementById('aia-send');
        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;
        showTyping();

        try {
            const response = await fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bot_id: CONFIG.botId,
                    session_id: SESSION_ID,
                    message: text,
                    history: messages.slice(-10)
                })
            });
            hideTyping();
            if (response.ok) {
                const data = await response.json();
                addMessage(data.reply, 'bot', data.quick_replies || null);
                if (data.handoff) {
                    addMessage('🔔 Értesítettem egy kollégát, hamarosan visszahívjuk!', 'bot');
                }
            } else {
                addMessage('Sajnos technikai hiba történt. Kérem, próbálja újra!', 'bot');
            }
        } catch (e) {
            hideTyping();
            const reply = getDemoReply(text);
            addMessage(reply.text, 'bot', reply.quickReplies);
        }

        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }

    // ========= SMART DEMO MODE =========
    // Context-aware, varied responses that showcase the bot's capabilities
    
    const demoConversations = {
        greeting: [
            { text: 'Üdvözlöm! 👋 Miben segíthetek ma?', qr: ['Hogyan működik?', 'Árak', 'Demo'] },
            { text: 'Szia! 😊 Örülök hogy benéztél! Kérdezz bátran.', qr: ['Mit tud a chatbot?', 'Mennyibe kerül?', 'Kipróbálom'] },
            { text: 'Helló! Írj nyugodtan, azonnal válaszolok! 🚀', qr: ['Mire jó ez?', 'Árak', 'Bemutató'] },
        ],
        how_it_works: [
            { text: '🤖 Így működik:\n\n1️⃣ <b>Beállítjuk</b> — megadjuk a céged infóit, nyitvatartást, árakat\n2️⃣ <b>Elindítjuk</b> — a chatbot elindul WhatsApp-on vagy a weboldaladon\n3️⃣ <b>Működik 0-24</b> — válaszol az ügyfeleknek, lead-eket gyűjt, árajánlatot készít elő\n\nTe csak a beérkező megrendelésekkel foglalkozol! 😎', qr: ['Mennyibe kerül?', 'Milyen cégeknek jó?', 'Demo'] },
            { text: 'Képzeld el, hogy este 11-kor ír egy ügyfél WhatsApp-on. Normál esetben reggelig vár.\n\nVelünk? <b>Azonnal kap választ</b>, összegyűjtjük a méreteket/igényeket, és reggel kész ajánlat vár a postaládádban. 💪', qr: ['Ez nekem is jó lenne!', 'Árak', 'Milyen cégeknek?'] },
        ],
        pricing: [
            { text: '💰 Csomagjaink:\n\n🟢 <b>Alap</b> — 19.900 Ft/hó\nWhatsApp bot, ügyfél Q&A, lead gyűjtés\n\n🔵 <b>Pro</b> — 34.900 Ft/hó\n+ Időpontfoglalás, heti riport, több nyelv\n\n🟣 <b>Prémium</b> — 59.900 Ft/hó\n+ CRM integráció, egyedi flow-k, kiemelt support\n\n<b>Első 2 hét ingyenes!</b> 🎉', qr: ['Érdekel!', 'Összehasonlítás', 'Hogyan működik?'] },
        ],
        comparison: [
            { text: '📊 Miért mi és nem a versenytársak?\n\n❌ <b>Wati</b> — $49-99/hó, angol, rule-based\n❌ <b>Tidio</b> — $29-59/hó, korlátozott AI\n❌ <b>Chatbot.com</b> — $52+/hó, nem beszél magyarul\n\n✅ <b>AI Asszisztens</b> — 19.900 Ft-tól\n• Valódi AI, nem döntési fa\n• Natív magyar + bármilyen nyelv\n• Neked 0 tech tudás kell\n• 24 órán belül kész', qr: ['Érdekel!', 'Demo', 'Hogyan működik?'] },
        ],
        industries: [
            { text: '🏢 Ezeknek a cégeknek tökéletes:\n\n🔧 <b>Kézműves/szolgáltató</b> — ablakos, villanyszerelő, festő\n🦷 <b>Egészségügy</b> — fogorvos, fodrász, masszőr\n🍕 <b>Vendéglátás</b> — étterem, kávézó\n🏠 <b>Ingatlan</b> — ügynökségek, építőipar\n🛒 <b>Webshop</b> — termék kérdések, rendelés\n\nBármelyik illik rád?', qr: ['Igen, érdekel!', 'Árak', 'Másra gondoltam'] },
        ],
        interested: [
            { text: 'Szuper! 🎉 Az induláshoz csak ennyi kell:\n\n1️⃣ Milyen <b>céged/vállalkozásod</b> van?\n2️⃣ Milyen <b>kérdéseket</b> kapod gyakran ügyfelektől?\n3️⃣ <b>WhatsApp</b> és/vagy <b>weboldal</b> chatbot?\n\nÍrd meg és 24 órán belül kész a személyre szabott botod! 🚀\n\nVagy írj nekünk: <b>info@aiasszisztens.hu</b>', qr: ['WhatsApp-on kérem', 'Weboldalra kérem', 'Mindkettő'] },
            { text: 'Remek döntés! 💪 Az <b>első 2 hét teljesen ingyenes</b>, kockázat nélkül kipróbálhatod.\n\nAz elkészítés menete:\n1. Kitöltesz egy rövid kérdőívet a cégedről (5 perc)\n2. Mi 24 órán belül felépítjük a chatbotot\n3. Teszteled, ha tetszik, indulunk!\n\nÍrj nekünk: <b>info@aiasszisztens.hu</b> ✉️', qr: [] },
        ],
        demo: [
            { text: 'Ez, amit most látsz, az <b>a mi demónk</b>! 😄\n\nPontosan így működne a te oldaladon is — de a <b>te cégedre szabva</b>:\n• A te áraidat, szolgáltatásaidat ismerné\n• A te stílusodban beszélne\n• A te logódat, színeidet használná\n\nPróbáld ki — kérdezz bármit!', qr: ['Hogyan működik?', 'Árak', 'Érdekel!'] },
        ],
        whatsapp: [
            { text: '📱 <b>WhatsApp chatbot</b> — a legnépszerűbb opcónk!\n\nAz ügyfeleid úgy írnak a botodnak, mint egy normál WhatsApp-beszélgetésben. Nem kell appot letölteni, nem kell regisztrálni.\n\n• Azonnal válaszol, 0-24\n• Képet is tud fogadni\n• Lead-eket gyűjt\n• Neked összefoglalót küld\n\nA magyar ügyfelek 78%-a WhatsApp-ot használ! 📊', qr: ['Mennyibe kerül?', 'Weboldalra is?', 'Érdekel!'] },
        ],
        website: [
            { text: '🌐 <b>Weboldal chatbot</b> — pont mint ez itt!\n\nEgy kis kódrészletet beillesztesz az oldaladra, és máris él a bot. Nem kell hozzá programozni — mi mindent megcsinálunk.\n\n• Modern, szép design\n• A te színeidben\n• Mobilon is tökéletesen működik\n• Gyűjti a lead-eket', qr: ['Mennyibe kerül?', 'WhatsApp-on is?', 'Érdekel!'] },
        ],
        fallback: [
            { text: 'Érdekes kérdés! 🤔 Mivel ez egy demo, a válaszaim limitáltak. De az éles verzió <b>bármilyen kérdésre válaszol</b> a te céged témájában!\n\nPróbáld ki:', qr: ['Hogyan működik?', 'Árak', 'Milyen cégeknek jó?'] },
            { text: 'Jó kérdés! Az éles verzióban a chatbot a <b>te céged adataiból</b> válaszol — árak, nyitvatartás, szolgáltatások, bármi amit beállítasz.\n\nSzeretned kipróbálni?', qr: ['Igen!', 'Árak', 'Hogyan működik?'] },
            { text: 'Erre most demo módban nem tudok válaszolni, de az éles bot <b>teljesen testreszabott</b> — pontosan azt tudja, amit a te ügyfeleid kérdeznek. 😊', qr: ['Mesélj többet!', 'Árak', 'Demo'] },
        ],
        thanks: [
            { text: 'Köszönöm! 😊 Ha bármi kérdésed van, írj bátran: <b>info@aiasszisztens.hu</b>\n\nSzép napot kívánok! 🌞', qr: [] },
            { text: 'Szívesen! Remélem hamarosan dolgozunk együtt! 🤝\n\nElérhetőség: <b>info@aiasszisztens.hu</b>', qr: [] },
        ],
    };

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function getDemoReply(text) {
        const l = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Greetings
        if (/^(szia|hello|helo|hey|hi|udvozl|szervusz|jo napot|hello)/.test(l)) {
            const r = pickRandom(demoConversations.greeting);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // How it works
        if (l.includes('hogyan') || l.includes('mukod') || l.includes('mire jo') || l.includes('mit tud') || l.includes('mesej') || l.includes('tobbe')) {
            const r = pickRandom(demoConversations.how_it_works);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // Pricing
        if (l.includes('ar') || l.includes('mennyib') || l.includes('koltseg') || l.includes('fizet') || l.includes('csomag') || l.includes('dij')) {
            const r = pickRandom(demoConversations.pricing);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // Comparison
        if (l.includes('osszehasonl') || l.includes('versenytars') || l.includes('wati') || l.includes('tidio') || l.includes('masik') || l.includes('kulonbseg')) {
            const r = pickRandom(demoConversations.comparison);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // Industries
        if (l.includes('milyen ceg') || l.includes('kinek') || l.includes('iparag') || l.includes('peldak') || l.includes('masra gondol')) {
            const r = pickRandom(demoConversations.industries);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // Interest / CTA
        if (l.includes('erdekel') || l.includes('szeretn') || l.includes('akarom') || l.includes('igen') || l.includes('kerem') || l.includes('rendel') || l.includes('indulj') || l.includes('mindketto')) {
            const r = pickRandom(demoConversations.interested);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // Demo
        if (l.includes('demo') || l.includes('bemutat') || l.includes('kiprob') || l.includes('teszt')) {
            const r = pickRandom(demoConversations.demo);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // WhatsApp specific
        if (l.includes('whatsapp')) {
            const r = pickRandom(demoConversations.whatsapp);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // Website specific
        if (l.includes('weboldal') || l.includes('weblap') || l.includes('honlap') || l.includes('website')) {
            const r = pickRandom(demoConversations.website);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // Thanks/bye
        if (l.includes('koszon') || l.includes('koszi') || l.includes('viszlat') || l.includes('szep napot') || l.includes('hala')) {
            const r = pickRandom(demoConversations.thanks);
            return { text: r.text, quickReplies: r.qr };
        }
        
        // Fallback — varied
        const r = pickRandom(demoConversations.fallback);
        return { text: r.text, quickReplies: r.qr };
    }

    // Toggle
    window.__aiaToggle = function() {
        isOpen = !isOpen;
        document.getElementById('aia-chat').classList.toggle('open', isOpen);
        document.getElementById('aia-bubble').classList.toggle('open', isOpen);
        
        if (isOpen) {
            document.getElementById('aia-dot').style.display = 'none';
        }
        
        if (isOpen && messages.length === 0) {
            setTimeout(() => {
                showTyping();
                setTimeout(() => {
                    hideTyping();
                    const g = pickRandom(demoConversations.greeting);
                    addMessage(g.text, 'bot', g.qr);
                }, 700);
            }, 200);
        }

        if (isOpen) {
            setTimeout(() => document.getElementById('aia-input').focus(), 300);
        }
    };

    window.__aiaSend = function() {
        const input = document.getElementById('aia-input');
        const text = input.value.trim();
        if (text) sendMessage(text);
    };

    document.getElementById('aia-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); window.__aiaSend(); }
    });

})();
