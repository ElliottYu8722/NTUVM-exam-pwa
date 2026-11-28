/* pet-lobby.js  椰林大廳：多人、讀書、餵食 */
(function (root) {
  'use strict';
  var T = null, I = null, AV = null;
  var WALK = 2.6, RUN = 5.4, NEAR = 3.2, BX = 33, BZ = 40;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function inst(geo, mat, items) {
    var m = new T.InstancedMesh(geo, mat, items.length), d = new T.Object3D(), c = new T.Color();
    items.forEach(function (it, i) {
      d.position.set(it.x, it.y || 0, it.z); d.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
      var s = it.s || 1; d.scale.set(it.sx || s, it.sy || s, it.sz || s); d.updateMatrix();
      m.setMatrixAt(i, d.matrix); c.set(it.c || '#ffffff'); m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.frustumCulled = false; return m;
  }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  function buildCampus() {
    var g = new T.Group(), obs = [], boxes = [], tables = [], r = rng(7), M = I.mesh, toon = I.toon, W = '#ffffff';
    var ground = new T.Mesh(new T.PlaneGeometry(160, 160), toon('#8fd06a')); ground.rotation.x = -Math.PI / 2; g.add(ground);
    var road = new T.Mesh(new T.PlaneGeometry(7, 84), toon('#9a9ca3')); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, 2); g.add(road);
    var line = []; for (var z = -36; z < 42; z += 4) line.push({ x: 0, z: z, y: 0.03, sx: 0.15, sy: 1, sz: 1.8, c: '#f5f1e0' });
    g.add(inst(new T.BoxGeometry(1, 0.01, 1), toon(W), line));
    [-1, 1].forEach(function (sd) {
      var sw = new T.Mesh(new T.PlaneGeometry(3.2, 84), toon('#e6d3ae')); sw.rotation.x = -Math.PI / 2; sw.position.set(sd * 5.6, 0.025, 2); g.add(sw);
      var bk = new T.Mesh(new T.PlaneGeometry(1.4, 84), toon('#c97b5a')); bk.rotation.x = -Math.PI / 2; bk.position.set(sd * 3.9, 0.026, 2); g.add(bk);
    });
    var plaza = new T.Mesh(new T.CircleGeometry(9, 40), toon('#e6d3ae')); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.024, -27); g.add(plaza);

    var trunks = [], rings = [], fronds = [], nuts = [];
    for (z = -22; z <= 38; z += 5) {
      [-1, 1].forEach(function (sd) {
        var x = sd * 7.6, h = 6.2 + r() * 0.8;
        trunks.push({ x: x, z: z, y: h / 2, sx: 1, sy: h, sz: 1, c: '#b8a58a' });
        for (var k = 1; k < 6; k++) rings.push({ x: x, z: z, y: h * k / 6, s: 1, c: '#9c8a70' });
        for (var f = 0; f < 9; f++) {
          var a = f / 9 * Math.PI * 2 + r() * 0.3;
          fronds.push({ x: x, z: z, y: h + 0.05, ry: a, rz: -0.35 - r() * 0.35, c: ['#3f9a45', '#4aa94e', '#358a3c'][f % 3] });
        }
        for (k = 0; k < 3; k++) nuts.push({ x: x + Math.cos(k * 2.1) * 0.22, z: z + Math.sin(k * 2.1) * 0.22, y: h - 0.2, s: 1, c: '#7a5a2a' });
        obs.push({ x: x, z: z, r: 0.5 });
      });
    }
    g.add(inst(new T.CylinderGeometry(0.2, 0.28, 1, 8), toon(W), trunks));
    g.add(inst(new T.TorusGeometry(0.24, 0.04, 4, 10), toon(W), rings.map(function (q) { q.rx = Math.PI / 2; return q; })));
    var fg2 = new T.ConeGeometry(0.3, 2.6, 4); fg2.rotateZ(-Math.PI / 2); fg2.scale(1, 0.22, 1); fg2.translate(1.3, 0, 0);
    g.add(inst(fg2, toon(W), fronds));
    g.add(inst(new T.SphereGeometry(0.14, 8, 6), toon(W), nuts));

    var az = [];
    for (z = -20; z <= 38; z += 2.5) [-1, 1].forEach(function (sd) {
      if (Math.abs(((z + 22) % 5)) < 0.8) return;
      az.push({ x: sd * (7.6 + (r() - 0.5) * 0.4), z: z, y: 0.35, sx: 1.1, sy: 0.75, sz: 0.9, c: ['#ff7aa2', '#ff9ec0', '#f25c8a', '#ffffff'][Math.floor(r() * 4)] });
    });
    g.add(inst(new T.SphereGeometry(0.6, 10, 8), toon(W), az));

    var lib = new T.Group(); lib.position.set(0, 0, -38);
    lib.add(M(new T.BoxGeometry(34, 9, 8), '#efe0c4', 0, 4.5, 0, 1, 1, 1, 0.01));
    lib.add(M(new T.BoxGeometry(35, 0.8, 8.6), '#b4573b', 0, 9.2, 0));
    lib.add(M(new T.BoxGeometry(12, 13, 9), '#e9d6b6', 0, 6.5, 0.6, 1, 1, 1, 0.01));
    var roof = M(new T.ConeGeometry(7.6, 3.4, 4), '#b4573b', 0, 14.6, 0.6, 1, 1, 0.8); roof.rotation.y = Math.PI / 4; lib.add(roof);
    for (var ai = -2; ai <= 2; ai++) {
      lib.add(M(new T.BoxGeometry(1.6, 3.4, 0.2), '#6b4a3a', ai * 2.2, 1.9, 5.15));
      var arch = M(new T.CylinderGeometry(0.8, 0.8, 0.2, 16, 1, false, -Math.PI / 2, Math.PI), '#6b4a3a', ai * 2.2, 3.6, 5.15); arch.rotation.x = Math.PI / 2; lib.add(arch);
    }
    for (var wi = -7; wi <= 7; wi++) {
      if (Math.abs(wi) < 3) continue;
      for (var wr = 0; wr < 2; wr++) lib.add(M(new T.BoxGeometry(1.1, 1.6, 0.1), '#7fb3d9', wi * 2.2, 2.6 + wr * 3.4, 4.05));
    }
    for (var sti = 0; sti < 4; sti++) lib.add(M(new T.BoxGeometry(13 - sti * 0.6, 0.22, 1), '#d8c9ad', 0, 0.11 + sti * 0.22, 6.8 - sti * 0.5));
    g.add(lib); boxes.push({ x0: -17.5, x1: 17.5, z0: -42.5, z1: -32.2 });
    var lbl = AV.label('總圖書館', { h: 0.9 }); lbl.position.set(0, 10.6, -32.5); g.add(lbl);

    var fu = new T.Group(); fu.position.set(-11.5, 0, 28);
    fu.add(M(new T.CylinderGeometry(1.6, 1.8, 0.5, 20), '#b9b4aa', 0, 0.25, 0, 1, 1, 1, 0.03));
    [-0.75, 0.75].forEach(function (x) { fu.add(M(new T.BoxGeometry(0.34, 3.2, 0.34), '#d8d3c8', x, 2.1, 0, 1, 1, 1, 0.04)); });
    fu.add(M(new T.BoxGeometry(2.2, 0.3, 0.8), '#5a5550', 0, 3.85, 0, 1, 1, 1, 0.04));
    var roof2 = M(new T.ConeGeometry(1.5, 0.7, 4), '#4a4540', 0, 4.35, 0, 1, 1, 0.5); roof2.rotation.y = Math.PI / 4; fu.add(roof2);
    var bell = new T.Group(); bell.position.set(0, 3.65, 0);
    bell.add(M(new T.CylinderGeometry(0.28, 0.5, 0.9, 16, 1, true), toon('#8a6a2a', { side: T.DoubleSide }), 0, -0.5, 0, 1, 1, 1, 0.04));
    bell.add(M(new T.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#8a6a2a', 0, -0.06, 0));
    fu.add(bell); g.add(fu); obs.push({ x: -11.5, z: 28, r: 1.9 });
    var lb2 = AV.label('傅鐘', { h: 0.5 }); lb2.position.set(-11.5, 5.2, 28); g.add(lb2);

    var gate = new T.Group(); gate.position.set(0, 0, 43);
    [-6, 6].forEach(function (x) { gate.add(M(new T.BoxGeometry(1.4, 4.2, 1.4), '#d8cfc0', x, 2.1, 0, 1, 1, 1, 0.03)); obs.push({ x: x, z: 43, r: 1.1 }); });
    gate.add(M(new T.BoxGeometry(14, 0.6, 1.8), '#a35d3c', 0, 4.5, 0, 1, 1, 1, 0.03));
    g.add(gate);

    function addTable(x, z, ry) {
      var t = new T.Group(); t.position.set(x, 0, z); t.rotation.y = ry || 0;
      var wood = '#a8703a', dark = '#7a4e26';
      t.add(M(new T.BoxGeometry(2.4, 0.1, 1.1), wood, 0, 0.78, 0, 1, 1, 1, 0.03));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { t.add(M(new T.BoxGeometry(0.1, 0.76, 0.1), dark, q[0] * 1.05, 0.38, q[1] * 0.42)); });
      [-1, 1].forEach(function (sd) {
        t.add(M(new T.BoxGeometry(2.4, 0.08, 0.42), wood, 0, 0.46, sd * 0.95, 1, 1, 1, 0.04));
        [-1, 1].forEach(function (q) { t.add(M(new T.BoxGeometry(0.08, 0.44, 0.32), dark, q * 1.0, 0.22, sd * 0.95)); });
      });
      g.add(t);
      var seats = [];
      [-1, 1].forEach(function (sd) {
        [-0.6, 0.6].forEach(function (lx) {
          var c = Math.cos(ry || 0), sn = Math.sin(ry || 0), lz = sd * 0.95;
          seats.push({ x: x + lx * c + lz * sn, z: z - lx * sn + lz * c, ry: (ry || 0) + (sd > 0 ? Math.PI : 0), side: sd, petX: x + lx * c + sd * 1.75 * sn, petZ: z - lx * sn + sd * 1.75 * c });
        });
      });
      tables.push({ x: x, z: z, seats: seats });
      obs.push({ x: x, z: z, r: 1.35, table: true });
    }
    [[-15, -12], [-22, -12], [-15, -3], [-22, -3], [-15, 6], [-22, 6], [-15, 15], [-22, 15]].forEach(function (p, i) { addTable(p[0], p[1], i % 2 ? 0.08 : -0.06); });
    [[15, -8], [22, -8], [15, 2], [22, 2], [15, 12], [22, 12]].forEach(function (p, i) { addTable(p[0], p[1], i % 2 ? -0.05 : 0.1); });

    var tr = [], lv = [];
    [[-28, -18], [-28, 0], [-28, 18], [28, -15], [28, 6], [28, 22], [-18, 32], [17, 30], [-18, -22], [18, -22]].forEach(function (p) {
      var s = 1 + r() * 0.4;
      tr.push({ x: p[0], z: p[1], y: 1.2 * s, sx: s, sy: s, sz: s, c: '#7a5230' });
      lv.push({ x: p[0], z: p[1], y: 3.3 * s, sx: 2.4 * s, sy: 1.8 * s, sz: 2.4 * s, c: ['#4f9a45', '#5fae52'][Math.floor(r() * 2)] });
      obs.push({ x: p[0], z: p[1], r: 0.7 * s });
    });
    g.add(inst(new T.CylinderGeometry(0.3, 0.4, 2.4, 8), toon(W), tr));
    g.add(inst(new T.SphereGeometry(1, 12, 10), toon(W), lv));
    var lamps = [];
    for (z = -20; z <= 36; z += 10) [-1, 1].forEach(function (sd) { lamps.push({ x: sd * 4.6, z: z + 2.5 }); obs.push({ x: sd * 4.6, z: z + 2.5, r: 0.25 }); });
    g.add(inst(new T.CylinderGeometry(0.06, 0.08, 3.2, 6), toon(W), lamps.map(function (l) { return { x: l.x, z: l.z, y: 1.6, c: '#34383f' }; })));
    g.add(inst(new T.SphereGeometry(0.24, 10, 8), new T.MeshBasicMaterial({ color: 0xfff1b0 }), lamps.map(function (l) { return { x: l.x, z: l.z, y: 3.3 }; })));

    var clouds = [];
    for (var ci = 0; ci < 7; ci++) {
      var cg = new T.Group(); cg.position.set(-60 + r() * 120, 26 + r() * 8, -60 + r() * 80);
      for (var j = 0; j < 3; j++) cg.add(M(new T.SphereGeometry(3 + r() * 2, 10, 8), new T.MeshBasicMaterial({ color: 0xffffff, fog: false }), j * 3.2, r(), 0, 1.2, 0.7, 0.9));
      g.add(cg); clouds.push(cg);
    }
    return { group: g, obs: obs, boxes: boxes, tables: tables, update: function (t, dt) { clouds.forEach(function (c) { c.position.x += dt * 0.8; if (c.position.x > 80) c.position.x = -80; }); bell.rotation.z = Math.sin(t * 0.8) * 0.04; } };
  }

  function petPose(g, S, dt, act, down) {
    root.PetPlay._animatePet(g, S, dt, act);
    var U = g.userData;
    S.dk = (S.dk || 0) + ((down ? 1 : 0) - (S.dk || 0)) * Math.min(1, dt * 5);
    if (S.dk > 0.01) {
      U.legs[0].rotation.x += -1.3 * S.dk; U.legs[1].rotation.x += -1.3 * S.dk;
      U.legs[2].rotation.x += 1.3 * S.dk; U.legs[3].rotation.x += 1.3 * S.dk;
      U.upper.position.y -= U.leg * 0.72 * S.dk;
    }
    S.ek = (S.ek || 0) + ((act === 'eat' ? 1 : 0) - (S.ek || 0)) * Math.min(1, dt * 6);
    if (S.ek > 0.01) {
      U.head.position.y = U.headBase - S.ek * U.th * 0.55;
      U.head.rotation.x += S.ek * (0.55 + Math.sin(S.t * 9) * 0.12);
      U.jaw.visible = true; U.jaw.scale.y = 0.01 + S.ek * (0.5 + 0.5 * Math.sin(S.t * 12));
    } else U.head.position.y = U.headBase;
  }

  function Lobby(petId) {
    this.petId = petId; this.keys = {}; this.jx = 0; this.jy = 0; this.yaw = 0; this.pitch = 0.42; this.tt = 0;
    this.players = {}; this.state = 'load'; this.act = 'idle'; this.seat = null; this.waveT = 0; this.feedT = 0; this.studySec = 0;
  }
  Lobby.prototype.S = function () { return root.PetUI.state(); };
  Lobby.prototype.petData = function () { return root.PetCore.findPet(this.S(), this.petId); };
  Lobby.prototype.open = function () {
    var self = this, el = document.createElement('div');
    el.id = 'petLobbyRoot';
    el.style.cssText = 'position:fixed;inset:0;z-index:10001;background:#a9dcff;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"PingFang TC","Noto Sans TC",sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden';
    var ld = document.createElement('div'); ld.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#24431c;font-size:16px;font-weight:600;background:linear-gradient(160deg,#cbeaff,#9fd88a)'; ld.textContent = '走進椰林大道…';
    el.appendChild(ld); this.ld = ld;
    this.el = el; document.body.appendChild(el); this.prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    this.kd = function (e) { if (e.target && e.target.tagName === 'INPUT') return; self.keys[e.key.toLowerCase()] = true; };
    this.ku = function (e) { self.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
    root.Pet3D.loadThree().then(function () {
      I = root.Pet3D._i(); T = I.T; AV = root.PetAvatar; self.build();
    }, function () { ld.textContent = '3D 載入失敗，請連線後再試'; setTimeout(function () { self.close(); }, 1800); });
  };
  Lobby.prototype.build = function () {
    var self = this, p = this.petData(), o = this.S().owner;
    if (!p) { this.close(); return; }
    var st = root.Pet3D.stage && root.Pet3D.stage(); if (st) st.setActive(false);
    this.ld.remove();
    this.ren = new T.WebGLRenderer({ antialias: true }); this.ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.ren.domElement.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%';
    this.el.appendChild(this.ren.domElement);
    this.scene = new T.Scene(); this.scene.background = new T.Color('#a9dcff'); this.scene.fog = new T.Fog('#a9dcff', 40, 95);
    this.cam = new T.PerspectiveCamera(55, 1.6, 0.1, 220);
    this.scene.add(new T.HemisphereLight(0xffffff, 0xb8d89a, 1.15));
    var dl = new T.DirectionalLight(0xffffff, 1.3); dl.position.set(20, 40, 15); this.scene.add(dl);
    this.world = buildCampus(); this.scene.add(this.world.group);
    this.me = this.makeChar(o.name, o.look, p, true);
    var sx = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 1.8), sz = 16 + Math.random() * 4;
    this.me.root.position.set(sx, 0, sz); this.me.root.rotation.y = Math.PI;
    this.me.pet.position.set(sx - 0.8, 0, sz + 1);
    this.yaw = 0;
    this.camPos = new T.Vector3(sx, 4, sz + 7);
    this.hud(); this.resize();
    this.onResize = function () { self.resize(); }; window.addEventListener('resize', this.onResize);
    if (root.PetSocial) {
      this.unsub = root.PetSocial.joinLobby(function (list) { self.sync(list); });
      this.sendPresence(true);
      this.hb = setInterval(function () { self.sendPresence(true); }, 15000);
    }
    this.state = 'play'; this.last = 0;
    this.onFrame = function (ts) { self.frame(ts); }; this.raf = requestAnimationFrame(this.onFrame);
  };
  Lobby.prototype.makeChar = function (name, look, petInfo, mine) {
    var c = { root: AV.build(look), A: AV.newAnim(), lookSig: JSON.stringify(look || {}), petSig: '' };
    this.scene.add(c.root);
    c.label = AV.label(name || '玩家', { bg: mine ? 'rgba(232,131,58,.9)' : 'rgba(30,26,22,.72)' }); c.label.position.y = 1.95; c.root.add(c.label);
    var sh = new T.Mesh(new T.CircleGeometry(0.42, 20), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; c.root.add(sh);
    this.setCharPet(c, petInfo);
    return c;
  };
  Lobby.prototype.setCharPet = function (c, info) {
    var sig = info ? [info.breedId, info.bcs, info.muscle, info.wear, info.harness].join('|') : '';
    if (sig === c.petSig && c.pet) return;
    var pos = c.pet ? c.pet.position.clone() : null;
    if (c.pet) this.scene.remove(c.pet);
    c.petSig = sig; c.pet = null;
    if (!info) return;
    var fake = info.items ? info : { breedId: info.breedId, bcs: info.bcs || 5, muscle: info.muscle || 0, wear: info.wear || '', items: { harness: !!info.harness, clothes: { normal: true, trend: true, gold: true } }, equip: { harness: !!info.harness } };
    c.pet = I.buildPet(fake, 0.9); c.ps = { t: 0, phase: 0, leg: [0, 0, 0, 0], lean: 0, blink: 3 };
    if (pos) c.pet.position.copy(pos); else c.pet.position.set(c.root.position.x - 0.9, 0, c.root.position.z + 0.6);
    var ps = new T.Mesh(new T.CircleGeometry(0.5, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }));
    ps.rotation.x = -Math.PI / 2; ps.position.y = 0.03; ps.scale.set(1 / c.pet.userData.scale, 1.4 / c.pet.userData.scale, 1); c.pet.add(ps);
    this.scene.add(c.pet);
  };
  Lobby.prototype.resize = function () {
    if (!this.ren) return; var w = window.innerWidth, h = window.innerHeight;
    this.ren.setSize(w, h, false); this.cam.aspect = w / h; this.cam.fov = w / h < 1 ? 64 : 52; this.cam.updateProjectionMatrix();
  };
  function mkBtn(txt, css, fn) {
    var b = document.createElement('button'); b.textContent = txt;
    b.style.cssText = 'border:0;border-radius:16px;font-size:15px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit;padding:12px 18px;box-shadow:0 4px 14px rgba(0,0,0,.25);' + (css || '');
    b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(e); }); return b;
  }
  Lobby.prototype.hud = function () {
    var self = this, el = this.el;
    var top = document.createElement('div');
    top.style.cssText = 'position:absolute;left:10px;right:10px;top:max(10px,env(safe-area-inset-top));padding:8px 8px 8px 14px;display:flex;align-items:center;gap:10px;background:rgba(30,26,22,.55);border-radius:18px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);z-index:3';
    var tt = document.createElement('div'); tt.style.cssText = 'flex:1;min-width:0'; tt.innerHTML = '<div style="font-weight:800;font-size:16px">椰林大廳</div>';
    this.onlineEl = document.createElement('div'); this.onlineEl.style.cssText = 'font-size:12px;opacity:.85'; tt.appendChild(this.onlineEl);
    top.appendChild(tt);
    this.coinEl = document.createElement('div'); this.coinEl.style.cssText = 'font-weight:700;font-size:14px;background:rgba(255,255,255,.16);padding:6px 10px;border-radius:999px'; top.appendChild(this.coinEl);
    top.appendChild(mkBtn('離開', 'background:rgba(255,255,255,.18);padding:8px 14px;box-shadow:none', function () { self.close(); }));
    el.appendChild(top);
    this.hint = document.createElement('div');
    this.hint.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:calc(max(10px,env(safe-area-inset-top)) + 66px);font-size:13px;background:rgba(30,26,22,.55);padding:8px 14px;border-radius:999px;pointer-events:none;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis;z-index:3';
    this.hint.textContent = ('ontouchstart' in window) ? '左下搖桿移動，右邊滑動轉視角' : 'WASD 移動，拖曳畫面轉視角';
    el.appendChild(this.hint);
    this.studyEl = document.createElement('div');
    this.studyEl.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:calc(max(10px,env(safe-area-inset-top)) + 66px);font-size:15px;font-weight:700;background:rgba(63,143,99,.85);padding:8px 16px;border-radius:999px;pointer-events:none;display:none;z-index:3;font-variant-numeric:tabular-nums';
    el.appendChild(this.studyEl);

    var look = document.createElement('div'); look.style.cssText = 'position:absolute;inset:0;z-index:1;touch-action:none';
    el.appendChild(look);
    var drag = null;
    look.addEventListener('pointerdown', function (e) { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: self.yaw, pitch: self.pitch }; look.setPointerCapture(e.pointerId); });
    look.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      self.yaw = drag.yaw - (e.clientX - drag.x) * 0.008;
      self.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.004, 0.15, 0.95);
    });
    function lu(e) { if (drag && e.pointerId === drag.id) drag = null; }
    look.addEventListener('pointerup', lu); look.addEventListener('pointercancel', lu);

    var zone = document.createElement('div'); zone.style.cssText = 'position:absolute;left:0;bottom:0;width:48%;height:48%;touch-action:none;z-index:2';
    var base = document.createElement('div'); base.style.cssText = 'position:absolute;left:24px;bottom:calc(30px + env(safe-area-inset-bottom));width:132px;height:132px;border-radius:50%;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.55)';
    var thumb = document.createElement('div'); thumb.style.cssText = 'position:absolute;left:37px;top:37px;width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.8)';
    base.appendChild(thumb); zone.appendChild(base); el.appendChild(zone);
    var act = false, pid = null;
    function move(e) {
      var rc = base.getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
      var dx = e.clientX - cx, dy = e.clientY - cy, d = Math.sqrt(dx * dx + dy * dy), mx = 66, k = d > mx ? mx / d : 1; dx *= k; dy *= k;
      thumb.style.left = (37 + dx) + 'px'; thumb.style.top = (37 + dy) + 'px'; self.jx = dx / mx; self.jy = dy / mx;
    }
    zone.addEventListener('pointerdown', function (e) { act = true; pid = e.pointerId; zone.setPointerCapture(pid); move(e); e.preventDefault(); e.stopPropagation(); });
    zone.addEventListener('pointermove', function (e) { if (act && e.pointerId === pid) move(e); });
    function up(e) { if (e.pointerId !== pid) return; act = false; self.jx = 0; self.jy = 0; thumb.style.left = '37px'; thumb.style.top = '37px'; }
    zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);

    var side = document.createElement('div');
    side.style.cssText = 'position:absolute;right:14px;bottom:calc(30px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;align-items:flex-end;z-index:3';
    this.studyBtn = mkBtn('讀書', 'background:#3f8f63;min-width:96px', function () { self.toggleStudy(); });
    this.feedBtn = mkBtn('餵寵物', 'background:#e8833a;min-width:96px', function () { self.feedMenu(); });
    side.appendChild(this.feedBtn); side.appendChild(this.studyBtn); el.appendChild(side);
    this.near = document.createElement('div');
    this.near.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(190px + env(safe-area-inset-bottom));display:none;flex-direction:column;align-items:center;gap:8px;z-index:3';
    this.nearName = document.createElement('div'); this.nearName.style.cssText = 'font-size:13px;background:rgba(30,26,22,.6);padding:5px 12px;border-radius:999px;white-space:nowrap';
    var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px';
    row.appendChild(mkBtn('打招呼', 'background:#f07aa0', function () { self.wave(); }));
    row.appendChild(mkBtn('交流', 'background:#4aa3df', function () { if (self.nearP && root.PetSocial) root.PetSocial.openChat(self.nearP.code, self.nearP.name); }));
    this.near.appendChild(this.nearName); this.near.appendChild(row); el.appendChild(this.near);
    this.updCoins();
  };
  Lobby.prototype.updCoins = function () { if (this.coinEl) this.coinEl.textContent = this.S().coins + ' 金幣'; };
  Lobby.prototype.toast = function (t) { if (root.PetUI) root.PetUI.toast(t); };

  Lobby.prototype.nearestSeat = function () {
    var me = this.me.root.position, best = null, bd = 1e9, taken = {};
    for (var k in this.players) { var pl = this.players[k]; if (pl.data.seat) taken[pl.data.seat] = 1; }
    this.world.tables.forEach(function (t, ti) {
      t.seats.forEach(function (s, si) {
        var id = ti + '-' + si; if (taken[id]) return;
        var dx = s.x - me.x, dz = s.z - me.z, d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { s: s, id: id }; }
      });
    });
    return best && bd < 36 ? best : null;
  };
  Lobby.prototype.toggleStudy = function () {
    if (this.seat) { this.standUp(); return; }
    var b = this.nearestSeat();
    if (!b) { this.toast('走到木桌旁邊再按讀書'); return; }
    this.seat = b; this.auto = { x: b.s.x, z: b.s.z, ry: b.s.ry }; this.studyBtn.textContent = '起來';
    this.sendPresence(true);
  };
  Lobby.prototype.standUp = function () {
    var s = this.seat && this.seat.s; this.seat = null; this.auto = null; this.sitting = false; this.studyBtn.textContent = '讀書';
    this.studyEl.style.display = 'none';
    if (s) { this.me.root.position.x += Math.sin(s.ry) * -0.9; this.me.root.position.z += Math.cos(s.ry) * -0.9; }
    this.sendPresence(true);
  };
  Lobby.prototype.feedMenu = function () {
    var self = this, p = this.petData(), C = root.PetCore;
    if (this.menuEl) { this.menuEl.remove(); this.menuEl = null; return; }
    var m = document.createElement('div');
    m.style.cssText = 'position:absolute;right:14px;bottom:calc(150px + env(safe-area-inset-bottom));background:rgba(255,255,255,.97);color:#2b2620;border-radius:18px;padding:12px;width:min(300px,calc(100vw - 28px));box-shadow:0 10px 30px rgba(0,0,0,.3);z-index:4';
    m.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    var hd = document.createElement('div'); hd.style.cssText = 'font-weight:800;font-size:15px;margin:2px 4px 8px'; hd.textContent = '餵 ' + p.name + '（今天 ' + p.meals + ' 餐，零食 ' + p.snacks + ' 個）'; m.appendChild(hd);
    var g = document.createElement('div'); g.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px';
    function add(label, sub, fn, bg) {
      var b = document.createElement('button'); b.style.cssText = 'border:0;border-radius:12px;padding:9px 6px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;color:' + (bg ? '#fff' : '#b8611f') + ';background:' + (bg || '#fdeedd');
      b.innerHTML = ''; b.appendChild(document.createTextNode(label)); var sm = document.createElement('small'); sm.style.cssText = 'display:block;font-weight:500;font-size:11px;opacity:.85'; sm.textContent = sub; b.appendChild(sm);
      b.onclick = function () { fn(); }; g.appendChild(b);
    }
    C.MEALS.forEach(function (x) { add(x.name, x.price + ' 金幣', function () { self.doFeed(C.feed(self.S(), p.id, x.id, Date.now()), x.id === 'big' ? 'kibble' : 'kibble'); }); });
    add('高級罐頭', C.CFG.cannedPrice + ' 金幣', function () { self.doFeed(C.feed(self.S(), p.id, 'canned', Date.now()), 'canned'); }, '#c48a2c');
    C.snackList(p).forEach(function (x) { add(x.name, C.CFG.snackPrice + ' 金幣', function () { self.doFeed(C.snack(self.S(), p.id, Date.now(), x.id), 'snack', x.id); }); });
    m.appendChild(g); this.el.appendChild(m); this.menuEl = m;
  };
  Lobby.prototype.doFeed = function (r, kind, snackId) {
    this.toast(r.msg);
    if (this.menuEl) { this.menuEl.remove(); this.menuEl = null; }
    if (!r.ok) return;
    root.PetStore.save(this.S()); this.updCoins();
    var pet = this.me.pet, U = pet.userData, fy = pet.rotation.y, reach = (U.tl * 0.85 + U.hr * 0.8) * U.scale;
    if (this.feedObj) this.scene.remove(this.feedObj);
    var obj;
    if (kind === 'snack') obj = I.snackMesh(snackId);
    else {
      obj = new T.Group();
      obj.add(I.mesh(new T.CylinderGeometry(0.28, 0.2, 0.16, 20), '#e8e8f0', 0, 0.08, 0, 1, 1, 1, 0.06));
      obj.add(I.mesh(I.sph(0.22), kind === 'canned' ? '#d98a7a' : '#8b5a2b', 0, 0.17, 0, 1, 0.35, 1));
    }
    obj.position.set(pet.position.x + Math.sin(fy) * reach, 0, pet.position.z + Math.cos(fy) * reach);
    this.scene.add(obj); this.feedObj = obj; this.feedT = kind === 'snack' ? 2.2 : 3.6; this.feedTot = this.feedT; this.feedFace = fy;
    var mp = pet.position, fx = (obj.position.x + mp.x) / 2, fz = (obj.position.z + mp.z) / 2, from = new T.Vector3(fx, 0.35, fz);
    var rc = new T.Raycaster(); rc.camera = this.cam; var best = fy + 0.8, cands = [0.8, -0.8, 1.6, -1.6, 2.4, -2.4, 0];
    for (var ci = 0; ci < cands.length; ci++) {
      var yw = fy + cands[ci], dir = new T.Vector3(Math.sin(yw) * Math.cos(0.38), Math.sin(0.38), Math.cos(yw) * Math.cos(0.38));
      rc.set(from, dir); rc.far = 2.8;
      if (!rc.intersectObject(this.world.group, true).length) { best = yw; break; }
    }
    this.zoom = { t: this.feedT + 0.6, at: obj.position.clone(), yaw: best };
  };
  Lobby.prototype.wave = function () {
    this.waveT = 1.8;
    if (this.nearP) {
      var me = this.me.root.position, o = this.nearP.cur;
      this.me.root.rotation.y = Math.atan2(o.x - me.x, o.z - me.z);
      this.sendPresence(true, { wave: { to: this.nearP.code, ts: Date.now() } });
    } else this.sendPresence(true, { wave: { to: '', ts: Date.now() } });
  };
  Lobby.prototype.sendPresence = function (force, extra) {
    if (!root.PetSocial || !this.me) return;
    var r = this.me.root, d = { x: Math.round(r.position.x * 100) / 100, z: Math.round(r.position.z * 100) / 100, ry: Math.round(r.rotation.y * 100) / 100, act: this.sitting ? 'study' : (this.moving ? 'walk' : 'idle'), seat: this.seat ? this.seat.id : '', petId: this.petId };
    if (extra && extra.wave) { this.lastWave = extra.wave; }
    d.wave = this.lastWave && Date.now() - this.lastWave.ts < 4000 ? this.lastWave : null;
    root.PetSocial.setPresence(d, force);
  };
  Lobby.prototype.sync = function (list) {
    var self = this, seen = {}, myCode = this.S().owner.friendCode;
    if (!this.scene) return;
    list.forEach(function (v) {
      seen[v.code] = 1;
      var pl = self.players[v.code];
      if (!pl) {
        var c = self.makeChar(v.name, v.look, v.pet, false);
        c.root.position.set(v.x || 0, 0, v.z || 0); c.root.rotation.y = v.ry || 0;
        pl = self.players[v.code] = { code: v.code, name: v.name, c: c, cur: c.root.position, data: v, waveSeen: v.wave ? v.wave.ts : 0, wv: 0 };
      }
      var lk = JSON.stringify(v.look || {});
      if (lk !== pl.c.lookSig) {
        var pos = pl.c.root.position.clone(), ry = pl.c.root.rotation.y;
        self.scene.remove(pl.c.root); var nc = AV.build(v.look); nc.position.copy(pos); nc.rotation.y = ry; self.scene.add(nc);
        nc.add(pl.c.label); pl.c.root.children.forEach(function () {}); pl.c.root = nc; pl.c.lookSig = lk; pl.cur = nc.position;
      }
      self.setCharPet(pl.c, v.pet);
      pl.data = v; pl.name = v.name;
      if (v.wave && v.wave.ts > pl.waveSeen) {
        pl.waveSeen = v.wave.ts; pl.wv = 1.8;
        if (v.wave.to === myCode) { self.toast(v.name + ' 向你打招呼'); self.bubble(pl, '嗨！'); }
        else self.bubble(pl, '嗨～');
      }
    });
    Object.keys(this.players).forEach(function (k) {
      if (seen[k]) return;
      var pl = self.players[k]; self.scene.remove(pl.c.root); if (pl.c.pet) self.scene.remove(pl.c.pet); delete self.players[k];
    });
    this.onlineEl.textContent = '線上 ' + (Object.keys(this.players).length + 1) + ' 人';
  };
  Lobby.prototype.bubble = function (pl, text) {
    if (pl.bub) pl.c.root.remove(pl.bub);
    var b = AV.label(text, { bg: 'rgba(255,255,255,.95)', fg: '#2b2620', h: 0.32 }); b.position.y = 2.35; pl.c.root.add(b); pl.bub = b; pl.bubT = 2.5;
  };
  Lobby.prototype.collide = function (p, rad, skipTables) {
    var ob = this.world.obs, i;
    for (i = 0; i < ob.length; i++) {
      if (skipTables && ob[i].table) continue;
      var dx = p.x - ob[i].x, dz = p.z - ob[i].z, d = Math.sqrt(dx * dx + dz * dz), mr = ob[i].r + rad;
      if (d < mr && d > 1e-4) { p.x = ob[i].x + dx / d * mr; p.z = ob[i].z + dz / d * mr; }
    }
    this.world.boxes.forEach(function (b) {
      if (p.x > b.x0 - rad && p.x < b.x1 + rad && p.z > b.z0 - rad && p.z < b.z1 + rad) p.z = b.z1 + rad;
    });
    p.x = clamp(p.x, -BX, BX); p.z = clamp(p.z, -31, BZ);
  };
  Lobby.prototype.frame = function (ts) {
    if (this.state !== 'play') return;
    var dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : 0.016; this.last = ts;
    this.step(dt); this.ren.render(this.scene, this.cam);
    this.raf = requestAnimationFrame(this.onFrame);
  };
  Lobby.prototype.step = function (dt) {
    this.tt += dt;
    var k = this.keys, jx = this.jx, jy = this.jy, me = this.me, r = me.root, act = 'idle', self = this;
    var kx = (k.arrowright || k.d ? 1 : 0) - (k.arrowleft || k.a ? 1 : 0), kz = (k.arrowdown || k.s ? 1 : 0) - (k.arrowup || k.w ? 1 : 0);
    if (k.q) this.yaw += dt * 1.8; if (k.e) this.yaw -= dt * 1.8;
    if (kx || kz) { var kl = Math.sqrt(kx * kx + kz * kz); jx = kx / kl * (k.shift ? 1 : 0.6); jy = kz / kl * (k.shift ? 1 : 0.6); }
    var mag = Math.min(1, Math.sqrt(jx * jx + jy * jy));
    if (mag > 0.15 && this.seat) this.standUp();
    this.moving = false;
    if (this.auto) {
      var ax = this.auto.x - r.position.x, az = this.auto.z - r.position.z, ad = Math.sqrt(ax * ax + az * az);
      if (ad > 0.06) {
        var sp0 = Math.min(WALK * 1.2, ad * 4);
        r.position.x += ax / ad * sp0 * dt; r.position.z += az / ad * sp0 * dt;
        r.rotation.y += angDiff(Math.atan2(ax, az), r.rotation.y) * Math.min(1, dt * 10); act = 'walk'; this.moving = true;
      } else {
        r.position.x = this.auto.x; r.position.z = this.auto.z;
        r.rotation.y += angDiff(this.auto.ry, r.rotation.y) * Math.min(1, dt * 8);
        if (!this.sitting) { this.sitting = true; this.studyT0 = Date.now(); this.sendPresence(true); this.toast('開始讀書'); }
        act = 'study';
      }
    } else if (mag > 0.1) {
      act = mag > 0.75 ? 'run' : 'walk';
      var sp = act === 'run' ? RUN : WALK * (0.5 + mag * 0.6);
      var cs = Math.cos(this.yaw), sn = Math.sin(this.yaw), nx = (jx * cs + jy * sn) / mag, nz = (-jx * sn + jy * cs) / mag;
      r.position.x += nx * sp * dt; r.position.z += nz * sp * dt;
      r.rotation.y += angDiff(Math.atan2(nx, nz), r.rotation.y) * Math.min(1, dt * 10);
      this.moving = true;
    }
    if (!this.auto) this.collide(r.position, 0.35);
    if (this.waveT > 0) { this.waveT -= dt; if (act === 'idle') act = 'wave'; }
    AV.animate(r, me.A, dt, act);
    if (act === 'study') r.position.y = 0.0; else r.position.y = 0;
    if (this.sitting) {
      var sec = Math.floor((Date.now() - this.studyT0) / 1000);
      this.studyEl.style.display = 'block'; this.studyEl.textContent = '讀書中 ' + String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
      if (this.hint) { this.hint.remove(); this.hint = null; }
    }

    var pet = me.pet, pU = pet.userData, ptx, ptz, pact = 'idle', down = false;
    if (this.seat && this.sitting) { ptx = this.seat.s.petX; ptz = this.seat.s.petZ; }
    else { var bk = r.rotation.y + 2.4; ptx = r.position.x + Math.sin(bk) * 1.1; ptz = r.position.z + Math.cos(bk) * 1.1; }
    if (this.feedT > 0) {
      this.feedT -= dt; pact = 'eat';
      pet.rotation.y += angDiff(this.feedFace, pet.rotation.y) * Math.min(1, dt * 6);
      if (this.feedObj) {
        var fo = this.feedObj, left = Math.max(0, this.feedT / this.feedTot);
        if (fo.children.length > 1 && fo.children[1].scale) fo.children[1].scale.set(Math.max(0.2, left), 0.35 * left + 0.01, Math.max(0.2, left));
        else fo.scale.setScalar(Math.max(0.05, left));
      }
      if (this.feedT <= 0 && this.feedObj) { this.scene.remove(this.feedObj); this.feedObj = null; this.toast(this.petData().name + ' 吃飽了'); }
    } else {
      var dx = ptx - pet.position.x, dz = ptz - pet.position.z, dd = Math.sqrt(dx * dx + dz * dz);
      if (dd > 0.25) {
        pact = dd > 3 ? 'run' : 'walk';
        var psp = Math.min(dd * 2.2, pact === 'run' ? RUN * 1.1 : WALK * 1.05);
        pet.position.x += dx / dd * psp * dt; pet.position.z += dz / dd * psp * dt;
        pet.rotation.y += angDiff(Math.atan2(dx, dz), pet.rotation.y) * Math.min(1, dt * 8);
      } else if (this.sitting) { down = true; pet.rotation.y += angDiff(this.seat.s.ry + Math.PI / 2, pet.rotation.y) * Math.min(1, dt * 4); }
      else pet.rotation.y += angDiff(Math.atan2(r.position.x - pet.position.x, r.position.z - pet.position.z), pet.rotation.y) * Math.min(1, dt * 3);
      this.collide(pet.position, 0.3 * pU.scale + 0.15, this.sitting);
    }
    petPose(pet, me.ps, dt, pact, down);

    var nearest = null, nd = NEAR;
    Object.keys(this.players).forEach(function (code) {
      var pl = self.players[code], v = pl.data, c = pl.c, rp = c.root.position;
      var tx = v.x || 0, tz = v.z || 0, ex = tx - rp.x, ez = tz - rp.z, ed = Math.sqrt(ex * ex + ez * ez);
      var ract = v.act === 'study' ? 'study' : 'idle';
      if (ed > 8) { rp.x = tx; rp.z = tz; }
      else if (ed > 0.05) { var rs = Math.min(ed * 3, RUN); rp.x += ex / ed * rs * dt; rp.z += ez / ed * rs * dt; if (ed > 0.2 && ract !== 'study') ract = ed > 2.5 ? 'run' : 'walk'; }
      if (ract === 'walk' || ract === 'run') c.root.rotation.y += angDiff(Math.atan2(ex, ez), c.root.rotation.y) * Math.min(1, dt * 8);
      else c.root.rotation.y += angDiff(v.ry || 0, c.root.rotation.y) * Math.min(1, dt * 6);
      if (pl.wv > 0) { pl.wv -= dt; if (ract === 'idle') ract = 'wave'; }
      AV.animate(c.root, c.A, dt, ract);
      if (pl.bubT > 0) { pl.bubT -= dt; if (pl.bubT <= 0 && pl.bub) { c.root.remove(pl.bub); pl.bub = null; } }
      if (c.pet) {
        var seat = null;
        if (v.seat && ract === 'study') { var pr = v.seat.split('-'), tb = self.world.tables[+pr[0]]; seat = tb && tb.seats[+pr[1]]; }
        var qx = seat ? seat.petX : rp.x + Math.sin(c.root.rotation.y + 2.4) * 1.1, qz = seat ? seat.petZ : rp.z + Math.cos(c.root.rotation.y + 2.4) * 1.1;
        var fx = qx - c.pet.position.x, fz = qz - c.pet.position.z, fd = Math.sqrt(fx * fx + fz * fz), pa = 'idle';
        if (fd > 0.25) { pa = fd > 3 ? 'run' : 'walk'; var s2 = Math.min(fd * 2.2, RUN); c.pet.position.x += fx / fd * s2 * dt; c.pet.position.z += fz / fd * s2 * dt; c.pet.rotation.y += angDiff(Math.atan2(fx, fz), c.pet.rotation.y) * Math.min(1, dt * 8); }
        petPose(c.pet, c.ps, dt, pa, !!seat && fd <= 0.25);
      }
      var mx = rp.x - r.position.x, mz = rp.z - r.position.z, md = Math.sqrt(mx * mx + mz * mz);
      if (md < nd) { nd = md; nearest = pl; }
    });
    if (nearest !== this.nearP) {
      this.nearP = nearest;
      this.near.style.display = nearest ? 'flex' : 'none';
      if (nearest) this.nearName.textContent = nearest.name + (nearest.data.pet ? ' 和 ' + nearest.data.pet.name : '');
    }

    this.world.update(this.tt, dt);
    var dist = 7.5, ph = this.pitch, focus = r.position, fh = 1.1;
    var yw = this.yaw;
    if (this.zoom && this.zoom.t > 0) {
      this.zoom.t -= dt; dist = 2.6; fh = 0.35; ph = 0.38; yw = this.zoom.yaw;
      var mp = this.me.pet.position; focus = { x: (this.zoom.at.x + mp.x) / 2, z: (this.zoom.at.z + mp.z) / 2 };
    } else if (this.sitting) dist = 5.2;
    var cx = focus.x + Math.sin(yw) * Math.cos(ph) * dist, cz = focus.z + Math.cos(yw) * Math.cos(ph) * dist, cy = fh + Math.sin(ph) * dist;
    var a = 1 - Math.exp(-dt * 5);
    this.camPos.x += (cx - this.camPos.x) * a; this.camPos.y += (cy - this.camPos.y) * a; this.camPos.z += (cz - this.camPos.z) * a;
    this.cam.position.copy(this.camPos);
    this.lookAt = this.lookAt || new T.Vector3(focus.x, fh, focus.z);
    this.lookAt.x += (focus.x - this.lookAt.x) * a; this.lookAt.y += (fh - this.lookAt.y) * a; this.lookAt.z += (focus.z - this.lookAt.z) * a;
    this.cam.lookAt(this.lookAt);
    if (this.moving && root.PetSocial) this.sendPresence(false);
    if (this.hint && this.tt > 7) { this.hint.remove(); this.hint = null; }
  };
  Lobby.prototype.close = function () {
    if (this.state === 'closed') return;
    this.state = 'closed';
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.hb) clearInterval(this.hb);
    if (this.unsub) this.unsub();
    if (root.PetSocial) { root.PetSocial.leaveLobby(); root.PetSocial.closeChat(); }
    window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku);
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.ren) { this.ren.dispose(); if (this.ren.forceContextLoss) this.ren.forceContextLoss(); }
    this.el.remove(); document.body.style.overflow = this.prevOverflow || ''; current = null;
    if (root.PetUI && root.PetUI.open) root.PetUI.open();
  };

  var current = null;
  function start(petId) {
    if (current) return;
    if (root.PetUI && root.PetUI.close) root.PetUI.close();
    current = new Lobby(petId); current.open();
  }
  root.PetLobby = { start: start, current: function () { return current; } };
})(typeof window !== 'undefined' ? window : globalThis);
