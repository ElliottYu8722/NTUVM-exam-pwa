/* pet-core.js  純邏輯，不碰 DOM */
(function (root) {
  'use strict';
  var DAY = 86400000;
  var CFG = {
    ageSpeed: 1, decayPerDay: 40, startHappy: 60, startBcs: 5, overUnit: 10,
    graceDays: 7, catchupDays: 7, mealGain: 10, snackGain: 3, snackMax: 5, mealMax: 3,
    playFull: 600, playMinWalk: 300, playGain: 50, firstPlayBonus: 10,
    happyRefuse: 30, capNoCare: 70, levelCosts: [100, 200, 300, 400], maxLevel: 5,
    neuterPrice: 50, dewormPrice: 10, checkupPrice: 20, snackPrice: 1, harnessPrice: 15,
    strollerPrice: 20, dailyNeed: 9, deficitDays: 2, cannedPrice: 10, cannedGain: 20, cannedUnits: 3,
    toyGain: 8, scratchGain: 5, trickGain: 2, trickMax: 6, nailGain: 5, nailDays: 7
  };
  var MEALS = [
    { id: 'small', name: '少量', units: 1, price: 1 },
    { id: 'meal', name: '一餐', units: 3, price: 3 },
    { id: 'big', name: '大份', units: 5, price: 5 }
  ];
  var SNACKS = {
    dog: [{ id: 'dbiscuit', name: '狗餅乾' }, { id: 'dental', name: '潔牙骨' }, { id: 'bone', name: '狗骨頭' }, { id: 'jerky', name: '肉乾' }],
    cat: [{ id: 'cbiscuit', name: '貓餅乾' }, { id: 'catgrass', name: '貓草' }, { id: 'puree', name: '貓肉泥' }, { id: 'cdental', name: '貓潔牙骨' }],
    bird: [{ id: 'sunseed', name: '葵花籽' }, { id: 'mineral', name: '鳥類礦物棒' }, { id: 'millet', name: '小米穗' }, { id: 'fruit', name: '蘋果丁' }],
    turtle: [{ id: 'shrimp', name: '乾燥蝦乾' }, { id: 'leaf', name: '地瓜葉' }, { id: 'worm', name: '蚯蚓' }, { id: 'mealworm', name: '麵包蟲' }],
    gecko: [{ id: 'mealworm', name: '麵包蟲' }, { id: 'dubia', name: '杜比亞蟑螂' }, { id: 'superworm', name: '大麥蟲' }, { id: 'silkworm', name: '蠶寶寶' }]
  };
  var FOOD = {
    dog: { meal: '狗飼料', canned: '高級罐頭' },
    cat: { meal: '貓飼料', canned: '高級罐頭' },
    bird: { meal: '滋養丸', canned: '新鮮蔬果盤' },
    turtle: { meal: '烏龜浮水飼料', canned: '新鮮小魚蝦' },
    gecko: { meal: '蟋蟀（灑鈣粉）', canned: '蜂蠟蟲大餐' }
  };
  var GEAR = {
    dog: { base: { name: '初級項圈', desc: '一開始就有，可以直接出門散步' },
      harness: { name: '胸背帶', price: 15, desc: '裝備後可以出門散步' },
      stroller: { name: '外出推車', price: 20, ride: true, model: 'stroller', desc: '裝備後用推車出門，BCS 8 以上也能出門，坐推車不計入減重' } },
    bird: { base: { name: '小鳥籠', ride: true, model: 'cageS', desc: '一開始就有，在家住這裡，也能提著出門' },
      harness: { name: '站棍', price: 10, desc: '出門站在站棍上跟著你，可以下地跳跳走走' },
      stroller: { name: '高級大鳥籠', price: 40, ride: true, model: 'cageL', desc: '寬敞的大籠子，在家和外出都更舒服' } },
    turtle: { base: { name: '塑膠箱輪子推車', ride: true, model: 'tub', desc: '一開始就有，在家住小塑膠箱，外出用有輪子的箱子推車' },
      harness: null,
      stroller: { name: '不鏽鋼玻璃高級推車', price: 40, ride: true, model: 'steel', desc: '不鏽鋼框配玻璃的高級推車' } },
    gecko: { base: { name: '小外出箱', ride: true, model: 'box', desc: '一開始就有，可以裝著出門' },
      harness: null,
      stroller: { name: '小生態箱', price: 30, ride: true, model: 'terra', desc: '有造景和躲避屋的小生態箱，也能帶出門' } }
  };
  GEAR.cat = GEAR.dog;
  var GO = {
    dog: ['下推車', '上推車'], cat: ['下推車', '上推車'], bird: ['出籠子', '回籠子'], turtle: ['下推車', '回推車'], gecko: ['出箱子', '回箱子']
  };
  var TRICK_SP = { shake: ['dog', 'cat', 'bird'], down: ['dog', 'cat'], spin: ['dog', 'cat', 'bird'], grin: ['dog', 'cat'], nails: ['dog', 'cat', 'bird'] };
  var TOYS = {
    toy: { name: '藏食玩具', price: 15, sp: ['dog', 'cat', 'bird'], desc: '把飼料藏在裡面，每天玩一次開心 +' + 8 },
    scratcher: { name: '貓抓板', price: 15, sp: ['cat'], desc: '每天抓一次開心 +' + 5 },
    uvb: { name: 'UVB 曬背燈', price: 15, sp: ['turtle', 'gecko'], desc: '每天曬一次開心 +' + 5 + '，爬蟲類需要 UVB 幫助鈣質代謝' }
  };
  var TRICKS = {
    shake: { name: '握手', price: 20 },
    down: { name: '趴下', price: 20 },
    spin: { name: '轉圈', price: 30 },
    grin: { name: '露齒笑', price: 30 },
    nails: { name: '乖乖剪指甲', price: 20 }
  };
  var ACH = [
    { id: 'meals', name: '一般餐點', steps: [10, 50, 100], reward: [5, 10, 20] },
    { id: 'canned', name: '高級罐頭', steps: [5, 20, 50], reward: [5, 10, 20] },
    { id: 'snacks', name: '零食', steps: [10, 50, 100], reward: [3, 6, 12] },
    { id: 'walks', name: '出去玩', steps: [5, 20, 50], reward: [5, 10, 20] }
  ];
  var LOOK = {
    hair: ['短髮', '刺蝟頭', '中分', '馬尾', '長髮', '丸子頭', '鮑伯頭', '捲髮'],
    top: ['T 恤', '帽 T', '襯衫', '連身裙', '實驗袍', '條紋衫'],
    bottom: ['長褲', '短褲', '裙子', '工作褲'],
    hairCol: ['#2b2220', '#5a3a26', '#a0662e', '#e2b65a', '#c9c9cf', '#c2475b', '#3e5fae'],
    cloth: ['#ffffff', '#2b2b33', '#e8833a', '#4aa3df', '#4caf7a', '#f07aa0', '#f6c343', '#8d6bd1', '#c0392b', '#7d8da0'],
    skin: ['#ffe0c7', '#f5cba7', '#e0ac85', '#b9825a', '#8a5a3c']
  };
  function defaultLook(g) {
    return g === 'f'
      ? { g: 'f', skin: 0, hair: 4, hairCol: 1, top: 0, topCol: 5, bottom: 2, botCol: 1 }
      : { g: 'm', skin: 0, hair: 0, hairCol: 0, top: 0, topCol: 3, bottom: 0, botCol: 1 };
  }
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
    { id: 'samoyed', name: '薩摩耶', sp: 'dog', tier: 'hard' },
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
    { id: 'bombay', name: '孟買貓', sp: 'cat', tier: 'easy' },
    { id: 'munchkin', name: '黃色曼赤肯', sp: 'cat', tier: 'easy' },
    { id: 'cockatoo', name: '巴丹鸚鵡', sp: 'bird', tier: 'hard' },
    { id: 'grey', name: '灰鸚鵡', sp: 'bird', tier: 'hard' },
    { id: 'myna', name: '八哥', sp: 'bird', tier: 'mid' },
    { id: 'monk', name: '和尚鸚鵡', sp: 'bird', tier: 'mid' },
    { id: 'gcaique', name: '金頭凱克', sp: 'bird', tier: 'mid' },
    { id: 'bcaique', name: '黑頭凱克', sp: 'bird', tier: 'mid' },
    { id: 'lory', name: '吸蜜鸚鵡', sp: 'bird', tier: 'mid' },
    { id: 'budgie', name: '虎皮鸚鵡', sp: 'bird', tier: 'easy' },
    { id: 'tielk', name: '玄鳳鸚鵡・黑', sp: 'bird', tier: 'easy' },
    { id: 'tielw', name: '玄鳳鸚鵡・白', sp: 'bird', tier: 'easy' },
    { id: 'tiely', name: '玄鳳鸚鵡・黃', sp: 'bird', tier: 'easy' },
    { id: 'slider', name: '巴西龜', sp: 'turtle', tier: 'mid' },
    { id: 'leo', name: '守宮（豹紋守宮）', sp: 'gecko', tier: 'easy' }
  ];
  var SPECIES = [['dog', '狗'], ['cat', '貓'], ['bird', '鳥'], ['turtle', '烏龜'], ['gecko', '守宮']];

  function breed(id) { for (var i = 0; i < BREEDS.length; i++) if (BREEDS[i].id === id) return BREEDS[i]; return null; }
  function spOf(p) { var b = breed(p && p.breedId); return b ? b.sp : 'dog'; }
  function food(p) { return FOOD[spOf(p)] || FOOD.dog; }
  function gearSet(p) { return GEAR[spOf(p)] || GEAR.dog; }
  function gearOf(p) {
    var G = gearSet(p), it = p.items || {}, eq = p.equip || {};
    if (G.stroller && it.stroller && eq.stroller) return { key: 'stroller', name: G.stroller.name, ride: !!G.stroller.ride, model: G.stroller.model };
    if (G.harness && it.harness && eq.harness) return { key: 'harness', name: G.harness.name, ride: false, model: '' };
    return { key: 'base', name: G.base.name, ride: !!G.base.ride, model: G.base.model || '' };
  }
  function goText(p) { return GO[spOf(p)] || GO.dog; }
  function trickOk(p, k) { return (TRICK_SP[k] || []).indexOf(spOf(p)) >= 0; }
  function mammal(p) { var sp = spOf(p); return sp === 'dog' || sp === 'cat'; }
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
    return { v: 1, owner: null, coins: 0, pets: [], quizSeen: {}, stats: newStats(), ach: {}, friends: [], createdTs: Date.now() };
  }
  function newStats() { return { quizCorrect: 0, meals: 0, canned: 0, snacks: 0, walks: 0 }; }
  function migratePet(p) {
    if (!p.items) p.items = {};
    if (!p.items.clothes) p.items.clothes = { normal: false, trend: false, gold: false };
    if (!p.equip) p.equip = { harness: !!p.items.harness, stroller: false };
    if (p.items.toy == null) p.items.toy = false;
    if (p.items.scratcher == null) p.items.scratcher = false;
    if (p.items.uvb == null) p.items.uvb = false;
    if (!p.tricks) p.tricks = {};
    if (!p.daily) p.daily = {};
    if (p.nailTs == null) p.nailTs = p.adoptTs || Date.now();
    if (p.tricksToday == null) p.tricksToday = 0;
    return p;
  }
  function migrate(s) {
    if (!s) return s;
    if (!s.stats) s.stats = newStats();
    var d = newStats(); for (var k in d) if (typeof s.stats[k] !== 'number') s.stats[k] = d[k];
    if (!s.ach) s.ach = {};
    if (!Array.isArray(s.friends)) s.friends = [];
    if (!s.quizSeen) s.quizSeen = {};
    if (s.owner && !s.owner.look) s.owner.look = defaultLook('m');
    (s.pets || []).forEach(migratePet);
    return s;
  }
  function createOwner(s, name) {
    s.owner = {
      name: name, level: 1, look: defaultLook('m'),
      friendCode: rid(8, ALPHA),
      recoveryCode: rid(4, ALPHA) + '-' + rid(4, ALPHA) + '-' + rid(4, ALPHA)
    };
    return { ok: true, msg: '已建立飼主資料' };
  }
  function need(p) { return p.neutered ? CFG.dailyNeed - 1 : CFG.dailyNeed; }
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
      items: { harness: false, stroller: false, toy: false, scratcher: false, clothes: { normal: false, trend: false, gold: false } },
      equip: { harness: false, stroller: false }, tricks: {}, daily: {}, nailTs: now, tricksToday: 0,
      wear: ''
    };
    s.pets.push(p);
    return { ok: true, msg: name + ' 成為你的家人了', pet: p };
  }

  function closeDay(p) {
    var N = need(p);
    if (p.fed <= 0) { p.bcs = clamp(p.bcs - 1, 1, 9); p.deficitDays = 0; p.excess = 0; }
    else if (p.fed < N) {
      p.deficitDays++; p.excess = 0;
      if (p.deficitDays >= CFG.deficitDays) { p.bcs = clamp(p.bcs - 1, 1, 9); p.deficitDays = 0; }
    } else {
      p.deficitDays = 0; p.excess += p.fed - N;
      if (p.excess >= CFG.overUnit) { p.bcs = clamp(p.bcs + 1, 1, 9); p.excess -= CFG.overUnit; }
      p.excess = Math.min(p.excess, CFG.overUnit * 3);
    }
    p.fed = 0; p.meals = 0; p.snacks = 0; p.playedToday = false; p.daily = {}; p.tricksToday = 0;
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
    if (p.dayKey < today) { p.dayKey = today; p.fed = 0; p.meals = 0; p.snacks = 0; p.playedToday = false; p.daily = {}; p.tricksToday = 0; }
    if (overdueCare(p, now)) p.happy = Math.min(p.happy, CFG.capNoCare);
  }
  function tick(s, now) { migrate(s); for (var i = 0; i < s.pets.length; i++) settle(s.pets[i], now); s.lastTs = now; }
  function bump(s, key) {
    s.stats[key] = (s.stats[key] || 0) + 1;
    var out = [];
    ACH.forEach(function (a) {
      if (a.id !== key) return;
      var got = s.ach[a.id] || 0;
      while (got < a.steps.length && s.stats[key] >= a.steps[got]) {
        s.coins += a.reward[got]; out.push(a.name + ' ' + a.steps[got] + ' 次成就 +' + a.reward[got] + ' 金幣'); got++;
      }
      s.ach[a.id] = got;
    });
    return out.length ? '，' + out.join('，') : '';
  }
  function gain(p, v, now) {
    p.happy = clamp(p.happy + v, 0, 100);
    if (overdueCare(p, now)) p.happy = Math.min(p.happy, CFG.capNoCare);
  }
  function findPet(s, id) { for (var i = 0; i < s.pets.length; i++) if (s.pets[i].id === id) return s.pets[i]; return null; }
  function spend(s, n) { if (s.coins < n) return false; s.coins -= n; return true; }

  function mealById(id) { for (var i = 0; i < MEALS.length; i++) if (MEALS[i].id === id) return MEALS[i]; return null; }
  function feed(s, id, kind, now) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    var canned = kind === 'canned', F = food(p), m = canned ? { name: F.canned, units: CFG.cannedUnits, price: CFG.cannedPrice } : mealById(kind);
    if (!m) return { ok: false, msg: '未知餐點' };
    if (!spend(s, m.price)) return { ok: false, msg: '金幣不夠，需要 ' + m.price + ' 金幣' };
    var g = canned ? CFG.cannedGain : CFG.mealGain;
    p.meals++; p.fed += m.units; gain(p, g, now);
    var extra = bump(s, canned ? 'canned' : 'meals');
    return { ok: true, msg: '吃了' + (canned ? F.canned : m.name + F.meal) + '，開心 +' + g + extra, food: canned ? 'canned' : 'kibble' };
  }
  function snackList(p) { return SNACKS[spOf(p)] || SNACKS.dog; }
  function snack(s, id, now, snackId) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    var list = snackList(p), it = list[0];
    for (var i = 0; i < list.length; i++) if (list[i].id === snackId) it = list[i];
    if (!spend(s, CFG.snackPrice)) return { ok: false, msg: '金幣不夠' };
    p.snacks++; p.fed += 1; gain(p, CFG.snackGain, now);
    return { ok: true, msg: it.name + '，開心 +' + CFG.snackGain + bump(s, 'snacks'), snack: it.id };
  }
  function canPlay(p) {
    var gr = gearOf(p);
    if (p.happy < CFG.happyRefuse) return { ok: false, msg: p.name + ' 太沒精神了，先餵牠吃東西吧' };
    if (p.bcs >= 8 && !gr.ride) return { ok: false, msg: p.name + ' 太胖走不動，需要裝備推車' };
    return { ok: true, msg: 'OK', stroller: gr.ride, model: gr.model, gear: gr.name, go: goText(p), sp: spOf(p) };
  }
  function playFinish(s, id, seconds, now, walkSec) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    seconds = clamp(Math.floor(seconds), 0, CFG.playFull);
    var pts = Math.floor(CFG.playGain * seconds / CFG.playFull);
    var full = seconds >= CFG.playFull, msgs = [];
    if (full && !p.playedToday) { pts += CFG.firstPlayBonus; msgs.push('今日首次完成 +' + CFG.firstPlayBonus); }
    if (seconds >= CFG.playFull) p.playedToday = true;
    gain(p, pts, now);
    msgs.unshift('開心 +' + pts);
    if (seconds >= CFG.playMinWalk) {
      var strollerWalk = walkSec == null ? gearOf(p).ride : walkSec < CFG.playMinWalk;
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
      } else msgs.push('待在' + (gearOf(p).ride ? gearOf(p).name : '推車') + '裡的時間不計入 BCS');
    }
    var ex = seconds >= 60 ? bump(s, 'walks') : '';
    return { ok: true, msg: msgs.join('，') + ex, points: pts };
  }
  function buyItem(s, id, item) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    if (item === 'harness' || item === 'stroller') {
      var G = gearSet(p)[item];
      if (!G) return { ok: false, msg: '這個寵物用不到' };
      if (p.items[item]) return { ok: false, msg: '已經有了' };
      if (!spend(s, G.price)) return { ok: false, msg: '金幣不夠' };
      p.items[item] = true; p.equip[item] = true; p.equip[item === 'harness' ? 'stroller' : 'harness'] = false;
      return { ok: true, msg: '買了' + G.name + '，已裝備' };
    }
    if (TOYS[item]) {
      if (TOYS[item].sp.indexOf(spOf(p)) < 0) return { ok: false, msg: '這個寵物用不到' };
      if (p.items[item]) return { ok: false, msg: '已經有了' };
      if (!spend(s, TOYS[item].price)) return { ok: false, msg: '金幣不夠' };
      p.items[item] = true; return { ok: true, msg: '買了' + TOYS[item].name + '，放在房間裡了' };
    }
    if (CLOTHES[item]) {
      if (!mammal(p)) return { ok: false, msg: '這個寵物不適合穿衣服' };
      if (p.items.clothes[item]) return { ok: false, msg: '已經有了' };
      if (!spend(s, CLOTHES[item].price)) return { ok: false, msg: '金幣不夠' };
      p.items.clothes[item] = true; p.wear = item; return { ok: true, msg: '買了' + CLOTHES[item].name + '並穿上' };
    }
    return { ok: false, msg: '未知商品' };
  }
  function equip(s, id, item, on) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    if (!p.items[item]) return { ok: false, msg: '還沒買' };
    p.equip[item] = !!on;
    if (on) p.equip[item === 'harness' ? 'stroller' : 'harness'] = false;
    var G = gearSet(p)[item], nm = G ? G.name : '';
    return { ok: true, msg: on ? '已裝備' + nm : '已卸下' + nm };
  }
  function useToy(s, id, item, now) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    if (!p.items[item]) return { ok: false, msg: '還沒買' };
    if (p.daily[item]) return { ok: false, msg: '今天玩過了，明天再來' };
    p.daily[item] = 1;
    var g = item === 'toy' ? CFG.toyGain : CFG.scratchGain; gain(p, g, now);
    if (item === 'uvb') return { ok: true, msg: '曬了 UVB 燈，開心 +' + g };
    return { ok: true, msg: TOYS[item].name + '，開心 +' + g };
  }
  function learn(s, id, trick) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    var t = TRICKS[trick]; if (!t) return { ok: false, msg: '未知技能' };
    if (!trickOk(p, trick)) return { ok: false, msg: '這個寵物學不了這招' };
    if (p.tricks[trick]) return { ok: false, msg: '已經學會了' };
    if (!spend(s, t.price)) return { ok: false, msg: '金幣不夠，需要 ' + t.price + ' 金幣' };
    p.tricks[trick] = 1; return { ok: true, msg: p.name + ' 學會「' + t.name + '」了' };
  }
  function perform(s, id, trick, now) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    if (!p.tricks[trick]) return { ok: false, msg: '還沒學會' };
    var g = 0;
    if (p.tricksToday < CFG.trickMax) { p.tricksToday++; g = CFG.trickGain; gain(p, g, now); }
    return { ok: true, msg: TRICKS[trick].name + (g ? '，開心 +' + g : '') };
  }
  function nailDue(p, now) { return now - (p.nailTs || 0) >= CFG.nailDays * DAY; }
  function trimNails(s, id, now) {
    var p = findPet(s, id); if (!p) return { ok: false, msg: '找不到寵物' };
    if (!p.tricks.nails) return { ok: false, msg: '先學會「乖乖剪指甲」' };
    var due = nailDue(p, now); p.nailTs = now;
    if (due) gain(p, CFG.nailGain, now);
    return { ok: true, msg: due ? '剪好指甲了，開心 +' + CFG.nailGain : '指甲修好了（' + CFG.nailDays + ' 天後再剪會加開心）' };
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
      if (!mammal(p)) return { ok: false, msg: '這個寵物不需要結紮' };
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
  function awardQuiz(s, qid, now, sid) {
    if (!qid) return 0;
    var key = (sid || 'x') + '|' + qid;
    if (s.quizSeen[key]) return 0;
    s.quizSeen[key] = now; s.coins++; s.stats.quizCorrect++;
    var keys = Object.keys(s.quizSeen);
    if (keys.length > 1500) for (var i = 0; i < keys.length; i++) if (now - s.quizSeen[keys[i]] >= 2 * DAY) delete s.quizSeen[keys[i]];
    return 1;
  }

  root.PetCore = {
    CFG: CFG, CLOTHES: CLOTHES, BREEDS: BREEDS, MUSCLE: MUSCLE, MEALS: MEALS, SNACKS: SNACKS, TOYS: TOYS,
    TRICKS: TRICKS, ACH: ACH, FOOD: FOOD, GEAR: GEAR, SPECIES: SPECIES, spOf: spOf, food: food, gearSet: gearSet, gearOf: gearOf,
    goText: goText, trickOk: trickOk, mammal: mammal, LOOK: LOOK, defaultLook: defaultLook, migrate: migrate, snackList: snackList,
    equip: equip, useToy: useToy, learn: learn, perform: perform, trimNails: trimNails, nailDue: nailDue, rid: rid,
    breed: breed, dayKey: dayKey, monthKey: monthKey, newState: newState, createOwner: createOwner,
    need: need, ageText: ageText, ageDays: ageDays, bcsLabel: bcsLabel, adopt: adopt, tick: tick,
    feed: feed, snack: snack, canPlay: canPlay, playFinish: playFinish, buyItem: buyItem, wear: wear,
    care: care, upgrade: upgrade, awardQuiz: awardQuiz, findPet: findPet, overdueCare: overdueCare
  };
})(typeof window !== 'undefined' ? window : globalThis);
