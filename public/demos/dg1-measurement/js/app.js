/*
 * DG-1 示範量測機 ── 畫面層（只在瀏覽器執行）
 * 一切狀態交給 DG1Engine，這裡只負責把推導結果畫出來，以及把點擊轉成引擎動作。
 */
(function () {
  'use strict';
  var E = window.DG1Engine;
  var I = window.DG1I18N;

  // ── 執行期狀態（畫面層自有） ──────────────────────────────────
  var state = E.createState();
  var lang = 'zh';
  var selected = null;                 // 被點選的部件 id
  var history = {};                    // 每個溫區的趨勢緩衝
  E.TEMP_IDS.forEach(function (id) { history[id] = []; });
  var HIST_LEN = 48;

  function t(key, vars) { return I.t(key, lang, vars); }

  // 機台圖座標（門型框架 + 輸送帶，刻意不照任何真實機台外觀）
  var LAYOUT = {
    sensors: { S1: 120, S2: 210, S3: 300, S4: 390 }, // 掛在橫梁上的 x
    temps: { T1: 120, T2: 210, T3: 300, T4: 390 },   // 輸送帶上的 x
    boxes: { PSU1: 18, PC1: 116, PC2: 214, PLC1: 312, PSU2: 410 } // 底座電箱 x
  };

  // ── 建立骨架（只做一次） ──────────────────────────────────────
  var root = document.getElementById('app');
  root.innerHTML =
    '<div class="wrap">' +
      '<header class="top">' +
        '<div><h1 id="title"></h1><div class="sub" id="subtitle"></div></div>' +
        '<div class="spacer"></div>' +
        '<span class="sim-badge" id="sim"></span>' +
        '<button class="btn small" id="lang"></button>' +
      '</header>' +
      '<div class="conclusion" id="conclusion">' +
        '<span class="dot"></span>' +
        '<div><div class="headline" id="c-headline"></div><div class="reason" id="c-reason"></div></div>' +
      '</div>' +
      '<div class="grid">' +
        '<div class="col">' +
          '<div class="card machine-wrap">' +
            '<h2 id="h-machine"></h2>' +
            '<div id="machine"></div>' +
            '<div class="detail" id="detail"></div>' +
            '<div class="legend" id="legend"></div>' +
          '</div>' +
          '<div class="card">' +
            '<h2 id="h-flow"></h2>' +
            '<div class="flow" id="flow"></div>' +
          '</div>' +
        '</div>' +
        '<div class="col">' +
          '<div class="card">' +
            '<h2 id="h-pending"></h2>' +
            '<div class="pending-list" id="pending"></div>' +
          '</div>' +
          '<div class="card">' +
            '<h2 id="h-temp"></h2>' +
            '<div class="temps" id="temps"></div>' +
          '</div>' +
          '<div class="card">' +
            '<h2 id="h-faults"></h2>' +
            '<div class="faults" id="faults"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<footer class="bottom">' +
        '<span class="tag" id="f-tag"></span>' +
        '<span class="spacer"></span>' +
        '<a id="f-contact" href="#"></a>' +
      '</footer>' +
    '</div>';

  // ── 互動 ──────────────────────────────────────────────────────
  document.getElementById('lang').addEventListener('click', function () {
    lang = lang === 'zh' ? 'en' : 'zh';
    render();
  });

  // 機台圖點擊（事件委派）
  document.getElementById('machine').addEventListener('click', function (e) {
    var g = e.target.closest ? e.target.closest('[data-comp]') : null;
    if (g) { selected = g.getAttribute('data-comp'); render(); }
  });

  function faultActive(id) {
    if (id === 'service-down') return state.faults.serviceDown;
    if (id === 'sensor-offline') return state.faults.sensorOffline;
    if (id === 'power-overload') return state.faults.powerOverload;
    if (id === 'temp-drift') return state.temps[E.constants.DRIFT_ZONE].offset > E.constants.TEMP_BAND;
    return false;
  }

  function toggleFault(id) {
    state = faultActive(id) ? E.repair(state, id) : E.injectFault(state, id);
    render();
  }

  // ── 繪製各區塊 ────────────────────────────────────────────────
  var STATUS_CLASS = { ok: 's-ok', warn: 's-warn', fault: 's-fault', offline: 's-offline' };

  function renderChrome() {
    document.getElementById('title').textContent = t('app.title');
    document.getElementById('subtitle').textContent = t('app.subtitle');
    document.getElementById('sim').textContent = t('app.sim');
    document.getElementById('lang').textContent = t('app.langBtn');
    document.getElementById('h-machine').textContent = t('machine.heading');
    document.getElementById('h-flow').textContent = t('flow.heading');
    document.getElementById('h-pending').textContent = t('pending.heading');
    document.getElementById('h-temp').textContent = t('temp.heading');
    document.getElementById('h-faults').textContent = t('faults.heading');
    document.getElementById('f-tag').textContent = t('footer.tagline');
    var contact = document.getElementById('f-contact');
    contact.textContent = t('footer.contact');
    contact.href = 'https://' + t('footer.contact');
  }

  function renderConclusion(c) {
    var el = document.getElementById('conclusion');
    el.className = 'conclusion level-' + c.level;
    var head = c.level === 'ready' ? t('conclusion.ready')
      : c.level === 'measuring' ? t('conclusion.measuring')
      : t('conclusion.notready');
    document.getElementById('c-headline').textContent = head;
    var reason = '';
    if (c.reasonKey) reason = t(c.reasonKey);
    if (c.level === 'wait') {
      var secs = Math.ceil(c.waitSeconds);
      reason = t('reason.thermal') + ' — ' + t('conclusion.wait', { s: secs });
    }
    document.getElementById('c-reason').textContent = reason;
  }

  function esc(s) { return String(s).replace(/[&<>]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]; }); }

  function renderMachine(comps) {
    function cls(id) { return 'part ' + STATUS_CLASS[comps[id].status] + (selected === id ? ' sel' : ''); }
    var svg = '<svg class="machine" viewBox="0 0 520 320" role="img" aria-label="DG-1">';
    // 門型框架
    svg += '<path class="frame" d="M70 210 L70 50 L450 50 L450 210" />';
    // 輸送帶
    svg += '<rect class="belt" x="40" y="185" width="440" height="34" rx="4" />';
    for (var bx = 70; bx < 480; bx += 34) svg += '<line class="belt-mark" x1="' + bx + '" y1="185" x2="' + bx + '" y2="219" />';
    // 工件
    svg += '<rect class="workpiece" x="236" y="170" width="52" height="16" rx="3" />';
    // 感測頭 + 雷射（量測頭正常時才畫雷射光幕）
    E.SENSOR_IDS.forEach(function (id) {
      var x = LAYOUT.sensors[id];
      if (comps[id].status === 'ok') svg += '<line class="laser" x1="' + x + '" y1="78" x2="' + x + '" y2="186" />';
      svg += '<g class="' + cls(id) + '" data-comp="' + id + '">' +
        '<circle cx="' + x + '" cy="66" r="11" />' +
        '<text class="part-label" x="' + x + '" y="44" text-anchor="middle">' + id + '</text></g>';
    });
    // 溫區（輸送帶上）
    E.TEMP_IDS.forEach(function (id) {
      var x = LAYOUT.temps[id];
      svg += '<g class="' + cls(id) + '" data-comp="' + id + '">' +
        '<rect x="' + (x - 11) + '" y="225" width="22" height="16" rx="3" />' +
        '<text class="part-label" x="' + x + '" y="255" text-anchor="middle">' + id + '</text></g>';
    });
    // 底座電箱
    Object.keys(LAYOUT.boxes).forEach(function (id) {
      var x = LAYOUT.boxes[id];
      svg += '<g class="' + cls(id) + '" data-comp="' + id + '">' +
        '<rect x="' + x + '" y="275" width="86" height="32" rx="5" />' +
        '<text class="part-label" x="' + (x + 43) + '" y="295" text-anchor="middle" style="fill:#07131f;font-weight:700">' + id + '</text></g>';
    });
    svg += '</svg>';
    document.getElementById('machine').innerHTML = svg;

    // 部件詳情
    var detail = document.getElementById('detail');
    if (!selected || !comps[selected]) {
      detail.innerHTML = '<span class="muted">' + esc(t('machine.hint')) + '</span>';
    } else {
      var c = comps[selected];
      var statusTxt = t('status.' + c.status);
      var extra = '';
      if (c.kind === 'temp' && typeof c.value === 'number') {
        extra = ' <span class="muted">' + c.value.toFixed(2) + ' ' + t('temp.unit') + '</span>';
      }
      detail.innerHTML = '<span class="name">' + esc(t('comp.' + selected)) + '</span>' +
        '<span class="chip ' + STATUS_CLASS[c.status] + '" style="color:#07131f">' + esc(statusTxt) + '</span>' + extra;
    }

    // 圖例
    document.getElementById('legend').innerHTML =
      ['ok', 'warn', 'fault', 'offline'].map(function (k) {
        var color = { ok: 'var(--ok)', warn: 'var(--warn)', fault: 'var(--fault)', offline: 'var(--offline)' }[k];
        return '<span><i style="background:' + color + '"></i>' + esc(t('status.' + k)) + '</span>';
      }).join('');
  }

  function renderFlow(pipe) {
    var html = '';
    pipe.stages.forEach(function (st, i) {
      if (i > 0) {
        var broken = pipe.breakIndex === i - 1;
        var flowing = pipe.breakIndex < 0 || i - 1 < pipe.breakIndex;
        html += '<div class="connector ' + (broken ? 'broken' : (flowing ? 'flowing' : '')) + '">' +
          (broken ? '✕' : '→') + '</div>';
      }
      var bclass = st.status === 'fault' ? 's-fault-b' : st.status === 'idle' ? 's-idle-b' : 's-ok-b';
      var startHere = (pipe.startStage === i) ? '<div class="start-here">' + esc(t('flow.startHere')) + '</div>' : '';
      var mark = st.status === 'fault' ? '✕' : st.status === 'idle' ? '·' : '✓';
      html += '<div class="stage ' + bclass + '">' + startHere +
        '<div class="st-name">' + esc(t('stage.' + st.id)) + '</div>' +
        '<div class="mark">' + mark + '</div></div>';
    });
    document.getElementById('flow').innerHTML = html;
  }

  function renderPending(pending) {
    var el = document.getElementById('pending');
    if (!pending.length) {
      el.innerHTML = '<div class="pending-empty">' + esc(t('pending.empty')) + '</div>';
      return;
    }
    el.innerHTML = '';
    pending.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'pending-item';
      var what = t('todo.' + p.id);
      var compLabel = t('comp.' + p.component);
      var extra = '';
      if (p.id === 'temp-drift' && typeof p.waitSeconds === 'number') {
        extra = ' · ' + t('conclusion.wait', { s: Math.ceil(p.waitSeconds) });
      }
      var fixLabel = p.id === 'temp-drift' ? t('pending.recal') : t('pending.fix');
      row.innerHTML = '<div class="what">' + esc(what) +
        '<div class="comp">' + esc(compLabel) + extra + '</div></div>' +
        '<button class="fix">' + esc(fixLabel) + '</button>';
      row.querySelector('.fix').addEventListener('click', function () {
        state = E.repair(state, p.id);
        render();
      });
      el.appendChild(row);
    });
  }

  function sparkline(zone) {
    var h = history[zone.id];
    var lo = zone.target - 2.5, hi = zone.target + 2.5; // 顯示範圍
    function y(v) { return 40 - ((v - lo) / (hi - lo)) * 40; }
    var bandTop = y(zone.target + zone.band), bandBot = y(zone.target - zone.band);
    var band = '<rect class="band" x="0" y="' + bandTop.toFixed(1) + '" width="100" height="' + (bandBot - bandTop).toFixed(1) + '" />';
    var pts = h.map(function (v, i) {
      var x = h.length > 1 ? (i / (h.length - 1)) * 100 : 0;
      return x.toFixed(1) + ',' + y(v).toFixed(1);
    }).join(' ');
    var line = pts ? '<polyline class="spark" points="' + pts + '" />' : '';
    return '<svg viewBox="0 0 100 40" preserveAspectRatio="none">' + band + line + '</svg>';
  }

  function renderTemps(temps) {
    var el = document.getElementById('temps');
    el.innerHTML = '';
    temps.forEach(function (z) {
      var div = document.createElement('div');
      div.className = 'temp' + (z.outOfBand ? ' warn' : '');
      div.innerHTML =
        '<div class="row"><span class="id">' + t('comp.' + z.id) + '</span>' +
        '<span class="big">' + z.value.toFixed(2) + '</span></div>' +
        '<div class="tgt">' + t('temp.band') + ' ' + z.target.toFixed(1) + ' ±' + z.band.toFixed(1) + ' ' + t('temp.unit') + '</div>' +
        sparkline(z);
      el.appendChild(div);
    });
  }

  function renderFaults() {
    var el = document.getElementById('faults');
    el.innerHTML = '';
    E.FAULTS.forEach(function (id) {
      var b = document.createElement('button');
      var active = faultActive(id);
      b.className = 'btn fault-btn' + (active ? ' active' : '');
      b.textContent = (active ? '● ' : '') + t('fault.' + id);
      b.addEventListener('click', function () { toggleFault(id); });
      el.appendChild(b);
    });
    // 量測開關
    var run = document.createElement('button');
    run.className = 'btn';
    run.textContent = state.running ? t('run.stop') : t('run.start');
    run.addEventListener('click', function () { state = E.setRunning(state, !state.running); render(); });
    el.appendChild(run);
    // 全部復位
    var reset = document.createElement('button');
    reset.className = 'btn';
    reset.textContent = t('faults.resetAll');
    reset.addEventListener('click', function () { state = E.repairAll(state); render(); });
    el.appendChild(reset);
  }

  // 離散狀態指紋：只有它變了才整頁重繪；否則每 tick 只更新會動的溫度卡。
  // 等待秒數取整進指紋，所以倒數每過 1 秒也會觸發一次重繪。
  var lastSig = null;
  function signature(d) {
    return [
      d.conclusion.level, d.conclusion.reasonKey || '', Math.ceil(d.conclusion.waitSeconds),
      d.pipeline.breakIndex,
      d.pending.map(function (p) { return p.id + Math.ceil(p.waitSeconds || 0); }).join(','),
      E.FAULTS.map(faultActive).join(','),
      state.running, selected, lang,
      E.TEMP_IDS.map(function (id) { return d.components[id].status; }).join('')
    ].join('|');
  }

  // 整頁重繪（事件觸發、或指紋改變時）
  function render() {
    var d = E.derive(state);
    renderChrome();
    renderConclusion(d.conclusion);
    renderMachine(d.components);
    renderFlow(d.pipeline);
    renderPending(d.pending);
    renderTemps(d.temps);
    renderFaults();
    lastSig = signature(d);
  }

  // ── 模擬時脈：推進溫區、累積趨勢 ──────────────────────────────
  function loop() {
    state = E.tick(state, 120);
    var d = E.derive(state);
    d.temps.forEach(function (z) {
      var h = history[z.id];
      h.push(z.value);
      if (h.length > HIST_LEN) h.shift();
    });
    if (signature(d) !== lastSig) { render(); return; } // 離散狀態變了：整頁重繪
    renderTemps(d.temps); // 否則只刷新會動的溫度卡（趨勢線）
  }

  // 先填滿一段趨勢，開場的線不會是空的
  for (var i = 0; i < HIST_LEN; i++) {
    E.deriveTemps(state).forEach(function (z) { history[z.id].push(z.value); });
    state = E.tick(state, 120);
  }
  render();
  setInterval(loop, 120);
})();
