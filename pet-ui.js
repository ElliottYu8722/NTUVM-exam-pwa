/* pet-ui.js  我的寵物：介面與 app.js 整合點 */
(function (root) {
  'use strict';
  var C = root.PetCore, ST = root.PetStore;
  var S = null, panel = null, sheet = null, body = null, toastEl = null, modalEl = null;
  var tab = 'pet', selId = null, timeOffset = 0, adoptOpen = false, adoptSp = 'dog', adoptPick = null, restoring = false;

  var ICON = {
    pet: '<path d="M8.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-7-1c-2.6 0-5 2.4-5 4.3 0 1.2 1 1.7 2.2 1.7 1.1 0 1.8-.5 2.8-.5s1.7.5 2.8.5c1.2 0 2.2-.5 2.2-1.7 0-1.9-2.4-4.3-5-4.3z"/>',
    shop: '<path d="M6 7V6a6 6 0 0 1 12 0v1h2.2l-1.1 14H4.9L3.8 7H6zm2 0h8V6a4 4 0 0 0-8 0v1z"/>',
    care: '<path d="M12 21s-7.5-4.6-9.5-9.4C1 7.9 3.4 4.5 7 4.5c2 0 3.5 1.1 5 2.9 1.5-1.8 3-2.9 5-2.9 3.6 0 6 3.4 4.5 7.1C19.5 16.4 12 21 12 21zm-1-12v3H8v2h3v3h2v-3h3v-2h-3V9h-2z"/>',
    owner: '<path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4.4 0-8 2.5-8 5.5V21h16v-1.5c0-3-3.6-5.5-8-5.5z"/>',
    lobby: '<path d="M12 2 2 7v2h20V7L12 2zm-7 9v7H3v3h18v-3h-2v-7h-2v7h-3v-7h-4v7H7v-7H5z"/>',
    backup: '<path d="M19 18H6a4 4 0 0 1-.6-8A6 6 0 0 1 17 8.1 5 5 0 0 1 19 18zm-8-7v4H8.5l3.5 3.5 3.5-3.5H13v-4h-2z"/>',
    close: '<path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/>',
    coin: '<circle cx="12" cy="12" r="9" fill="#f6c343"/><circle cx="12" cy="12" r="6.3" fill="none" stroke="#c98a12" stroke-width="1.6"/><path d="M12 8.2v7.6M9.8 10h4.4" stroke="#c98a12" stroke-width="1.6" stroke-linecap="round"/>',
    plus: '<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>'
  };
  function svg(name, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="currentColor" aria-hidden="true">' + ICON[name] + '</svg>';
  }

  function now() { return Date.now() + timeOffset; }
  function h(tag, props, kids) {
    var e = document.createElement(tag), k;
    if (props) for (k in props) {
      if (props[k] == null) continue;
      if (k === 'class') e.className = props[k];
      else if (k === 'text') e.textContent = props[k];
      else if (k === 'html') e.innerHTML = props[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (c) { if (c == null || c === false) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  function css() {
    var st = document.createElement('style');
    st.id = 'petStyle';
    st.textContent = [
      '#petPanel{--bg:#fbf7f1;--card:#fff;--ink:#2b2620;--sub:#8a7f72;--line:#ece4d8;--pri:#e8833a;--pri2:#f6a65a;--ok:#4caf7a;--warn:#e7a33c;--bad:#d9534f;--pink:#f07aa0;',
      'position:fixed;inset:0;z-index:9999;background:rgba(20,16,12,.55);display:none;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;-webkit-tap-highlight-color:transparent}',
      '#petPanel *{box-sizing:border-box}',
      '#petPanel .sheet{background:var(--bg);color:var(--ink);width:min(540px,100vw);height:min(880px,100dvh);display:flex;flex-direction:column;border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}',
      '@media (max-width:600px){#petPanel .sheet{border-radius:0;height:100dvh}}',
      '#petPanel .hd{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;padding-top:max(12px,env(safe-area-inset-top));background:var(--bg)}',
      '#petPanel .hd .t{font-size:19px;font-weight:700;flex:1;letter-spacing:.5px}',
      '#petPanel .coin{display:flex;align-items:center;gap:5px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 10px 4px 6px;font-weight:700;font-size:15px}',
      '#petPanel .earn{border:0;background:var(--pri);color:#fff;border-radius:999px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer}',
      '#petPanel .x{border:0;background:transparent;color:var(--sub);padding:6px;cursor:pointer;display:flex;border-radius:10px}',
      '#petPanel .x:hover{background:var(--line)}',
      '#petPanel .bd{flex:1;overflow:auto;padding:4px 14px 18px;-webkit-overflow-scrolling:touch}',
      '#petPanel .nav{display:flex;border-top:1px solid var(--line);background:#fff;padding-bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px))}',
      '#petPanel .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
      '@media (max-width:420px){#petPanel .grid4{grid-template-columns:repeat(2,1fr)}}',
      '#petPanel .snk{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}',
      '#petPanel .snk button{border:1px solid var(--line);background:#fff;border-radius:12px;padding:9px 4px;font-size:13px;font-weight:600;cursor:pointer;color:var(--ink)}',
      '#petPanel .snk button small{display:block;font-weight:500;color:var(--sub);font-size:11px;margin-top:2px}',
      '#petPanel .snk button:disabled{opacity:.45}',
      '#petPanel .acts{display:flex;flex-wrap:wrap;gap:8px}',
      '#petPanel .acts .btn{flex:1 1 calc(33% - 8px);min-width:96px;padding:10px 8px;font-size:14px}',
      '#petPanel .pick{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
      '#petPanel .pick button{border:1px solid var(--line);background:#fff;border-radius:10px;padding:7px 10px;font-size:13px;cursor:pointer;color:var(--ink)}',
      '#petPanel .pick button.on{background:var(--ink);color:#fff;border-color:var(--ink)}',
      '#petPanel .dots{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}',
      '#petPanel .dots button{width:30px;height:30px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--line);cursor:pointer;padding:0}',
      '#petPanel .dots button.on{box-shadow:0 0 0 2.5px var(--pri)}',
      '#petPanel .avbox{height:230px;border-radius:16px;background:linear-gradient(180deg,#fdf1e2,#f3e3cc);position:relative;overflow:hidden}',
      '#petPanel .lbl{font-size:12px;color:var(--sub);font-weight:600;margin-top:12px}',
      '#petPanel .ach{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}',
      '#petPanel .ach:first-child{border-top:0}',
      '#petPanel .ach .st{display:flex;gap:4px}',
      '#petPanel .ach .st i{width:22px;height:22px;border-radius:50%;background:#f0e9df;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:10px;color:#a99}',
      '#petPanel .ach .st i.on{background:#f6c343;color:#7a5200;font-weight:700}',
      '#petPanel .on-dot{width:9px;height:9px;border-radius:50%;background:#cfc6ba;display:inline-block;flex:none}',
      '#petPanel .on-dot.live{background:#4caf7a}',
      '#petPanel .lobby-hero{border-radius:18px;padding:18px;color:#fff;background:linear-gradient(160deg,#5f9c4f,#2f6b45);position:relative;overflow:hidden}',
      '#petPanel .lobby-hero b{font-size:20px;display:block}',
      '#petPanel .lobby-hero p{margin:6px 0 14px;font-size:13px;opacity:.9;line-height:1.5}',
      '#petPanel .nav button{flex:1;border:0;background:transparent;color:var(--sub);padding:10px 0 6px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;cursor:pointer}',
      '#petPanel .nav button.on{color:var(--pri);font-weight:700}',
      '#petPanel .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin:10px 0}',
      '#petPanel .sec{font-size:13px;color:var(--sub);font-weight:600;margin:16px 2px 6px;letter-spacing:.5px}',
      '#petPanel .btn{border:0;border-radius:12px;padding:11px 14px;font-size:15px;font-weight:600;cursor:pointer;background:var(--pri);color:#fff;transition:transform .08s,opacity .15s}',
      '#petPanel .btn:active{transform:scale(.97)}',
      '#petPanel .btn:disabled{opacity:.45;cursor:default}',
      '#petPanel .btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}',
      '#petPanel .btn.soft{background:#fdeedd;color:#b8611f}',
      '#petPanel .btn.danger{background:#fff;color:var(--bad);border:1px solid #f1c9c7}',
      '#petPanel .btn.block{width:100%}',
      '#petPanel .btn small{display:block;font-size:11px;font-weight:500;opacity:.8;margin-top:2px}',
      '#petPanel .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '#petPanel .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
      '#petPanel .muted{color:var(--sub);font-size:13px;line-height:1.5}',
      '#petPanel .pet-stage-slot{margin:6px 0 0;border-radius:18px;overflow:hidden;background:#f1dfc4;min-height:240px;position:relative}',
      '#petPanel .pet-stage-slot>div{margin:0!important;border-radius:0!important}',
      '#petPanel .chips{display:flex;gap:6px;overflow-x:auto;padding:8px 0 2px}',
      '#petPanel .chip{flex:none;border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:999px;padding:6px 12px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px}',
      '#petPanel .chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}',
      '#petPanel .chip.add{color:var(--pri);border-style:dashed;border-color:var(--pri2)}',
      '#petPanel .name{font-size:21px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '#petPanel .tag{font-size:12px;font-weight:600;border-radius:999px;padding:2px 8px;background:#f3ede4;color:#7a6b5a}',
      '#petPanel .tag.easy{background:#e3f4ea;color:#2f8a57}#petPanel .tag.mid{background:#fdf0d9;color:#a86b12}#petPanel .tag.hard{background:#fbe1e0;color:#b23a36}',
      '#petPanel .stat{margin-top:10px}',
      '#petPanel .stat .l{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px}',
      '#petPanel .stat .l b{font-size:14px}',
      '#petPanel .bar{height:9px;border-radius:9px;background:#f0e9df;overflow:hidden}',
      '#petPanel .bar i{display:block;height:100%;border-radius:9px;transition:width .4s}',
      '#petPanel .bcs{display:grid;grid-template-columns:repeat(9,1fr);gap:3px}',
      '#petPanel .bcs i{height:9px;border-radius:3px;background:#f0e9df}',
      '#petPanel .bcs i.ideal{background:#d6eedf}',
      '#petPanel .bcs i.cur{background:var(--ink)}',
      '#petPanel .row{display:flex;align-items:center;gap:10px}',
      '#petPanel .item{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line)}',
      '#petPanel .item:first-child{border-top:0;padding-top:2px}',
      '#petPanel .item .ic{width:42px;height:42px;border-radius:12px;background:#fdeedd;color:#c26a22;display:flex;align-items:center;justify-content:center;flex:none;font-weight:700;font-size:15px}',
      '#petPanel .item .tx{flex:1;min-width:0}',
      '#petPanel .item .tx b{display:block;font-size:15px}',
      '#petPanel .item .tx span{font-size:12px;color:var(--sub)}',
      '#petPanel .item .btn{padding:8px 12px;font-size:14px;flex:none}',
      '#petPanel .done{font-size:13px;color:var(--ok);font-weight:600;flex:none}',
      '#petPanel input[type=text],#petPanel input[type=number]{width:100%;font-size:16px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);outline:none}',
      '#petPanel input:focus{border-color:var(--pri2);box-shadow:0 0 0 3px rgba(232,131,58,.15)}',
      '#petPanel .seg{display:flex;background:#efe7db;border-radius:12px;padding:3px;gap:3px}',
      '#petPanel .seg button{flex:1;border:0;background:transparent;border-radius:9px;padding:8px;font-size:14px;cursor:pointer;color:var(--sub);font-weight:600}',
      '#petPanel .seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)}',
      '#petPanel .breeds{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:8px}',
      '#petPanel .breed{border:1.5px solid var(--line);background:#fff;border-radius:14px;padding:10px 8px;text-align:center;cursor:pointer;font-size:13px;line-height:1.3;color:var(--ink)}',
      '#petPanel .breed.on{border-color:var(--pri);box-shadow:0 0 0 3px rgba(232,131,58,.15)}',
      '#petPanel .sw{width:30px;height:30px;border-radius:50%;margin:0 auto 6px;border:2px solid #fff;box-shadow:0 0 0 1px var(--line)}',
      '#petPanel .welcome{min-height:100%;display:flex;flex-direction:column;justify-content:center;padding:20px 6px;text-align:center}',
      '#petPanel .welcome .big{font-size:26px;font-weight:800;margin:14px 0 6px}',
      '#petPanel .welcome .paw{width:76px;height:76px;margin:0 auto;border-radius:24px;background:linear-gradient(135deg,#f6a65a,#e8833a);color:#fff;display:flex;align-items:center;justify-content:center}',
      '#petPanel .link{background:none;border:0;color:var(--sub);text-decoration:underline;font-size:14px;cursor:pointer;margin-top:14px;padding:8px}',
      '#petPanel .lvl{display:flex;align-items:center;gap:14px}',
      '#petPanel .lvl .n{width:58px;height:58px;border-radius:18px;background:var(--ink);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:22px;line-height:1}',
      '#petPanel .lvl .n small{font-size:10px;font-weight:500;opacity:.7;margin-bottom:2px}',
      '#petPanel .code{font-family:ui-monospace,Menlo,monospace;font-size:16px;letter-spacing:1px;background:#f6f1ea;border-radius:10px;padding:8px 10px;flex:1}',
      '#petPanel .warn{background:#fff6e8;border:1px solid #f6dcb0;color:#8a5a10;border-radius:12px;padding:10px 12px;font-size:13px;margin-top:10px}',
      '#petToast{position:fixed;left:50%;bottom:calc(100px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(10px);background:rgba(43,38,32,.94);color:#fff;padding:10px 18px;border-radius:999px;z-index:10002;font-size:14px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;max-width:88vw;text-align:center;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif}',
      '#petToast.on{opacity:1;transform:translateX(-50%) translateY(0)}',
      '#petModal{position:fixed;inset:0;z-index:10003;background:rgba(20,16,12,.5);display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif}',
      '#petModal .m{background:#fff;color:#2b2620;border-radius:18px;padding:20px;width:min(360px,100%);box-shadow:0 20px 50px rgba(0,0,0,.3)}',
      '#petModal .m b{display:block;font-size:17px;margin-bottom:6px}',
      '#petModal .m p{margin:0 0 16px;color:#6f655a;font-size:14px;line-height:1.5}',
      '#petModal .m .r{display:flex;gap:8px}',
      '#petModal .m button{flex:1;border:0;border-radius:12px;padding:11px;font-size:15px;font-weight:600;cursor:pointer}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function toast(msg) {
    if (!toastEl) { toastEl = h('div', { id: 'petToast' }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }
  function ask(title, text, okText, danger) {
    return new Promise(function (res) {
      if (modalEl) modalEl.remove();
      function done(v) { modalEl.remove(); modalEl = null; res(v); }
      modalEl = h('div', { id: 'petModal', onclick: function (e) { if (e.target === modalEl) done(false); } }, [
        h('div', { class: 'm' }, [
          h('b', { text: title }), h('p', { text: text }),
          h('div', { class: 'r' }, [
            h('button', { text: '取消', style: 'background:#f1ebe3;color:#2b2620', onclick: function () { done(false); } }),
            h('button', { text: okText || '確定', style: 'color:#fff;background:' + (danger ? '#d9534f' : '#e8833a'), onclick: function () { done(true); } })
          ])
        ])
      ]);
      document.body.appendChild(modalEl);
    });
  }
  root.PetAsk = ask;

  function emit(name, detail) { try { root.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) {} }
  function commit() { C.tick(S, now()); ST.save(S); if (isOpen()) render(); }
  function toStage() {
    var slot = body && body.querySelector('.pet-stage-slot');
    if (!slot) return;
    var d = slot.getBoundingClientRect().top - body.getBoundingClientRect().top;
    if (d < 0) body.scrollTo({ top: Math.max(0, body.scrollTop + d - 8), behavior: 'smooth' });
  }
  function act(r, ev) { toast(r.msg); if (r.ok && ev) emit('petui:action', ev); commit(); if (r.ok && ev && ev.petId) toStage(); return r.ok; }
  function curPet() {
    if (!S || !S.owner) return null;
    var p = C.findPet(S, selId) || S.pets[0] || null;
    if (p) selId = p.id;
    return p;
  }
  function isOpen() { return panel && panel.style.display === 'flex'; }

  var backAfterQuiz = false, quizWatch = 0;
  var QUIZ_IDS = ['random-quiz-prep-mask', 'random-quiz-cross-mask', 'random-quiz-loading-mask', 'random-quiz-mask'];
  function quizOpen() { for (var i = 0; i < QUIZ_IDS.length; i++) if (document.getElementById(QUIZ_IDS[i])) return true; return false; }
  function goQuiz() {
    close();
    var b = document.getElementById('btnRandomQuiz');
    if (!b) { toast('請點選左側的「隨機測驗」'); return; }
    backAfterQuiz = true; b.click();
    var t0 = Date.now(), seen = false;
    clearInterval(quizWatch);
    quizWatch = setInterval(function () {
      if (quizOpen()) { seen = true; return; }
      if (!seen && Date.now() - t0 < 4000) return;
      clearInterval(quizWatch);
      if (backAfterQuiz) { backAfterQuiz = false; open(); }
    }, 350);
  }
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#rq-main-review')) backAfterQuiz = false;
  }, true);

  function placeEntry() {
    var tries = 0;
    function attempt() {
      if (document.getElementById('btnPet')) return;
      var prog = document.getElementById('btnProgress');
      if (prog && prog.parentNode) {
        var b = document.createElement('button');
        b.id = 'btnPet';
        b.textContent = '我的寵物';
        b.className = prog.className || '';
        if (prog.style && prog.style.cssText) b.style.cssText = prog.style.cssText;
        b.addEventListener('click', function (e) { e.preventDefault(); open(); });
        prog.parentNode.insertBefore(b, prog.nextSibling);
        var f = document.getElementById('petEntryFloat'); if (f) f.remove();
        return;
      }
      tries++;
      if (tries === 20 && !document.getElementById('petEntryFloat')) {
        var fb = h('button', { id: 'petEntryFloat', text: '我的寵物', onclick: open });
        fb.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9998;background:#e8833a;color:#fff;border:0;border-radius:999px;padding:10px 16px;font-size:14px;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer';
        document.body.appendChild(fb);
      }
      if (tries < 120) setTimeout(attempt, 250);
    }
    attempt();
  }

  function bar(pct, color) {
    var b = h('div', { class: 'bar' }, [h('i')]);
    b.firstChild.style.width = Math.max(0, Math.min(100, pct)) + '%';
    b.firstChild.style.background = color;
    return b;
  }
  function stat(label, value, el) {
    return h('div', { class: 'stat' }, [h('div', { class: 'l' }, [h('span', { text: label }), h('b', { text: value })]), el]);
  }
  function bcsBar(v) {
    var w = h('div', { class: 'bcs' });
    for (var i = 1; i <= 9; i++) w.appendChild(h('i', { class: i === v ? 'cur' : ((i === 4 || i === 5) ? 'ideal' : '') }));
    return w;
  }
  function swatch(id) {
    var P = root.Pet3D && root.Pet3D.PARAMS && root.Pet3D.PARAMS[id];
    var c1 = P && P.col ? P.col : '#d9a066', c2 = P && P.col2 ? P.col2 : c1;
    var s = h('div', { class: 'sw' }); s.style.background = 'linear-gradient(135deg,' + c1 + ' 55%,' + c2 + ' 55%)'; return s;
  }

  /* 首次使用 */
  function renderWelcome() {
    if (restoring) return renderRestore();
    var nm = h('input', { type: 'text', placeholder: '你的名字', maxlength: '12', autocomplete: 'off' });
    function go() {
      var v = nm.value.trim(); if (!v) { toast('請輸入名字'); nm.focus(); return; }
      C.createOwner(S, v); tab = 'pet'; adoptOpen = true; commit(); toast('歡迎，' + v);
    }
    nm.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    body.appendChild(h('div', { class: 'welcome' }, [
      h('div', { class: 'paw', html: svg('pet', 44) }),
      h('div', { class: 'big', text: '開始養寵物' }),
      h('p', { class: 'muted', text: '答對國考題換金幣，用金幣照顧你的狗狗或貓咪。' }),
      h('div', { style: 'margin:22px 0 12px' }, [nm]),
      h('button', { class: 'btn block', text: '開始', onclick: go }),
      h('button', { class: 'link', text: '我有備份檔，從備份還原', onclick: function () { restoring = true; render(); } })
    ]));
    setTimeout(function () { nm.focus(); }, 60);
  }
  function filePicker(label) {
    var f = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    f.addEventListener('change', function () {
      var file = f.files && f.files[0]; if (!file) return;
      var rd = new FileReader();
      rd.onload = function () {
        var s = ST.parseBackup(String(rd.result));
        if (!s) { toast('這不是有效的備份檔'); return; }
        S = C.migrate(s); selId = null; restoring = false; tab = 'pet'; commit(); toast('還原完成');
      };
      rd.readAsText(file);
    });
    var b = h('button', { class: 'btn block', text: label, onclick: function () { f.click(); } });
    return h('div', {}, [f, b]);
  }
  function renderRestore() {
    body.appendChild(h('div', { class: 'welcome' }, [
      h('div', { class: 'paw', html: svg('backup', 44) }),
      h('div', { class: 'big', text: '從備份還原' }),
      h('p', { class: 'muted', text: '選擇之前在「備份」頁下載的 .json 檔。' }),
      h('div', { style: 'margin-top:22px' }, [filePicker('選擇備份檔')]),
      h('button', { class: 'link', text: '返回', onclick: function () { restoring = false; render(); } })
    ]));
  }

  /* 寵物 */
  function stageBusy() { var st = root.Pet3D && root.Pet3D.stage && root.Pet3D.stage(); return st && st.busy && st.busy(); }
  function renderPet() {
    var p = curPet();
    if (!p || adoptOpen) { renderAdopt(); return; }
    var b = C.breed(p.breedId), N = C.need(p), t = now(), cat = b.sp === 'cat';

    var chips = h('div', { class: 'chips' });
    S.pets.forEach(function (x) {
      chips.appendChild(h('button', { class: 'chip' + (x.id === p.id ? ' on' : ''), text: x.name, onclick: function () { selId = x.id; render(); } }));
    });
    if (S.pets.length < S.owner.level) chips.appendChild(h('button', { class: 'chip add', html: svg('plus', 14) + '領養', onclick: function () { adoptOpen = true; adoptPick = null; render(); } }));
    if (S.pets.length > 1 || S.pets.length < S.owner.level) body.appendChild(chips);

    body.appendChild(h('div', { class: 'pet-stage-slot' }));

    var happyCap = C.overdueCare(p, t);
    var card = h('div', { class: 'card' }, [
      h('div', { class: 'name' }, [p.name]),
      h('div', { class: 'muted', text: b.name + '・' + C.ageText(p, t) + '・' + C.dayKey(p.adoptTs) + ' 領養' + (p.neutered ? '・已結紮' : '') }),
      stat('開心', Math.round(p.happy) + ' / ' + (happyCap ? C.CFG.capNoCare : 100), bar(p.happy, 'var(--pink)')),
      stat('今日飼料', p.fed + ' / ' + N + ' 單位・' + p.meals + ' / ' + C.CFG.mealMax + ' 餐', bar(p.fed / N * 100, p.fed > N ? 'var(--warn)' : 'var(--ok)')),
      stat('BCS', p.bcs + ' / 9 ' + C.bcsLabel(p.bcs) + (C.MUSCLE[p.muscle] && p.muscle ? '・' + C.MUSCLE[p.muscle] : ''), bcsBar(p.bcs))
    ]);
    if (happyCap) card.appendChild(h('div', { class: 'warn', text: '這個月的驅蟲或健康檢查還沒做，開心上限降為 ' + C.CFG.capNoCare + '。' }));
    body.appendChild(card);

    var full = p.meals >= C.CFG.mealMax;
    body.appendChild(h('div', { class: 'sec', text: '餵食' + (full ? '（今天三餐已吃完）' : '・每天約 ' + N + ' 單位') }));
    var g = h('div', { class: 'grid4' });
    C.MEALS.forEach(function (m) {
      var bt = h('button', { class: 'btn ' + (m.id === 'meal' ? '' : 'soft'), onclick: function () { var r = C.feed(S, p.id, m.id, now()); act(r, { type: 'feed', petId: p.id, food: r.food }); } }, [m.name, h('small', { text: m.price + ' 金幣・' + m.units + ' 單位' })]);
      if (full) bt.disabled = true; g.appendChild(bt);
    });
    var cn = h('button', { class: 'btn', style: 'background:linear-gradient(135deg,#d9a441,#b97a1c)', onclick: function () { var r = C.feed(S, p.id, 'canned', now()); act(r, { type: 'feed', petId: p.id, food: 'canned' }); } }, ['高級罐頭', h('small', { text: C.CFG.cannedPrice + ' 金幣・開心 +' + C.CFG.cannedGain })]);
    if (full) cn.disabled = true; g.appendChild(cn);
    body.appendChild(g);

    var snFull = p.snacks >= C.CFG.snackMax;
    body.appendChild(h('div', { class: 'sec', text: '零食・每個 ' + C.CFG.snackPrice + ' 金幣・今天 ' + p.snacks + ' / ' + C.CFG.snackMax }));
    var sg = h('div', { class: 'snk' });
    C.snackList(p).forEach(function (x) {
      var bt = h('button', { onclick: function () { var r = C.snack(S, p.id, now(), x.id); act(r, { type: 'snack', petId: p.id, snack: x.id }); } }, [x.name, h('small', { text: '+' + C.CFG.snackGain + ' 開心' })]);
      if (snFull) bt.disabled = true; sg.appendChild(bt);
    });
    body.appendChild(sg);

    body.appendChild(h('div', { class: 'sec', text: '互動' }));
    var ck = C.canPlay(p);
    var gear = p.items.stroller && p.equip.stroller ? '推車' : (p.items.harness && p.equip.harness ? '胸背帶' : '');
    body.appendChild(h('button', { class: 'btn block', style: 'background:#3f8f63', onclick: function () { startPlay(p); } }, ['出門玩' + (gear ? '（' + gear + '）' : ''), h('small', { text: ck.ok ? '10 分鐘 +' + C.CFG.playGain + ' 開心' : ck.msg })]));
    var ac = h('div', { class: 'acts', style: 'margin-top:8px' });
    function aBtn(label, sub, fn, cls) { ac.appendChild(h('button', { class: 'btn ' + (cls || 'ghost'), onclick: fn }, [label, sub ? h('small', { text: sub }) : null])); }
    if (p.items.toy) aBtn('藏食玩具', p.daily.toy ? '今天玩過了' : '+' + C.CFG.toyGain + ' 開心', function () { doAct(p, function () { return C.useToy(S, p.id, 'toy', now()); }, { type: 'toy' }); });
    if (p.items.scratcher && cat) aBtn('貓抓板', p.daily.scratcher ? '今天抓過了' : '+' + C.CFG.scratchGain + ' 開心', function () { doAct(p, function () { return C.useToy(S, p.id, 'scratcher', now()); }, { type: 'scratch' }); });
    ['shake', 'down', 'spin', 'grin'].forEach(function (k) {
      if (p.tricks[k]) aBtn(C.TRICKS[k].name, p.tricksToday < C.CFG.trickMax ? '+' + C.CFG.trickGain + ' 開心' : '表演', function () { doAct(p, function () { return C.perform(S, p.id, k, now()); }, { type: 'trick', trick: k }); });
    });
    if (p.tricks.nails) aBtn('剪指甲', C.nailDue(p, t) ? '指甲長了' : '還很短', function () { doAct(p, function () { return C.trimNails(S, p.id, now()); }, { type: 'nails' }); }, C.nailDue(p, t) ? 'soft' : 'ghost');
    if (ac.childNodes.length) body.appendChild(ac);
    var lack = ['shake', 'down', 'spin', 'grin', 'nails'].filter(function (k) { return !p.tricks[k]; }).length;
    if (lack) body.appendChild(h('button', { class: 'link', style: 'margin-top:6px;display:block', text: '到商店學技能（握手、趴下、轉圈、露齒笑、剪指甲）', onclick: function () { tab = 'shop'; render(); setTimeout(function () { var el = body.querySelector('#petSkills'); if (el) el.scrollIntoView({ block: 'start' }); }, 30); } }));
  }
  function doAct(p, fn, ev) {
    if (stageBusy()) { toast(p.name + ' 正在忙，等一下'); return; }
    var r = fn(); ev.petId = p.id;
    if (r.ok) emit('petui:action', ev);
    toast(r.msg); commit();
    if (r.ok) toStage();
  }
  function startPlay(p) {
    C.tick(S, now());
    var ck = C.canPlay(p);
    if (!ck.ok) { toast(ck.msg); return; }
    if (root.PetPlay && root.PetPlay.start) { emit('petui:action', { type: 'play', petId: p.id }); root.PetPlay.start(p.id, { stroller: ck.stroller }); }
    else toast('戶外場景載入失敗，請重新整理');
  }

  var adPrev = null;
  function renderAdopt() {
    var has = S.pets.length > 0;
    if (S.pets.length >= S.owner.level) { adoptOpen = false; return renderPet(); }
    body.appendChild(h('div', { class: 'row', style: 'margin-top:8px' }, [
      h('div', { style: 'flex:1' }, [h('div', { class: 'name', text: '領養新寵物' }), h('div', { class: 'muted', text: '領養免費，之後每天要用金幣買飼料。' })]),
      has ? h('button', { class: 'btn ghost', text: '取消', onclick: function () { adoptOpen = false; render(); } }) : null
    ]));
    var seg = h('div', { class: 'seg', style: 'margin-top:14px' });
    [['dog', '狗'], ['cat', '貓']].forEach(function (x) {
      seg.appendChild(h('button', { class: adoptSp === x[0] ? 'on' : '', text: x[1], onclick: function () { adoptSp = x[0]; adoptPick = null; render(); } }));
    });
    body.appendChild(seg);
    var grid = h('div', { class: 'breeds', style: 'margin-top:12px' });
    C.BREEDS.filter(function (b) { return b.sp === adoptSp; }).forEach(function (b) {
      grid.appendChild(h('button', { class: 'breed' + (adoptPick === b.id ? ' on' : ''), onclick: function () { adoptPick = b.id; render(); setTimeout(function () { var el = body.querySelector('#petAdoptForm'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 30); } }, [swatch(b.id), b.name.replace(/（.*）/, '')]));
    });
    body.appendChild(grid);
    if (adoptPick) {
      var b = C.breed(adoptPick);
      var nm = h('input', { type: 'text', placeholder: '幫牠取名字', maxlength: '12', autocomplete: 'off' });
      var age = h('input', { type: 'number', min: '0', max: '20', step: '0.5', value: '1', inputmode: 'decimal' });
      var pbox = h('div', { class: 'avbox', style: 'height:210px;margin-top:10px' });
      if (adPrev && adPrev.api) adPrev.api.dispose();
      adPrev = { api: null }; var mineP = adPrev;
      if (root.PetAvatar && root.PetAvatar.previewPet) root.PetAvatar.previewPet(pbox, b.id).then(function (api) { if (mineP === adPrev && pbox.isConnected) mineP.api = api; else api.dispose(); }, function () { pbox.appendChild(h('div', { class: 'muted', style: 'padding:90px 0;text-align:center', text: '3D 載入失敗' })); });
      body.appendChild(h('div', { class: 'card', id: 'petAdoptForm' }, [
        h('div', { class: 'row' }, [(function () { var w = swatch(b.id); w.style.margin = '0'; return w; })(), h('b', { text: b.name, style: 'font-size:17px' })]),
        pbox,
        h('div', { class: 'muted', style: 'text-align:center;margin-top:4px', text: '左右拖曳可以轉動' }),
        h('div', { style: 'margin-top:12px' }, [nm]),
        h('div', { class: 'row', style: 'margin-top:8px' }, [h('span', { class: 'muted', text: '目前年齡（歲）', style: 'flex:none' }), age]),
        h('button', { class: 'btn block', style: 'margin-top:12px', text: '領養', onclick: function () {
          var r = C.adopt(S, b.id, nm.value, (parseFloat(age.value) || 0) * 365, now());
          if (r.ok) { selId = r.pet ? r.pet.id : null; adoptOpen = false; adoptPick = null; }
          act(r);
        } })
      ]));
    }
  }

  /* 商店 */
  function renderShop() {
    var p = curPet();
    if (!p) { body.appendChild(empty()); return; }
    var cat = C.breed(p.breedId).sp === 'cat';
    body.appendChild(petSwitch('幫誰買東西'));
    var card = h('div', { class: 'card' });
    function row(target, icon, name, desc, right, icStyle) {
      target.appendChild(h('div', { class: 'item' }, [
        h('div', { class: 'ic', text: icon, style: icStyle || '' }),
        h('div', { class: 'tx' }, [h('b', { text: name }), h('span', { text: desc })]),
        right
      ]));
    }
    function buyBtn(price, fn) { return h('button', { class: 'btn', onclick: fn }, [price + ' 金幣']); }
    function gearRow(k, icon, name, desc, price) {
      var right = p.items[k]
        ? h('button', { class: 'btn ' + (p.equip[k] ? 'ghost' : 'soft'), text: p.equip[k] ? '卸下' : '裝備', onclick: function () { act(C.equip(S, p.id, k, !p.equip[k])); } })
        : buyBtn(price, function () { act(C.buyItem(S, p.id, k)); });
      row(card, icon, name + (p.items[k] && p.equip[k] ? '・裝備中' : ''), desc, right);
    }
    gearRow('harness', '帶', '胸背帶', '裝備後可以出門散步', C.CFG.harnessPrice);
    gearRow('stroller', '車', '外出推車', '裝備後用推車出門，BCS 8 以上也能出門，不計入減重', C.CFG.strollerPrice);
    body.appendChild(h('div', { class: 'sec', text: '外出' }));
    body.appendChild(card);

    var tc = h('div', { class: 'card' });
    Object.keys(C.TOYS).forEach(function (k) {
      var it = C.TOYS[k]; if (it.sp.indexOf(cat ? 'cat' : 'dog') < 0) return;
      row(tc, k === 'toy' ? '藏' : '抓', it.name, it.desc, p.items[k] ? h('span', { class: 'done', text: '已擁有' }) : buyBtn(it.price, function () { act(C.buyItem(S, p.id, k)); }), 'background:#e3f1fb;color:#2e78b7');
    });
    body.appendChild(h('div', { class: 'sec', text: '玩具' }));
    body.appendChild(tc);

    var sk = h('div', { class: 'card' });
    var skDesc = { shake: '伸出前腳跟你握手', down: '聽口令乖乖趴下', spin: '原地轉兩圈', grin: '露出牙齒對你笑', nails: '每 ' + C.CFG.nailDays + ' 天剪一次，開心 +' + C.CFG.nailGain };
    Object.keys(C.TRICKS).forEach(function (k) {
      var it = C.TRICKS[k];
      row(sk, it.name.slice(-2, -1) === '指' ? '剪' : it.name.charAt(0), it.name, skDesc[k], p.tricks[k] ? h('span', { class: 'done', text: '已學會' }) : buyBtn(it.price, function () { act(C.learn(S, p.id, k)); }), 'background:#f3e8fb;color:#8a4bb8');
    });
    body.appendChild(h('div', { class: 'sec', id: 'petSkills', text: '技能' }));
    body.appendChild(sk);

    var cl = h('div', { class: 'card' }), icons = { normal: '衣', trend: '潮', gold: '金' };
    Object.keys(C.CLOTHES).forEach(function (k) {
      var c = C.CLOTHES[k], on = p.wear === k, owned = p.items.clothes[k];
      row(cl, icons[k] || '衣', c.name, '穿著時每天開心少掉 ' + c.bonus, owned
        ? h('button', { class: 'btn ' + (on ? 'ghost' : 'soft'), text: on ? '脫下' : '穿上', onclick: function () { act(C.wear(S, p.id, on ? '' : k)); } })
        : buyBtn(c.price, function () { act(C.buyItem(S, p.id, k)); }), k === 'gold' ? 'background:#fff3c4;color:#a87b00' : '');
    });
    body.appendChild(h('div', { class: 'sec', text: '衣服' }));
    body.appendChild(cl);
  }
  function petSwitch(label) {
    if (S.pets.length < 2) return h('div');
    var chips = h('div', { class: 'chips' });
    S.pets.forEach(function (x) { chips.appendChild(h('button', { class: 'chip' + (x.id === selId ? ' on' : ''), text: x.name, onclick: function () { selId = x.id; render(); } })); });
    return h('div', {}, [h('div', { class: 'sec', text: label }), chips]);
  }
  function empty() {
    return h('div', { class: 'welcome' }, [h('p', { class: 'muted', text: '先領養一隻寵物。' }), h('button', { class: 'btn', text: '去領養', onclick: function () { tab = 'pet'; adoptOpen = true; render(); } })]);
  }

  /* 照護 */
  function renderCare() {
    var p = curPet();
    if (!p) { body.appendChild(empty()); return; }
    var mk = C.monthKey(now());
    body.appendChild(petSwitch('照護對象'));
    body.appendChild(h('div', { class: 'sec', text: '每月照護（' + mk.replace('-', ' 年 ') + ' 月）' }));
    var card = h('div', { class: 'card' });
    function row(icon, name, desc, price, done, kind) {
      card.appendChild(h('div', { class: 'item' }, [
        h('div', { class: 'ic', text: icon, style: 'background:#e6f3ec;color:#2f8a57' }),
        h('div', { class: 'tx' }, [h('b', { text: name }), h('span', { text: desc })]),
        done ? h('span', { class: 'done', text: '已完成' }) : h('button', { class: 'btn', text: price + ' 金幣', onclick: function () { act(C.care(S, p.id, kind, now())); } })
      ]));
    }
    row('驅', '驅蟲', '每月一次', C.CFG.dewormPrice, p.care.deworm === mk, 'deworm');
    row('檢', '健康檢查', '每月一次', C.CFG.checkupPrice, p.care.checkup === mk, 'checkup');
    body.appendChild(card);
    body.appendChild(h('p', { class: 'muted', style: 'margin:4px 2px', text: '每月 ' + C.CFG.graceDays + ' 號後還沒做完，開心上限會降到 ' + C.CFG.capNoCare + '。' }));
    body.appendChild(h('div', { class: 'sec', text: '一次性' }));
    var c2 = h('div', { class: 'card' }); card = c2;
    row('紮', '結紮', '之後食量需求 -10%，比較容易變胖', C.CFG.neuterPrice, p.neutered, 'neuter');
    body.appendChild(c2);
  }

  /* 飼主 */
  var avPrev = null;
  function avatarEditor() {
    var o = S.owner, look = o.look, LK = C.LOOK;
    var box = h('div', { class: 'avbox' });
    if (avPrev && avPrev.api) { avPrev.api.dispose(); }
    avPrev = { el: box, api: null };
    var mine = avPrev;
    if (root.PetAvatar) root.PetAvatar.preview(box, look).then(function (api) { if (mine === avPrev && box.isConnected) mine.api = api; else api.dispose(); }, function () { box.appendChild(h('div', { class: 'muted', style: 'padding:90px 0;text-align:center', text: '3D 載入失敗' })); });
    var ed = h('div');
    function set(k, v) {
      look[k] = v;
      if (k === 'g') { var d = C.defaultLook(v); look.hair = d.hair; look.bottom = d.bottom; }
      ST.save(S); draw(); if (avPrev && avPrev.api) avPrev.api.update(look);
      if (root.PetSocial) root.PetSocial.publish();
    }
    function picks(label, key, names) {
      var w = h('div', { class: 'pick' });
      names.forEach(function (n, i) { w.appendChild(h('button', { class: look[key] === i ? 'on' : '', text: n, onclick: function () { set(key, i); } })); });
      return [h('div', { class: 'lbl', text: label }), w];
    }
    function dots(label, key, cols) {
      var w = h('div', { class: 'dots' });
      cols.forEach(function (c, i) { var b = h('button', { class: look[key] === i ? 'on' : '', 'aria-label': label + (i + 1), onclick: function () { set(key, i); } }); b.style.background = c; w.appendChild(b); });
      return [h('div', { class: 'lbl', text: label }), w];
    }
    function draw() {
      ed.innerHTML = '';
      var seg = h('div', { class: 'seg', style: 'margin-top:12px' });
      [['m', '男生'], ['f', '女生']].forEach(function (x) { seg.appendChild(h('button', { class: look.g === x[0] ? 'on' : '', text: x[1], onclick: function () { set('g', x[0]); } })); });
      ed.appendChild(seg);
      [].concat(picks('髮型', 'hair', LK.hair), dots('髮色', 'hairCol', LK.hairCol), picks('上衣', 'top', LK.top), dots('上衣顏色', 'topCol', LK.cloth),
        picks('下身', 'bottom', LK.bottom), dots('下身顏色', 'botCol', LK.cloth), dots('膚色', 'skin', LK.skin)).forEach(function (x) { ed.appendChild(x); });
    }
    draw();
    return h('div', { class: 'card' }, [box, h('div', { class: 'muted', style: 'text-align:center;margin-top:6px;font-size:12px', text: '拖曳可以轉動，點一下會揮手。全部免費，隨意搭配。' }), ed]);
  }
  function achCard() {
    var c = h('div', { class: 'card' });
    C.ACH.forEach(function (a) {
      var got = S.ach[a.id] || 0, n = S.stats[a.id] || 0, next = a.steps[got];
      var st = h('div', { class: 'st' });
      a.steps.forEach(function (x, i) { st.appendChild(h('i', { class: i < got ? 'on' : '', text: String(x) })); });
      c.appendChild(h('div', { class: 'ach' }, [
        h('div', { style: 'flex:1;min-width:0' }, [h('b', { text: a.name, style: 'font-size:15px;display:block' }), h('span', { class: 'muted', style: 'font-size:12px', text: '累計 ' + n + ' 次' + (next ? '・下一個 ' + next + ' 次 +' + a.reward[got] + ' 金幣' : '・全部完成') })]),
        st
      ]));
    });
    return c;
  }
  function renderOwner() {
    var o = S.owner, lv = o.level, max = C.CFG.maxLevel;
    var up = lv < max
      ? h('button', { class: 'btn block', style: 'margin-top:14px', onclick: function () { act(C.upgrade(S)); } }, ['升到等級 ' + (lv + 1), h('small', { text: C.CFG.levelCosts[lv - 1] + ' 金幣・可多養 1 隻' })])
      : h('div', { class: 'muted', style: 'margin-top:12px', text: '已達最高等級' });
    body.appendChild(h('div', { class: 'card', style: 'margin-top:12px' }, [
      h('div', { class: 'lvl' }, [
        h('div', { class: 'n' }, [h('small', { text: 'LV' }), String(lv)]),
        h('div', { style: 'flex:1' }, [
          h('div', { class: 'name', text: o.name }),
          h('div', { class: 'muted', text: '可養 ' + lv + ' 隻・目前 ' + S.pets.length + ' 隻・累計答對 ' + S.stats.quizCorrect + ' 題' })
        ])
      ]),
      stat('等級', lv + ' / ' + max, bar(lv / max * 100, 'var(--pri)')),
      up
    ]));
    body.appendChild(h('div', { class: 'sec', text: '飼主形象' }));
    body.appendChild(avatarEditor());
    body.appendChild(h('div', { class: 'sec', text: '成就' }));
    body.appendChild(achCard());
    var hidden = '••••-••••-••••', rc = h('div', { class: 'code', text: hidden });
    body.appendChild(h('div', { class: 'sec', text: '我的代碼' }));
    body.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'muted', text: '好友碼（可以給朋友）' }),
      h('div', { class: 'row', style: 'margin:4px 0 12px' }, [h('div', { class: 'code', text: o.friendCode }), copyBtn(o.friendCode)]),
      h('div', { class: 'muted', text: '恢復碼（私密，不要給別人）' }),
      h('div', { class: 'row', style: 'margin-top:4px' }, [rc, h('button', { class: 'btn ghost', text: '顯示', onclick: function (e) {
        var show = rc.textContent === hidden; rc.textContent = show ? o.recoveryCode : hidden; e.currentTarget.textContent = show ? '隱藏' : '顯示';
      } })])
    ]));
    renderBackup();
    body.appendChild(h('div', { class: 'sec', text: '重新開始' }));
    body.appendChild(h('div', { class: 'card' }, [
      h('b', { text: '刪除飼主和寵物，保留金幣', style: 'font-size:16px' }),
      h('p', { class: 'muted', style: 'margin:4px 0 12px', text: '飼主名字、等級、所有寵物和買過的物品都會刪除。目前的 ' + S.coins + ' 金幣會留下來。' }),
      h('button', { class: 'btn danger block', text: '刪除資料（保留金幣）', onclick: function () {
        ask('刪除飼主和寵物？', '等級、寵物和物品都會刪除，無法復原。' + S.coins + ' 金幣會保留。', '刪除', true).then(function (ok) {
          if (!ok) return;
          var keep = S.coins, seen = S.quizSeen;
          S = C.newState(); S.coins = keep; S.quizSeen = seen || {};
          selId = null; adoptOpen = false; tab = 'pet'; ST.save(S); render(); toast('已重新開始，保留 ' + keep + ' 金幣');
        });
      } }),
      h('button', { class: 'link', style: 'display:block;margin:10px auto 0;color:var(--bad)', text: '清除所有寵物資料（包含金幣）', onclick: function () {
        ask('清除所有資料？', '飼主、寵物和金幣都會刪除，無法復原。建議先下載備份。', '清除', true).then(function (ok) {
          if (!ok) return;
          S = C.newState(); selId = null; adoptOpen = false; tab = 'pet'; ST.save(S); render(); toast('已清除');
        });
      } })
    ]));
  }
  function copyBtn(txt) {
    return h('button', { class: 'btn ghost', text: '複製', onclick: function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast('已複製'); }, function () { toast(txt); });
      else toast(txt);
    } });
  }

  /* 備份 */
  function renderBackup() {
    body.appendChild(h('div', { class: 'sec', text: '備份' }));
    body.appendChild(h('div', { class: 'card' }, [
      h('p', { class: 'muted', style: 'margin:0 0 12px', text: '寵物資料只存在這台裝置的瀏覽器裡。換手機或清除瀏覽器資料前，請先下載備份。' }),
      h('div', { class: 'grid2' }, [
        h('button', { class: 'btn', text: '下載備份檔', onclick: function () { ST.exportJson(S); toast('已下載備份'); } }),
        (function () { var w = filePicker('從備份還原'); w.lastChild.className = 'btn ghost block'; return w; })()
      ])
    ]));
  }

  /* 大廳與好友 */
  function renderLobby() {
    var SO = root.PetSocial;
    body.appendChild(h('div', { class: 'lobby-hero', style: 'margin-top:12px' }, [
      h('b', { text: '椰林大廳' }),
      h('p', { text: '椰林大道旁的草地和木桌，帶著寵物坐下來讀書。靠近其他玩家可以打招呼、聊天、加好友。' }),
      h('button', { class: 'btn', style: 'background:#fff;color:#2f6b45', text: '進入大廳', onclick: function () {
        if (!S.pets.length) { toast('先領養一隻寵物'); return; }
        if (root.PetLobby) root.PetLobby.start(selId || S.pets[0].id); else toast('大廳載入失敗，請重新整理');
      } })
    ]));
    if (S.pets.length > 1) body.appendChild(petSwitch('帶誰去大廳'));
    var st = SO ? SO.status() : 'off';
    if (st !== 'ok') body.appendChild(h('div', { class: 'warn', text: st === 'denied' ? '線上功能目前無法連線（資料庫權限），大廳只能自己逛。' : (st === 'off' ? '目前離線，大廳只能自己逛。' : '連線中…') }));
    var rq = SO && SO.reqList ? SO.reqList() : [];
    if (rq.length) {
      body.appendChild(h('div', { class: 'sec', text: '好友邀請（' + rq.length + '）' }));
      var rc = h('div', { class: 'card' });
      rq.forEach(function (q) {
        rc.appendChild(h('div', { class: 'item' }, [
          h('div', { class: 'tx' }, [h('b', { text: q.name }), h('span', { text: '想加你為好友' })]),
          h('button', { class: 'btn ghost', text: '略過', onclick: function () { SO.declineReq(q.code); render(); } }),
          h('button', { class: 'btn', text: '接受', style: 'margin-left:6px', onclick: function () { SO.acceptReq(q.code).then(function (r) { toast(r.msg); render(); }); } })
        ]));
      });
      body.appendChild(rc);
    }
    body.appendChild(h('div', { class: 'sec', text: '好友（' + S.friends.length + '）' }));
    var list = h('div', { class: 'card' });
    if (!S.friends.length) list.appendChild(h('p', { class: 'muted', style: 'margin:0', text: '還沒有好友。在大廳靠近其他玩家按「交流」→「送出好友邀請」，或輸入好友碼。' }));
    S.friends.forEach(function (f) {
      var info = SO && SO.profile(f.code), live = info && Date.now() - (info.ts || 0) < 120000;
      var unread = SO && SO.unread(f.code);
      list.appendChild(h('div', { class: 'item' }, [
        h('span', { class: 'on-dot' + (live ? ' live' : '') }),
        h('div', { class: 'tx' }, [h('b', { text: (info && info.name) || f.name }), h('span', { text: info && info.pet ? '帶著 ' + info.pet.name + '（' + ((C.breed(info.pet.breedId) || {}).name || '') + '）' : f.code })]),
        h('button', { class: 'btn ' + (unread ? '' : 'ghost'), text: unread ? '新訊息' : '聊天', onclick: function () { if (SO) SO.openChat(f.code, (info && info.name) || f.name); } })
      ]));
    });
    body.appendChild(list);
    var th = SO && SO.threadList ? SO.threadList() : [];
    body.appendChild(h('div', { class: 'sec', text: '對話紀錄' }));
    var tc = h('div', { class: 'card' });
    if (!th.length) tc.appendChild(h('p', { class: 'muted', style: 'margin:0', text: '還沒有對話。在大廳靠近其他玩家按「交流」就能聊天。' }));
    th.forEach(function (t) {
      var fr = SO.hasFriend(t.code), d = new Date(t.ts), when = t.ts ? (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : '';
      tc.appendChild(h('div', { class: 'item' }, [
        h('div', { class: 'tx' }, [h('b', { text: t.name + (fr ? '' : '（非好友）') }), h('span', { text: (t.from === S.owner.friendCode ? '你：' : '') + t.last.slice(0, 40) + (when ? '・' + when : '') })]),
        h('button', { class: 'btn ' + (t.unread ? '' : 'ghost'), text: t.unread ? '新訊息' : '開啟', onclick: function () { SO.openChat(t.code, t.name); } })
      ]));
    });
    body.appendChild(tc);
    if (SO && S.friends.length) SO.fetchProfiles(S.friends.map(function (f) { return f.code; }), function () { if (isOpen() && tab === 'lobby') render(); });
    var inp = h('input', { type: 'text', placeholder: '輸入好友碼', maxlength: '8', autocomplete: 'off', style: 'text-transform:uppercase' });
    body.appendChild(h('div', { class: 'sec', text: '用好友碼加好友' }));
    body.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'row' }, [inp, h('button', { class: 'btn', text: '邀請', onclick: function () {
        var code = inp.value.trim().toUpperCase();
        if (!SO) { toast('目前離線'); return; }
        SO.addFriendByCode(code).then(function (r) { toast(r.msg); if (r.ok) { inp.value = ''; render(); } });
      } })]),
      h('div', { class: 'muted', style: 'margin-top:8px', text: '我的好友碼：' + S.owner.friendCode })
    ]));
  }

  /* 外框 */
  function build() {
    panel = h('div', { id: 'petPanel' });
    sheet = h('div', { class: 'sheet' });
    panel.appendChild(sheet);
    panel.addEventListener('click', function (e) { if (e.target === panel) close(); });
    document.body.appendChild(panel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen() && !modalEl && !document.getElementById('petPlayRoot')) close(); });
  }
  function render() {
    if (!panel) return;
    var keep = body ? body.scrollTop : 0, sameTab = sheet._tab === (S.owner ? tab : 'welcome');
    var oldSlot = sheet.querySelector('.pet-stage-slot'), stageNode = oldSlot && oldSlot.firstChild;
    sheet.innerHTML = '';
    var hd = h('div', { class: 'hd' }, [h('div', { class: 't', text: S.owner ? '我的寵物' : '' })]);
    if (S.owner) {
      hd.appendChild(h('div', { class: 'coin', html: svg('coin', 20) + '<span>' + S.coins + '</span>' }));
      hd.appendChild(h('button', { class: 'earn', text: '賺金幣', onclick: goQuiz }));
    }
    hd.appendChild(h('button', { class: 'x', html: svg('close', 22), 'aria-label': '關閉', onclick: close }));
    sheet.appendChild(hd);
    body = h('div', { class: 'bd' });
    sheet.appendChild(body);
    if (!S.owner) { renderWelcome(); sheet._tab = 'welcome'; return; }
    if (tab === 'pet') renderPet();
    else if (tab === 'shop') renderShop();
    else if (tab === 'care') renderCare();
    else if (tab === 'owner') renderOwner();
    else if (tab === 'lobby') renderLobby();
    else { tab = 'pet'; renderPet(); }
    var slot = body.querySelector('.pet-stage-slot');
    if (slot && stageNode) slot.appendChild(stageNode);
    var nav = h('div', { class: 'nav' });
    [['pet', '寵物'], ['shop', '商店'], ['care', '照護'], ['lobby', '大廳'], ['owner', '飼主']].forEach(function (n) {
      var badge = n[0] === 'lobby' && root.PetSocial && root.PetSocial.unread() ? '<i style="position:absolute;top:6px;margin-left:16px;width:8px;height:8px;border-radius:50%;background:#e74c3c"></i>' : '';
      nav.appendChild(h('button', { class: tab === n[0] ? 'on' : '', style: 'position:relative', html: svg(n[0], 22) + badge + '<span>' + n[1] + '</span>', onclick: function () { if (tab !== n[0]) { tab = n[0]; adoptOpen = false; render(); body.scrollTop = 0; } } }));
    });
    sheet.appendChild(nav);
    if (sameTab) body.scrollTop = keep;
    sheet._tab = tab;
    emit('petui:render', { tab: tab, petId: selId, slot: slot || null });
  }
  function open() {
    if (!panel) return;
    C.tick(S, now()); ST.save(S);
    panel.style.display = 'flex'; document.body.style.overflow = 'hidden';
    render();
  }
  function close() {
    if (!panel) return;
    panel.style.display = 'none'; document.body.style.overflow = '';
    emit('petui:render', { tab: null, petId: null, slot: null });
  }

  function onCorrect(qid, quiet, sid) {
    if (!S) return 0;
    var n = C.awardQuiz(S, String(qid), now(), sid);
    if (n) { ST.save(S); if (!quiet) toast('+1 金幣'); }
    return n;
  }
  function skip(hours) { timeOffset += hours * 3600000; commit(); return '已快轉 ' + hours + ' 小時（重新整理後還原）'; }

  function init() {
    S = C.migrate(ST.load() || C.newState());
    css(); build(); C.tick(S, now()); ST.save(S);
    placeEntry(); ST.requestPersist();
  }
  root.PetUI = {
    init: init, open: open, close: close, onCorrect: onCorrect, goQuiz: goQuiz, skip: skip, toast: toast,
    state: function () { return S; }, current: curPet, isOpen: isOpen, refresh: commit, save: function () { ST.save(S); },
    tab: function () { return tab; }, rerender: function () { if (isOpen()) render(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
