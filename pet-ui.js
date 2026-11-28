/* pet-ui.js  介面與 app.js 整合點 */
(function (root) {
  'use strict';
  var C = root.PetCore, ST = root.PetStore;
  var S = null, panel = null, bar = null, entry = null, toastEl = null;
  var tab = 'pet', selId = null, timeOffset = 0, playT = null;

  function now() { return Date.now() + timeOffset; }
  function h(tag, props, kids) {
    var e = document.createElement(tag), k;
    if (props) for (k in props) {
      if (k === 'class') e.className = props[k];
      else if (k === 'text') e.textContent = props[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function css() {
    var st = document.createElement('style');
    st.textContent = [
      '#petBar{position:fixed;top:6px;right:8px;z-index:9998;background:rgba(30,30,40,.88);color:#ffd54a;padding:5px 12px;border-radius:16px;font-size:14px;display:flex;gap:10px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,.35)}',
      '#petBar button{background:#ffd54a;color:#222;border:0;border-radius:10px;padding:2px 8px;font-size:12px;cursor:pointer}',
      '#petEntry{cursor:pointer}',
      '#petEntryFloat{position:fixed;left:10px;bottom:10px;z-index:9998;background:#ff9f43;color:#222;border:0;border-radius:20px;padding:8px 14px;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35)}',
      '#petPanel{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center}',
      '#petPanel .box{background:#fff;color:#222;width:min(560px,96vw);max-height:92vh;overflow:auto;border-radius:14px;padding:14px}',
      '#petPanel h3{margin:0 0 8px}',
      '#petPanel .tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}',
      '#petPanel .tabs button{flex:1;padding:6px;border:1px solid #bbb;background:#f3f3f3;border-radius:8px;cursor:pointer}',
      '#petPanel .tabs button.on{background:#ff9f43;border-color:#ff9f43}',
      '#petPanel .row{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}',
      '#petPanel button.b{padding:7px 10px;border:0;border-radius:8px;background:#4a90e2;color:#fff;cursor:pointer}',
      '#petPanel button.b:disabled{background:#aaa}',
      '#petPanel .meter{height:12px;background:#ddd;border-radius:6px;overflow:hidden;margin:2px 0 8px}',
      '#petPanel .meter i{display:block;height:100%;background:#4caf50}',
      '#petPanel .card{border:1px solid #ddd;border-radius:10px;padding:10px;margin:8px 0}',
      '#petPanel .note{font-size:12px;color:#666}',
      '#petPanel input,#petPanel select{padding:6px;border:1px solid #bbb;border-radius:6px;max-width:100%}',
      '#petToast{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:8px 16px;border-radius:18px;z-index:10000;display:none;font-size:14px}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function toast(msg) {
    if (!toastEl) { toastEl = h('div', { id: 'petToast' }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.style.display = 'block';
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.display = 'none'; }, 2200);
  }
  function commit() { C.tick(S, now()); ST.save(S); renderBar(); if (panel && panel.style.display === 'flex') render(); }
  function act(r) { toast(r.msg); commit(); }
  function curPet() { return S && S.owner ? (C.findPet(S, selId) || S.pets[0] || null) : null; }

  function renderBar() {
    if (!bar) {
      bar = h('div', { id: 'petBar' });
      document.body.appendChild(bar);
    }
    bar.innerHTML = '';
    bar.appendChild(h('span', { text: '金幣 ' + (S ? S.coins : 0) }));
    bar.appendChild(h('button', { text: '取得金幣', onclick: goQuiz }));
  }
  function goQuiz() {
    if (panel) panel.style.display = 'none';
    var b = document.getElementById('btnRandomQuiz');
    if (b) { b.click(); return; }
    var els = document.querySelectorAll('button,a,li,div,span,label'), i, best = null;
    for (i = 0; i < els.length; i++) {
      var t = (els[i].textContent || '').replace(/\s+/g, '');
      if (t === '隨機測驗' || (t.indexOf('隨機測驗') === 0 && t.length <= 8 && els[i].children.length === 0)) { best = els[i]; break; }
    }
    if (best) best.click(); else toast('請手動點選左側的「隨機測驗」');
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
        entry = b;
        return;
      }
      tries++;
      if (tries === 20 && !document.getElementById('petEntryFloat')) {
        document.body.appendChild(h('button', { id: 'petEntryFloat', text: '我的寵物', onclick: open }));
      }
      if (tries < 120) setTimeout(attempt, 250);
    }
    attempt();
  }

  function meter(pct, color) { var m = h('div', { class: 'meter' }, [h('i')]); m.firstChild.style.width = Math.max(0, Math.min(100, pct)) + '%'; if (color) m.firstChild.style.background = color; return m; }

  function renderOnboard(box) {
    var nm = h('input', { placeholder: '飼主名字', maxlength: '12' });
    box.appendChild(h('h3', { text: '歡迎來到我的寵物' }));
    box.appendChild(h('p', { text: '第一次使用，請先取一個飼主名字，系統會幫你產生專屬 ID。' }));
    box.appendChild(h('div', { class: 'row' }, [nm]));
    box.appendChild(h('div', { class: 'row' }, [
      h('button', { class: 'b', text: '建立新飼主', onclick: function () {
        var v = nm.value.trim(); if (!v) { toast('請輸入名字'); return; }
        C.createOwner(S, v); commit(); toast('已建立，歡迎 ' + v);
      } }),
      h('button', { class: 'b', text: '我已有 ID（匯入備份）', onclick: function () { tab = 'backup'; S.owner = null; render(); } })
    ]));
    box.appendChild(h('p', { class: 'note', text: '目前換裝置請用備份檔匯入，雲端同步之後開放。' }));
    box.appendChild(importRow());
  }
  function importRow() {
    var f = h('input', { type: 'file', accept: '.json,application/json' });
    f.addEventListener('change', function () {
      var file = f.files && f.files[0]; if (!file) return;
      var rd = new FileReader();
      rd.onload = function () {
        var s = ST.parseBackup(String(rd.result));
        if (!s) { toast('備份檔格式不正確'); return; }
        S = s; selId = null; commit(); toast('匯入完成');
      };
      rd.readAsText(file);
    });
    return h('div', { class: 'row' }, [h('span', { text: '匯入備份：' }), f]);
  }

  function renderPet(box) {
    var p = curPet(), i;
    if (S.pets.length > 1) {
      var sel = h('select', { onchange: function () { selId = sel.value; render(); } });
      S.pets.forEach(function (x) { var o = h('option', { value: x.id, text: x.name }); if (p && x.id === p.id) o.selected = true; sel.appendChild(o); });
      box.appendChild(h('div', { class: 'row' }, [sel]));
    }
    if (p) {
      var b = C.breed(p.breedId), N = C.need(p), t = now();
      var card = h('div', { class: 'card' });
      card.appendChild(h('b', { text: p.name + '（' + b.name + '・難度' + C.TIER_NAME[b.tier] + '）' }));
      card.appendChild(h('div', { text: '年齡：' + C.ageText(p, t) + '　領養日：' + C.dayKey(p.adoptTs) + (p.neutered ? '　已結紮' : '') }));
      card.appendChild(h('div', { text: 'BCS：' + p.bcs + ' / 9（' + C.bcsLabel(p.bcs) + '）　體態：' + C.MUSCLE[p.muscle] }));
      card.appendChild(meter(p.bcs / 9 * 100, (p.bcs >= 4 && p.bcs <= 5) ? '#4caf50' : '#e67e22'));
      card.appendChild(h('div', { text: '開心：' + Math.round(p.happy) + ' / 100' + (C.overdueCare(p, t) ? '（本月照護未完成，上限 70）' : '') }));
      card.appendChild(meter(p.happy, '#ff7aa2'));
      card.appendChild(h('div', { text: '今日餵食：' + p.meals + ' / 3 餐，共 ' + p.fed + ' / ' + N + ' 單位　零食 ' + p.snacks + ' / ' + C.CFG.snackMax }));
      box.appendChild(card);
      var one = Math.max(1, Math.ceil(N / 3));
      box.appendChild(h('div', { class: 'row' }, [
        h('button', { class: 'b', text: '少量餵食 ' + Math.max(1, Math.ceil(one / 2)), onclick: function () { act(C.feed(S, p.id, Math.max(1, Math.ceil(one / 2)), now())); } }),
        h('button', { class: 'b', text: '標準餵食 ' + one, onclick: function () { act(C.feed(S, p.id, one, now())); } }),
        h('button', { class: 'b', text: '大量餵食 ' + Math.ceil(one * 1.5), onclick: function () { act(C.feed(S, p.id, Math.ceil(one * 1.5), now())); } }),
        h('button', { class: 'b', text: '給零食 (' + C.CFG.snackPrice + ')', onclick: function () { act(C.snack(S, p.id, now())); } })
      ]));
      box.appendChild(playBlock(p));
    }
    if (S.pets.length < S.owner.level) box.appendChild(adoptBlock());
    else box.appendChild(h('p', { class: 'note', text: '目前 ' + S.pets.length + ' / ' + S.owner.level + ' 隻。想養更多請到「飼主」升級。' }));
  }
  function fmt(sec) { var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function playBlock(p) {
    var wrap = h('div', { class: 'card' });
    wrap.appendChild(h('b', { text: '出門玩' }));
    var disp = h('div', { text: playT ? '' : '最長 10 分鐘，完成 +50 開心，中途結束按時間比例。' });
    wrap.appendChild(disp);
    function tickDisp() {
      if (!playT) return;
      var sec = Math.floor((Date.now() - playT.start) / 1000);
      if (sec >= C.CFG.playFull) { finish(); return; }
      disp.textContent = '玩樂中 ' + fmt(sec) + ' / 10:00';
    }
    function finish() {
      if (!playT) return;
      var sec = Math.floor((Date.now() - playT.start) / 1000), pid = playT.pid;
      clearInterval(playT.iv); playT = null;
      act(C.playFinish(S, pid, sec, now()));
    }
    var row = h('div', { class: 'row' });
    if (playT) {
      row.appendChild(h('button', { class: 'b', text: '結束並結算', onclick: finish }));
      clearInterval(playT.iv); playT.iv = setInterval(tickDisp, 500); tickDisp();
    } else {
      row.appendChild(h('button', { class: 'b', text: '開始出門玩', onclick: function () {
        var ck = C.canPlay(p); if (!ck.ok) { toast(ck.msg); return; }
        playT = { start: Date.now(), pid: p.id, iv: null }; render();
      } }));
    }
    wrap.appendChild(row);
    return wrap;
  }
  function adoptBlock() {
    var sel = h('select'), g = {};
    C.BREEDS.forEach(function (b) {
      var key = (b.sp === 'dog' ? '狗' : '貓') + '・難度' + C.TIER_NAME[b.tier];
      if (!g[key]) { g[key] = h('optgroup', { label: key }); sel.appendChild(g[key]); }
      g[key].appendChild(h('option', { value: b.id, text: b.name }));
    });
    var nm = h('input', { placeholder: '寵物名字', maxlength: '12' });
    var age = h('input', { type: 'number', min: '0', max: '20', value: '1', style: 'width:60px' });
    return h('div', { class: 'card' }, [
      h('b', { text: '領養新寵物' }),
      h('div', { class: 'row' }, [sel]),
      h('div', { class: 'row' }, [nm, h('span', { text: '初始年齡（歲）' }), age]),
      h('div', { class: 'note', text: '難度高：每天需 25 單位飼料、BCS 容易下降；中 15；易 5。領養免費。' }),
      h('button', { class: 'b', text: '領養', onclick: function () {
        act(C.adopt(S, sel.value, nm.value, (parseFloat(age.value) || 0) * 365, now()));
      } })
    ]);
  }
  function renderShop(box) {
    var p = curPet(); if (!p) { box.appendChild(h('p', { text: '先領養一隻寵物。' })); return; }
    var tier = C.breed(p.breedId).tier;
    box.appendChild(h('p', { text: '正在幫 ' + p.name + ' 購物' }));
    function item(label, price, owned, key, extra) {
      var r = h('div', { class: 'row' }, [h('span', { text: label + '（' + price + ' 金幣）' + (owned ? ' 已擁有' : '') })]);
      if (!owned) r.appendChild(h('button', { class: 'b', text: '購買', onclick: function () { act(C.buyItem(S, p.id, key)); } }));
      else if (extra) r.appendChild(extra);
      box.appendChild(r);
    }
    item('胸背帶（外出必備）', C.CFG.harnessPrice, p.items.harness, 'harness');
    item('外出推車（肥胖時可用，散步不計 BCS）', C.CFG.strollerPrice[tier], p.items.stroller, 'stroller');
    Object.keys(C.CLOTHES).forEach(function (k) {
      var c = C.CLOTHES[k], on = p.wear === k;
      item(c.name + '（每天開心衰減 -' + c.bonus + '）', c.price, p.items.clothes[k], k,
        h('button', { class: 'b', text: on ? '脫下' : '穿上', onclick: function () { act(C.wear(S, p.id, on ? '' : k)); } }));
    });
    box.appendChild(h('p', { class: 'note', text: '零食（3 金幣）在「寵物」頁直接給。' }));
  }
  function renderCare(box) {
    var p = curPet(); if (!p) { box.appendChild(h('p', { text: '先領養一隻寵物。' })); return; }
    var mk = C.monthKey(now());
    function row(label, price, done, kind) {
      var r = h('div', { class: 'row' }, [h('span', { text: label + '（' + price + ' 金幣）' + (done ? ' 已完成' : '') })]);
      if (!done) r.appendChild(h('button', { class: 'b', text: '執行', onclick: function () { act(C.care(S, p.id, kind, now())); } }));
      box.appendChild(r);
    }
    box.appendChild(h('p', { text: p.name + ' 的照護（' + mk + '）' }));
    row('每月驅蟲', C.CFG.dewormPrice, p.care.deworm === mk, 'deworm');
    row('每月健康檢查', C.CFG.checkupPrice, p.care.checkup === mk, 'checkup');
    row('結紮（一次性，之後食量 -10%、更容易變胖）', C.CFG.neuterPrice, p.neutered, 'neuter');
    box.appendChild(h('p', { class: 'note', text: '每月 ' + C.CFG.graceDays + ' 號之後還沒做完，開心上限降為 ' + C.CFG.capNoCare + '。' }));
  }
  function renderOwner(box) {
    var o = S.owner, lv = o.level;
    box.appendChild(h('div', { class: 'card' }, [
      h('b', { text: '飼主：' + o.name }),
      h('div', { text: '等級 ' + lv + '，可養 ' + lv + ' 隻（目前 ' + S.pets.length + ' 隻）' }),
      h('div', { text: '累計答對得幣：' + S.stats.quizCorrect + ' 題' }),
      lv < C.CFG.maxLevel
        ? h('button', { class: 'b', text: '升到等級 ' + (lv + 1) + '（' + C.CFG.levelCosts[lv - 1] + ' 金幣）', onclick: function () { act(C.upgrade(S)); } })
        : h('div', { text: '已達最高等級' })
    ]));
    var rc = h('span', { text: '••••-••••-••••' });
    box.appendChild(h('div', { class: 'card' }, [
      h('div', { text: '好友碼（可公開，給朋友加你）：' + o.friendCode }),
      h('div', {}, ['恢復碼（私密，換裝置用）：', rc]),
      h('button', { class: 'b', text: '顯示 / 隱藏恢復碼', onclick: function () { rc.textContent = rc.textContent.indexOf('•') === 0 ? o.recoveryCode : '••••-••••-••••'; } })
    ]));
  }
  function renderBackup(box) {
    box.appendChild(h('div', { class: 'row' }, [
      h('button', { class: 'b', text: '下載備份檔', onclick: function () { ST.exportJson(S); } })
    ]));
    box.appendChild(importRow());
    box.appendChild(h('p', { class: 'note', text: '資料存在這個瀏覽器裡。換手機、清除網站資料前請先備份。' }));
    box.appendChild(h('div', { class: 'row' }, [
      h('button', { class: 'b', style: 'background:#c0392b', text: '清除所有寵物資料', onclick: function () {
        if (confirm('確定要清除全部資料嗎？無法復原，建議先下載備份。')) {
          S = C.newState(); selId = null; ST.save(S); renderBar(); render();
        }
      } })
    ]));
  }
  function render() {
    if (!panel) return;
    renderBar();
    var box = panel.firstChild; box.innerHTML = '';
    if (!S.owner && tab !== 'backup') { renderOnboard(box); box.appendChild(closeRow()); return; }
    if (!S.owner && tab === 'backup') { box.appendChild(h('h3', { text: '匯入備份' })); box.appendChild(importRow()); box.appendChild(closeRow()); return; }
    box.appendChild(h('h3', { text: '我的寵物　金幣 ' + S.coins }));
    var tabs = h('div', { class: 'tabs' }), names = [['pet', '寵物'], ['shop', '商店'], ['care', '照護'], ['owner', '飼主'], ['backup', '備份']];
    names.forEach(function (n) { tabs.appendChild(h('button', { class: tab === n[0] ? 'on' : '', text: n[1], onclick: function () { tab = n[0]; render(); } })); });
    box.appendChild(tabs);
    if (tab === 'pet') renderPet(box);
    else if (tab === 'shop') renderShop(box);
    else if (tab === 'care') renderCare(box);
    else if (tab === 'owner') renderOwner(box);
    else renderBackup(box);
    box.appendChild(closeRow());
  }
  function closeRow() {
    return h('div', { class: 'row' }, [
      h('button', { class: 'b', text: '去答題賺金幣', onclick: goQuiz }),
      h('button', { class: 'b', style: 'background:#777', text: '關閉', onclick: close })
    ]);
  }
  function open() {
    C.tick(S, now()); ST.save(S);
    panel.style.display = 'flex'; render();
  }
  function close() { panel.style.display = 'none'; }

  function onCorrect(qid, quiet) {
    if (!S) return 0;
    var n = C.awardQuiz(S, String(qid), now());
    if (n) { ST.save(S); renderBar(); if (!quiet) toast('+1 金幣'); }
    return n;
  }
  function skip(hours) {
    timeOffset += hours * 3600000; commit(); return '已快轉 ' + hours + ' 小時（只用來測試，重新整理後會還原時鐘）';
  }
  function init() {
    S = ST.load() || C.newState();
    css();
    panel = h('div', { id: 'petPanel' }, [h('div', { class: 'box' })]);
    panel.addEventListener('click', function (e) { if (e.target === panel) close(); });
    document.body.appendChild(panel);
    C.tick(S, now()); ST.save(S);
    renderBar(); placeEntry();
    ST.requestPersist();
  }
  root.PetUI = { init: init, open: open, close: close, onCorrect: onCorrect, goQuiz: goQuiz, skip: skip, state: function () { return S; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
