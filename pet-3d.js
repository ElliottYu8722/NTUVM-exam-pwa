/* pet-3d.js  3D 房間與寵物（Three.js） */
(function (root) {
  'use strict';
  var URLS = ['./three.module.js', 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'];
  var T = null, loadP = null;

  function loadThree() {
    if (T) return Promise.resolve(T);
    if (loadP) return loadP;
    function go(i) {
      if (i >= URLS.length) return Promise.reject(new Error('Three.js 載入失敗'));
      return import(URLS[i]).then(function (m) { T = m; return m; }, function () { return go(i + 1); });
    }
    loadP = go(0).catch(function (e) { loadP = null; throw e; });
    return loadP;
  }

  function D(o) {
    var d = { sp: 'dog', s: 1, l: 1, w: 1, h: 1, leg: 1, head: 1, snout: 0.24, ear: 'prick', es: 1, tail: 'long',
      col: '#c28e4c', col2: '#e8cfa0', col3: null, earCol: null, fluffy: false, chest: false, pts: false,
      beard: false, stripes: false, patches: null, saddle: false };
    for (var k in o) d[k] = o[k];
    return d;
  }
  var PARAMS = {
    akita: D({ s: 1.25, w: 1.05, head: 1.05, snout: 0.22, tail: 'curl', col: '#d9a066', col2: '#fff3e0', chest: true }),
    doberman: D({ s: 1.2, w: 0.85, leg: 1.25, head: 0.95, snout: 0.34, es: 1.2, tail: 'stub', col: '#2a2a2e', col2: '#b8692a' }),
    labrador: D({ s: 1.15, w: 1.05, snout: 0.25, ear: 'floppy', col: '#e6c26b', col2: '#e6c26b' }),
    golden: D({ s: 1.15, w: 1.05, snout: 0.25, ear: 'floppy', tail: 'fluffy', col: '#d9992f', col2: '#efc37a', fluffy: true }),
    samoyed: D({ s: 1.12, w: 1.05, head: 1.05, snout: 0.2, tail: 'curl', col: '#fbf8f2', col2: '#ffffff', fluffy: true }),
    gsd: D({ s: 1.2, leg: 1.15, snout: 0.3, es: 1.2, tail: 'fluffy', col: '#c68a45', col2: '#2c2c2c', col3: '#2f2a26', saddle: true }),
    twnative: D({ snout: 0.24, tail: 'curl', col: '#c28e4c', col2: '#e8cfa0' }),
    shiba: D({ s: 0.95, snout: 0.2, tail: 'curl', col: '#d9843f', col2: '#fff3e0', chest: true }),
    mixdog: D({ ear: 'floppy', col: '#a9835a', col2: '#f1e3cf', chest: true }),
    twdog: D({ s: 1.05, leg: 1.1, snout: 0.26, tail: 'curl', col: '#3a3029', col2: '#c9a27a' }),
    corgi: D({ s: 0.85, l: 1.1, leg: 0.5, es: 1.3, tail: 'stub', col: '#e0953c', col2: '#ffffff', chest: true }),
    beagle: D({ s: 0.9, snout: 0.22, ear: 'floppy', col: '#f2e4c4', col2: '#ffffff', col3: '#a0602a', earCol: '#9a5a26', saddle: true }),
    maltese: D({ s: 0.55, l: 0.85, leg: 0.7, head: 1.15, snout: 0.1, ear: 'floppy', tail: 'curl', col: '#fffaf0', col2: '#fffaf0', fluffy: true }),
    pom: D({ s: 0.5, l: 0.8, leg: 0.65, head: 1.2, snout: 0.08, es: 0.6, tail: 'curl', col: '#e8963c', col2: '#ffd9a0', fluffy: true }),
    yorkie: D({ s: 0.5, l: 0.9, leg: 0.7, head: 1.1, snout: 0.12, es: 0.7, tail: 'stub', col: '#5f5a66', col2: '#d9a860' }),
    schnauzer: D({ s: 0.65, l: 0.95, leg: 0.9, snout: 0.28, ear: 'fold', tail: 'stub', col: '#8d8d93', col2: '#d8d8dc', beard: true }),
    chihuahua: D({ s: 0.45, l: 0.8, leg: 0.8, head: 1.35, snout: 0.1, es: 1.6, col: '#e5c9a0', col2: '#f6e6c8' }),
    orange: D({ sp: 'cat', s: 1.1, w: 1.2, h: 1.1, leg: 0.8, snout: 0.03, ear: 'cat', col: '#f0922b', col2: '#ffd9a8', col3: '#d9741a', stripes: true }),
    bsh: D({ sp: 'cat', s: 0.95, w: 1.1, leg: 0.8, head: 1.1, snout: 0.02, ear: 'cat', col: '#8c9bab', col2: '#a9b6c4' }),
    ash: D({ sp: 'cat', s: 0.95, w: 0.95, leg: 0.8, snout: 0.03, ear: 'cat', col: '#b9b9bd', col2: '#e8e8ea', col3: '#6f6f75', stripes: true }),
    tabby: D({ sp: 'cat', s: 0.9, w: 0.9, leg: 0.8, snout: 0.03, ear: 'cat', col: '#a08560', col2: '#e0cfae', col3: '#6a5238', stripes: true }),
    persian: D({ sp: 'cat', s: 0.95, w: 1.1, leg: 0.7, head: 1.15, snout: 0, ear: 'cat', col: '#f5efe6', col2: '#f5efe6', fluffy: true }),
    calico: D({ sp: 'cat', s: 0.9, w: 0.9, leg: 0.8, snout: 0.03, ear: 'cat', col: '#ffffff', col2: '#ffffff', patches: ['#f0922b', '#2a2a2e', '#f0922b'] }),
    siamese: D({ sp: 'cat', s: 0.9, w: 0.8, leg: 1.0, snout: 0.05, ear: 'cat', col: '#f2e6d0', col2: '#5a4636', pts: true }),
    rblue: D({ sp: 'cat', s: 0.9, w: 0.85, leg: 0.9, snout: 0.03, ear: 'cat', col: '#7d8da0', col2: '#7d8da0' }),
    abys: D({ sp: 'cat', s: 0.9, w: 0.85, leg: 0.95, snout: 0.03, ear: 'cat', col: '#b5733a', col2: '#c98a52' }),
    singa: D({ sp: 'cat', s: 0.75, w: 0.8, leg: 0.8, snout: 0.03, ear: 'cat', es: 1.2, col: '#d8b890', col2: '#f0e0c8' }),
    bombay: D({ sp: 'cat', s: 0.9, w: 0.9, leg: 0.8, snout: 0.02, ear: 'cat', col: '#1f1f24', col2: '#1f1f24' })
  };
  var MOODS = {
    neutral: { joy: 0.25 }, happy: { joy: 0.9 }, excited: { joy: 0.85, excited: 1 },
    sad: { sad: 0.9 }, sleepy: { sleepy: 0.9, joy: 0.1 }, angry: { angry: 0.9 }, hungry: { sad: 0.5 }
  };
  var EK = ['joy', 'sad', 'sleepy', 'excited', 'angry'];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function luma(hex) { var c = parseInt(hex.slice(1), 16); return 0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255); }

  var gradTex = null, OUT = null;
  function grad() {
    if (!gradTex) {
      gradTex = new T.DataTexture(new Uint8Array([100, 175, 255]), 3, 1, T.RedFormat);
      gradTex.minFilter = T.NearestFilter; gradTex.magFilter = T.NearestFilter; gradTex.needsUpdate = true;
    }
    return gradTex;
  }
  function toon(col, extra) {
    var o = { color: col, gradientMap: grad() };
    if (extra) for (var k in extra) o[k] = extra[k];
    return new T.MeshToonMaterial(o);
  }
  function outline(m, w) {
    if (!OUT) OUT = new T.MeshBasicMaterial({ color: 0x2a1a14, side: T.BackSide });
    var o = new T.Mesh(m.geometry, OUT);
    o.scale.setScalar(1 + (w || 0.05));
    m.add(o); return o;
  }
  function mesh(geo, col, x, y, z, sx, sy, sz, ol) {
    var m = new T.Mesh(geo, typeof col === 'string' ? toon(col) : col);
    m.position.set(x || 0, y || 0, z || 0);
    m.scale.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    if (ol) outline(m, ol === true ? 0.05 : ol);
    return m;
  }
  function sph(r) { return new T.SphereGeometry(r, 20, 14); }

  var SIZE = { L: 1.1, M: 0.85, S: 0.55, C: 0.65 };
  var SIZE_OF = { akita: 'L', doberman: 'L', labrador: 'L', golden: 'L', samoyed: 'L', gsd: 'L',
    twnative: 'M', shiba: 'M', mixdog: 'M', twdog: 'M', corgi: 'M', beagle: 'M',
    maltese: 'S', pom: 'S', yorkie: 'S', schnauzer: 'S', chihuahua: 'S' };
  for (var pk in PARAMS) PARAMS[pk].s = SIZE[PARAMS[pk].sp === 'cat' ? 'C' : (SIZE_OF[pk] || 'M')];
  function buildPet(p, ageF) {
    var pr = PARAMS[p.breedId] || PARAMS.mixdog;
    var bc = p.bcs || 5, mus = p.muscle || 0;
    var bw = (0.65 + 0.07 * bc) * (1 + 0.05 * mus) * (pr.fluffy ? 1.1 : 1);
    var bh = (0.84 + 0.032 * bc) * (1 + 0.03 * mus);
    var tw = 0.42 * pr.w * bw, th = 0.36 * pr.h * bh, tl = 0.62 * pr.l * (pr.fluffy ? 1.05 : 1);
    var leg = 0.5 * pr.leg, legR = 0.075 * (1 + 0.15 * mus) * (pr.fluffy ? 1.1 : 1);
    var hr = 0.3 * pr.head;
    var g = new T.Group();
    var U = { pr: pr, th: th, tl: tl, tw: tw, leg: leg, hr: hr, legs: [], ears: [], brows: [], cheeks: [], eyes: [] };
    var upper = new T.Group(); upper.position.y = leg * 0.9 + th; g.add(upper); U.upper = upper; U.upperBase = upper.position.y;

    var torso = mesh(sph(1), pr.col, 0, 0, 0, tw, th, tl, 0.04); upper.add(torso); U.torso = torso;
    if (pr.chest || pr.col2 !== pr.col && pr.sp === 'dog' && !pr.saddle) {
      upper.add(mesh(sph(1), pr.col2, 0, -th * 0.15, tl * 0.55, tw * 0.62, th * 0.62, tl * 0.5));
    }
    if (pr.saddle && pr.col3) {
      var cap = new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, 1.15);
      upper.add(mesh(cap, toon(pr.col3, { side: T.DoubleSide }), 0, 0.01, -tl * 0.05, tw * 1.03, th * 1.03, tl * 0.9));
    }
    if (pr.stripes && pr.col3) {
      [-0.3, 0, 0.3].forEach(function (f) {
        var k = Math.sqrt(Math.max(0.05, 1 - f * f / (0.62 * 0.62) * 0.4)) * 1.03;
        var cg = new T.CylinderGeometry(1, 1, 0.06 * pr.l, 20, 1, true); cg.rotateX(Math.PI / 2);
        upper.add(mesh(cg, toon(pr.col3, { side: T.DoubleSide }), 0, 0, f * pr.l, tw * k, th * k, 1));
      });
    }
    if (pr.patches) {
      var pos = [[0.5, -0.4], [-0.6, 0.3], [0.1, 0.8]];
      pr.patches.forEach(function (c, i) {
        var cp = new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, 0.7);
        var pm = mesh(cp, toon(c, { side: T.DoubleSide }), 0, 0, 0, tw * 1.02, th * 1.02, tl * 1.02);
        pm.rotation.z = pos[i][0]; pm.rotation.x = pos[i][1]; upper.add(pm);
      });
    }

    var legPos = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
    legPos.forEach(function (lp) {
      var lx = lp[0] * tw * 0.56, lz = lp[1] * tl * 0.52, pvY = leg * 0.9 + th * 0.42;
      var pv = new T.Group(); pv.position.set(lx, pvY, lz);
      var len = Math.max(0.05, pvY - legR * 1.6);
      pv.add(mesh(new T.CapsuleGeometry(legR, len, 6, 12), pr.col, 0, (-pvY + legR * 0.6) / 2, 0, 1, 1, 1, 0.07));
      upper.add(mesh(sph(legR * 1.35), pr.col, lx, -th * 0.5, lz, 1, 1.3, 1.1, 0.05));
      var paw = (pr.pts || pr.chest || pr.col2 !== pr.col) ? pr.col2 : pr.col;
      var pwY = -pvY + legR * 0.9;
      pv.add(mesh(sph(legR * 1.15), paw, 0, pwY, legR * 0.35, 1, 0.8, 1.3));
      if (lp[1] > 0) {
        var cl = [];
        [-0.55, 0, 0.55].forEach(function (cx) {
          var c = mesh(new T.ConeGeometry(legR * 0.16, legR * 0.5, 6), '#fbfbf4', cx * legR, pwY - legR * 0.45, legR * 1.75);
          c.rotation.x = Math.PI / 2 + 0.5; pv.add(c); cl.push(c);
        });
        (U.claws = U.claws || []).push(cl);
        U.pawY = pwY; U.legR = legR; U.legLen = pvY;
      }
      g.add(pv); U.legs.push(pv);
    });

    var head = new T.Group(); head.position.set(0, th * 0.6, tl * 0.85); upper.add(head); U.head = head; U.headBase = head.position.y;
    head.add(mesh(sph(hr), pr.col, 0, 0, 0, 1, 0.92, 1, 0.045));
    var sn = pr.snout, sz = 1 + sn * 4, sc = hr * 0.4;
    var snCol = pr.pts ? pr.col2 : (pr.sp === 'cat' ? pr.col2 : pr.col2);
    var snY = -hr * 0.3, snZ = hr * 0.62;
    head.add(mesh(sph(sc), snCol, 0, snY, snZ, 1, 0.78, sz, 0.05));
    var tipZ = snZ + sc * sz;
    head.add(mesh(sph(hr * 0.1), '#2a1a1a', 0, snY + sc * 0.5, tipZ - hr * 0.03, 1.2, 0.85, 0.9));
    if (pr.beard) head.add(mesh(sph(hr * 0.3), pr.col2, 0, -hr * 0.55, tipZ * 0.85, 1.1, 0.8, 0.8));

    var dark = luma(pr.col) < 80 ? '#d9a86a' : '#3a2a22';
    [-1, 1].forEach(function (sd) {
      var r = hr * 0.23;
      var e = mesh(sph(r), '#14100e', sd * hr * 0.43, hr * 0.12, hr * 0.86, 1, 1, 0.6);
      e.add(mesh(sph(r * 0.38), '#ffffff', r * 0.3, r * 0.36, r * 0.62, 1, 1, 0.6));
      e.add(mesh(sph(r * 0.18), '#ffffff', -r * 0.3, -r * 0.3, r * 0.65, 1, 1, 0.6));
      head.add(e); U.eyes.push(e);
      var bg = new T.Group(); bg.position.set(sd * hr * 0.43, hr * 0.42, hr * 0.8);
      var cap2 = new T.CapsuleGeometry(hr * 0.035, hr * 0.2, 4, 8); cap2.rotateZ(Math.PI / 2);
      bg.add(new T.Mesh(cap2, toon(dark)));
      head.add(bg); U.brows.push(bg);
      var ch = new T.Mesh(new T.CircleGeometry(hr * 0.13, 16), new T.MeshBasicMaterial({ color: 0xff7aa2, transparent: true, opacity: 0.3 }));
      ch.position.set(sd * hr * 0.62, -hr * 0.08, hr * 0.7); ch.rotation.y = sd * 0.8;
      head.add(ch); U.cheeks.push(ch);
      var eg = new T.Group(), ec = pr.earCol || (pr.pts ? pr.col2 : pr.col), kind, em;
      if (pr.ear === 'prick' || pr.ear === 'cat') {
        var cone = pr.ear === 'cat' ? new T.ConeGeometry(hr * 0.3, hr * 0.55, 3) : new T.ConeGeometry(hr * 0.32 * pr.es, hr * 0.8 * pr.es, 4);
        var h2 = (pr.ear === 'cat' ? hr * 0.55 : hr * 0.8 * pr.es);
        em = mesh(cone, ec, 0, h2 / 2, 0, 1, 1, 0.6, 0.06);
        eg.position.set(sd * hr * (pr.ear === 'cat' ? 0.58 : 0.55), hr * 0.72, -hr * 0.05);
        kind = 'up';
      } else {
        var fs = pr.ear === 'fold' ? 0.6 : 1;
        em = mesh(sph(hr * 0.3 * fs), ec, sd * hr * 0.06, -hr * 0.3 * fs, 0, 0.45, 1.2, 0.8, 0.06);
        eg.position.set(sd * hr * 0.68, hr * (pr.ear === 'fold' ? 0.7 : 0.5), 0);
        kind = 'hang';
      }
      eg.add(em); eg.userData = { side: sd, kind: kind };
      eg.rotation.z = kind === 'up' ? -sd * 0.2 : sd * 0.12;
      head.add(eg); U.ears.push(eg);
    });

    var mouth = new T.Mesh(new T.TorusGeometry(hr * 0.1, hr * 0.014, 6, 14, Math.PI), new T.MeshBasicMaterial({ color: 0x3a2020, side: T.DoubleSide }));
    mouth.position.set(0, snY - sc * 0.1, tipZ - hr * 0.1); mouth.rotation.z = Math.PI;
    head.add(mouth); U.mouth = mouth;
    var jaw = mesh(sph(hr * 0.11), '#7a2a35', 0, snY - sc * 0.25, tipZ - hr * 0.15, 1, 0.01, 0.6);
    jaw.add(mesh(sph(hr * 0.07), '#ff8fa3', 0, -hr * 0.05, hr * 0.03, 1, 0.7, 1));
    head.add(jaw); U.jaw = jaw; U.jawR = hr * 0.11;
    var teeth = new T.Group(); teeth.position.set(0, snY - sc * 0.12, tipZ - hr * 0.1); teeth.visible = false;
    teeth.add(mesh(new T.BoxGeometry(hr * 0.24, hr * 0.06, hr * 0.03), '#ffffff', 0, 0, 0));
    [-1, 1].forEach(function (sd) { var f = mesh(new T.ConeGeometry(hr * 0.03, hr * 0.1, 5), '#ffffff', sd * hr * 0.1, -hr * 0.06, 0); f.rotation.x = Math.PI; teeth.add(f); });
    head.add(teeth); U.teeth = teeth;

    var tail = new T.Group(); tail.position.set(0, th * 0.3, -tl * 0.95); tail.rotation.order = 'YXZ'; upper.add(tail); U.tail = tail;
    var tc = pr.pts ? pr.col2 : pr.col, tt = pr.tail;
    if (tt === 'long') { tail.rotation.x = pr.sp === 'cat' ? -0.35 : -0.95; tail.add(mesh(new T.CapsuleGeometry(0.05, 0.5, 4, 8), tc, 0, 0.3, 0, 1, 1, 1, 0.07)); }
    else if (tt === 'fluffy') { tail.rotation.x = -0.9; tail.add(mesh(sph(1), tc, 0, 0.28, 0, 0.13, 0.36, 0.13, 0.05)); }
    else if (tt === 'curl') { tail.rotation.x = -0.2; var tr = mesh(new T.TorusGeometry(0.13, 0.05, 8, 16, Math.PI * 1.5), tc, 0, 0.14, 0.02, 1, 1, 1, 0.07); tr.rotation.y = Math.PI / 2; tail.add(tr); }
    else { tail.rotation.x = -0.7; tail.add(mesh(sph(0.06), tc, 0, 0.07, 0, 1, 1.4, 1, 0.07)); }
    U.tailBase = tail.rotation.x;

    var wear = p.wear && p.items && p.items.clothes && p.items.clothes[p.wear] ? p.wear : '';
    if (wear) {
      var cols = { normal: '#4aa3df', trend: '#ff6fae', gold: '#ffd34a' };
      var cg2 = new T.CylinderGeometry(1, 1, 1, 24, 1, true); cg2.rotateX(Math.PI / 2);
      var cm = toon(cols[wear], { side: T.DoubleSide });
      if (wear === 'gold') { cm.emissive = new T.Color(0x886600); }
      upper.add(mesh(cg2, cm, 0, 0.005, tl * 0.1, tw * 1.05, th * 1.05, tl * 0.5));
      if (wear === 'trend') upper.add(mesh(cg2, toon('#fff27a', { side: T.DoubleSide }), 0, 0.005, tl * 0.12, tw * 1.06, th * 1.06, tl * 0.12));
      if (wear === 'gold') upper.add(mesh(cg2, toon('#ffffff', { side: T.DoubleSide }), 0, 0.005, tl * 0.3, tw * 1.06, th * 1.06, tl * 0.06));
    }
    if (p.items && p.items.harness && (!p.equip || p.equip.harness)) {
      var hm = mesh(new T.TorusGeometry(1, 0.05, 8, 28), '#e03b3b', 0, 0, tl * 0.5, tw * 0.9, th * 0.9, 1);
      upper.add(hm);
    } else if (!(p.equip && p.equip.stroller && p.items && p.items.stroller)) {
      var cl = mesh(new T.TorusGeometry(1, 0.13, 8, 28), '#2f7de1', 0, -hr * 0.5, -hr * 0.22, hr * 0.93, hr * 0.93, hr * 0.93);
      cl.rotation.x = 1.15; head.add(cl);
      head.add(mesh(sph(hr * 0.12), '#f2c230', 0, -hr * 0.9, hr * 0.28, 1, 1, 0.6));
    }
    var sc2 = pr.s * ageF; g.scale.setScalar(sc2); U.scale = sc2;
    g.userData = U;
    return g;
  }

  function woodTex() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 512;
    var x = c.getContext('2d'), rows = 8, i, j;
    for (i = 0; i < rows; i++) {
      var base = 150 + (i * 37 % 40);
      x.fillStyle = 'rgb(' + (base + 40) + ',' + (base) + ',' + (base - 55) + ')';
      x.fillRect(0, i * 64, 512, 64);
      for (j = 0; j < 40; j++) {
        x.fillStyle = 'rgba(90,50,20,' + (0.04 + ((i * 13 + j * 7) % 5) * 0.015) + ')';
        x.fillRect((j * 97 + i * 53) % 512, i * 64 + (j * 11) % 60, 60 + (j * 5) % 90, 2);
      }
      x.fillStyle = 'rgba(70,35,10,0.55)'; x.fillRect(0, i * 64, 512, 3);
      x.fillRect(((i * 211) % 480) + 20, i * 64, 3, 64);
    }
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 2);
    if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;
    return t;
  }

  function buildRoom(scene) {
    var r = new T.Group();
    var floor = new T.Mesh(new T.PlaneGeometry(14, 9), new T.MeshBasicMaterial({ map: woodTex() }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1); r.add(floor);
    var wallCol = '#f6e7cf';
    var back = mesh(new T.PlaneGeometry(14, 5), toon(wallCol), 0, 2.5, -3.5); r.add(back);
    var lw = mesh(new T.PlaneGeometry(9, 5), toon('#f1dfc4'), -7, 2.5, 1); lw.rotation.y = Math.PI / 2; r.add(lw);
    var rw = mesh(new T.PlaneGeometry(9, 5), toon('#f1dfc4'), 7, 2.5, 1); rw.rotation.y = -Math.PI / 2; r.add(rw);
    r.add(mesh(new T.BoxGeometry(14, 0.25, 0.1), '#c9a27a', 0, 0.12, -3.45));
    var win = new T.Group(); win.position.set(-1.8, 2.5, -3.45);
    win.add(mesh(new T.PlaneGeometry(2.2, 1.6), new T.MeshBasicMaterial({ color: 0xbfe6ff }), 0, 0, 0.01));
    win.add(mesh(new T.BoxGeometry(2.4, 0.1, 0.12), '#fff', 0, 0.85, 0.05));
    win.add(mesh(new T.BoxGeometry(2.4, 0.1, 0.12), '#fff', 0, -0.85, 0.05));
    win.add(mesh(new T.BoxGeometry(0.1, 1.8, 0.12), '#fff', -1.15, 0, 0.05));
    win.add(mesh(new T.BoxGeometry(0.1, 1.8, 0.12), '#fff', 1.15, 0, 0.05));
    win.add(mesh(new T.BoxGeometry(0.06, 1.7, 0.12), '#fff', 0, 0, 0.05));
    win.add(mesh(new T.BoxGeometry(2.3, 0.06, 0.12), '#fff', 0, 0, 0.05));
    r.add(win);
    [[2.2, 2.7, '#ffb7a8'], [3.2, 2.3, '#a8d8ff']].forEach(function (f) {
      var fr = new T.Group(); fr.position.set(f[0], f[1], -3.45);
      fr.add(mesh(new T.BoxGeometry(0.9, 0.7, 0.06), '#8a5a2b', 0, 0, 0.03));
      fr.add(mesh(new T.PlaneGeometry(0.75, 0.55), new T.MeshBasicMaterial({ color: new T.Color(f[2]) }), 0, 0, 0.07));
      r.add(fr);
    });
    r.add(mesh(new T.BoxGeometry(2.2, 0.08, 0.5), '#b57d4a', 4.5, 1.7, -3.2));
    [['#e74c3c', 0], ['#3498db', 0.18], ['#f1c40f', 0.36]].forEach(function (b) {
      r.add(mesh(new T.BoxGeometry(0.14, 0.5, 0.35), b[0], 3.9 + b[1], 1.99, -3.2));
    });
    var rug = mesh(new T.CylinderGeometry(2.3, 2.3, 0.03, 40), '#eab5a8', 0, 0.02, 0.4); r.add(rug);
    r.add(mesh(new T.CylinderGeometry(1.7, 1.7, 0.04, 40), '#fff0e6', 0, 0.03, 0.4));
    var bed = new T.Group(); bed.position.set(-3.6, 0, -1.8);
    bed.add(mesh(new T.CylinderGeometry(0.95, 1.0, 0.28, 28), '#7da7d9', 0, 0.14, 0, 1, 1, 1, 0.03));
    bed.add(mesh(new T.CylinderGeometry(0.75, 0.75, 0.2, 28), '#fff5e0', 0, 0.28, 0));
    r.add(bed);
    var bowl1 = mesh(new T.CylinderGeometry(0.28, 0.2, 0.16, 20), '#e8e8f0', 3.2, 0.08, -1.3, 1, 1, 1, 0.06);
    bowl1.add(mesh(sph(0.22), '#8b5a2b', 0, 0.09, 0, 1, 0.35, 1));
    var bowl2 = mesh(new T.CylinderGeometry(0.28, 0.2, 0.16, 20), '#e8e8f0', 3.2, 0.08, -0.6, 1, 1, 1, 0.06);
    bowl2.add(mesh(new T.CylinderGeometry(0.22, 0.22, 0.02, 20), '#6fc3ff', 0, 0.07, 0));
    r.add(bowl1); r.add(bowl2);
    var pot = mesh(new T.CylinderGeometry(0.4, 0.3, 0.55, 16), '#c0714a', 5.4, 0.28, -2.6, 1, 1, 1, 0.04);
    [[0, 0.55, 0], [0.2, 0.75, 0.1], [-0.2, 0.7, -0.1]].forEach(function (q) { pot.add(mesh(sph(0.3), '#4caf50', q[0], q[1], q[2], 1, 1.2, 1)); });
    r.add(pot);
    r.add(mesh(sph(0.16), '#e74c3c', 1.6, 0.16, 2.2, 1, 1, 1, 0.08));
    var sofa = new T.Group(); sofa.position.set(-1.2, 0, -2.7);
    sofa.add(mesh(new T.BoxGeometry(2.8, 0.55, 1.0), '#9fb8a1', 0, 0.3, 0, 1, 1, 1, 0.02));
    sofa.add(mesh(new T.BoxGeometry(2.8, 0.9, 0.3), '#8aa58d', 0, 0.75, -0.4, 1, 1, 1, 0.02));
    r.add(sofa);
    var toy = new T.Group(); toy.position.set(-1.9, 0, 1.9);
    toy.add(mesh(new T.IcosahedronGeometry(0.24, 1), '#4fc1a6', 0, 0.24, 0, 1, 1, 1, 0.05));
    [[0.2, 0.3, 0.1], [-0.15, 0.35, 0.15], [0.05, 0.42, -0.18], [-0.1, 0.18, -0.2]].forEach(function (q) { toy.add(mesh(sph(0.05), '#2a6b5a', q[0], q[1], q[2])); });
    toy.visible = false; r.add(toy); r.userData.toy = toy;
    var scr = new T.Group(); scr.position.set(-2.9, 0, -0.6); scr.rotation.y = 0.7;
    var ramp = mesh(new T.BoxGeometry(0.7, 0.08, 1.2), '#c9a070', 0, 0.32, 0, 1, 1, 1, 0.03); ramp.rotation.x = -0.5; scr.add(ramp);
    for (var si = 0; si < 7; si++) { var ln = mesh(new T.BoxGeometry(0.66, 0.012, 0.03), '#8a6236', 0, 0.37 + (si - 3) * 0.075, (si - 3) * -0.14); ln.rotation.x = -0.5; scr.add(ln); }
    scr.add(mesh(new T.BoxGeometry(0.72, 0.06, 1.15), '#a57b4a', 0, 0.03, 0.05));
    scr.visible = false; r.add(scr); r.userData.scr = scr;
    r.userData.bowl = bowl1; r.userData.food = bowl1.children[bowl1.children.length - 1];
    scene.add(r); return r;
  }
  function heartGeo() {
    var sh = new T.Shape();
    sh.moveTo(0, -0.5); sh.bezierCurveTo(-0.9, 0.1, -0.5, 0.9, 0, 0.45); sh.bezierCurveTo(0.5, 0.9, 0.9, 0.1, 0, -0.5);
    return new T.ShapeGeometry(sh);
  }
  function snackMesh(id) {
    var g = new T.Group();
    if (id === 'bone' || id === 'dental' || id === 'cdental') {
      var c = id === 'bone' ? '#f5ecd8' : (id === 'dental' ? '#7fc98a' : '#9bd0ef');
      var b = new T.CapsuleGeometry(0.035, 0.22, 4, 8); b.rotateZ(Math.PI / 2); g.add(mesh(b, c, 0, 0.04, 0, 1, 1, 1, 0.08));
      [-1, 1].forEach(function (sd) { g.add(mesh(sph(0.05), c, sd * 0.14, 0.05, 0.03, 1, 1, 1, 0.06)); g.add(mesh(sph(0.05), c, sd * 0.14, 0.05, -0.03, 1, 1, 1, 0.06)); });
    } else if (id === 'jerky') {
      g.add(mesh(new T.BoxGeometry(0.28, 0.03, 0.1), '#8a3b22', 0, 0.02, 0, 1, 1, 1, 0.08));
    } else if (id === 'catgrass') {
      g.add(mesh(new T.CylinderGeometry(0.1, 0.08, 0.1, 12), '#d98a5a', 0, 0.05, 0, 1, 1, 1, 0.05));
      for (var k = 0; k < 7; k++) { var bl = mesh(new T.ConeGeometry(0.015, 0.2, 4), '#5fbf4a', Math.cos(k) * 0.05, 0.18, Math.sin(k) * 0.05); bl.rotation.z = Math.cos(k * 2) * 0.3; g.add(bl); }
    } else if (id === 'puree') {
      var tube = new T.CylinderGeometry(0.035, 0.035, 0.28, 10); tube.rotateZ(Math.PI / 2);
      g.add(mesh(tube, '#ffffff', 0, 0.04, 0, 1, 1, 1, 0.08)); g.add(mesh(sph(0.05), '#e3a07a', 0.17, 0.035, 0, 1, 0.6, 1));
    } else {
      g.add(mesh(new T.CylinderGeometry(0.07, 0.07, 0.03, 12), id === 'cbiscuit' ? '#e8b35a' : '#c98a3a', 0, 0.02, 0, 1, 1, 1, 0.08));
    }
    return g;
  }

  var MOOD_KEYS = EK;
  function Stage(container, opts) {
    var self = this; opts = opts || {};
    this.el = container; this.active = false; this.raf = 0; this.last = 0; this.t = 0; this.phase = 0;
    this.scene = new T.Scene(); this.scene.background = new T.Color('#f1dfc4');
    this.cam = new T.PerspectiveCamera(40, 1.6, 0.1, 60);
    this.cam.position.set(0, 3.1, 6.6); this.cam.lookAt(0, 0.95, 0);
    this.ren = new T.WebGLRenderer({ antialias: true });
    this.ren.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    this.ren.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation';
    this.el.appendChild(this.ren.domElement);
    this.scene.add(new T.HemisphereLight(0xffffff, 0xd9c2a0, 1.1));
    var dl = new T.DirectionalLight(0xffffff, 1.4); dl.position.set(3, 6, 5); this.scene.add(dl);
    this.room = buildRoom(this.scene);
    this.camP = new T.Vector3(0, 3.1, 6.6); this.camL = new T.Vector3(0, 0.95, 0); this.camGoal = null; this.camK = 2.5;
    this.parts = []; this.heartG = heartGeo(); this.tr = null; this.food = 'kibble';
    var bl = new T.Mesh(new T.CircleGeometry(1, 24), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
    bl.rotation.x = -Math.PI / 2; bl.position.y = 0.045; this.scene.add(bl); this.blob = bl;
    this.pet = null; this.sig = '';
    this.cur = { joy: 0.25, sad: 0, sleepy: 0, excited: 0, angry: 0 };
    this.tar = { joy: 0.25, sad: 0, sleepy: 0, excited: 0, angry: 0 };
    this.baseMood = 'neutral'; this.boost = 0;
    this.mode = 'wander'; this.act = 'idle'; this.wait = 1.5; this.tx = 0; this.tz = 0.8; this.eatT = 0; this.jumpT = 0; this.blinkT = 3;
    this.legRot = [0, 0, 0, 0]; this.sleepK = 0; this.eatK = 0; this.openAmt = 0;
    this.ray = new T.Raycaster(); this.mv = new T.Vector2();
    this.ren.domElement.addEventListener('pointerdown', function (e) { self.poke(e); });
    this.onFrame = function (ts) { self.frame(ts); };
    if (typeof ResizeObserver !== 'undefined') { this.ro = new ResizeObserver(function () { self.resize(); }); this.ro.observe(this.el); }
    this.resize();
  }
  Stage.prototype.resize = function () {
    var w = this.el.clientWidth || 320, hh = this.el.clientHeight || 200;
    this.ren.setSize(w, hh, false); this.cam.aspect = w / hh; this.cam.updateProjectionMatrix();
    this.cam.fov = w / hh < 1.2 ? 52 : 40; this.cam.updateProjectionMatrix();
  };
  Stage.prototype.setPet = function (p, force) {
    var sig = [p.id, p.breedId, p.bcs, p.muscle, p.wear, p.items && p.items.harness && (!p.equip || p.equip.harness) ? 1 : 0, p.items && p.items.toy ? 1 : 0, p.equip && p.equip.stroller ? 1 : 0, p.items && p.items.scratcher ? 1 : 0, Math.floor(root.PetCore ? root.PetCore.ageDays(p, Date.now()) / 30 : 0)].join('|');
    if (!force && sig === this.sig) { this.petData = p; this.syncProps(p); return; }
    this.sig = sig; this.petData = p;
    var old = this.pet, pos = old ? old.position.clone() : null, yaw = old ? old.rotation.y : 0.35;
    if (old) this.scene.remove(old);
    var ageF = 1;
    if (root.PetCore) ageF = clamp(0.65 + 0.35 * (root.PetCore.ageDays(p, Date.now()) / 365), 0.65, 1);
    this.pet = buildPet(p, ageF);
    this.pet.position.set(pos ? pos.x : 0, 0, pos ? pos.z : 0.8); this.pet.rotation.y = yaw;
    this.scene.add(this.pet);
    var U = this.pet.userData; this.blob.scale.set(U.tw * U.scale * 1.6, U.tl * U.scale * 1.5, 1);
    this.blob.scale.set(U.tw * U.scale * 1.8, U.tl * U.scale * 1.7, 1);
    this.syncProps(p, true);
  };
  Stage.prototype.syncProps = function (p, fresh) {
    var U = this.pet.userData, R = this.room.userData, cat = (PARAMS[p.breedId] || {}).sp === 'cat';
    R.toy.visible = !!(p.items && p.items.toy); R.scr.visible = !!(p.items && p.items.scratcher && cat);
    if (this.tr && this.tr.kind === 'nails') return;
    if (U.claws && root.PetCore) {
      var grown = Math.min(1, (Date.now() - (p.nailTs || Date.now())) / (root.PetCore.CFG.nailDays * 86400000));
      U.claws.forEach(function (cl) { cl.forEach(function (c) { c.visible = true; c.scale.set(1, 0.7 + grown * 0.9, 1); }); });
    }
  };
  Stage.prototype.setMood = function (m) {
    var src = typeof m === 'string' ? (MOODS[m] || MOODS.neutral) : m, i;
    for (i = 0; i < MOOD_KEYS.length; i++) this.tar[MOOD_KEYS[i]] = src[MOOD_KEYS[i]] || 0;
    this.baseTar = {}; for (i = 0; i < MOOD_KEYS.length; i++) this.baseTar[MOOD_KEYS[i]] = this.tar[MOOD_KEYS[i]];
  };
  Stage.prototype.eat = function (food) {
    if (!this.pet) return;
    var U = this.pet.userData, R = this.room.userData, bw = R.bowl.position, reach = (U.tl * 0.85 + U.hr * 0.75) * U.scale;
    this.food = food || 'kibble'; this.tr = null;
    this.mode = 'toBowl'; this.tx = bw.x - reach - 0.05; this.tz = bw.z; this.act = 'walk';
    R.food.material = toon(this.food === 'canned' ? '#d98a7a' : '#8b5a2b'); R.food.scale.set(1, 0.05, 1); this.fill = 0;
    var S = U.scale, self = this;
    this.camGoal = { p: new T.Vector3(bw.x + 1.2, 0.55 + 0.35 * S, bw.z + 0.95), l: new T.Vector3(bw.x - 0.35 * S, 0.22 + 0.22 * S, bw.z) }; this.camK = 2.2;
    for (var i = 0; i < 16; i++) (function (i) {
      setTimeout(function () {
        var m = mesh(sph(0.032), self.food === 'canned' ? '#c97a6a' : (i % 3 ? '#8b5a2b' : '#a0703a'), bw.x + (Math.random() - 0.5) * 0.08, 0.95, bw.z + (Math.random() - 0.5) * 0.08);
        self.spawn(m, { vx: (Math.random() - 0.5) * 0.4, vy: -0.5, vz: (Math.random() - 0.5) * 0.4, life: 1.4, floor: 0.13, onLand: function () { self.fill = Math.min(1, self.fill + 1 / 16); }, kill: true });
      }, i * 45);
    })(i);
  };
  Stage.prototype.spawn = function (m, o) { this.scene.add(m); o.m = m; o.age = 0; if (o.vx == null) o.vx = 0; if (o.vy == null) o.vy = 0; if (o.vz == null) o.vz = 0; this.parts.push(o); return o; };
  Stage.prototype.hearts = function (n, at) {
    for (var i = 0; i < (n || 3); i++) {
      var m = new T.Mesh(this.heartG, new T.MeshBasicMaterial({ color: 0xff6f9a, transparent: true, side: T.DoubleSide, depthTest: false }));
      m.scale.setScalar(0.13); m.renderOrder = 5;
      m.position.set(at.x + (Math.random() - 0.5) * 0.4, at.y + Math.random() * 0.2, at.z + (Math.random() - 0.5) * 0.3);
      this.spawn(m, { vy: 0.5 + Math.random() * 0.3, life: 1.6 + Math.random() * 0.5, noGrav: true, fade: true, face: true, delay: i * 0.18 });
    }
  };
  Stage.prototype.headPos = function () { var v = new T.Vector3(); this.pet.userData.head.getWorldPosition(v); return v; };
  Stage.prototype.snack = function (id) {
    if (!this.pet) return;
    var g = this.pet, U = g.userData, S = U.scale;
    this.mode = 'trick'; this.tr = { kind: 'snack', t: 0, dur: 2.6 };
    var fy = Math.atan2(this.camP.x - g.position.x, this.camP.z - g.position.z); this.tr.face = fy;
    var reach = (U.tl * 0.85 + U.hr * 0.9) * S, sm = snackMesh(id);
    sm.position.set(g.position.x + Math.sin(fy) * reach, 0.9, g.position.z + Math.cos(fy) * reach); sm.rotation.y = fy + 0.4;
    this.spawn(sm, { vy: 0, life: 2.3, floor: 0.02, shrinkAfter: 0.9 });
    this.camGoal = { p: new T.Vector3(g.position.x + Math.sin(fy + 0.5) * (1.4 + S), 0.6 + 0.5 * S, g.position.z + Math.cos(fy + 0.5) * (1.4 + S)), l: new T.Vector3(g.position.x + Math.sin(fy) * reach * 0.6, 0.25 + 0.3 * S, g.position.z + Math.cos(fy) * reach * 0.6) };
    this.camK = 3;
  };
  var TR_DUR = { shake: 3.6, down: 3.2, spin: 2.4, grin: 2.8, nails: 6.2, toy: 5.5, scratch: 4.2 };
  Stage.prototype.trick = function (kind) {
    if (!this.pet) return;
    var g = this.pet, U = g.userData, S = U.scale, R = this.room.userData;
    this.tr = { kind: kind, t: 0, dur: TR_DUR[kind] || 3, cut: 0 };
    if (kind === 'toy' || kind === 'scratch') {
      var obj = kind === 'toy' ? R.toy : R.scr, op = obj.position;
      var ang = kind === 'toy' ? -0.6 : 0.7, reach = (U.tl * 0.85 + U.hr) * S + (kind === 'toy' ? 0.25 : 0.35);
      this.tr.goto = { x: op.x - Math.sin(ang + Math.PI) * -reach, z: op.z + Math.cos(ang) * reach };
      this.tr.goto = { x: op.x + Math.sin(ang) * reach, z: op.z + Math.cos(ang) * reach };
      this.tr.face = ang + Math.PI; this.tr.obj = obj; this.tr.home = op.clone();
      this.tr.walking = true; this.mode = 'trick';
      var cx = op.x + Math.sin(ang + 1.1) * 2.4, cz = op.z + Math.cos(ang + 1.1) * 2.4;
      this.camGoal = { p: new T.Vector3(cx, 1.1 + 0.5 * S, cz), l: new T.Vector3((op.x + this.tr.goto.x) / 2, 0.35 + 0.2 * S, (op.z + this.tr.goto.z) / 2) }; this.camK = 2;
      return;
    }
    this.mode = 'trick';
    var fy = Math.atan2(this.camDefP().x - g.position.x, this.camDefP().z - g.position.z);
    this.tr.face = fy;
    var cs = Math.sin(fy), cc = Math.cos(fy);
    if (kind === 'nails') {
      var d = 0.75 + 0.35 * S;
      this.camGoal = { p: new T.Vector3(g.position.x + Math.sin(fy + 0.35) * d * 1.25, 0.35 + 0.35 * S, g.position.z + Math.cos(fy + 0.35) * d * 1.25), l: null, nails: true };
      this.camK = 3;
      if (!this.clip) {
        var cg = new T.Group();
        cg.add(mesh(new T.BoxGeometry(0.035, 0.03, 0.18), '#d9534f', 0, 0, -0.1, 1, 1, 1, 0.08));
        cg.add(mesh(new T.BoxGeometry(0.03, 0.025, 0.1), '#bfc4cc', 0, 0.015, 0.03, 1, 1, 1, 0.08));
        cg.add(mesh(new T.BoxGeometry(0.03, 0.025, 0.1), '#bfc4cc', 0, -0.015, 0.03, 1, 1, 1, 0.08));
        this.clip = cg; this.scene.add(cg);
      }
      this.clip.visible = true;
      var cl = U.claws && U.claws[1]; if (cl) cl.forEach(function (c) { c.visible = true; });
    } else {
      var dd = (kind === 'spin' ? 2.2 : 1.6) + 1.0 * S, side = kind === 'shake' ? 0.45 : 0.25;
      this.camGoal = { p: new T.Vector3(g.position.x + Math.sin(fy + side) * dd, 0.7 + 0.55 * S, g.position.z + Math.cos(fy + side) * dd), l: new T.Vector3(g.position.x + cs * 0.15, 0.35 + 0.4 * S, g.position.z + cc * 0.15) };
      this.camK = 3;
      if (kind === 'shake' && !this.hand) {
        var hd = new T.Group(); hd.add(mesh(sph(0.11), '#f5cba7', 0, 0, 0, 1, 0.7, 1.3, 0.05)); hd.add(mesh(new T.CapsuleGeometry(0.07, 0.4, 4, 8), '#4aa3df', 0, 0, 0.3, 1, 1, 1, 0.05)); hd.children[1].rotation.x = Math.PI / 2;
        this.hand = hd; this.scene.add(hd);
      }
    }
  };
  Stage.prototype.camDefP = function () { return new T.Vector3(0, 3.1, 6.6); };
  Stage.prototype.jump = function () { this.jumpT = 1.2; };
  Stage.prototype.sleep = function (on) { this.mode = on ? 'sleep' : 'wander'; };
  Stage.prototype.busy = function () { return this.mode === 'trick' || this.mode === 'toBowl' || this.mode === 'eating'; };
  Stage.prototype.poke = function (e) {
    if (!this.pet) return;
    var rc = this.ren.domElement.getBoundingClientRect();
    this.mv.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    this.ray.setFromCamera(this.mv, this.cam);
    if (this.ray.intersectObject(this.pet, true).length) {
      this.boost = 2.2; this.jump();
      if (this.mode === 'sleep') this.mode = 'wander';
    }
  };
  Stage.prototype.setActive = function (on) {
    if (on === this.active) return;
    this.active = on;
    if (on) { this.last = 0; this.resize(); this.raf = requestAnimationFrame(this.onFrame); }
    else if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
  };
  Stage.prototype.dispose = function () {
    this.setActive(false); if (this.ro) this.ro.disconnect();
    if (this.ren.domElement.parentNode) this.ren.domElement.parentNode.removeChild(this.ren.domElement);
    this.ren.dispose();
  };
  Stage.prototype.frame = function (ts) {
    if (!this.active) return;
    var dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0.016; this.last = ts;
    this.step(dt); this.stepFx(dt); this.stepCam(dt);
    this.ren.render(this.scene, this.cam);
    this.raf = requestAnimationFrame(this.onFrame);
  };
  Stage.prototype.stepCam = function (dt) {
    var G = this.camGoal, P, Lk;
    if (G) {
      P = G.p; Lk = G.l;
      if (G.nails && this.pet) { var pw = new T.Vector3(); this.pet.userData.claws[1][1].getWorldPosition(pw); Lk = pw; }
    } else { P = this.camDefP(); Lk = new T.Vector3(0, 0.95, 0); }
    var a = 1 - Math.exp(-dt * this.camK);
    this.camP.lerp(P, a); this.camL.lerp(Lk, a);
    this.cam.position.copy(this.camP); this.cam.lookAt(this.camL);
  };
  Stage.prototype.stepFx = function (dt) {
    var i, o, cam = this.cam;
    for (i = this.parts.length - 1; i >= 0; i--) {
      o = this.parts[i];
      if (o.delay > 0) { o.delay -= dt; o.m.visible = false; continue; }
      o.m.visible = true; o.age += dt;
      if (!o.noGrav && !o.landed) o.vy -= 5.5 * dt;
      o.m.position.x += o.vx * dt; o.m.position.y += o.vy * dt; o.m.position.z += o.vz * dt;
      if (o.spin) { o.m.rotation.x += o.spin * dt; o.m.rotation.z += o.spin * 0.7 * dt; }
      if (o.floor != null && o.m.position.y <= o.floor && !o.landed) {
        o.m.position.y = o.floor;
        if (o.bounce && Math.abs(o.vy) > 0.4) { o.vy = -o.vy * o.bounce; o.vx *= 0.6; o.vz *= 0.6; }
        else { o.landed = true; o.vx = o.vz = o.vy = 0; if (o.onLand) o.onLand(); if (o.kill) o.age = o.life; }
      }
      if (o.face) o.m.quaternion.copy(cam.quaternion);
      if (o.fade && o.m.material) o.m.material.opacity = Math.max(0, 1 - o.age / o.life);
      if (o.shrinkAfter != null && o.age > o.shrinkAfter) { var k = Math.max(0.001, 1 - (o.age - o.shrinkAfter) / (o.life - o.shrinkAfter)); o.m.scale.setScalar(k); }
      if (o.age >= o.life) { this.scene.remove(o.m); this.parts.splice(i, 1); }
    }
    var R = this.room.userData;
    if (this.fill != null) {
      var f = this.fill; R.food.scale.set(0.3 + 0.7 * Math.min(1, f * 1.2), Math.max(0.02, 0.35 * f), 0.3 + 0.7 * Math.min(1, f * 1.2));
      R.food.visible = f > 0.02;
    }
  };
  Stage.prototype.step = function (dt) {
    this.t += dt;
    var g = this.pet; if (!g) return;
    var U = g.userData, t = this.t, k = Math.min(1, dt * 5), i, mode = this.mode;

    if (this.boost > 0) { this.boost -= dt; }
    var tar = this.tar, base = this.baseTar || tar;
    for (i = 0; i < MOOD_KEYS.length; i++) {
      var key = MOOD_KEYS[i], tv = this.boost > 0 ? (key === 'joy' ? 0.9 : key === 'excited' ? 1 : 0) : (base[key] || 0);
      if (mode === 'sleep') tv = key === 'sleepy' ? 1 : 0;
      this.cur[key] += (tv - this.cur[key]) * k;
    }
    var c = this.cur;

    var speed = 0, dx = 0, dz = 0, moving = false;
    if (mode === 'wander') {
      if (this.act === 'walk' || this.act === 'run') {
        dx = this.tx - g.position.x; dz = this.tz - g.position.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        if (d < 0.12) { this.act = 'idle'; this.wait = 2 + Math.random() * 4; }
        else moving = true;
      } else {
        this.wait -= dt;
        if (this.wait <= 0) {
          this.tx = -2.6 + Math.random() * 5.2; this.tz = -0.6 + Math.random() * 2.8;
          this.act = Math.random() < 0.25 ? 'run' : 'walk';
        }
      }
    } else if (mode === 'toBowl') {
      dx = this.tx - g.position.x; dz = this.tz - g.position.z;
      var d2 = Math.sqrt(dx * dx + dz * dz);
      if (d2 < 0.12) { this.mode = 'eating'; this.eatT = 4.2; this.eatTot = 4.2; this.act = 'eat'; this.crumbT = 0; } else { moving = true; this.act = 'walk'; }
    } else if (mode === 'eating') {
      this.eatT -= dt;
      if (this.fill != null && this.eatT < this.eatTot - 0.6) this.fill = Math.max(0, Math.min(this.fill, this.eatT / (this.eatTot - 0.6)));
      this.crumbT -= dt;
      if (this.crumbT <= 0) {
        this.crumbT = 0.22 + Math.random() * 0.25;
        var bw = this.room.userData.bowl.position;
        var cm = mesh(sph(0.018), this.food === 'canned' ? '#c97a6a' : '#8b5a2b', bw.x - 0.15, 0.2, bw.z + (Math.random() - 0.5) * 0.2);
        this.spawn(cm, { vx: -0.3 - Math.random() * 0.4, vy: 0.9 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.6, life: 1.6, floor: 0.04, bounce: 0.4 });
      }
      if (this.eatT <= 0) {
        this.mode = 'wander'; this.act = 'idle'; this.wait = 2.2; this.boost = 2.5; this.fill = 0;
        this.hearts(4, this.headPos().add(new T.Vector3(0, 0.25, 0)));
        var self = this; setTimeout(function () { if (!self.busy()) self.camGoal = null; }, 1300);
      }
    } else if (mode === 'trick') {
      var tr = this.tr;
      if (tr && tr.walking) {
        dx = tr.goto.x - g.position.x; dz = tr.goto.z - g.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < 0.1) { tr.walking = false; tr.t = 0; this.act = 'idle'; } else { moving = true; this.act = 'walk'; }
      } else this.act = 'idle';
    } else if (mode === 'sleep') { this.act = 'sleep'; }

    if (moving) {
      speed = (this.act === 'run' ? 2.2 : 1.1) * (0.6 + U.scale * 0.4);
      var dd = Math.sqrt(dx * dx + dz * dz);
      g.position.x += dx / dd * speed * dt; g.position.z += dz / dd * speed * dt;
      var want = Math.atan2(dx, dz), diff = want - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * Math.min(1, dt * 8);
    } else {
      var face = mode === 'eating' ? Math.PI / 2 : (mode === 'trick' && this.tr ? this.tr.face : 0.35), df = face - g.rotation.y;
      while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2;
      g.rotation.y += df * Math.min(1, dt * 4);
    }

    var act = this.act;
    this.phase += dt * (act === 'run' ? 16 : (act === 'walk' ? 9 : 0));
    var amp = act === 'run' ? 0.9 : (act === 'walk' ? 0.5 : 0), sl = act === 'sleep' ? 1 : 0;
    this.sleepK += (sl - this.sleepK) * Math.min(1, dt * 3);
    this.eatK += ((act === 'eat' ? 1 : 0) - this.eatK) * Math.min(1, dt * 6);
    var s1 = Math.sin(this.phase) * amp;
    var targets = [s1, -s1, -s1, s1];
    for (i = 0; i < 4; i++) {
      var lt = targets[i] + this.sleepK * (i < 2 ? -1.3 : 1.3);
      this.legRot[i] += (lt - this.legRot[i]) * Math.min(1, dt * 12);
      U.legs[i].rotation.x = this.legRot[i];
    }
    var bob = (act === 'run' ? Math.abs(Math.sin(this.phase)) * 0.06 : (act === 'walk' ? Math.abs(Math.sin(this.phase)) * 0.03 : 0));
    var breath = Math.sin(t * (act === 'sleep' ? 1.2 : 2.2)) * 0.02;
    U.upper.position.y = U.upperBase + bob - this.sleepK * U.leg * 0.75;
    U.torso.scale.y = U.th * (1 + breath);
    if (this.jumpT > 0) { this.jumpT -= dt; g.position.y = Math.abs(Math.sin(t * 8)) * 0.28 * Math.min(1, this.jumpT); } else g.position.y = 0;
    this.blob.position.x = g.position.x; this.blob.position.z = g.position.z;
    var bs = 1 - Math.min(0.4, g.position.y); this.blob.material.opacity = 0.22 * bs;

    U.head.position.y = U.headBase - this.eatK * U.th * 0.55 - this.sleepK * U.th * 0.2;
    U.head.rotation.x = this.eatK * (0.55 + Math.sin(t * 9) * 0.12) + this.sleepK * 0.35 + Math.sin(t * 1.3) * 0.02 + (act === 'walk' || act === 'run' ? Math.sin(this.phase * 2) * 0.03 : 0);
    U.head.rotation.z = Math.sin(t * 0.7) * 0.03 + c.sad * 0.05;

    this.blinkT -= dt; var blink = 1;
    if (this.blinkT < 0) { blink = 0.1; if (this.blinkT < -0.12) this.blinkT = 2.5 + Math.random() * 3; }
    var open = clamp(1 - 0.88 * c.sleepy - 0.2 * c.sad + 0.12 * c.excited - 0.55 * c.joy * c.joy * (1 - c.excited * 0.6), 0.06, 1.15) * blink;
    var er = 1 + 0.12 * c.excited;
    for (i = 0; i < 2; i++) {
      U.eyes[i].scale.set(er, open * er, 0.6);
      var sd = i === 0 ? -1 : 1;
      U.brows[i].rotation.z = -sd * (c.sad * 0.5 - c.angry * 0.55);
      U.brows[i].position.y = U.hr * (0.42 + 0.06 * c.excited + 0.03 * c.sad - 0.04 * c.angry);
      U.cheeks[i].material.opacity = 0.2 + 0.55 * c.joy;
      var ear = U.ears[i], e = ear.userData, droop = c.sad * 0.45 + c.sleepy * 0.2 - c.excited * 0.15 + c.angry * 0.4;
      if (e.kind === 'up') ear.rotation.z = -e.side * (0.2 + droop) + Math.sin(t * 1.1 + i) * 0.02;
      else ear.rotation.z = e.side * (0.12 + droop * 0.5 - c.excited * 0.1) + Math.sin(t * 6 * (moving ? 1 : 0.2) + i) * 0.03 * (moving ? 2 : 0);
    }
    var cv = clamp(c.joy - c.sad - c.angry * 0.6, -1, 1);
    var sg = cv >= 0 ? 1 : -1; U.mouth.scale.set(1, sg * Math.max(0.2, Math.abs(cv)), 1);
    var want = clamp(c.excited * 0.6 + c.joy * 0.3 * (c.joy > 0.6 ? 1 : 0), 0, 1);
    if (act === 'eat') want = 0.5 + 0.5 * Math.sin(t * 12);
    this.openAmt += (want - this.openAmt) * Math.min(1, dt * 10);
    U.jaw.scale.y = 0.01 + this.openAmt * 1.1; U.jaw.visible = this.openAmt > 0.06; U.mouth.visible = this.openAmt < 0.5;

    var wagAmp = (c.joy + c.excited) * 0.5 * (1 - c.sad), freq = 6 + c.excited * 7;
    U.tail.rotation.y = Math.sin(t * freq) * wagAmp;
    U.tail.rotation.x = U.tailBase + c.sad * 0.6 + this.sleepK * 0.3 - c.excited * 0.15;
    this.pose(dt);
  };
  Stage.prototype.pose = function (dt) {
    var g = this.pet, U = g.userData, tr = this.mode === 'trick' ? this.tr : null, i;
    var kind = tr && !tr.walking ? tr.kind : '', tt = tr ? tr.t : 0;
    if (tr && !tr.walking) tr.t += dt;
    var want = { sit: 0, down: 0, paw: 0, grin: 0, scr: 0 };
    if (kind === 'shake' || kind === 'grin' || kind === 'nails' || kind === 'snack') want.sit = kind === 'snack' ? 0 : 1;
    if (kind === 'shake' && tt > 0.5 && tt < 3.0) want.paw = 1;
    if (kind === 'nails' && tt > 0.5 && tt < 5.6) want.paw = 0.85;
    if (kind === 'down' && tt > 0.4 && tt < 2.8) want.down = 1;
    if (kind === 'grin' && tt > 0.5 && tt < 2.4) want.grin = 1;
    if (kind === 'scratch' && tt > 0.2 && tt < 3.8) want.scr = 1;
    var P = this.pk || (this.pk = { sit: 0, down: 0, paw: 0, grin: 0, scr: 0 }), k = Math.min(1, dt * 7);
    for (var n in want) P[n] += (want[n] - P[n]) * k;
    var sit = P.sit, dn = P.down, pw = P.paw, gr = P.grin, sc = P.scr;
    U.upper.rotation.x = -0.42 * sit - 0.5 * sc;
    U.upper.position.y -= U.leg * (0.28 * sit + 0.72 * dn) + 0.1 * sc;
    U.head.rotation.x += 0.36 * sit + 0.4 * sc - 0.25 * dn;
    U.legs[2].rotation.x += -1.25 * sit + 1.3 * dn; U.legs[3].rotation.x += -1.25 * sit + 1.3 * dn;
    U.legs[0].rotation.x += -1.3 * dn; U.legs[1].rotation.x += -1.3 * dn;
    if (sc > 0.01) {
      var a = Math.sin(this.t * 14);
      U.legs[0].rotation.x = -1.3 * sc + a * 0.45 * sc; U.legs[1].rotation.x = -1.3 * sc - a * 0.45 * sc;
      if (Math.random() < dt * 8) {
        var o = this.tr.obj.position, bit = mesh(new T.BoxGeometry(0.03, 0.01, 0.02), '#b48850', o.x + (Math.random() - 0.5) * 0.4, 0.45, o.z + (Math.random() - 0.5) * 0.3);
        this.spawn(bit, { vx: (Math.random() - 0.5) * 0.8, vy: 0.6, vz: (Math.random() - 0.5) * 0.8, life: 1.4, floor: 0.03, spin: 6 });
      }
    }
    if (pw > 0.01) {
      var sh = kind === 'shake' ? Math.sin(this.t * 7) * 0.12 : 0;
      U.legs[1].rotation.x = U.legs[1].rotation.x * (1 - pw) + (-1.35 + sh) * pw;
    }
    if (kind === 'shake' && this.hand) {
      var pp = new T.Vector3(); U.legs[1].getWorldPosition(pp);
      var fy = tr.face, rch = U.legLen * U.scale;
      var hx = pp.x + Math.sin(fy) * (rch + 0.08), hz = pp.z + Math.cos(fy) * (rch + 0.08);
      var hv = pw > 0.3; this.hand.visible = hv;
      this.hand.position.set(hx + Math.sin(fy) * (1 - pw) * 0.8, pp.y + Math.sin(this.t * 7) * 0.04 * U.scale, hz + Math.cos(fy) * (1 - pw) * 0.8);
      this.hand.rotation.y = fy;
    } else if (this.hand) this.hand.visible = false;
    if (kind === 'spin') {
      var sp = Math.min(1, tt / 2.0), e = sp < 0.5 ? 2 * sp * sp : 1 - Math.pow(-2 * sp + 2, 2) / 2;
      g.rotation.y = tr.face + e * Math.PI * 4;
      g.position.y = Math.abs(Math.sin(sp * Math.PI * 2)) * 0.12;
      this.phase += dt * 10;
    }
    if (gr > 0.01) {
      U.teeth.visible = gr > 0.35; U.jaw.visible = true; U.mouth.visible = false;
      U.jaw.scale.y = 0.01 + 0.9 * gr; U.head.rotation.x -= 0.15 * gr;
      for (i = 0; i < 2; i++) U.eyes[i].scale.y = Math.max(0.1, U.eyes[i].scale.y * (1 - 0.75 * gr));
      U.cheeks[0].material.opacity = U.cheeks[1].material.opacity = 0.75;
    } else U.teeth.visible = false;
    if (kind === 'nails' && this.clip) {
      var cl = U.claws[1], pp2 = new T.Vector3();
      var idx = Math.floor((tt - 1.2) / 1.3);
      var tgt = cl[Math.max(0, Math.min(2, idx))];
      tgt.getWorldPosition(pp2);
      var phase = ((tt - 1.2) % 1.3) / 1.3, near = tt > 1.0 && idx < 3 ? (phase < 0.6 ? phase / 0.6 : 1) : 0;
      this.clip.position.set(pp2.x + 0.25 * (1 - near) + 0.02, pp2.y + 0.12 * (1 - near) + 0.01, pp2.z + 0.18 * (1 - near) + 0.03);
      this.clip.lookAt(pp2); this.clip.rotation.z += Math.sin(this.t * 30) * 0.05 * near;
      if (idx >= 0 && idx < 3 && phase > 0.65 && tr.cut <= idx) {
        tr.cut = idx + 1;
        var tip = mesh(new T.ConeGeometry(U.legR * 0.16 * U.scale, U.legR * 0.3 * U.scale, 6), '#ffffff', pp2.x, pp2.y, pp2.z);
        this.spawn(tip, { vx: (Math.random() - 0.5) * 0.3, vy: 0.3, vz: 0.25, life: 2.6, floor: 0.02, bounce: 0.35, spin: 9 });
        cl.forEach(function (c, ci) { if (ci === idx) c.scale.y = 0.55; });
        this.boost = 0.6;
      }
      if (tt > 5.3) this.clip.visible = false;
    }
    if (kind === 'snack') {
      var ch = tt > 0.7 && tt < 2.3 ? 1 : 0;
      this.snK = (this.snK || 0) + (ch - (this.snK || 0)) * k;
      U.head.position.y -= this.snK * U.th * 0.5; U.head.rotation.x += this.snK * (0.55 + Math.sin(this.t * 10) * 0.12);
      U.jaw.visible = true; U.jaw.scale.y = 0.01 + this.snK * (0.5 + 0.5 * Math.sin(this.t * 12)); U.mouth.visible = this.snK < 0.3;
      if (ch && Math.random() < dt * 5) {
        var hp = this.headPos(), cr = mesh(sph(0.015), '#c98a3a', hp.x, Math.max(0.1, hp.y - 0.2), hp.z);
        this.spawn(cr, { vx: (Math.random() - 0.5) * 0.7, vy: 0.6, vz: (Math.random() - 0.5) * 0.7, life: 1.2, floor: 0.03 });
      }
    }
    if (kind === 'toy' && tr.obj) {
      var ob = tr.obj, home = tr.home, ph2 = Math.max(0, tt - 0.2);
      U.head.rotation.x += 0.45 + Math.sin(this.t * 6) * 0.15;
      ob.position.x = home.x + Math.sin(ph2 * 2.3) * 0.18; ob.position.z = home.z + Math.sin(ph2 * 1.7) * 0.1;
      ob.rotation.z = Math.sin(ph2 * 2.3) * 0.6; ob.rotation.x = Math.sin(ph2 * 1.7) * 0.4;
      if (Math.random() < dt * 3) {
        var kb = mesh(sph(0.03), '#8b5a2b', ob.position.x, 0.4, ob.position.z);
        this.spawn(kb, { vx: (Math.random() - 0.5) * 1.2, vy: 1.0, vz: (Math.random() - 0.5) * 1.2, life: 1.2, floor: 0.03, bounce: 0.3, shrinkAfter: 0.8 });
      }
      if (tt > 5.2) { ob.position.copy(home); ob.rotation.set(0, 0, 0); }
    }
    if (tr && !tr.walking && tt >= tr.dur) {
      var done = tr.kind; this.tr = null; this.mode = 'wander'; this.act = 'idle'; this.wait = 2; this.boost = 2;
      if (done !== 'snack') this.hearts(3, this.headPos().add(new T.Vector3(0, 0.3, 0)));
      if (this.clip) this.clip.visible = false; if (this.hand) this.hand.visible = false;
      var self = this; setTimeout(function () { if (!self.busy()) self.camGoal = null; }, done === 'snack' ? 300 : 900);
    }
  };

  function autoMood(p) {
    var hr = new Date().getHours();
    if (p.bcs <= 3 || p.happy < 30) return 'sad';
    if (p.bcs >= 8) return 'hungry';
    if (hr >= 0 && hr < 5 && p.happy < 85) return 'sleepy';
    if (p.happy >= 80) return 'happy';
    if (p.happy < 50) return 'sad';
    return 'neutral';
  }

  function mount(container, opts) {
    return loadThree().then(function () { return new Stage(container, opts); });
  }

  // 掛進「我的寵物」面板的 3D 區塊
  function autoAttach() {
    if (!root.PetUI || !root.PetUI.current) return false;
    var stage = null, stageEl = null, msgEl = null, failed = false, mounting = false;
    var FAIL = '3D 載入失敗，請連上網路後重新整理。';
    function msg(t) { if (msgEl) msgEl.remove(); var d = msgEl = document.createElement('div'); d.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8a6d4a;font-size:14px'; d.textContent = t; stageEl.appendChild(d); }
    function sync(slot) {
      var p = root.PetUI.current();
      if (!slot || !p) { if (stage) stage.setActive(false); return; }
      if (!stageEl) {
        stageEl = document.createElement('div');
        stageEl.style.cssText = 'width:100%;height:250px;position:relative;background:#f1dfc4';
      }
      if (stageEl.parentNode !== slot) slot.appendChild(stageEl);
      if (failed) { if (stageEl.querySelector('canvas')) stageEl.innerHTML = ''; msg(FAIL); return; }
      if (!stage) {
        if (mounting) return; mounting = true; msg('3D 載入中…');
        mount(stageEl).then(function (s) {
          stage = s; if (msgEl) { msgEl.remove(); msgEl = null; }
          var q = root.PetUI.current(); if (q) { stage.setPet(q); stage.setMood(autoMood(q)); }
          stage.setActive(!!stageEl.parentNode && root.PetUI.isOpen()); stage.resize(); mounting = false;
        }, function () { failed = true; mounting = false; msg(FAIL); });
        return;
      }
      stage.setPet(p); stage.setMood(autoMood(p)); stage.setActive(true); stage.resize();
    }
    root.addEventListener('petui:render', function (e) { sync(e.detail && e.detail.slot); });
    root.addEventListener('petui:action', function (e) {
      if (!stage || !e.detail) return;
      var d = e.detail;
      if (d.type === 'feed') stage.eat(d.food);
      else if (d.type === 'snack') stage.snack(d.snack);
      else if (d.type === 'trick') stage.trick(d.trick);
      else if (d.type === 'nails') stage.trick('nails');
      else if (d.type === 'toy') stage.trick('toy');
      else if (d.type === 'scratch') stage.trick('scratch');
      else if (d.type === 'play') stage.jump();
    });
    root.Pet3D.stage = function () { return stage; };
    return true;
  }
  function boot() {
    var tries = 0, iv = setInterval(function () {
      tries++; if (autoAttach() || tries > 40) clearInterval(iv);
    }, 250);
  }

  root.Pet3D = { mount: mount, autoMood: autoMood, loadThree: loadThree, PARAMS: PARAMS, _setThree: function (m) { T = m; },
    _i: function () { return { T: T, buildPet: buildPet, toon: toon, mesh: mesh, sph: sph, snackMesh: snackMesh, heartGeo: heartGeo }; } };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
