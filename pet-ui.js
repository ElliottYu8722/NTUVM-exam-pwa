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
      '#petPanel .nav{display:flex;border-top:1px solid var(--line);background:#fff;padding-bottom:env(safe-area-inset-bottom)}',
      '#petPanel .nav button{flex:1;border:0;background:transparent;color:var(--sub);padding:8px 0 7px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;cursor:pointer}',
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
      '#petToast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(10px);background:rgba(43,38,32,.94);color:#fff;padding:10px 18px;border-radius:999px;z-index:10002;font-size:14px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;max-width:88vw;text-align:center;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif}',
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
  function act(r, ev) { toast(r.msg); if (r.ok && ev) emit('petui:action', ev); commit(); return r.ok; }
  function curPet() {
    if (!S || !S.owner) return null;
    var p = C.findPet(S, selId) || S.pets[0] || null;
    if (p) selId = p.id;
    return p;
  }
  function isOpen() { return panel && panel.style.display === 'flex'; }

  function goQuiz() {
    close();
    var b = document.getElementById('btnRandomQuiz');
    if (b) { b.click(); return; }
    toast('請點選左側的「隨機測驗」');
  }

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
  function tierTag(t) { return h('span', { class: 'tag ' + t, text: '難度' + C.TIER_NAME[t] }); }
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
        S = s; selId = null; restoring = false; tab = 'pet'; commit(); toast('還原完成');
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
  function renderPet() {
    var p = curPet();
    if (!p || adoptOpen) { renderAdopt(); return; }
    var b = C.breed(p.breedId), N = C.need(p), t = now();

    var chips = h('div', { class: 'chips' });
    S.pets.forEach(function (x) {
      chips.appendChild(h('button', { class: 'chip' + (x.id === p.id ? ' on' : ''), text: x.name, onclick: function () { selId = x.id; render(); } }));
    });
    if (S.pets.length < S.owner.level) chips.appendChild(h('button', { class: 'chip add', html: svg('plus', 14) + '領養', onclick: function () { adoptOpen = true; adoptPick = null; render(); } }));
    if (S.pets.length > 1 || S.pets.length < S.owner.level) body.appendChild(chips);

    body.appendChild(h('div', { class: 'pet-stage-slot' }));

    var happyCap = C.overdueCare(p, t);
    var card = h('div', { class: 'card' }, [
      h('div', { class: 'name' }, [p.name, tierTag(b.tier)]),
      h('div', { class: 'muted', text: b.name + '・' + C.ageText(p, t) + '・' + C.dayKey(p.adoptTs) + ' 領養' + (p.neutered ? '・已結紮' : '') }),
      stat('開心', Math.round(p.happy) + ' / ' + (happyCap ? C.CFG.capNoCare : 100), bar(p.happy, 'var(--pink)')),
      stat('今日飼料', p.fed + ' / ' + N + ' 單位・' + p.meals + ' / ' + C.CFG.mealMax + ' 餐', bar(p.fed / N * 100, p.fed > N ? 'var(--warn)' : 'var(--ok)')),
      stat('BCS', p.bcs + ' / 9 ' + C.bcsLabel(p.bcs) + (C.MUSCLE[p.muscle] && p.muscle ? '・' + C.MUSCLE[p.muscle] : ''), bcsBar(p.bcs))
    ]);
    if (happyCap) card.appendChild(h('div', { class: 'warn', text: '這個月的驅蟲或健康檢查還沒做，開心上限降為 ' + C.CFG.capNoCare + '。' }));
    body.appendChild(card);

    var one = Math.max(1, Math.ceil(N / 3));
    var amts = [['少量', Math.max(1, Math.ceil(one / 2))], ['一餐', one], ['大份', Math.ceil(one * 1.5)]];
    var full = p.meals >= C.CFG.mealMax;
    body.appendChild(h('div', { class: 'sec', text: '餵食' + (full ? '（今天三餐已吃完）' : '') }));
    var g = h('div', { class: 'grid3' });
    amts.forEach(function (a) {
      var bt = h('button', { class: 'btn ' + (a[0] === '一餐' ? '' : 'soft'), onclick: function () { act(C.feed(S, p.id, a[1], now()), { type: 'feed', petId: p.id }); } }, [a[0], h('small', { text: a[1] + ' 金幣' })]);
      if (full) bt.disabled = true;
      g.appendChild(bt);
    });
    body.appendChild(g);

    body.appendChild(h('div', { class: 'grid2', style: 'margin-top:8px' }, [
      h('button', { class: 'btn ghost', onclick: function () { act(C.snack(S, p.id, now()), { type: 'snack', petId: p.id }); } }, ['零食 +' + C.CFG.snackGain + ' 開心', h('small', { text: C.CFG.snackPrice + ' 金幣・今天 ' + p.snacks + ' / ' + C.CFG.snackMax })]),
      h('button', { class: 'btn', style: 'background:#3f8f63', onclick: function () { startPlay(p); } }, ['出門玩', h('small', { text: '10 分鐘 +' + C.CFG.playGain + ' 開心' })])
    ]));
  }
  function startPlay(p) {
    C.tick(S, now());
    var ck = C.canPlay(p);
    if (!ck.ok) { toast(ck.msg); return; }
    if (root.PetPlay && root.PetPlay.start) { emit('petui:action', { type: 'play', petId: p.id }); root.PetPlay.start(p.id); }
    else toast('戶外場景載入失敗，請重新整理');
  }

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
    var tierInfo = { easy: '每天 5 單位飼料', mid: '每天 15 單位飼料', hard: '每天 25 單位，BCS 容易掉' };
    ['easy', 'mid', 'hard'].forEach(function (tier) {
      var list = C.BREEDS.filter(function (b) { return b.sp === adoptSp && b.tier === tier; });
      if (!list.length) return;
      body.appendChild(h('div', { class: 'sec', style: 'display:flex;align-items:center;gap:8px' }, [tierTag(tier), h('span', { text: tierInfo[tier], style: 'font-weight:500' })]));
      var grid = h('div', { class: 'breeds' });
      list.forEach(function (b) {
        grid.appendChild(h('button', { class: 'breed' + (adoptPick === b.id ? ' on' : ''), onclick: function () { adoptPick = b.id; render(); setTimeout(function () { var el = body.querySelector('#petAdoptForm'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 30); } }, [swatch(b.id), b.name.replace(/（.*）/, '')]));
      });
      body.appendChild(grid);
    });
    if (adoptPick) {
      var b = C.breed(adoptPick);
      var nm = h('input', { type: 'text', placeholder: '幫牠取名字', maxlength: '12', autocomplete: 'off' });
      var age = h('input', { type: 'number', min: '0', max: '20', step: '0.5', value: '1', inputmode: 'decimal' });
      body.appendChild(h('div', { class: 'card', id: 'petAdoptForm' }, [
        h('div', { class: 'row' }, [(function () { var w = swatch(b.id); w.style.margin = '0'; return w; })(), h('b', { text: b.name, style: 'font-size:17px' }), tierTag(b.tier)]),
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
    var tier = C.breed(p.breedId).tier;
    body.appendChild(petSwitch('幫誰買東西'));
    var card = h('div', { class: 'card' });
    function item(icon, name, desc, price, owned, onBuy, extra) {
      card.appendChild(h('div', { class: 'item' }, [
        h('div', { class: 'ic', text: icon }),
        h('div', { class: 'tx' }, [h('b', { text: name }), h('span', { text: desc })]),
        owned ? (extra || h('span', { class: 'done', text: '已擁有' })) : h('button', { class: 'btn', onclick: onBuy }, [price + ' 金幣'])
      ]));
    }
    item('帶', '胸背帶', '出門玩必備', C.CFG.harnessPrice, p.items.harness, function () { act(C.buyItem(S, p.id, 'harness')); });
    item('車', '外出推車', 'BCS 8 以上也能出門，散步不計入減重', C.CFG.strollerPrice[tier], p.items.stroller, function () { act(C.buyItem(S, p.id, 'stroller')); });
    body.appendChild(h('div', { class: 'sec', text: '配件' }));
    body.appendChild(card);
    var cl = h('div', { class: 'card' }), icons = { normal: '衣', trend: '潮', gold: '金' };
    Object.keys(C.CLOTHES).forEach(function (k) {
      var c = C.CLOTHES[k], on = p.wear === k, owned = p.items.clothes[k];
      cl.appendChild(h('div', { class: 'item' }, [
        h('div', { class: 'ic', text: icons[k] || '衣', style: k === 'gold' ? 'background:#fff3c4;color:#a87b00' : '' }),
        h('div', { class: 'tx' }, [h('b', { text: c.name }), h('span', { text: '穿著時每天開心少掉 ' + c.bonus })]),
        owned
          ? h('button', { class: 'btn ' + (on ? 'ghost' : 'soft'), text: on ? '脫下' : '穿上', onclick: function () { act(C.wear(S, p.id, on ? '' : k)); } })
          : h('button', { class: 'btn', text: c.price + ' 金幣', onclick: function () { act(C.buyItem(S, p.id, k)); } })
      ]));
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
  }
  function copyBtn(txt) {
    return h('button', { class: 'btn ghost', text: '複製', onclick: function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast('已複製'); }, function () { toast(txt); });
      else toast(txt);
    } });
  }

  /* 備份 */
  function renderBackup() {
    body.appendChild(h('div', { class: 'card', style: 'margin-top:12px' }, [
      h('b', { text: '下載備份', style: 'font-size:16px' }),
      h('p', { class: 'muted', style: 'margin:4px 0 12px', text: '寵物資料只存在這台裝置的瀏覽器裡。換手機或清除瀏覽器資料前，請先下載備份。' }),
      h('button', { class: 'btn block', text: '下載備份檔', onclick: function () { ST.exportJson(S); toast('已下載備份'); } })
    ]));
    body.appendChild(h('div', { class: 'card' }, [
      h('b', { text: '從備份還原', style: 'font-size:16px' }),
      h('p', { class: 'muted', style: 'margin:4px 0 12px', text: '會用備份檔覆蓋目前的資料。' }),
      (function () { var w = filePicker('選擇備份檔'); w.lastChild.className = 'btn ghost block'; return w; })()
    ]));
    body.appendChild(h('div', { class: 'sec', text: '危險區域' }));
    body.appendChild(h('button', { class: 'btn danger block', text: '清除所有寵物資料', onclick: function () {
      ask('清除所有資料？', '飼主、寵物和金幣都會刪除，無法復原。建議先下載備份。', '清除', true).then(function (ok) {
        if (!ok) return;
        S = C.newState(); selId = null; adoptOpen = false; tab = 'pet'; ST.save(S); render(); toast('已清除');
      });
    } }));
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
    else renderBackup();
    var slot = body.querySelector('.pet-stage-slot');
    if (slot && stageNode) slot.appendChild(stageNode);
    var nav = h('div', { class: 'nav' });
    [['pet', '寵物'], ['shop', '商店'], ['care', '照護'], ['owner', '飼主'], ['backup', '備份']].forEach(function (n) {
      nav.appendChild(h('button', { class: tab === n[0] ? 'on' : '', html: svg(n[0], 22) + '<span>' + n[1] + '</span>', onclick: function () { if (tab !== n[0]) { tab = n[0]; adoptOpen = false; render(); body.scrollTop = 0; } } }));
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

  function onCorrect(qid, quiet) {
    if (!S) return 0;
    var n = C.awardQuiz(S, String(qid), now());
    if (n) { ST.save(S); if (!quiet) toast('+1 金幣'); }
    return n;
  }
  function skip(hours) { timeOffset += hours * 3600000; commit(); return '已快轉 ' + hours + ' 小時（重新整理後還原）'; }

  function init() {
    S = ST.load() || C.newState();
    css(); build(); C.tick(S, now()); ST.save(S);
    placeEntry(); ST.requestPersist();
  }
  root.PetUI = {
    init: init, open: open, close: close, onCorrect: onCorrect, goQuiz: goQuiz, skip: skip, toast: toast,
    state: function () { return S; }, current: curPet, isOpen: isOpen, refresh: commit
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
