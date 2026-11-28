/* pet-social.js  好友、聊天、大廳同步（Firestore） */
(function (root) {
  'use strict';
  var st = 'wait', profiles = {}, profTs = {}, threads = {}, unsub = [], started = '', chatEl = null, chatUnsub = null;
  var LOBBY_TTL = 45000;
  function db() { return root.db && typeof root.db.collection === 'function' ? root.db : null; }
  function S() { return root.PetUI && root.PetUI.state && root.PetUI.state(); }
  function me() { var s = S(); return s && s.owner ? s.owner : null; }
  function toast(t) { if (root.PetUI) root.PetUI.toast(t); }
  function fail(e) {
    var code = e && (e.code || e.name || '');
    if (/permission/i.test(String(code)) || /permission/i.test(String(e && e.message))) st = 'denied';
    else if (st !== 'ok') st = 'off';
    rer();
  }
  var rerT = 0;
  function rer() { clearTimeout(rerT); rerT = setTimeout(function () { if (root.PetUI && root.PetUI.tab && root.PetUI.tab() === 'lobby') root.PetUI.rerender(); }, 200); }
  function pairOf(a, b) { return a < b ? a + '_' + b : b + '_' + a; }
  function clean(t, n) { return String(t || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n || 200); }
  function petSummary(p) { return p ? { name: p.name, breedId: p.breedId, bcs: p.bcs, muscle: p.muscle || 0, wear: p.wear || '', harness: !!(p.items && p.items.harness && p.equip && p.equip.harness) } : null; }
  function readMap() { try { return JSON.parse(localStorage.getItem('vetpet_read') || '{}'); } catch (e) { return {}; } }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function mineKey(k) { var o = me(); return k + '_' + (o ? o.friendCode : ''); }
  function reqs() { return lsGet(mineKey('vetpet_reqs')); }
  function sent() { return lsGet(mineKey('vetpet_sent')); }
  function saveThreads() { lsSet(mineKey('vetpet_threads'), threads); }
  function loadThreads() { threads = lsGet(mineKey('vetpet_threads')); }
  function cleared() { return lsGet(mineKey('vetpet_cleared')); }
  function clearChat(code, pair) {
    var c = cleared(), t = threads[code]; c[pair] = t && t.ts ? t.ts : Date.now(); lsSet(mineKey('vetpet_cleared'), c);
    delete threads[code]; saveThreads(); closeChat(); toast('已刪除對話紀錄');
  }
  function markRead(pair) { var m = readMap(); m[pair] = Date.now(); try { localStorage.setItem('vetpet_read', JSON.stringify(m)); } catch (e) {} }

  function publish(extra) {
    var d = db(), o = me(); if (!d || !o) return Promise.resolve(false);
    var s = S(), p = root.PetUI.current ? root.PetUI.current() : (s.pets[0] || null);
    var doc = { name: o.name, look: o.look || null, pet: petSummary(p), ts: Date.now() };
    if (extra) for (var k in extra) doc[k] = extra[k];
    return d.collection('petUsers').doc(o.friendCode).set(doc, { merge: true }).then(function () { if (st !== 'ok') { st = 'ok'; rer(); } return true; }, function (e) { fail(e); return false; });
  }
  function hasFriend(code) { var s = S(); return !!(s && s.friends.some(function (f) { return f.code === code; })); }
  function addLocal(code, name) {
    var s = S(); if (!s || !s.owner || code === s.owner.friendCode) return false;
    if (hasFriend(code)) return false;
    s.friends.push({ code: code, name: clean(name, 20) || code, ts: Date.now() }); root.PetUI.save(); return true;
  }
  function sendFriendDoc(code, kind) {
    var d = db(), o = me(); if (!d || !o) return Promise.reject(new Error('off'));
    return d.collection('petFriend').doc(code + '_' + o.friendCode).set({ to: code, from: o.friendCode, name: o.name, kind: kind, ts: Date.now() });
  }
  function addFriend(code, name) {
    var d = db(), o = me(); if (!o) return Promise.resolve({ ok: false, msg: '請先建立飼主' });
    if (code === o.friendCode) return Promise.resolve({ ok: false, msg: '這是你自己的好友碼' });
    if (hasFriend(code)) return Promise.resolve({ ok: false, msg: '已經是好友了' });
    if (reqs()[code]) return acceptReq(code);
    if (!d) return Promise.resolve({ ok: false, msg: '目前離線，無法送出邀請' });
    return sendFriendDoc(code, 'req').then(function () {
      var m = sent(); m[code] = { name: clean(name, 20) || code, ts: Date.now() }; lsSet(mineKey('vetpet_sent'), m); rer();
      return { ok: true, msg: '已送出好友邀請給 ' + (clean(name, 20) || code) };
    }, function (e) { fail(e); return { ok: false, msg: '邀請送出失敗，稍後再試' }; });
  }
  function acceptReq(code) {
    var r = reqs(), q = r[code]; if (!q) return Promise.resolve({ ok: false, msg: '找不到邀請' });
    addLocal(code, q.name); delete r[code]; lsSet(mineKey('vetpet_reqs'), r); rer();
    return sendFriendDoc(code, 'ok').then(function () { return { ok: true, msg: '已和 ' + q.name + ' 成為好友' }; }, function (e) { fail(e); return { ok: true, msg: '已和 ' + q.name + ' 成為好友' }; });
  }
  function declineReq(code) { var r = reqs(); delete r[code]; lsSet(mineKey('vetpet_reqs'), r); rer(); }
  function reqList() { var r = reqs(); return Object.keys(r).map(function (k) { return { code: k, name: r[k].name, ts: r[k].ts }; }).sort(function (a, b) { return b.ts - a.ts; }); }
  function threadList() {
    return Object.keys(threads).map(function (k) { var t = threads[k]; return { code: k, name: t.name || (profiles[k] && profiles[k].name) || k, last: t.last || '', ts: t.ts || 0, from: t.from, unread: unread(k) }; })
      .sort(function (a, b) { return b.ts - a.ts; });
  }
  function addFriendByCode(code) {
    code = clean(code, 8).toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(code)) return Promise.resolve({ ok: false, msg: '好友碼是 8 個英數字' });
    var d = db(); if (!d) return Promise.resolve({ ok: false, msg: '目前離線' });
    return d.collection('petUsers').doc(code).get().then(function (snap) {
      if (!snap.exists) return { ok: false, msg: '找不到這個好友碼' };
      var v = snap.data(); profiles[code] = v; profTs[code] = Date.now();
      return addFriend(code, v.name);
    }, function (e) { fail(e); return { ok: false, msg: '無法連線，稍後再試' }; });
  }
  function profile(code) { return profiles[code] || null; }
  function fetchProfiles(codes, cb) {
    var d = db(); if (!d) return;
    var now = Date.now(), todo = codes.filter(function (c) { return !profTs[c] || now - profTs[c] > 60000; });
    if (!todo.length) return;
    todo.forEach(function (c) { profTs[c] = now; });
    Promise.all(todo.map(function (c) {
      return d.collection('petUsers').doc(c).get().then(function (snap) { if (snap.exists) profiles[c] = snap.data(); }, function (e) { fail(e); });
    })).then(function () { if (cb) cb(); });
  }

  function start() {
    var d = db(), o = me();
    if (!o) { st = d ? 'wait' : 'off'; return; }
    if (!d) { st = 'off'; return; }
    if (started === o.friendCode) return;
    stop(); started = o.friendCode; loadThreads();
    publish();
    unsub.push(d.collection('petFriend').where('to', '==', o.friendCode).onSnapshot(function (qs) {
      qs.forEach(function (doc) {
        var v = doc.data(), nm = clean(v.name, 20) || v.from;
        if (v.kind === 'req' && !hasFriend(v.from)) {
          var sn = sent();
          if (sn[v.from]) { delete sn[v.from]; lsSet(mineKey('vetpet_sent'), sn); addLocal(v.from, nm); sendFriendDoc(v.from, 'ok').catch(function () {}); toast('已和 ' + nm + ' 成為好友'); }
          else { var r = reqs(); if (!r[v.from]) { r[v.from] = { name: nm, ts: v.ts || Date.now() }; lsSet(mineKey('vetpet_reqs'), r); toast(nm + ' 想加你為好友'); } }
        } else if (v.kind === 'req') {
          sendFriendDoc(v.from, 'ok').catch(function () {});
        } else {
          var s2 = sent(); if (s2[v.from]) { delete s2[v.from]; lsSet(mineKey('vetpet_sent'), s2); }
          if (addLocal(v.from, nm)) toast(nm + ' 接受了你的好友邀請');
        }
        rer();
        doc.ref.delete().catch(function () {});
      });
    }, fail));
    unsub.push(d.collection('petThread').where('members', 'array-contains', o.friendCode).onSnapshot(function (qs) {
      var fresh = false;
      qs.docChanges().forEach(function (ch) {
        var v = ch.doc.data(), other = (v.members || []).filter(function (c) { return c !== o.friendCode; })[0];
        if (!other) return;
        var old = threads[other], cl = cleared()[ch.doc.id] || 0;
        if ((v.ts || 0) <= cl) { if (old) { delete threads[other]; saveThreads(); } return; }
        threads[other] = { pair: ch.doc.id, ts: v.ts || 0, from: v.from, last: v.last, name: v.names && v.names[other] };
        saveThreads();
        if (old && v.from !== o.friendCode && v.ts > old.ts && !(chatEl && chatEl._code === other)) { toast((threads[other].name || '朋友') + '：' + clean(v.last, 30)); fresh = true; }
      });
      if (fresh || true) rer();
    }, fail));
  }
  function stop() { unsub.forEach(function (u) { try { u(); } catch (e) {} }); unsub = []; started = ''; }
  function unread(code) {
    var o = me(); if (!o) return false;
    var rm = readMap();
    if (code) { var t = threads[code]; return !!(t && t.from !== o.friendCode && t.ts > (rm[t.pair] || 0)); }
    for (var k in threads) if (unread(k)) return true;
    return false;
  }

  /* 聊天視窗 */
  function css() {
    if (document.getElementById('petChatStyle')) return;
    var s = document.createElement('style'); s.id = 'petChatStyle';
    s.textContent = [
      '#petChat{position:fixed;inset:0;z-index:10010;background:rgba(20,16,12,.5);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif}',
      '#petChat .w{background:#fbf7f1;color:#2b2620;width:min(460px,100%);height:min(560px,82dvh);border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -10px 40px rgba(0,0,0,.3)}',
      '@media (min-width:600px){#petChat{align-items:center}#petChat .w{border-radius:20px}}',
      '#petChat .hd{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #ece4d8;background:#fff}',
      '#petChat .hd b{flex:1;font-size:17px}',
      '#petChat button{font-family:inherit}',
      '#petChat .hb{border:0;border-radius:10px;padding:7px 12px;font-size:14px;font-weight:600;cursor:pointer;background:#fdeedd;color:#b8611f}',
      '#petChat .hb.x{background:#f1ebe3;color:#2b2620}',
      '#petChat .hb:disabled{opacity:.6;cursor:default}',
      '#petChat .ms{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:6px}',
      '#petChat .m{max-width:78%;padding:8px 12px;border-radius:16px;font-size:15px;line-height:1.4;word-break:break-word;white-space:pre-wrap}',
      '#petChat .m.me{align-self:flex-end;background:#e8833a;color:#fff;border-bottom-right-radius:4px}',
      '#petChat .m.ot{align-self:flex-start;background:#fff;border:1px solid #ece4d8;border-bottom-left-radius:4px}',
      '#petChat .em{margin:auto;color:#8a7f72;font-size:14px;text-align:center}',
      '#petChat .ft{display:flex;gap:8px;padding:10px 12px;padding-bottom:max(14px,calc(env(safe-area-inset-bottom) + 8px));background:#fff;border-top:1px solid #ece4d8}',
      '#petChat .ft input{flex:1;font-size:16px;padding:10px 14px;border:1px solid #ece4d8;border-radius:999px;outline:none;background:#fbf7f1;color:#2b2620}',
      '#petChat .ft button{border:0;border-radius:999px;padding:0 18px;font-size:15px;font-weight:700;background:#e8833a;color:#fff;cursor:pointer}',
      '#petChat .qk{display:flex;gap:6px;padding:0 12px 8px;background:#fff;overflow-x:auto}',
      '#petChat .qk button{flex:none;border:1px solid #ece4d8;background:#fff;border-radius:999px;padding:5px 10px;font-size:13px;cursor:pointer;color:#2b2620}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function closeChat() { if (chatUnsub) { try { chatUnsub(); } catch (e) {} chatUnsub = null; } if (chatEl) { chatEl.remove(); chatEl = null; } rer(); }
  function openChat(code, name) {
    var o = me(); if (!o) return;
    css(); closeChat();
    var d = db(), pair = pairOf(o.friendCode, code);
    chatEl = el('div'); chatEl.id = 'petChat'; chatEl._code = code;
    var w = el('div', 'w'), hd = el('div', 'hd'), ms = el('div', 'ms'), ft = el('div', 'ft');
    hd.appendChild(el('b', '', clean(name, 20) || code));
    if (!hasFriend(code)) {
      var inv = !!reqs()[code], pend = !!sent()[code];
      var af = el('button', 'hb', inv ? '接受好友邀請' : (pend ? '已送出邀請' : '送出好友邀請'));
      if (pend && !inv) af.disabled = true;
      af.onclick = function () { addFriend(code, name).then(function (r) { toast(r.msg); if (r.ok) { if (hasFriend(code)) af.remove(); else { af.textContent = '已送出邀請'; af.disabled = true; } } }); };
      hd.appendChild(af);
    }
    var del = el('button', 'hb x', '刪除'); del.style.color = '#c0392b';
    del.onclick = function () {
      var go = function (ok) { if (ok) clearChat(code, pair); };
      if (root.PetAsk) root.PetAsk('刪除對話紀錄？', '只會刪除你這邊的紀錄，對方那邊不受影響。之後有新訊息還是會收到。', '刪除', true).then(go);
      else go(confirm('刪除對話紀錄？'));
    };
    hd.appendChild(del);
    var x = el('button', 'hb x', '關閉'); x.onclick = closeChat; hd.appendChild(x);
    var inp = el('input'); inp.type = 'text'; inp.maxLength = 200; inp.placeholder = '輸入訊息'; inp.setAttribute('enterkeyhint', 'send');
    var sb = el('button', '', '送出');
    var qk = el('div', 'qk');
    ['嗨！', '一起讀書嗎？', '你的寵物好可愛', '加油！', '要去吃飯了'].forEach(function (q) { var b = el('button', '', q); b.onclick = function () { send(q); }; qk.appendChild(b); });
    ft.appendChild(inp); ft.appendChild(sb);
    w.appendChild(hd); w.appendChild(ms); w.appendChild(qk); w.appendChild(ft); chatEl.appendChild(w);
    chatEl.addEventListener('click', function (e) { if (e.target === chatEl) closeChat(); });
    ['keydown', 'keyup', 'keypress'].forEach(function (t) { chatEl.addEventListener(t, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(chatEl);
    var empty = el('div', 'em', d ? '載入中…' : '目前離線，無法聊天'); ms.appendChild(empty);
    function send(t) {
      t = clean(t, 200); if (!t || !d) return;
      inp.value = '';
      var now = Date.now(), names = {}; names[o.friendCode] = o.name; names[code] = clean(name, 20);
      d.collection('petMsg').add({ pair: pair, from: o.friendCode, name: o.name, text: t, ts: now }).catch(function (e) { fail(e); toast('送出失敗'); });
      d.collection('petThread').doc(pair).set({ members: [o.friendCode, code], names: names, last: t, from: o.friendCode, ts: now }, { merge: true }).catch(fail);
      threads[code] = { pair: pair, ts: now, from: o.friendCode, last: t, name: clean(name, 20) }; saveThreads();
    }
    sb.onclick = function () { send(inp.value); inp.focus(); };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(inp.value); } });
    markRead(pair);
    if (d) chatUnsub = d.collection('petMsg').where('pair', '==', pair).onSnapshot(function (qs) {
      var arr = [], cl = cleared()[pair] || 0; qs.forEach(function (doc) { var m = doc.data(); if ((m.ts || 0) > cl) arr.push(m); });
      arr.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }); arr = arr.slice(-100);
      ms.innerHTML = '';
      if (!arr.length) ms.appendChild(el('div', 'em', '還沒有訊息，打個招呼吧'));
      arr.forEach(function (m) { ms.appendChild(el('div', 'm ' + (m.from === o.friendCode ? 'me' : 'ot'), clean(m.text, 200))); });
      ms.scrollTop = ms.scrollHeight; markRead(pair);
    }, function (e) { fail(e); empty.textContent = '無法載入訊息'; });
    setTimeout(function () { inp.focus(); }, 80);
  }

  /* 大廳 */
  var lob = null;
  function joinLobby(onList) {
    var d = db(), o = me(); if (!d || !o) { onList([]); return function () {}; }
    lob = { last: 0, pend: null, t: 0 };
    var u = d.collection('petLobby').where('ts', '>', Date.now() - LOBBY_TTL).onSnapshot(function (qs) {
      var arr = [], now = Date.now();
      qs.forEach(function (doc) { var v = doc.data(); v.code = doc.id; if (doc.id !== o.friendCode && now - (v.ts || 0) < LOBBY_TTL) arr.push(v); });
      if (st !== 'ok') { st = 'ok'; }
      onList(arr);
    }, function (e) { fail(e); onList([]); });
    return function () { try { u(); } catch (e) {} };
  }
  function setPresence(data, force) {
    var d = db(), o = me(); if (!d || !o || !lob) return;
    var now = Date.now();
    lob.pend = data;
    if (!force && now - lob.last < 1200) {
      if (!lob.t) lob.t = setTimeout(function () { lob.t = 0; if (lob && lob.pend) setPresence(lob.pend, true); }, 1200 - (now - lob.last));
      return;
    }
    lob.last = now; var v = lob.pend; lob.pend = null;
    var s = S(), doc = { name: o.name, look: o.look || null, ts: now };
    for (var k in v) doc[k] = v[k];
    if (doc.petId) { var p = root.PetCore.findPet(s, doc.petId); doc.pet = petSummary(p); delete doc.petId; }
    d.collection('petLobby').doc(o.friendCode).set(doc).then(function () { if (st !== 'ok') { st = 'ok'; } }, fail);
  }
  function leaveLobby() {
    var d = db(), o = me();
    if (lob && lob.t) clearTimeout(lob.t);
    lob = null;
    if (d && o) d.collection('petLobby').doc(o.friendCode).delete().catch(function () {});
  }

  function boot() {
    var n = 0, iv = setInterval(function () {
      n++;
      if (me()) start();
      if (n > 600) clearInterval(iv);
    }, 1000);
    root.addEventListener('petui:render', function () { if (me() && started !== me().friendCode) start(); });
    var pubT = 0;
    var lastPub = 0;
    root.addEventListener('petui:render', function () { clearTimeout(pubT); pubT = setTimeout(function () { if (Date.now() - lastPub < 60000) return; if (me() && db()) { lastPub = Date.now(); publish(); } }, 4000); });
  }
  root.PetSocial = {
    status: function () { if (!db()) return 'off'; return st; }, publish: publish, profile: profile, fetchProfiles: fetchProfiles,
    addFriend: addFriend, addFriendByCode: addFriendByCode, hasFriend: hasFriend, openChat: openChat, closeChat: closeChat,
    unread: unread, reqList: reqList, acceptReq: acceptReq, declineReq: declineReq, threadList: threadList,
    pending: function (c) { return !!sent()[c]; }, joinLobby: joinLobby, setPresence: setPresence, leaveLobby: leaveLobby, start: start, stop: stop, petSummary: petSummary
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
