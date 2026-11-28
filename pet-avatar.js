/* pet-avatar.js  飼主形象（Three.js） */
(function (root) {
  'use strict';
  var T = null, I = null;
  function need() { if (!T) { I = root.Pet3D._i(); T = I.T; } }
  function L() { return root.PetCore.LOOK; }
  function col(arr, i) { return arr[Math.max(0, Math.min(arr.length - 1, i | 0))]; }
  function cap(r, len) { return new T.CapsuleGeometry(r, len, 6, 12); }

  function build(look) {
    need();
    look = look || root.PetCore.defaultLook('m');
    var LK = L(), skin = col(LK.skin, look.skin), hc = col(LK.hairCol, look.hairCol);
    var tc = col(LK.cloth, look.topCol), bc = col(LK.cloth, look.botCol);
    var top = look.top | 0, bot = look.bottom | 0, hair = look.hair | 0, fem = look.g === 'f';
    var M = I.mesh, S = I.sph, toon = I.toon;
    var g = new T.Group(), U = { legs: [], knees: [], arms: [], elbows: [] };
    var body = new T.Group(); g.add(body); U.body = body;
    var hipY = 0.5;
    var longPants = bot === 0 || bot === 3, skirt = bot === 2 || top === 3;
    [-1, 1].forEach(function (sd) {
      var hip = new T.Group(); hip.position.set(sd * 0.1, hipY, 0); body.add(hip);
      hip.add(M(cap(0.07, 0.12), skirt ? skin : bc, 0, -0.12, 0, 1, 1, 1, 0.06));
      var knee = new T.Group(); knee.position.set(0, -0.24, 0); hip.add(knee);
      knee.add(M(cap(0.062, 0.1), longPants && !skirt ? bc : skin, 0, -0.1, 0, 1, 1, 1, 0.06));
      knee.add(M(S(0.08), '#3a2f2a', 0, -0.22, 0.04, 1, 0.65, 1.45, 0.05));
      U.legs.push(hip); U.knees.push(knee);
    });
    var torso = new T.Group(); torso.position.y = hipY; body.add(torso); U.torso = torso;
    var tmain = top === 4 ? '#ffffff' : tc;
    torso.add(M(new T.CylinderGeometry(0.17, 0.2, 0.42, 18), tmain, 0, 0.22, 0, 1, 1, 0.8, 0.04));
    torso.add(M(S(0.17), tmain, 0, 0.42, 0, 1.05, 0.5, 0.82));
    if (!skirt) torso.add(M(new T.CylinderGeometry(0.2, 0.2, 0.08, 18), bc, 0, 0.02, 0, 1, 1, 0.8, 0.04));
    if (skirt) {
      var sc = top === 3 ? tc : bc;
      torso.add(M(new T.CylinderGeometry(0.19, 0.3, 0.28, 20, 1, true), toon(sc, { side: T.DoubleSide }), 0, -0.08, 0, 1, 1, 0.85, 0.03));
    }
    if (top === 1) {
      torso.add(M(new T.TorusGeometry(0.13, 0.05, 8, 16), tc, 0, 0.44, -0.06, 1, 1, 0.8));
      torso.add(M(new T.BoxGeometry(0.22, 0.1, 0.02), tc, 0, 0.12, 0.165, 1, 1, 1, 0.08));
    } else if (top === 2) {
      [-1, 1].forEach(function (sd) { var c = M(new T.ConeGeometry(0.05, 0.1, 3), '#ffffff', sd * 0.06, 0.43, 0.13, 1, 1, 0.4); c.rotation.z = Math.PI + sd * 0.5; torso.add(c); });
      [0.33, 0.24, 0.15].forEach(function (y) { torso.add(M(S(0.014), '#f0f0f0', 0, y, 0.165)); });
    } else if (top === 4) {
      torso.add(M(new T.BoxGeometry(0.12, 0.38, 0.02), tc, 0, 0.24, 0.158));
      torso.add(M(new T.CylinderGeometry(0.205, 0.235, 0.36, 18, 1, true), toon('#ffffff', { side: T.DoubleSide }), 0, -0.1, 0, 1, 1, 0.82, 0.03));
      torso.add(M(new T.BoxGeometry(0.06, 0.05, 0.02), '#4aa3df', 0.09, 0.32, 0.168));
    } else if (top === 5) {
      [0.08, 0.2, 0.32].forEach(function (y) { torso.add(M(new T.CylinderGeometry(0.188 - y * 0.06, 0.19 - y * 0.06, 0.04, 18, 1, true), toon('#ffffff', { side: T.DoubleSide }), 0, y, 0, 1.01, 1, 0.81)); });
    }
    var longSleeve = top === 1 || top === 2 || top === 4;
    var sleeveC = top === 4 ? '#ffffff' : tc;
    [-1, 1].forEach(function (sd) {
      var sh = new T.Group(); sh.position.set(sd * 0.22, 0.4, 0); torso.add(sh);
      sh.add(M(cap(0.055, 0.1), sleeveC, 0, -0.08, 0, 1, 1, 1, 0.06));
      var el = new T.Group(); el.position.set(0, -0.17, 0); sh.add(el);
      el.add(M(cap(0.05, 0.08), longSleeve ? sleeveC : skin, 0, -0.07, 0, 1, 1, 1, 0.06));
      el.add(M(S(0.058), skin, 0, -0.16, 0, 1, 1, 1, 0.06));
      sh.rotation.z = sd * 0.12;
      U.arms.push(sh); U.elbows.push(el);
    });
    var head = new T.Group(); head.position.y = hipY + 0.72; body.add(head); U.head = head;
    var hr = 0.27;
    head.add(M(S(hr), skin, 0, 0, 0, 1, 0.95, 0.95, 0.04));
    [-1, 1].forEach(function (sd) {
      var e = M(S(0.035), '#1d1715', sd * 0.09, 0.0, hr * 0.9, 1, fem ? 1.35 : 1.2, 0.5);
      e.add(M(S(0.012), '#ffffff', 0.012, 0.012, 0.03));
      head.add(e); (U.eyes = U.eyes || []).push(e);
      var ch = new T.Mesh(new T.CircleGeometry(0.035, 14), new T.MeshBasicMaterial({ color: 0xff8aa8, transparent: true, opacity: 0.45 }));
      ch.position.set(sd * 0.15, -0.06, hr * 0.84); ch.rotation.y = sd * 0.5; head.add(ch);
      head.add(M(S(0.045), skin, sd * hr * 0.97, -0.02, 0, 0.5, 0.8, 0.6));
    });
    var mouth = new T.Mesh(new T.TorusGeometry(0.03, 0.007, 6, 12, Math.PI), new T.MeshBasicMaterial({ color: 0x5a2a2a }));
    mouth.position.set(0, -0.1, hr * 0.92); mouth.rotation.z = Math.PI; head.add(mouth); U.mouth = mouth;
    var hm = toon(hc, { side: T.DoubleSide });
    function hairCap(thetaLen, s) {
      var c = new T.Mesh(new T.SphereGeometry(hr * 1.06, 22, 14, 0, Math.PI * 2, 0, thetaLen || 1.45), hm);
      c.scale.set(s || 1, 1, 1); c.rotation.x = -0.25; return c;
    }
    if (hair === 1) {
      head.add(hairCap(1.1));
      for (var k = 0; k < 9; k++) {
        var a = k / 9 * Math.PI * 2, sp = M(new T.ConeGeometry(0.06, 0.18, 6), hm, Math.cos(a) * 0.14, 0.22, Math.sin(a) * 0.14 - 0.02);
        sp.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); head.add(sp);
      }
      head.add(M(new T.ConeGeometry(0.07, 0.2, 6), hm, 0, 0.3, 0));
    } else if (hair === 7) {
      head.add(hairCap(1.3));
      for (var j = 0; j < 16; j++) {
        var b = j / 16 * Math.PI * 2, rr = j % 2 ? 0.2 : 0.25, yy = j % 2 ? 0.2 : 0.1;
        head.add(M(S(0.07), hm, Math.cos(b) * rr, yy, Math.sin(b) * rr - 0.02));
      }
      head.add(M(S(0.09), hm, 0, 0.27, 0));
    } else {
      head.add(hairCap(hair === 6 ? 1.75 : 1.45, hair === 6 ? 1.05 : 1));
      head.add(M(S(0.12), hm, hair === 2 ? 0.07 : -0.04, 0.17, 0.17, 1.4, 0.5, 0.6));
      if (hair === 2) head.add(M(S(0.12), hm, -0.09, 0.17, 0.17, 1.2, 0.5, 0.6));
      if (hair === 3) {
        var pt = new T.Group(); pt.position.set(0, 0.12, -0.27); head.add(pt);
        pt.add(M(S(0.03), '#e74c3c', 0, 0, 0));
        pt.add(M(cap(0.06, 0.2), hm, 0, -0.14, -0.04, 1, 1, 1, 0.05)); pt.rotation.x = 0.35; U.pony = pt;
      } else if (hair === 4) {
        head.add(M(new T.BoxGeometry(0.5, 0.44, 0.12), hm, 0, -0.14, -0.17, 1, 1, 1, 0.03));
        [-1, 1].forEach(function (sd) { head.add(M(cap(0.05, 0.22), hm, sd * 0.24, -0.12, 0.08, 1, 1, 1, 0.05)); });
      } else if (hair === 5) {
        head.add(M(S(0.1), hm, 0, 0.32, -0.06, 1, 1, 1, 0.05));
      } else if (hair === 6) {
        [-1, 1].forEach(function (sd) { head.add(M(S(0.1), hm, sd * 0.22, -0.1, 0.02, 0.6, 1.1, 1)); });
      }
    }
    var book = new T.Group(); book.visible = false; book.position.set(0, 0.24, 0.32); torso.add(book);
    var cover = col(['#c0392b', '#2e86c1', '#27ae60', '#8e44ad'], (look.topCol | 0) % 4);
    book.add(M(new T.BoxGeometry(0.34, 0.02, 0.24), cover, 0, 0, 0));
    book.add(M(new T.BoxGeometry(0.32, 0.025, 0.22), '#fffdf5', 0, 0.015, 0));
    var page = new T.Group(); page.position.set(0, 0.03, 0); book.add(page);
    var pg = M(new T.BoxGeometry(0.16, 0.004, 0.21), '#ffffff', 0.08, 0, 0); page.add(pg);
    book.rotation.x = 0.5; U.book = book; U.page = page;
    g.userData = U;
    return g;
  }

  function newAnim() { return { t: 0, ph: 0, k: { sit: 0, study: 0, wave: 0, push: 0 } }; }
  function animate(g, A, dt, act) {
    var U = g.userData, i, k = Math.min(1, dt * 8);
    A.t += dt;
    var walk = act === 'walk' || act === 'run' || act === 'push';
    A.ph += dt * (act === 'run' ? 13 : (walk ? 8 : 0));
    ['sit', 'study', 'wave', 'push'].forEach(function (n) {
      var on = n === act || (n === 'sit' && act === 'study');
      A.k[n] += ((on ? 1 : 0) - A.k[n]) * k;
    });
    var sit = A.k.sit, st = A.k.study, wv = A.k.wave, ps = A.k.push;
    var amp = act === 'run' ? 0.9 : (walk ? 0.55 : 0), s = Math.sin(A.ph) * amp;
    for (i = 0; i < 2; i++) {
      var sd = i === 0 ? 1 : -1;
      U.legs[i].rotation.x = s * sd * (1 - sit) - 1.5 * sit;
      U.knees[i].rotation.x = Math.max(0, -s * sd) * 0.6 * (1 - sit) + 1.5 * sit;
      var ar = -s * sd * 0.8 * (1 - ps);
      U.arms[i].rotation.x = ar * (1 - st) - 1.05 * st - 1.2 * ps;
      U.elbows[i].rotation.x = -0.25 * walk - 0.6 * st + (i === 1 ? Math.sin(A.t * 9) * 0.15 * st : 0) - 0.2 * ps;
      U.arms[i].rotation.z = (i === 0 ? -0.12 : 0.12);
    }
    if (wv > 0.01) {
      U.arms[1].rotation.z = 0.12 + wv * (2.5 + Math.sin(A.t * 12) * 0.35);
      U.arms[1].rotation.x *= 1 - wv; U.elbows[1].rotation.x = -0.3 * wv;
    }
    U.body.position.y = (walk ? Math.abs(Math.sin(A.ph)) * (act === 'run' ? 0.05 : 0.025) : 0) - 0.04 * sit;
    U.torso.rotation.x = 0.08 * ps + 0.1 * st;
    U.head.rotation.x = 0.3 * st + Math.sin(A.t * 1.5) * 0.03 + Math.sin(A.t * 0.9) * 0.08 * st;
    U.head.rotation.y = Math.sin(A.t * 0.6) * 0.15 * (1 - st) * (walk ? 0.2 : 1);
    U.head.position.y = 0.5 + 0.72 + Math.sin(A.t * 2) * 0.006;
    U.book.visible = st > 0.4;
    if (U.book.visible) {
      var cyc = (A.t % 4) / 4;
      U.page.rotation.z = cyc > 0.85 ? -Math.PI * (cyc - 0.85) / 0.15 : 0;
    }
    if (U.pony) U.pony.rotation.x = 0.35 + Math.sin(A.ph) * 0.15 * (walk ? 1 : 0);
    if (U.eyes) {
      A.bl = (A.bl == null ? 2 : A.bl) - dt; var b = 1;
      if (A.bl < 0) { b = 0.15; if (A.bl < -0.12) A.bl = 2 + Math.random() * 3; }
      for (i = 0; i < U.eyes.length; i++) U.eyes[i].scale.y = (st > 0.5 ? 0.7 : 1.25) * b;
    }
  }

  function label(text, opts) {
    need(); opts = opts || {};
    var c = document.createElement('canvas'), x = c.getContext('2d'), fs = 44;
    x.font = '600 ' + fs + 'px -apple-system,"PingFang TC","Noto Sans TC",sans-serif';
    var w = Math.ceil(x.measureText(text).width) + 40; c.width = w; c.height = 70;
    x.font = '600 ' + fs + 'px -apple-system,"PingFang TC","Noto Sans TC",sans-serif';
    x.fillStyle = opts.bg || 'rgba(30,26,22,.72)';
    var r = 30; x.beginPath(); x.moveTo(r, 4); x.lineTo(w - r, 4); x.arc(w - r, 35, 31, -Math.PI / 2, Math.PI / 2); x.lineTo(r, 66); x.arc(r, 35, 31, Math.PI / 2, -Math.PI / 2); x.fill();
    x.fillStyle = opts.fg || '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, 37);
    var tex = new T.CanvasTexture(c); if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    var hgt = opts.h || 0.26; sp.scale.set(hgt * w / 70, hgt, 1); sp.renderOrder = 10;
    return sp;
  }

  function preview(container, look) {
    return root.Pet3D.loadThree().then(function () {
      need();
      var ren = new T.WebGLRenderer({ antialias: true, alpha: true });
      ren.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
      ren.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
      container.appendChild(ren.domElement);
      var scene = new T.Scene(), cam = new T.PerspectiveCamera(32, 1, 0.1, 20);
      cam.position.set(0, 1.05, 3.6); cam.lookAt(0, 0.82, 0);
      scene.add(new T.HemisphereLight(0xffffff, 0xd9c2a0, 1.2));
      var dl = new T.DirectionalLight(0xffffff, 1.3); dl.position.set(2, 4, 3); scene.add(dl);
      var floor = new T.Mesh(new T.CircleGeometry(0.75, 32), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
      floor.rotation.x = -Math.PI / 2; scene.add(floor);
      var av = build(look), A = newAnim(), yaw = 0.5, drag = null, raf = 0, last = 0, alive = true, waveT = 0;
      scene.add(av);
      function size() { var w = container.clientWidth || 200, h = container.clientHeight || 220; ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      size();
      ren.domElement.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: yaw, moved: false }; });
      ren.domElement.addEventListener('pointermove', function (e) { if (drag) { var d = e.clientX - drag.x; if (Math.abs(d) > 4) drag.moved = true; yaw = drag.y + d * 0.012; } });
      root.addEventListener('pointerup', function () { if (drag && !drag.moved) waveT = 1.6; drag = null; });
      function frame(ts) {
        if (!alive) return;
        if (!container.isConnected) { api.dispose(); return; }
        var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
        if (!drag) yaw += dt * 0.35;
        if (waveT > 0) waveT -= dt;
        av.rotation.y = yaw; animate(av, A, dt, waveT > 0 ? 'wave' : 'idle');
        ren.render(scene, cam); raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      var api = {
        update: function (lk) { scene.remove(av); av = build(lk); av.rotation.y = yaw; scene.add(av); waveT = 1.2; },
        dispose: function () { alive = false; cancelAnimationFrame(raf); ren.dispose(); if (ren.forceContextLoss) ren.forceContextLoss(); if (ren.domElement.parentNode) ren.domElement.parentNode.removeChild(ren.domElement); }
      };
      return api;
    });
  }

  function previewPet(container, breedId) {
    return root.Pet3D.loadThree().then(function () {
      need();
      var ren = new T.WebGLRenderer({ antialias: true, alpha: true });
      ren.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
      ren.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
      container.appendChild(ren.domElement);
      var scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.05, 40);
      scene.add(new T.HemisphereLight(0xffffff, 0xd9c2a0, 1.2));
      var dl = new T.DirectionalLight(0xffffff, 1.3); dl.position.set(2, 4, 3); scene.add(dl);
      var floor = new T.Mesh(new T.CircleGeometry(1, 32), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
      floor.rotation.x = -Math.PI / 2; scene.add(floor);
      var pet, ps, yaw = 0.7, drag = null, raf = 0, last = 0, alive = true;
      var anim = root.PetPlay && root.PetPlay._animatePet;
      function make(id) {
        if (pet) scene.remove(pet);
        pet = I.buildPet({ breedId: id, bcs: 5, muscle: 0, wear: '', items: { harness: false, clothes: {} }, equip: {} }, 1);
        ps = { t: 0, phase: 0, leg: [0, 0, 0, 0], lean: 0, blink: 2 };
        scene.add(pet); pet.rotation.y = yaw; pet.updateMatrixWorld(true);
        var bx = new T.Box3().setFromObject(pet), sz = new T.Vector3(), ct = new T.Vector3(); bx.getSize(sz); bx.getCenter(ct);
        var r = Math.max(sz.x, sz.y, sz.z) * 0.62 + 0.05, d = r / Math.tan(15 * Math.PI / 180);
        floor.scale.setScalar(Math.max(sz.x, sz.z) * 0.6);
        cam.position.set(0, ct.y + d * 0.28, d); cam.lookAt(0, ct.y * 0.9, 0);
      }
      make(breedId);
      function size() { var w = container.clientWidth || 200, h = container.clientHeight || 200; ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      size();
      ren.domElement.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: yaw }; });
      ren.domElement.addEventListener('pointermove', function (e) { if (drag) yaw = drag.y + (e.clientX - drag.x) * 0.012; });
      root.addEventListener('pointerup', function () { drag = null; });
      function frame(ts) {
        if (!alive) return;
        if (!container.isConnected) { api.dispose(); return; }
        var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
        if (!drag) yaw += dt * 0.4;
        pet.rotation.y = yaw; if (anim) anim(pet, ps, dt, 'idle');
        ren.render(scene, cam); raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      var api = {
        update: function (id) { make(id); },
        dispose: function () { alive = false; cancelAnimationFrame(raf); ren.dispose(); if (ren.forceContextLoss) ren.forceContextLoss(); if (ren.domElement.parentNode) ren.domElement.parentNode.removeChild(ren.domElement); }
      };
      return api;
    });
  }

  function stroller() {
    need();
    var M = I.mesh, g = new T.Group();
    var frame = '#3a3f4a', fab = '#e8833a';
    g.add(M(new T.BoxGeometry(0.9, 0.42, 1.25), fab, 0, 0.62, 0, 1, 1, 1, 0.03));
    g.add(M(new T.BoxGeometry(0.8, 0.06, 1.15), '#fff3e0', 0, 0.84, 0));
    var hood = new T.Mesh(new T.SphereGeometry(0.5, 16, 8, 0, Math.PI, 0, Math.PI / 2), I.toon('#c96a2a', { side: T.DoubleSide }));
    hood.scale.set(0.95, 0.8, 0.85); hood.position.set(0, 0.83, -0.42); hood.rotation.y = Math.PI / 2; hood.rotation.z = 0; g.add(hood);
    hood.rotation.set(0, 0, 0); hood.rotation.y = Math.PI; hood.position.z = -0.45;
    [[-0.42, 0.5], [0.42, 0.5], [-0.42, -0.5], [0.42, -0.5]].forEach(function (w) {
      var wh = M(new T.TorusGeometry(0.15, 0.05, 8, 18), '#22252b', w[0] * 1.05, 0.18, w[1]); wh.rotation.y = Math.PI / 2; g.add(wh);
      g.add(M(new T.CylinderGeometry(0.02, 0.02, 0.36, 6), frame, w[0], 0.36, w[1]));
    });
    var hd = M(new T.CylinderGeometry(0.025, 0.025, 0.9, 8), frame, 0, 1.15, -0.85); hd.rotation.z = Math.PI / 2; g.add(hd);
    [-1, 1].forEach(function (sd) { var b = M(new T.CylinderGeometry(0.022, 0.022, 0.65, 8), frame, sd * 0.42, 0.95, -0.72); b.rotation.x = -0.6; g.add(b); });
    g.userData = { seatY: 0.84, handleZ: -0.85 };
    return g;
  }

  root.PetAvatar = { build: build, stroller: stroller, animate: animate, newAnim: newAnim, label: label, preview: preview, previewPet: previewPet };
})(typeof window !== 'undefined' ? window : globalThis);
