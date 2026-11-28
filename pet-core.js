/* pet-core.js  純邏輯，不碰 DOM */
(function (root) {
  'use strict';
  var DAY = 86400000;
  var CFG = {
    ageSpeed: 1, decayPerDay: 40, startHappy: 60, startBcs: 5, overUnit: 15,
    graceDays: 7, catchupDays: 7, mealGain: 10, snackGain: 3, snackMax: 5, mealMax: 3,
    playFull: 600, playMinWalk: 300, playGain: 50, firstPlayBonus: 10,
    happyRefuse: 30, capNoCare: 70, levelCosts: [100, 200, 300, 400], maxLevel: 5,
    neuterPrice: 50, dewormPrice: 10, checkupPrice: 20, snackPrice: 3, harnessPrice: 15,
    strollerPrice: { easy: 20, mid: 30, hard: 40 }, quizCooldown: DAY
  };
  var NEED = { easy: 5, mid: 15, hard: 25 };
  var DEFICIT_DAYS = { easy: 3, mid: 2, hard: 1 };
  var TIER_NAME = { easy: '易', mid: '中', hard: '難' };
  var CLOTHES = {
    normal: { name: '一般衣服', price: 10, bonus: 1 },
    trend: { name: '潮衣', price: 30, bonus: 3 },
    gold: { name: '高級華麗金光閃閃衣服', price: 80, bonus: 5 }
  };
  var BREEDS = [
    { id: 'akita', name: '大秋田', sp: 'dog', tier: 'hard' },
    { id: 'doberman', name: '杜賓', sp: 'dog', tier: 'hard' },
    { id: 'labrador', name: '拉布拉多', sp: 'dog', tier: 'hard' },
    { id: 'golden', name: '黃金獵犬', sp: 'dog', tier: 'hard' },
    { id: 'gsd', name: '德國牧羊犬', sp: 'dog', tier: 'hard' },
    { id: 'twnative', name: '台灣土狗', sp: 'dog', tier: 'mid' },
    { id: 'shiba', name: '柴犬', sp: 'dog', tier: 'mid' },
    { id: 'mixdog', name: '米克斯', sp: 'dog', tier: 'mid' },
    { id: 'twdog', name: '台灣犬（高山犬）', sp: 'dog', tier: 'mid' },
    { id: 'corgi', name: '柯基', sp: 'dog', tier: 'mid' },
    { id: 'beagle', name: '比格', sp: 'dog', tier: 'mid' },
    { id: 'maltese', name: '馬爾濟斯', sp: 'dog', tier: 'easy' },
    { id: 'pom', name: '博美', sp: 'dog', tier: 'easy' },
    { id: 'yorkie', name: '約克夏', sp: 'dog', tier: 'easy' },
    { id: 'schnauzer', name: '雪納瑞', sp: 'dog', tier: 'easy' },
    { id: 'chihuahua', name: '吉娃娃', sp: 'dog', tier: 'easy' },
    { id: 'orange', name: '橘色短毛貓（大貓）', sp: 'cat', tier: 'hard' },
    { id: 'bsh', name: '英國短毛貓', sp: 'cat', tier: 'mid' },
    { id: 'ash', name: '美國短毛貓', sp: 'cat', tier: 'mid' },
    { id: 'tabby', name: '台灣虎斑米克斯貓', sp: 'cat', tier: 'mid' },
    { id: 'persian', name: '波斯貓', sp: 'cat', tier: 'mid' },
    { id: 'calico', name: '三花貓', sp: 'cat', tier: 'mid' },
    { id: 'siamese', name: '暹羅貓', sp: 'cat', tier: 'easy' },
    { id: 'rblue', name: '俄羅斯藍貓', sp: 'cat', tier: 'easy' },
    { id: 'abys', name: '阿比西尼亞貓', sp: 'cat', tier: 'easy' },
    { id: 'singa', name: '新加坡貓', sp: 'cat', tier: 'easy' },
    { id: 'bombay', name: '孟買貓', sp: 'cat', tier: 'easy' }
  ];

  function breed(id) { for (var i = 0; i < BREEDS.length; i++) if (BREEDS[i].id === id) return BREEDS[i]; return null; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function monthKey(ts) { return dayKey(ts).slice(0, 7); }
  function nextDay(k) {
    var a = k.split('-'); var d = new Date(+a[0], +a[1] - 1, +a[2] + 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rid(len, alphabet) {
    var out = '', i, arr = new Uint32Array(len);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(arr);
    else for (i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 4294967295);
    for (i = 0; i < len; i++) out += alphabet.charAt(arr[i] % alphabet.length);
    return out;
  }
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function newState() {
    return { v: 1, owner: null, coins: 0, pets: [], quizSeen: {}, stats: { quizCorrect: 0 }, createdTs: Date.now() };
  }
  function createOwner(s, name) {
    s.owner = {
      name: name, level: 1,
      friendCode: rid(8, ALPHA),
      recoveryCode: rid(4, ALPHA) + '-' + rid(4, ALPHA) + '-' + rid(4, ALPHA)
    };
    return { ok: true, msg: '已建立飼主資料' };
  }
  function need(p) {
    var b = breed(p.breedId); var n = NEED[b.tier];
    return p.neutered ? Math.ceil(n * 0.9) : n;
  }
  function clothesBonus(p) { return p.wear && CLOTHES[p.wear] && p.items.clothes[p.wear] ? CLOTHES[p.wear].bonus : 0; }
  function ageDays(p, now) { return p.initAgeDays + Math.max(0, now - p.adoptTs) / DAY * CFG.ageSpeed; }
  function ageText(p, now) {
    var d = Math.floor(ageDays(p, now)); var y = Math.floor(d / 365); var m = Math.floor((d % 365) / 30);
    if (y > 0) return y + ' 歲 ' + m + ' 個月';
    if (m > 0) return m + ' 個月';
    return d + ' 天';
  }
  function bcsLabel(b) { return b <= 3 ? '過瘦' : (b <= 5 ? '理想' : (b <= 7 ? '過重' : '肥胖')); }
  var MUSCLE = ['普通', '精壯', '超壯'];

  function adopt(s, breedId, name, initAgeDays, now) {
    if (!s.owner) return { ok: false, msg: '請先建立飼主資料' };
    if (s.pets.length >= s.owner.level) return { ok: false, msg: '飼主等級 ' + s.owner.level + ' 最多養 ' + s.owner.level + ' 隻，請先升級' };
    var b = breed(breedId); if (!b) return { ok: false, msg: '找不到品種' };
    name = String(name || '').trim(); if (!name) return { ok: false, msg: '請幫牠取名字' };
    var mk = monthKey(now);
    var p = {
      id: 'p' + now.toString(36) + rid(3, ALPHA), name: name, breedId: breedId,
      adoptTs: now, initAgeDays: Math.max(0, Math.round(initAgeDays || 0)),
      neutered: false, bcs: 5, happy: CFG.startHappy, happyTs: now, muscle: 0,
      muscleWalks: 0, walkTotal: 0, walkCounter: 0, deficitDays: 0, excess: 0,
      dayKey: dayKey(now), fed: 0, meals: 0, snacks: 0, playedToday: false,
      care: { deworm: mk, checkup: mk },
      items: { harness: false, stroller: false, clothes: { normal: false, trend: false, gold: false } },
      wear: ''
    };
    s.pets.push(p);
    return { ok: true, msg: name + ' 成為你的家人了', pet: p };
  }

  function closeDay(p) {
    var b = breed(p.breedId), N = need(p), tier = b.tier;
    if (p.fed <= 0) { p.bcs = clamp(p.bcs - 1, 1, 9); p.deficitDays = 0; p.excess = 0; }
    else if (p.fed < N) {
      p.deficitDays++; p.excess = 0;
      if (p.deficitDays >= DEFICIT_DAYS[tier]) { p.bcs = clamp(p.bcs - 1, 1, 9); p.deficitDays = 0; }
    } else {
      p.deficitDays = 0; p.excess += p.fed - N;
      while (p.excess >= CFG.overUnit) { p.bcs = clamp(p.bcs + 1, 1, 9); p.excess -= CFG.overUnit; }
    }
    p.fed = 0; p.meals = 0; p.snacks = 0; p.playedToday = false;
  }
  function overdueCare(p, now) {
    if (new Date(now).getDate() <= CFG.graceDays) return false;
    var mk = monthKey(now);
    return p.care.deworm !== mk || p.care.checkup !== mk;
  }
  function settle(p, now) {
    var dt = now - p.happyTs;
    if (dt > 0) {
      var rate = (CFG.decayPerDay - clothesBonus(p)) / DAY;
      p.happy = Math.max(0, p.happy - rate * Math.min(dt, 14 * DAY));
      p.happyTs = now;
    }
    var today = dayKey(now), guard = 0;
    while (p.dayKey < today && guard < CFG.catchupDays) { closeDay(p); p.dayKey = nextDay(p.dayKey); guard++; }
    if (p.dayKey < today) { p.dayKey = today; p.fed = 0; p.meals = 0; p.snacks = 0; p.playedToday = false; }
    if (overdueCare(p, now)) p.happy = Math.min(p.happy, CFG.capNoCare);
  }
  function tick(s, now) { for (var i = 0; i < s.pets.length; i++) settle(s.pets[i], now); s.lastTs = now; }
  function gain(p, v, now) {
    p.happy = clamp(p.happy + v, 0, 100);
    if (overdueCare(p, now)) p.happy = Math.min(p.happy, CFG.capNoCare);
  }
  function findPet(s, id) { for (var i = 0; i < s.pets.length; i++) if (s.pets[i].id === id) return s.pets[i]; return null; }
  function spend(s, n) { if (s.coins < n) return false; s.coins -= n; return true; }

  function feed(s, id, units, now) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    units = Math.floor(units);
    if (units < 1) return { ok: false, msg: '份量至少 1 單位' };
    if (p.meals >= CFG.mealMax) return { ok: false, msg: '今天已經吃滿 3 餐了' };
    if (!spend(s, units)) return { ok: false, msg: '金幣不夠，需要 ' + units + ' 金幣' };
    p.meals++; p.fed += units; gain(p, CFG.mealGain, now);
    return { ok: true, msg: '吃了 ' + units + ' 單位，開心 +' + CFG.mealGain };
  }
  function snack(s, id, now) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    if (p.snacks >= CFG.snackMax) return { ok: false, msg: '今天零食吃太多了（上限 ' + CFG.snackMax + '）' };
    if (!spend(s, CFG.snackPrice)) return { ok: false, msg: '金幣不夠' };
    p.snacks++; p.fed += 1; gain(p, CFG.snackGain, now);
    return { ok: true, msg: '零食 +' + CFG.snackGain + ' 開心' };
  }
  function canPlay(p) {
    if (!p.items.harness) return { ok: false, msg: '外出需要胸背帶，請先到商店購買' };
    if (p.happy < CFG.happyRefuse) return { ok: false, msg: p.name + ' 太沒精神了，先餵牠吃東西吧' };
    if (p.bcs >= 8 && !p.items.stroller) return { ok: false, msg: p.name + ' 太胖走不動，需要推車' };
    return { ok: true, msg: 'OK' };
  }
  function playFinish(s, id, seconds, now) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    seconds = clamp(Math.floor(seconds), 0, CFG.playFull);
    var pts = Math.floor(CFG.playGain * seconds / CFG.playFull);
    var full = seconds >= CFG.playFull, msgs = [];
    if (full && !p.playedToday) { pts += CFG.firstPlayBonus; msgs.push('今日首次完成 +' + CFG.firstPlayBonus); }
    if (seconds >= CFG.playFull) p.playedToday = true;
    gain(p, pts, now);
    msgs.unshift('開心 +' + pts);
    if (seconds >= CFG.playMinWalk) {
      var strollerWalk = p.bcs >= 8 && p.items.stroller;
      p.walkTotal++;
      if (!strollerWalk) {
        if (p.bcs >= 6) {
          p.walkCounter++;
          if (p.walkCounter >= 3) { p.walkCounter = 0; p.bcs = clamp(p.bcs - 1, 1, 9); msgs.push('BCS -1'); }
        } else if (p.bcs >= 4) {
          p.muscleWalks++;
          var m = p.muscleWalks >= 100 ? 2 : (p.muscleWalks >= 30 ? 1 : 0);
          if (m > p.muscle) { p.muscle = m; msgs.push('體態升級：' + MUSCLE[m]); }
        }
      } else msgs.push('推車散步不計入 BCS');
    }
    return { ok: true, msg: msgs.join('，'), points: pts };
  }
  function buyItem(s, id, item) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    var tier = breed(p.breedId).tier;
    if (item === 'harness') {
      if (p.items.harness) return { ok: false, msg: '已經有了' };
      if (!spend(s, CFG.harnessPrice)) return { ok: false, msg: '金幣不夠' };
      p.items.harness = true; return { ok: true, msg: '買了胸背帶' };
    }
    if (item === 'stroller') {
      if (p.items.stroller) return { ok: false, msg: '已經有了' };
      if (!spend(s, CFG.strollerPrice[tier])) return { ok: false, msg: '金幣不夠' };
      p.items.stroller = true; return { ok: true, msg: '買了推車' };
    }
    if (CLOTHES[item]) {
      if (p.items.clothes[item]) return { ok: false, msg: '已經有了' };
      if (!spend(s, CLOTHES[item].price)) return { ok: false, msg: '金幣不夠' };
      p.items.clothes[item] = true; p.wear = item; return { ok: true, msg: '買了' + CLOTHES[item].name + '並穿上' };
    }
    return { ok: false, msg: '未知商品' };
  }
  function wear(s, id, item) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    if (item && !p.items.clothes[item]) return { ok: false, msg: '還沒買這件' };
    p.wear = item || ''; return { ok: true, msg: item ? '已穿上' : '已脫下' };
  }
  function care(s, id, kind, now) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    var mk = monthKey(now);
    if (kind === 'neuter') {
      if (p.neutered) return { ok: false, msg: '已經結紮過了' };
      if (!spend(s, CFG.neuterPrice)) return { ok: false, msg: '金幣不夠' };
      p.neutered = true; return { ok: true, msg: '結紮完成，食量需求 -10%' };
    }
    if (kind !== 'deworm' && kind !== 'checkup') return { ok: false, msg: '未知項目' };
    if (p.care[kind] === mk) return { ok: false, msg: '本月已完成' };
    var price = kind === 'deworm' ? CFG.dewormPrice : CFG.checkupPrice;
    if (!spend(s, price)) return { ok: false, msg: '金幣不夠' };
    p.care[kind] = mk; return { ok: true, msg: kind === 'deworm' ? '驅蟲完成' : '健康檢查完成' };
  }
  function upgrade(s) {
    if (!s.owner) return { ok: false, msg: '請先建立飼主資料' };
    if (s.owner.level >= CFG.maxLevel) return { ok: false, msg: '已經是最高等級' };
    var cost = CFG.levelCosts[s.owner.level - 1];
    if (!spend(s, cost)) return { ok: false, msg: '需要 ' + cost + ' 金幣' };
    s.owner.level++; return { ok: true, msg: '升到等級 ' + s.owner.level + '，最多可養 ' + s.owner.level + ' 隻' };
  }
  function awardQuiz(s, qid, now) {
    if (!qid) return 0;
    var last = s.quizSeen[qid];
    if (last && now - last < CFG.quizCooldown) return 0;
    s.quizSeen[qid] = now; s.coins++; s.stats.quizCorrect++;
    var keys = Object.keys(s.quizSeen);
    if (keys.length > 3000) for (var i = 0; i < keys.length; i++) if (now - s.quizSeen[keys[i]] >= CFG.quizCooldown) delete s.quizSeen[keys[i]];
    return 1;
  }

  root.PetCore = {
    CFG: CFG, NEED: NEED, TIER_NAME: TIER_NAME, CLOTHES: CLOTHES, BREEDS: BREEDS, MUSCLE: MUSCLE,
    breed: breed, dayKey: dayKey, monthKey: monthKey, newState: newState, createOwner: createOwner,
    need: need, ageText: ageText, ageDays: ageDays, bcsLabel: bcsLabel, adopt: adopt, tick: tick,
    feed: feed, snack: snack, canPlay: canPlay, playFinish: playFinish, buyItem: buyItem, wear: wear,
    care: care, upgrade: upgrade, awardQuiz: awardQuiz, findPet: findPet, overdueCare: overdueCare
  };
})(typeof window !== 'undefined' ? window : globalThis);
