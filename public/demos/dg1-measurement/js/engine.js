/*
 * DG-1 示範量測機 ── 純模擬引擎
 *
 * 這一層完全不碰 DOM，只有狀態與推導邏輯，所以：
 *   瀏覽器：classic <script> 載入後掛在 window.DG1Engine（file:// 可直接開）。
 *   Node ：被 module.exports 匯出，給 node --test 用，不需要裝任何套件。
 *
 * 所有數值、名稱皆為虛構，只用模擬驗證，與任何真實機台無關。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DG1Engine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ── 常數（虛構） ──────────────────────────────────────────────
  var TEMP_TARGET = 36.0;   // 溫區目標溫度（°C）
  var TEMP_BAND = 0.6;      // 綠帶半寬，±0.6°C 內算穩定
  var DRIFT_INIT = 1.8;     // 注入「溫度飄移」時的初始偏移量
  var RECOVER_RATE = 0.3;   // 回溫速率（°C/秒），飄移後會自動收斂

  var SENSOR_IDS = ['S1', 'S2', 'S3', 'S4'];
  var TEMP_IDS = ['T1', 'T2', 'T3', 'T4'];
  var STAGES = ['sense', 'capture', 'compute', 'gateway', 'output'];
  var FAULTS = ['service-down', 'sensor-offline', 'temp-drift', 'power-overload'];

  var OFFLINE_SENSOR = 'S2'; // 感測器斷線打中的頭
  var DRIFT_ZONE = 'T3';     // 溫度飄移打中的溫區

  // ── 狀態 ──────────────────────────────────────────────────────
  function createState() {
    var temps = {};
    TEMP_IDS.forEach(function (id, i) {
      temps[id] = { offset: 0, phase: i * 600 }; // phase 讓各區抖動不同步（純美觀）
    });
    return {
      t: 0,          // 累積毫秒
      running: false, // 是否正在量測
      faults: { serviceDown: false, sensorOffline: false, powerOverload: false },
      temps: temps
    };
  }

  function clone(state) { return JSON.parse(JSON.stringify(state)); }

  // ── 動作（都回傳新狀態，不原地修改） ──────────────────────────
  function injectFault(state, id) {
    var s = clone(state);
    switch (id) {
      case 'service-down': s.faults.serviceDown = true; break;
      case 'sensor-offline': s.faults.sensorOffline = true; break;
      case 'power-overload': s.faults.powerOverload = true; break;
      case 'temp-drift': s.temps[DRIFT_ZONE].offset = DRIFT_INIT; break;
    }
    return s;
  }

  function repair(state, id) {
    var s = clone(state);
    switch (id) {
      case 'service-down': s.faults.serviceDown = false; break;
      case 'sensor-offline': s.faults.sensorOffline = false; break;
      case 'power-overload': s.faults.powerOverload = false; break;
      case 'temp-drift': s.temps[DRIFT_ZONE].offset = 0; break;
    }
    return s;
  }

  function repairAll(state) {
    var s = clone(state);
    s.faults = { serviceDown: false, sensorOffline: false, powerOverload: false };
    TEMP_IDS.forEach(function (id) { s.temps[id].offset = 0; });
    return s;
  }

  function setRunning(state, on) { var s = clone(state); s.running = !!on; return s; }

  // 推進時間：溫區偏移每 tick 朝 0 收斂（硬故障不隨時間自癒）
  function tick(state, dtMs) {
    var s = clone(state);
    s.t += dtMs;
    TEMP_IDS.forEach(function (id) {
      var z = s.temps[id];
      if (z.offset > 0) z.offset = Math.max(0, z.offset - RECOVER_RATE * dtMs / 1000);
    });
    return s;
  }

  // ── 推導（純讀，不改狀態） ────────────────────────────────────
  function tempValue(z, t) {
    var wobble = 0.12 * Math.sin((t + z.phase) / 1700); // 輕微抖動，僅供趨勢線好看
    return TEMP_TARGET + z.offset + wobble;
  }

  function deriveTemps(state) {
    return TEMP_IDS.map(function (id) {
      var z = state.temps[id];
      var outOfBand = z.offset > TEMP_BAND;
      return {
        id: id,
        target: TEMP_TARGET,
        band: TEMP_BAND,
        value: tempValue(z, state.t),
        offset: z.offset,
        outOfBand: outOfBand,
        status: outOfBand ? 'warn' : 'ok',
        waitSeconds: outOfBand ? (z.offset - TEMP_BAND) / RECOVER_RATE : 0
      };
    });
  }

  // 13 個部件的狀態：ok / warn / fault / offline
  function deriveComponents(state) {
    var c = {};
    SENSOR_IDS.forEach(function (id) { c[id] = { id: id, kind: 'sensor', status: 'ok' }; });
    c.PC1 = { id: 'PC1', kind: 'computer', status: 'ok' };
    c.PC2 = { id: 'PC2', kind: 'computer', status: 'ok' };
    c.PLC1 = { id: 'PLC1', kind: 'plc', status: 'ok' };
    c.PSU1 = { id: 'PSU1', kind: 'power', status: 'ok' };
    c.PSU2 = { id: 'PSU2', kind: 'power', status: 'ok' };
    deriveTemps(state).forEach(function (z) {
      c[z.id] = { id: z.id, kind: 'temp', status: z.status, value: z.value };
    });

    // 故障映射（電源過載會連帶拖垮它供電的運算主機）
    if (state.faults.sensorOffline) c[OFFLINE_SENSOR].status = 'offline';
    if (state.faults.serviceDown) c.PC1.status = 'fault';
    if (state.faults.powerOverload) { c.PSU2.status = 'fault'; c.PC2.status = 'fault'; }
    return c;
  }

  // 資料流程鏈：找出第一個斷點，斷點之後的站別進入 idle（沒有資料流過）
  function derivePipeline(state) {
    var c = deriveComponents(state);
    var sensorsOk = SENSOR_IDS.every(function (id) { return c[id].status === 'ok'; });
    var stageFault = {
      sense: !sensorsOk,
      capture: c.PC1.status !== 'ok',
      compute: c.PC2.status !== 'ok',
      gateway: c.PLC1.status !== 'ok',
      output: false
    };
    var breakIndex = -1;
    for (var i = 0; i < STAGES.length; i++) {
      if (stageFault[STAGES[i]]) { breakIndex = i; break; }
    }
    var stages = STAGES.map(function (id, i) {
      var status;
      if (stageFault[id]) status = 'fault';
      else if (breakIndex >= 0 && i > breakIndex) status = 'idle';
      else status = 'ok';
      return { id: id, status: status };
    });
    return { stages: stages, breakIndex: breakIndex, startStage: breakIndex };
  }

  // 一句結論。硬故障（紅）優先於溫度等待（黃）。
  function deriveConclusion(state) {
    var pipe = derivePipeline(state);
    if (pipe.breakIndex >= 0) {
      var stageId = STAGES[pipe.breakIndex];
      var reasonKey = stageId === 'sense' ? 'reason.sensor'
        : stageId === 'capture' ? 'reason.service'
        : stageId === 'compute' ? 'reason.power'
        : 'reason.gateway';
      return { level: 'blocked', reasonKey: reasonKey, stage: stageId, waitSeconds: 0 };
    }
    var worst = deriveTemps(state)
      .filter(function (z) { return z.outOfBand; })
      .sort(function (a, b) { return b.waitSeconds - a.waitSeconds; })[0];
    if (worst) {
      return { level: 'wait', reasonKey: 'reason.thermal', zone: worst.id, waitSeconds: worst.waitSeconds };
    }
    return { level: state.running ? 'measuring' : 'ready', reasonKey: null, waitSeconds: 0 };
  }

  // 待處理清單：每筆都對應一個可修復動作
  function derivePending(state) {
    var items = [];
    if (state.faults.sensorOffline) items.push({ id: 'sensor-offline', component: OFFLINE_SENSOR, stage: 'sense' });
    if (state.faults.serviceDown) items.push({ id: 'service-down', component: 'PC1', stage: 'capture' });
    if (state.faults.powerOverload) items.push({ id: 'power-overload', component: 'PSU2', stage: 'compute' });
    deriveTemps(state).forEach(function (z) {
      if (z.outOfBand) items.push({ id: 'temp-drift', component: z.id, stage: 'thermal', waitSeconds: z.waitSeconds });
    });
    return items;
  }

  function derive(state) {
    return {
      components: deriveComponents(state),
      pipeline: derivePipeline(state),
      temps: deriveTemps(state),
      conclusion: deriveConclusion(state),
      pending: derivePending(state)
    };
  }

  return {
    createState: createState,
    injectFault: injectFault,
    repair: repair,
    repairAll: repairAll,
    setRunning: setRunning,
    tick: tick,
    derive: derive,
    deriveComponents: deriveComponents,
    derivePipeline: derivePipeline,
    deriveTemps: deriveTemps,
    deriveConclusion: deriveConclusion,
    derivePending: derivePending,
    STAGES: STAGES,
    SENSOR_IDS: SENSOR_IDS,
    TEMP_IDS: TEMP_IDS,
    FAULTS: FAULTS,
    constants: {
      TEMP_TARGET: TEMP_TARGET, TEMP_BAND: TEMP_BAND, DRIFT_INIT: DRIFT_INIT,
      RECOVER_RATE: RECOVER_RATE, DRIFT_ZONE: DRIFT_ZONE, OFFLINE_SENSOR: OFFLINE_SENSOR
    }
  };
});
