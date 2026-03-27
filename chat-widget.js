/**
 * AI Asszisztens — Chat Widget
 * Purple/dark theme, Hungarian, AI chatbot SaaS
 */
(function() {
    'use strict';

    const CONFIG = {
        color: '#a855f7',
        colorDark: '#7c3aed',
        bg: '#0d0d0f',
        bgCard: '#18181b',
        title: 'AI Asszisztens',
        phone: 'tel:+36305010704',
    };

    let isOpen = false;
    let messages = [];

    const style = document.createElement('style');
    style.textContent = `
        #aa-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; }

        #aa-bubble {
            position: fixed; bottom: 28px; right: 28px;
            width: 62px; height: 62px; border-radius: 50%;
            background: linear-gradient(135deg, ${CONFIG.color}, ${CONFIG.colorDark});
            border: none; color: white; cursor: pointer; z-index: 99998;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 24px rgba(168,85,247,0.45);
            transition: all 0.3s cubic-bezier(.4,0,.2,1);
            font-size: 1.5rem;
        }
        #aa-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 36px rgba(168,85,247,0.6); }

        .aa-dot {
            position: absolute; top: -2px; right: -2px;
            width: 18px; height: 18px; border-radius: 50%;
            background: #4ade80; border: 2px solid ${CONFIG.bg};
            animation: aa-pulse 2s infinite;
        }
        @keyframes aa-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }

        #aa-chat {
            position: fixed; bottom: 104px; right: 28px;
            width: 360px; max-width: calc(100vw - 32px);
            height: 520px; max-height: calc(100vh - 130px);
            background: ${CONFIG.bg}; border: 1px solid rgba(168,85,247,0.2);
            border-radius: 18px; z-index: 99999;
            display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(168,85,247,0.06);
            opacity: 0; visibility: hidden; transform: translateY(20px) scale(0.96);
            transition: all 0.3s cubic-bezier(.4,0,.2,1);
        }
        #aa-chat.open { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }

        .aa-header {
            background: linear-gradient(135deg, #18181b, #1a1025);
            padding: 16px 18px;
            display: flex; align-items: center; gap: 12px;
            flex-shrink: 0;
            border-bottom: 1px solid rgba(168,85,247,0.12);
        }
        .aa-header-avatar {
            width: 40px; height: 40px; border-radius: 50%;
            background: linear-gradient(135deg, ${CONFIG.color}, ${CONFIG.colorDark});
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem; flex-shrink: 0;
        }
        .aa-header-info { flex: 1; }
        .aa-header-title { font-size: 14px; font-weight: 700; color: #fff; }
        .aa-header-status {
            font-size: 11px; color: #4ade80; margin-top: 2px;
            display: flex; align-items: center; gap: 4px;
        }
        .aa-header-status::before {
            content: ''; width: 6px; height: 6px; border-radius: 50%;
            background: #4ade80; display: inline-block;
        }
        .aa-close {
            background: none; border: 1px solid rgba(255,255,255,0.1);
            color: #666; cursor: pointer; font-size: 13px;
            padding: 5px 9px; border-radius: 6px; transition: all 0.2s;
        }
        .aa-close:hover { border-color: rgba(168,85,247,0.4); color: ${CONFIG.color}; }

        .aa-messages {
            flex: 1; overflow-y: auto; padding: 16px;
            display: flex; flex-direction: column; gap: 10px;
            scroll-behavior: smooth;
        }
        .aa-messages::-webkit-scrollbar { width: 3px; }
        .aa-messages::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.2); border-radius: 4px; }

        .aa-msg {
            max-width: 85%; padding: 11px 14px;
            border-radius: 14px; font-size: 13.5px; line-height: 1.6;
            animation: aa-fadeIn 0.25s ease; word-wrap: break-word;
        }
        @keyframes aa-fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .aa-msg.bot {
            background: ${CONFIG.bgCard}; color: #e5e5e5;
            border: 1px solid rgba(168,85,247,0.1);
            border-bottom-left-radius: 4px; align-self: flex-start;
        }
        .aa-msg.user {
            background: linear-gradient(135deg, ${CONFIG.color}, ${CONFIG.colorDark});
            color: #fff; border-bottom-right-radius: 4px; align-self: flex-end;
        }

        .aa-typing {
            display: flex; gap: 4px; padding: 12px 14px;
            background: ${CONFIG.bgCard}; border: 1px solid rgba(168,85,247,0.1);
            border-radius: 14px; border-bottom-left-radius: 4px;
            align-self: flex-start;
        }
        .aa-typing span {
            width: 6px; height: 6px; border-radius: 50%;
            background: rgba(168,85,247,0.5);
            animation: aa-bounce 1.3s infinite;
        }
        .aa-typing span:nth-child(2){animation-delay:.15s}
        .aa-typing span:nth-child(3){animation-delay:.3s}
        @keyframes aa-bounce { 0%,60%,100%{transform:translateY(0);opacity:.3} 30%{transform:translateY(-6px);opacity:1} }

        .aa-qrs { display: flex; flex-wrap: wrap; gap: 5px; padding: 4px 0; }
        .aa-qr {
            padding: 6px 14px; border-radius: 20px;
            background: transparent; color: ${CONFIG.color};
            border: 1px solid rgba(168,85,247,0.3);
            font-size: 12px; cursor: pointer; transition: all 0.2s;
            font-family: inherit;
        }
        .aa-qr:hover { background: ${CONFIG.color}; color: #fff; border-color: ${CONFIG.color}; }

        .aa-input-area {
            padding: 12px 14px; background: ${CONFIG.bgCard};
            border-top: 1px solid rgba(168,85,247,0.1);
            display: flex; gap: 8px; flex-shrink: 0;
        }
        .aa-input {
            flex: 1; border: 1px solid rgba(168,85,247,0.2);
            border-radius: 22px; padding: 10px 16px; font-size: 13px;
            font-family: inherit; outline: none;
            background: ${CONFIG.bg}; color: #e5e5e5;
            transition: border-color 0.2s;
        }
        .aa-input::placeholder { color: #555; }
        .aa-input:focus { border-color: ${CONFIG.color}; }

        .aa-send {
            width: 40px; height: 40px; border-radius: 50%;
            background: linear-gradient(135deg, ${CONFIG.color}, ${CONFIG.colorDark});
            border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; transition: all 0.2s; flex-shrink: 0;
        }
        .aa-send:hover { transform: scale(1.08); }
        .aa-send:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

        .aa-powered {
            text-align: center; padding: 7px; font-size: 10px;
            color: #444; background: ${CONFIG.bgCard};
            border-top: 1px solid rgba(168,85,247,0.06);
        }

        @media (max-width: 480px) {
            #aa-chat { bottom:0; right:0; left:0; top:0; width:100%; max-width:100%; height:100%; max-height:100%; border-radius:0; }
            #aa-bubble { bottom:16px; right:16px; }
        }
    `;
    document.head.appendChild(style);

    const widget = document.createElement('div');
    widget.id = 'aa-widget';
    widget.innerHTML = `
        <button id="aa-bubble" onclick="window.__aaToggle()">
            🤖
            <span class="aa-dot"></span>
        </button>
        <div id="aa-chat">
            <div class="aa-header">
                <div class="aa-header-avatar">🤖</div>
                <div class="aa-header-info">
                    <div class="aa-header-title">${CONFIG.title}</div>
                    <div class="aa-header-status">Online – azonnal válaszolok</div>
                </div>
                <button class="aa-close" onclick="window.__aaToggle()">✕</button>
            </div>
            <div class="aa-messages" id="aa-messages"></div>
            <div class="aa-input-area">
                <input class="aa-input" id="aa-input" placeholder="Írjon üzenetet..." autocomplete="off">
                <button class="aa-send" id="aa-send" onclick="window.__aaSend()">➤</button>
            </div>
            <div class="aa-powered">AI Asszisztens · aiasszisztens.hu</div>
        </div>
    `;
    document.body.appendChild(widget);

    const replies = {
        greeting: [
            { text: 'Szia! 👋 Az AI Asszisztens chatbotja vagyok. Segíthetek megismerni a szolgáltatásainkat, vagy bármilyen kérdésre válaszolok!', qr: ['💰 Árak', '⚡ Gyors setup', '🤖 Mit tud a bot?', '📞 Kapcsolat'] },
        ],
        ar: [
            { text: '💰 <b>Áraink:</b><br><br>◆ <b>Alap csomag</b> — 19.900 Ft/hó<br>&nbsp;&nbsp;&nbsp;WhatsApp chatbot, alap FAQ, 500 üzenet/hó<br><br>◆ <b>Üzleti csomag</b> — 39.900 Ft/hó<br>&nbsp;&nbsp;&nbsp;WhatsApp + webes chat, lead gyűjtés, 2000 üzenet/hó<br><br>◆ <b>Prémium</b> — egyedi árazás<br>&nbsp;&nbsp;&nbsp;Teljes integráció, egyedi AI tudásbázis, korlátlan üzenet<br><br>📦 Setup díj: 0 Ft – az első hónap tartalmazza.', qr: ['⚡ Hogyan lehet elindítani?', '📞 Ajánlatot kérek'] },
        ],
        setup: [
            { text: '⚡ <b>Elindítás – 24 órán belül:</b><br><br><b>1.</b> Megbeszéljük mire van szükség (15 perc)<br><b>2.</b> Összepároljuk a WhatsApp számát / webes chatet<br><b>3.</b> Feltöltjük a tudásbázist (termékek, GYIK, árak)<br><b>4.</b> Teszt körök, finomhangolás<br><b>5.</b> Éles indítás ✅<br><br>Nem kell programozás, nincs IT csapat. Mi mindent megcsinálunk.', qr: ['💰 Árak', '📞 Érdekel, felveszem a kapcsolatot'] },
        ],
        mire: [
            { text: '🤖 <b>Mire képes az AI chatbot?</b><br><br>◆ 24/7 válaszol ügyfeleknek — hétvégén is<br>◆ Árajánlatot kér, méreteket gyűjt<br>◆ Lead-eket rögzít automatikusan<br>◆ Több nyelven kommunikál<br>◆ WhatsApp-on és weboldalon egyaránt fut<br>◆ Tudásbázis alapján pontosan válaszol<br>◆ Csökkenti az ügyfélszolgálati terhet 60–80%-kal<br><br>Lényegében: úgy viselkedik, mint egy képzett munkatárs – de sosem fárad el.', qr: ['💰 Mennyibe kerül?', '⚡ Gyors setup', '📞 Érdekel!'] },
        ],
        contact: [
            { text: '📞 <b>Vegyük fel a kapcsolatot!</b><br><br>Hívjon vagy írjon, 24 órán belül visszajelzünk:<br><br>📧 info@aiasszisztens.hu<br>🌐 aiasszisztens.hu<br><br>Vagy kattintson ide a közvetlen híváshoz! 👇', qr: ['🔙 Vissza a főmenübe'] },
        ],
        fallback: [
            { text: 'Jó kérdés! 😊 Erre a legjobb választ egy rövid egyeztetésen tudnám megadni. Vegyen fel velünk kapcsolatot, és mindent elmagyarázunk!', qr: ['📞 Kapcsolat', '🤖 Mit tud a bot?', '💰 Árak'] },
        ],
    };

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function getDemoReply(text) {
        const l = text.toLowerCase();
        if (/^(szia|hello|hi|üdv|helló|jó)/.test(l)) return pick(replies.greeting);
        if (l.includes('ár') || l.includes('csomag') || l.includes('mennyibe') || l.includes('díj') || l.includes('fizet') || l.includes('költség')) return pick(replies.ar);
        if (l.includes('setup') || l.includes('elindít') || l.includes('hogyan') || l.includes('mikor') || l.includes('gyors') || l.includes('beállít')) return pick(replies.setup);
        if (l.includes('mit tud') || l.includes('mire') || l.includes('képes') || l.includes('funkció') || l.includes('feature') || l.includes('lehetős')) return pick(replies.mire);
        if (l.includes('kapcsolat') || l.includes('hív') || l.includes('email') || l.includes('érdekel') || l.includes('ajánlat') || l.includes('info')) return pick(replies.contact);
        if (l.includes('vissza') || l.includes('főmenü')) return pick(replies.greeting);
        return pick(replies.fallback);
    }

    function addMessage(text, type, qrs) {
        const c = document.getElementById('aa-messages');
        const m = document.createElement('div');
        m.className = `aa-msg ${type}`;
        m.innerHTML = text;
        c.appendChild(m);
        if (qrs?.length) {
            const qrDiv = document.createElement('div');
            qrDiv.className = 'aa-qrs';
            qrs.forEach(q => {
                const b = document.createElement('button');
                b.className = 'aa-qr'; b.textContent = q;
                b.onclick = () => { qrDiv.remove(); sendMessage(q); };
                qrDiv.appendChild(b);
            });
            c.appendChild(qrDiv);
        }
        c.scrollTop = c.scrollHeight;
        messages.push({ role: type, content: text });
    }

    function showTyping() {
        const c = document.getElementById('aa-messages');
        const t = document.createElement('div');
        t.className = 'aa-typing'; t.id = 'aa-typing';
        t.innerHTML = '<span></span><span></span><span></span>';
        c.appendChild(t); c.scrollTop = c.scrollHeight;
    }
    function hideTyping() { const e = document.getElementById('aa-typing'); if(e) e.remove(); }

    async function sendMessage(text) {
        addMessage(text, 'user');
        const input = document.getElementById('aa-input');
        const btn = document.getElementById('aa-send');
        input.value = ''; input.disabled = true; btn.disabled = true;
        showTyping();
        await new Promise(r => setTimeout(r, 500 + Math.random() * 600));
        hideTyping();
        const r = getDemoReply(text);
        addMessage(r.text, 'bot', r.qr);
        input.disabled = false; btn.disabled = false; input.focus();
    }

    window.__aaToggle = function() {
        isOpen = !isOpen;
        document.getElementById('aa-chat').classList.toggle('open', isOpen);
        if (isOpen && messages.length === 0) {
            document.querySelector('.aa-dot').style.display = 'none';
            setTimeout(() => {
                showTyping();
                setTimeout(() => {
                    hideTyping();
                    const g = pick(replies.greeting);
                    addMessage(g.text, 'bot', g.qr);
                }, 700);
            }, 250);
        }
        if (isOpen) setTimeout(() => document.getElementById('aa-input').focus(), 300);
    };

    window.__aaSend = function() {
        const input = document.getElementById('aa-input');
        const text = input.value.trim();
        if (text) sendMessage(text);
    };

    document.getElementById('aa-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); window.__aaSend(); }
    });
})();
