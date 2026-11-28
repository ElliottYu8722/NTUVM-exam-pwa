/* pet-play.js  戶外玩樂場景與虛擬搖桿 */
(function (root) {
  'use strict';
  var T = null, I = null;
  var SCENES = [
    { id: 'grass', name: '大草原', desc: '開闊的草地、野花和蝴蝶' },
    { id: 'forest', name: '樹林', desc: '濃密的樹木、倒木和蘑菇' },
    { id: 'park', name: '公園', desc: '噴水池、水塘、長椅和步道' }
  ];
  var WALK = 2.2, RUN = 5.6, LIMIT = 29.5;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(s) { return pad(Math.floor(s / 60)) + ':' + pad(Math.floor(s % 60)); }

  function inst(geo, mat, items) {
    var m = new T.InstancedMesh(geo, mat, items.length), d = new T.Object3D(), col = new T.Color();
    items.forEach(function (it, i) {
      d.position.set(it.x, it.y || 0, it.z); d.rotation.set(0, it.ry || 0, 0);
      var s = it.s || 1; d.scale.set(it.sx || s, it.sy || s, it.sz || s); d.updateMatrix();
      m.setMatrixAt(i, d.matrix); col.set(it.c || '#ffffff'); m.setColorAt(i, col);
    });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.frustumCulled = false; return m;
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function ringPos(r, minR, maxR, avoid) {
    for (var k = 0; k < 20; k++) {
      var a = r() * Math.PI * 2, d = minR + Math.sqrt(r()) * (maxR - minR), x = Math.cos(a) * d, z = Math.sin(a) * d, ok = true;
      if (avoid) for (var i = 0; i < avoid.length; i++) { var dx = x - avoid[i].x, dz = z - avoid[i].z; if (dx * dx + dz * dz < avoid[i].r * avoid[i].r) { ok = false; break; } }
      if (ok) return { x: x, z: z };
    }
    return { x: Math.cos(1) * maxR, z: Math.sin(1) * maxR };
  }

  function buildScene(id) {
    var r = rng(id === 'grass' ? 11 : id === 'forest' ? 22 : 33);
    var g = new T.Group(), obs = [], upd = [];
    var cfg = {
      grass: { sky: '#a5defa', ground: '#8fd36b', fog: [28, 70], tufts: 700, greens: ['#7bc65a', '#8fd36b', '#6fb850', '#9ddc78'] },
      forest: { sky: '#bfe0c9', ground: '#5f9c4f', fog: [10, 42], tufts: 350, greens: ['#4f8a45', '#5f9c4f', '#3f7a3c', '#6aa858'] },
      park: { sky: '#a9e0ff', ground: '#a5df7a', fog: [30, 75], tufts: 260, greens: ['#94d46c', '#a5df7a', '#86c860', '#b2e888'] }
    }[id];
    var ground = new T.Mesh(new T.CircleGeometry(70, 48), I.toon(cfg.ground)); ground.rotation.x = -Math.PI / 2; g.add(ground);

    var tufts = [], i;
    for (i = 0; i < cfg.tufts; i++) { var p = ringPos(r, 0, 33); tufts.push({ x: p.x, z: p.z, y: 0.2, sx: 0.8 + r() * 0.8, sy: 0.7 + r() * 0.9, sz: 0.8 + r() * 0.8, ry: r() * 6, c: pick(r, cfg.greens) }); }
    g.add(inst(new T.ConeGeometry(0.1, 0.5, 4), I.toon('#ffffff'), tufts));

    function trees(list, trunkC, leafCs, sc) {
      var tr = [], c1 = [], c2 = [];
      list.forEach(function (p) {
        var s = (0.8 + r() * 0.7) * sc, lc = pick(r, leafCs);
        tr.push({ x: p.x, z: p.z, y: 0.8 * s, s: s, c: trunkC });
        c1.push({ x: p.x, z: p.z, y: 2.3 * s, s: s, c: lc });
        c2.push({ x: p.x, z: p.z, y: 3.5 * s, s: s * 0.9, c: lc });
        obs.push({ x: p.x, z: p.z, r: 0.55 * s + 0.3 });
      });
      g.add(inst(new T.CylinderGeometry(0.18, 0.25, 1.6, 6), I.toon('#ffffff'), tr));
      g.add(inst(new T.ConeGeometry(1.25, 2.4, 7), I.toon('#ffffff'), c1));
      g.add(inst(new T.ConeGeometry(0.95, 1.9, 7), I.toon('#ffffff'), c2));
    }
    function rocks(n, minR) {
      var rk = [];
      for (var k = 0; k < n; k++) { var p = ringPos(r, minR, 27, obs); var s = 0.5 + r() * 0.9; rk.push({ x: p.x, z: p.z, y: s * 0.4, sx: s * 1.2, sy: s * 0.8, sz: s, ry: r() * 6, c: pick(r, ['#9a9aa0', '#8a8a90', '#aaaab0']) }); obs.push({ x: p.x, z: p.z, r: s * 1.0 + 0.2 }); }
      g.add(inst(new T.DodecahedronGeometry(1, 0), I.toon('#ffffff'), rk));
    }
    function flowers(n, minR, maxR) {
      var fl = [], cs = ['#ff7aa2', '#ffd54a', '#ffffff', '#b58cff', '#ff9f43'];
      for (var k = 0; k < n; k++) { var p = ringPos(r, minR, maxR); fl.push({ x: p.x, z: p.z, y: 0.28, s: 1, c: pick(r, cs) }); }
      g.add(inst(new T.SphereGeometry(0.12, 8, 6), I.toon('#ffffff'), fl));
      var st = fl.map(function (f) { return { x: f.x, z: f.z, y: 0.13, sx: 0.4, sy: 1, sz: 0.4, c: '#4f9a3c' }; });
      g.add(inst(new T.CylinderGeometry(0.03, 0.03, 0.26, 4), I.toon('#ffffff'), st));
    }

    if (id === 'grass') {
      var lone = []; for (i = 0; i < 9; i++) lone.push(ringPos(r, 8, 27, obs));
      trees(lone, '#8b5a2b', ['#5fb85a', '#6fc868', '#4fa84e'], 1.1);
      rocks(14, 6); flowers(160, 3, 30);
    } else if (id === 'forest') {
      var tl = []; for (i = 0; i < 95; i++) tl.push(ringPos(r, 4, 29, tl.map(function (q) { return { x: q.x, z: q.z, r: 1.8 }; })));
      trees(tl, '#6b4a2b', ['#2f7a3c', '#3a8a45', '#256a35', '#4a9a4e'], 1.15);
      rocks(8, 5);
      var mu = [], mc = [];
      for (i = 0; i < 28; i++) { var mp = ringPos(r, 3, 28, obs); mu.push({ x: mp.x, z: mp.z, y: 0.2, s: 0.6 + r() * 0.6, c: pick(r, ['#e74c3c', '#f39c12', '#f5e6d0']) }); mc.push({ x: mp.x, z: mp.z, y: 0.1, sx: 0.5, sy: 1, sz: 0.5, c: '#f5efe6' }); }
      g.add(inst(new T.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), I.toon('#ffffff'), mu));
      g.add(inst(new T.CylinderGeometry(0.06, 0.07, 0.2, 6), I.toon('#ffffff'), mc));
      var lg = [];
      for (i = 0; i < 6; i++) { var lp = ringPos(r, 4, 26, obs); lg.push({ x: lp.x, z: lp.z, y: 0.3, sx: 1, sy: 3.2, sz: 1, ry: r() * 3, c: '#7a5230' }); obs.push({ x: lp.x, z: lp.z, r: 1.4 }); }
      var lgGeo = new T.CylinderGeometry(0.32, 0.32, 1, 8); lgGeo.rotateZ(Math.PI / 2);
      g.add(inst(lgGeo, I.toon('#ffffff'), lg.map(function (q) { return { x: q.x, z: q.z, y: 0.32, sx: 3.2, sy: 1, sz: 1, ry: q.ry, c: '#7a5230' }; })));
      flowers(40, 3, 28);
    } else {
      var path = new T.Mesh(new T.RingGeometry(8.5, 11.5, 56), I.toon('#ecdcb8')); path.rotation.x = -Math.PI / 2; path.position.y = 0.02; g.add(path);
      var cross = new T.Mesh(new T.PlaneGeometry(3, 60), I.toon('#ecdcb8')); cross.rotation.x = -Math.PI / 2; cross.position.y = 0.021; g.add(cross);
      var cross2 = cross.clone(); cross2.rotation.z = Math.PI / 2; g.add(cross2);
      var fo = new T.Group(); fo.add(I.mesh(new T.CylinderGeometry(2.2, 2.4, 0.6, 24), '#d9d9e0', 0, 0.3, 0, 1, 1, 1, 0.03));
      fo.add(I.mesh(new T.CylinderGeometry(1.8, 1.8, 0.1, 24), '#6fc3ff', 0, 0.58, 0));
      fo.add(I.mesh(new T.CylinderGeometry(0.2, 0.3, 1.6, 12), '#d9d9e0', 0, 1.0, 0, 1, 1, 1, 0.04));
      fo.add(I.mesh(new T.SphereGeometry(0.45, 14, 10), '#8fd6ff', 0, 1.9, 0)); g.add(fo); obs.push({ x: 0, z: 0, r: 2.7 });
      var pondM = new T.Mesh(new T.CircleGeometry(5, 32), I.toon('#5fb8f0')); pondM.rotation.x = -Math.PI / 2; pondM.position.set(-17, 0.03, -12); g.add(pondM);
      var rim = new T.Mesh(new T.RingGeometry(5, 5.5, 32), I.toon('#9a9aa0')); rim.rotation.x = -Math.PI / 2; rim.position.set(-17, 0.035, -12); g.add(rim);
      obs.push({ x: -17, z: -12, r: 5.4 });
      upd.push(function (t) { pondM.material.color.setHSL(0.56, 0.8, 0.62 + Math.sin(t * 1.5) * 0.02); });
      [[0, 1], [Math.PI, 1], [Math.PI / 2, 1], [-Math.PI / 2, 1]].forEach(function (b) {
        var bx = Math.cos(b[0]) * 7.2, bz = Math.sin(b[0]) * 7.2, bn = new T.Group(); bn.position.set(bx, 0, bz); bn.rotation.y = -b[0] + Math.PI / 2;
        bn.add(I.mesh(new T.BoxGeometry(2.0, 0.12, 0.6), '#a8703a', 0, 0.55, 0, 1, 1, 1, 0.04));
        bn.add(I.mesh(new T.BoxGeometry(2.0, 0.6, 0.1), '#a8703a', 0, 0.9, -0.28, 1, 1, 1, 0.04));
        bn.add(I.mesh(new T.BoxGeometry(0.1, 0.55, 0.5), '#6b4a2b', -0.85, 0.27, 0)); bn.add(I.mesh(new T.BoxGeometry(0.1, 0.55, 0.5), '#6b4a2b', 0.85, 0.27, 0));
        g.add(bn); obs.push({ x: bx, z: bz, r: 1.1 });
      });
      for (i = 0; i < 8; i++) {
        var la = i / 8 * Math.PI * 2, lx = Math.cos(la) * 12.2, lz = Math.sin(la) * 12.2, lp2 = new T.Group(); lp2.position.set(lx, 0, lz);
        lp2.add(I.mesh(new T.CylinderGeometry(0.06, 0.08, 2.6, 8), '#3a3a42', 0, 1.3, 0));
        lp2.add(new T.Mesh(new T.SphereGeometry(0.22, 10, 8), new T.MeshBasicMaterial({ color: 0xfff1b0 })).translateY(2.7));
        g.add(lp2); obs.push({ x: lx, z: lz, r: 0.3 });
      }
      var ring = []; for (i = 0; i < 16; i++) { var ta = i / 16 * Math.PI * 2 + 0.2, tr2 = 17 + (i % 3) * 4; ring.push({ x: Math.cos(ta) * tr2, z: Math.sin(ta) * tr2 }); }
      trees(ring, '#8b5a2b', ['#6fc868', '#5fb85a', '#ff9fb8'], 1.0);
      flowers(120, 13, 30);
      for (i = 0; i < 4; i++) { var ba = i / 4 * Math.PI * 2 + 0.78; var fb = new T.Mesh(new T.CylinderGeometry(1.3, 1.3, 0.3, 14), I.toon('#7a5230')); fb.position.set(Math.cos(ba) * 14.5, 0.15, Math.sin(ba) * 14.5); g.add(fb); obs.push({ x: fb.position.x, z: fb.position.z, r: 1.6 }); }
    }

    var bush = []; for (i = 0; i < 48; i++) { var ba2 = i / 48 * Math.PI * 2; bush.push({ x: Math.cos(ba2) * 31.5, z: Math.sin(ba2) * 31.5, y: 1.0, sx: 2.2, sy: 1.6, sz: 2.2, c: pick(r, cfg.greens) }); }
    g.add(inst(new T.SphereGeometry(1, 10, 8), I.toon('#ffffff'), bush));
    var hills = []; for (i = 0; i < 10; i++) { var ha = i / 10 * Math.PI * 2; hills.push({ x: Math.cos(ha) * 62, z: Math.sin(ha) * 62, y: -4, sx: 16 + r() * 8, sy: 9 + r() * 6, sz: 16 + r() * 8, c: id === 'forest' ? '#3f7a4a' : '#7bc07a' }); }
    g.add(inst(new T.SphereGeometry(1, 14, 10), I.toon('#ffffff'), hills));
    var sun = new T.Mesh(new T.SphereGeometry(4, 16, 12), new T.MeshBasicMaterial({ color: 0xfff1a0, fog: false })); sun.position.set(40, 45, -70); g.add(sun);

    var clouds = [];
    for (i = 0; i < 7; i++) {
      var cg = new T.Group(); cg.position.set(-60 + r() * 120, 24 + r() * 8, -50 + r() * 60);
      for (var j = 0; j < 3; j++) cg.add(I.mesh(new T.SphereGeometry(3 + r() * 2, 10, 8), new T.MeshBasicMaterial({ color: 0xffffff, fog: false }), j * 3.2, r(), 0, 1.2, 0.7, 0.9));
      g.add(cg); clouds.push(cg);
    }
    upd.push(function (t, dt) { clouds.forEach(function (c) { c.position.x += dt * 0.8; if (c.position.x > 70) c.position.x = -70; }); });

    if (id !== 'forest') {
      var bfs = [];
      for (i = 0; i < 6; i++) {
        var bf = new T.Group(), col = pick(r, [0xffa8d0, 0xfff27a, 0xa8d8ff, 0xffffff]);
        var wing = new T.PlaneGeometry(0.4, 0.3), wm = new T.MeshBasicMaterial({ color: col, side: T.DoubleSide });
        var w1 = new T.Mesh(wing, wm), w2 = new T.Mesh(wing, wm); w1.position.x = -0.2; w2.position.x = 0.2;
        var p1 = new T.Group(), p2 = new T.Group(); p1.add(w1); p2.add(w2); bf.add(p1); bf.add(p2);
        g.add(bf); bfs.push({ g: bf, p1: p1, p2: p2, cx: -14 + r() * 28, cz: -14 + r() * 28, rad: 2 + r() * 4, sp: 0.4 + r() * 0.5, ph: r() * 6 });
      }
      upd.push(function (t) {
        bfs.forEach(function (b) {
          var a = t * b.sp + b.ph; b.g.position.set(b.cx + Math.cos(a) * b.rad, 1.4 + Math.sin(t * 2 + b.ph) * 0.4, b.cz + Math.sin(a) * b.rad);
          b.g.rotation.y = -a; var f = Math.sin(t * 18 + b.ph) * 0.9; b.p1.rotation.z = f; b.p2.rotation.z = -f;
        });
      });
    }
    return { group: g, obstacles: obs, update: function (t, dt) { for (var k = 0; k < upd.length; k++) upd[k](t, dt); }, sky: cfg.sky, fog: cfg.fog };
  }

  function animatePet(g, S, dt, act) {
    var U = g.userData, run = act === 'run', walk = act === 'walk', i;
    S.t += dt; S.phase += dt * (run ? 15 : (walk ? 9 : 0));
    var a = run ? 1 : (walk ? 0.5 : 0), s = Math.sin(S.phase), tg;
    tg = run ? [s * a, s * a, Math.sin(S.phase + 2.4) * a, Math.sin(S.phase + 2.4) * a] : [s * a, -s * a, -s * a, s * a];
    for (i = 0; i < 4; i++) { S.leg[i] += (tg[i] - S.leg[i]) * Math.min(1, dt * 14); U.legs[i].rotation.x = S.leg[i]; }
    U.upper.position.y = U.upperBase + (run ? Math.abs(Math.sin(S.phase)) * 0.1 : (walk ? Math.abs(s) * 0.03 : 0));
    S.lean += ((run ? 0.07 : 0) - S.lean) * Math.min(1, dt * 6); U.upper.rotation.x = S.lean;
    U.torso.scale.y = U.th * (1 + Math.sin(S.t * 2.2) * 0.02);
    U.head.rotation.x = (run ? -0.12 : 0) + (run || walk ? Math.sin(S.phase * 2) * 0.04 : 0) + Math.sin(S.t * 1.3) * 0.02;
    S.blink -= dt; var bl = 1; if (S.blink < 0) { bl = 0.15; if (S.blink < -0.12) S.blink = 2.5 + Math.random() * 3; }
    for (i = 0; i < 2; i++) {
      U.eyes[i].scale.set(1, 0.6 * bl, 0.6); U.brows[i].rotation.z = 0; U.cheeks[i].material.opacity = 0.65;
      var e = U.ears[i].userData, fl = run ? 0.35 + 0.2 * Math.sin(S.phase * 2) : (walk ? 0.1 : 0.02);
      if (e.kind === 'up') U.ears[i].rotation.z = -e.side * (0.2 + (run ? 0.3 : 0.05)); else U.ears[i].rotation.z = e.side * (0.12 + fl);
    }
    var open = run ? 0.75 : (walk ? 0.35 : 0.15);
    U.jaw.scale.y = 0.01 + open; U.jaw.visible = open > 0.06; U.mouth.visible = open < 0.5; U.mouth.scale.set(1, 1, 1);
    U.tail.rotation.y = Math.sin(S.t * (run ? 16 : 9)) * (run ? 0.7 : 0.5);
    U.tail.rotation.x = U.tailBase - (run ? 0.25 : 0);
  }

  function Game(petId) {
    this.petId = petId; this.sec = 0; this.state = 'menu'; this.keys = {}; this.jx = 0; this.jy = 0;
    this.ps = { t: 0, phase: 0, leg: [0, 0, 0, 0], lean: 0, blink: 3 }; this.tt = 0; this.sceneId = null;
  }
  Game.prototype.petData = function () { return root.PetCore.findPet(root.PetUI.state(), this.petId); };
  Game.prototype.ui = function () {
    var self = this, el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:10001;background:#000;color:#fff;font-family:sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden';
    this.el = el; document.body.appendChild(el); this.prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    this.menu();
    this.onKey = function (e, d) { self.keys[e.key.toLowerCase()] = d; };
    this.kd = function (e) { self.onKey(e, true); }; this.ku = function (e) { self.onKey(e, false); };
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
  };
  function btn(txt, bg, fn) {
    var b = document.createElement('button'); b.textContent = txt;
    b.style.cssText = 'padding:10px 16px;border:0;border-radius:12px;font-size:16px;color:#fff;background:' + bg + ';cursor:pointer;margin:6px';
    b.addEventListener('click', fn); return b;
  }
  Game.prototype.menu = function () {
    var self = this, p = this.petData(), box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(#7ec8ff,#c8f0b0);text-align:center;padding:16px;box-sizing:border-box';
    var h = document.createElement('div'); h.style.cssText = 'font-size:22px;font-weight:bold;color:#234;margin-bottom:6px'; h.textContent = '帶 ' + (p ? p.name : '') + ' 出去玩';
    var d = document.createElement('div'); d.style.cssText = 'color:#345;margin-bottom:12px'; d.textContent = '選一個地點。最長 10 分鐘，完成加 50 開心，中途結束依時間比例計算。';
    box.appendChild(h); box.appendChild(d);
    SCENES.forEach(function (sc) {
      var b = btn(sc.name + '　' + sc.desc, '#3a8f5a', function () { self.begin(sc.id); }); b.style.width = 'min(340px,90%)'; box.appendChild(b);
    });
    box.appendChild(btn('取消', '#777', function () { self.close(false); }));
    this.el.appendChild(box); this.menuEl = box;
  };
  Game.prototype.begin = function (sceneId) {
    var self = this; this.sceneId = sceneId;
    this.menuEl.firstChild.textContent = '載入中...';
    root.Pet3D.loadThree().then(function () {
      I = root.Pet3D._i(); T = I.T; self.start(sceneId);
    }, function () { self.menuEl.firstChild.textContent = '3D 載入失敗，請連線一次後再試'; });
  };
  Game.prototype.start = function (sceneId) {
    var self = this, p = this.petData(); if (!p) { this.close(false); return; }
    var st = root.Pet3D.stage && root.Pet3D.stage(); if (st) st.setActive(false);
    this.menuEl.remove();
    var cv = document.createElement('div'); cv.style.cssText = 'position:absolute;inset:0'; this.el.appendChild(cv);
    this.ren = new T.WebGLRenderer({ antialias: true }); this.ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.ren.domElement.style.cssText = 'display:block;width:100%;height:100%'; cv.appendChild(this.ren.domElement);
    this.scene = new T.Scene(); this.cam = new T.PerspectiveCamera(50, 1.6, 0.1, 200);
    this.world = buildScene(sceneId); this.scene.add(this.world.group);
    this.scene.background = new T.Color(this.world.sky); this.scene.fog = new T.Fog(this.world.sky, this.world.fog[0], this.world.fog[1]);
    this.scene.add(new T.HemisphereLight(0xffffff, 0xb8d89a, 1.15));
    var dl = new T.DirectionalLight(0xffffff, 1.3); dl.position.set(20, 40, 15); this.scene.add(dl);
    var ageF = clamp(0.65 + 0.35 * (root.PetCore.ageDays(p, Date.now()) / 365), 0.65, 1);
    this.pet = I.buildPet(p, ageF); this.pet.position.set(0, 0, sceneId === 'park' ? 5 : 3); this.scene.add(this.pet);
    this.blob = new T.Mesh(new T.CircleGeometry(1, 20), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = 0.05; this.scene.add(this.blob);
    var U = this.pet.userData; this.blob.scale.set(U.tw * U.scale * 1.8, U.tl * U.scale * 1.7, 1);
    this.camPos = new T.Vector3(this.pet.position.x, 4.5, this.pet.position.z + 8.5);
    this.cam.position.copy(this.camPos);
    this.hud(); this.resize();
    this.onResize = function () { self.resize(); }; window.addEventListener('resize', this.onResize);
    this.state = 'play'; this.last = 0;
    this.onFrame = function (ts) { self.frame(ts); }; this.raf = requestAnimationFrame(this.onFrame);
  };
  Game.prototype.resize = function () {
    if (!this.ren) return; var w = window.innerWidth, h = window.innerHeight;
    this.ren.setSize(w, h, false); this.cam.aspect = w / h; this.cam.fov = w / h < 1 ? 62 : 50; this.cam.updateProjectionMatrix();
  };
  Game.prototype.hud = function () {
    var self = this, el = this.el, top = document.createElement('div');
    top.style.cssText = 'position:absolute;left:0;right:0;top:0;padding:10px 12px;display:flex;align-items:center;gap:10px;background:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,0))';
    this.timeEl = document.createElement('div'); this.timeEl.style.cssText = 'font-size:20px;font-weight:bold;min-width:130px';
    var bar = document.createElement('div'); bar.style.cssText = 'flex:1;height:10px;background:rgba(255,255,255,.3);border-radius:5px;overflow:hidden';
    this.barEl = document.createElement('i'); this.barEl.style.cssText = 'display:block;height:100%;width:0;background:#ffd54a'; bar.appendChild(this.barEl);
    top.appendChild(this.timeEl); top.appendChild(bar);
    top.appendChild(btn('結束散步', '#c0392b', function () { self.endEarly(); }));
    el.appendChild(top);
    this.hint = document.createElement('div'); this.hint.style.cssText = 'position:absolute;left:0;right:0;bottom:190px;text-align:center;font-size:14px;text-shadow:0 1px 3px #000;pointer-events:none';
    this.hint.textContent = '拖曳左下搖桿：輕推走路，推到底快跑（電腦可用方向鍵或 WASD，Shift 快跑）';
    el.appendChild(this.hint);
    var zone = document.createElement('div'); zone.style.cssText = 'position:absolute;left:0;bottom:0;width:60%;height:55%;touch-action:none';
    var base = document.createElement('div'); base.style.cssText = 'position:absolute;left:26px;bottom:34px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.6)';
    var thumb = document.createElement('div'); thumb.style.cssText = 'position:absolute;left:40px;top:40px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.75)';
    base.appendChild(thumb); zone.appendChild(base); el.appendChild(zone);
    var act = false, pid = null;
    function move(e) {
      var rc = base.getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
      var dx = e.clientX - cx, dy = e.clientY - cy, d = Math.sqrt(dx * dx + dy * dy), mx = 70;
      var k = d > mx ? mx / d : 1; dx *= k; dy *= k;
      thumb.style.left = (40 + dx) + 'px'; thumb.style.top = (40 + dy) + 'px';
      self.jx = dx / mx; self.jy = dy / mx; thumb.style.background = Math.sqrt(self.jx * self.jx + self.jy * self.jy) > 0.72 ? 'rgba(255,213,74,.95)' : 'rgba(255,255,255,.75)';
    }
    zone.addEventListener('pointerdown', function (e) { act = true; pid = e.pointerId; zone.setPointerCapture(pid); move(e); e.preventDefault(); });
    zone.addEventListener('pointermove', function (e) { if (act && e.pointerId === pid) move(e); });
    function up(e) { if (e.pointerId !== pid) return; act = false; self.jx = 0; self.jy = 0; thumb.style.left = '40px'; thumb.style.top = '40px'; thumb.style.background = 'rgba(255,255,255,.75)'; }
    zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
  };
  Game.prototype.frame = function (ts) {
    if (this.state !== 'play') return;
    var dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : 0.016; this.last = ts;
    this.step(dt); this.ren.render(this.scene, this.cam);
    if (this.state === 'play') this.raf = requestAnimationFrame(this.onFrame);
  };
  Game.prototype.step = function (dt) {
    this.tt += dt; this.sec += dt;
    var k = this.keys, jx = this.jx, jy = this.jy;
    var kx = (k.arrowright || k.d ? 1 : 0) - (k.arrowleft || k.a ? 1 : 0), kz = (k.arrowdown || k.s ? 1 : 0) - (k.arrowup || k.w ? 1 : 0);
    if (kx || kz) { var kl = Math.sqrt(kx * kx + kz * kz); jx = kx / kl * (k.shift ? 1 : 0.6); jy = kz / kl * (k.shift ? 1 : 0.6); }
    var mag = Math.min(1, Math.sqrt(jx * jx + jy * jy)), act = 'idle', g = this.pet;
    if (mag > 0.1) {
      act = mag > 0.72 ? 'run' : 'walk';
      var sp = act === 'run' ? RUN : WALK * (0.5 + mag * 0.7), nx = jx / mag, nz = jy / mag;
      g.position.x += nx * sp * dt; g.position.z += nz * sp * dt;
      var want = Math.atan2(nx, nz), diff = want - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * Math.min(1, dt * 10);
    }
    var ob = this.world.obstacles, i, pr = 0.5 * g.userData.scale + 0.2;
    for (i = 0; i < ob.length; i++) {
      var dx = g.position.x - ob[i].x, dz = g.position.z - ob[i].z, d = Math.sqrt(dx * dx + dz * dz), mr = ob[i].r + pr;
      if (d < mr && d > 0.0001) { g.position.x = ob[i].x + dx / d * mr; g.position.z = ob[i].z + dz / d * mr; }
    }
    var dd = Math.sqrt(g.position.x * g.position.x + g.position.z * g.position.z);
    if (dd > LIMIT) { g.position.x *= LIMIT / dd; g.position.z *= LIMIT / dd; }
    animatePet(g, this.ps, dt, act);
    this.blob.position.x = g.position.x; this.blob.position.z = g.position.z;
    this.world.update(this.tt, dt);
    var a = 1 - Math.exp(-dt * 4.5);
    this.camPos.x += (g.position.x - this.camPos.x) * a; this.camPos.z += (g.position.z + 8.5 - this.camPos.z) * a;
    this.cam.position.set(this.camPos.x, 4.5, this.camPos.z); this.cam.lookAt(this.camPos.x + (g.position.x - this.camPos.x) * 0.5, 0.8, g.position.z);
    this.timeEl.textContent = fmt(this.sec) + ' / 10:00　預計 +' + Math.floor(50 * Math.min(this.sec, 600) / 600);
    this.barEl.style.width = (Math.min(this.sec, 600) / 6) + '%';
    if (this.sec > 6 && this.hint) { this.hint.remove(); this.hint = null; }
    if (this.sec >= 600) this.finish();
  };
  Game.prototype.endEarly = function () {
    var pts = Math.floor(50 * Math.min(this.sec, 600) / 600);
    if (confirm('要結束散步嗎？目前 ' + fmt(this.sec) + '，可得 ' + pts + ' 點開心。')) this.finish();
  };
  Game.prototype.finish = function () {
    if (this.state !== 'play') return;
    this.state = 'done'; if (this.raf) cancelAnimationFrame(this.raf);
    var S = root.PetUI.state(), sec = Math.floor(this.sec), msg = '時間太短，沒有獲得開心。';
    if (sec >= 1) {
      root.PetCore.tick(S, Date.now());
      var r = root.PetCore.playFinish(S, this.petId, sec, Date.now()); msg = r.msg; root.PetStore.save(S);
    }
    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.65);text-align:center;padding:16px';
    var h = document.createElement('div'); h.style.cssText = 'font-size:24px;font-weight:bold;margin-bottom:8px'; h.textContent = '散步結束';
    var d = document.createElement('div'); d.style.cssText = 'font-size:18px;margin-bottom:12px'; d.textContent = '時間 ' + fmt(sec) + '：' + msg;
    box.appendChild(h); box.appendChild(d); var self = this;
    box.appendChild(btn('回到我的寵物', '#3a8f5a', function () { self.close(true); }));
    this.el.appendChild(box);
  };
  Game.prototype.close = function (reopen) {
    if (this.raf) cancelAnimationFrame(this.raf); this.state = 'closed';
    window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku);
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.ren) { this.ren.dispose(); if (this.ren.forceContextLoss) this.ren.forceContextLoss(); }
    this.el.remove(); document.body.style.overflow = this.prevOverflow || ''; current = null;
    if (root.PetUI && root.PetUI.open) root.PetUI.open();
  };

  var current = null;
  function startGame(petId) {
    if (current) return; current = new Game(petId); current.ui();
  }
  function pickPet(panel) {
    var S = root.PetUI.state(); if (!S || !S.owner || !S.pets.length) return null;
    var sel = panel.querySelector('.tabs ~ .row select');
    if (sel && sel.options.length === S.pets.length) { for (var i = 0; i < S.pets.length; i++) if (S.pets[i].id === sel.value) return S.pets[i]; }
    return S.pets[0];
  }
  function attach() {
    var panel = document.getElementById('petPanel');
    if (!panel || !root.PetUI || !root.Pet3D || !root.PetCore) return false;
    panel.addEventListener('click', function (ev) {
      var b = ev.target; if (!b || b.tagName !== 'BUTTON' || (b.textContent || '').indexOf('開始出門玩') < 0) return;
      var p = pickPet(panel); if (!p) return;
      var S = root.PetUI.state(); root.PetCore.tick(S, Date.now());
      if (!root.PetCore.canPlay(p).ok) return;
      ev.stopPropagation(); ev.preventDefault(); startGame(p.id);
    }, true);
    return true;
  }
  function boot() { var n = 0, iv = setInterval(function () { n++; if (attach() || n > 40) clearInterval(iv); }, 250); }
  root.PetPlay = { start: startGame, SCENES: SCENES, _Game: Game };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); }
})(typeof window !== 'undefined' ? window : globalThis);
