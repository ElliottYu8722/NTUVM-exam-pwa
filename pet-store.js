/* pet-store.js  本機存檔、備份匯出入 */
(function (root) {
  'use strict';
  var KEY = 'vetpet_v1';
  var KEY_BAK = 'vetpet_v1_bak';
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || s.v !== 1 || !Array.isArray(s.pets)) return null;
      return s;
    } catch (e) { return null; }
  }
  function save(s) {
    try {
      var prev = localStorage.getItem(KEY);
      if (prev) localStorage.setItem(KEY_BAK, prev);
      localStorage.setItem(KEY, JSON.stringify(s));
      return true;
    } catch (e) { return false; }
  }
  function exportJson(s) {
    var blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    var d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = 'pet-backup-' + d.getFullYear() + (d.getMonth() + 1) + d.getDate() + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function parseBackup(text) {
    try {
      var s = JSON.parse(text);
      if (!s || s.v !== 1 || !Array.isArray(s.pets) || !s.owner) return null;
      if (typeof s.coins !== 'number') return null;
      if (!s.quizSeen) s.quizSeen = {};
      if (!s.stats) s.stats = { quizCorrect: 0 };
      return s;
    } catch (e) { return null; }
  }
  function requestPersist() {
    if (navigator.storage && navigator.storage.persist) {
      return navigator.storage.persist().catch(function () { return false; });
    }
    return Promise.resolve(false);
  }
  root.PetStore = { load: load, save: save, exportJson: exportJson, parseBackup: parseBackup, requestPersist: requestPersist };
})(window);
