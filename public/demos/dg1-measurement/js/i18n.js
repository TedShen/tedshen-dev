/*
 * DG-1 示範量測機 ── 中英字串
 * t(key, lang, vars) 取字串；{s} 這類佔位符用 vars 代換。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DG1I18N = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STRINGS = {
    zh: {
      'app.title': 'DG-1 示範量測機',
      'app.subtitle': '線上輪廓量測・狀態畫面',
      'app.sim': '只用模擬驗證',
      'app.langBtn': 'EN',

      'conclusion.ready': '可以量測',
      'conclusion.measuring': '量測中',
      'conclusion.notready': '還不能量測',

      'reason.service': '擷取服務已停止，資料沒有進來',
      'reason.sensor': '一個感測頭離線，缺一軌資料',
      'reason.power': '電源過載，運算主機停機',
      'reason.gateway': 'PLC 閘道中斷',
      'reason.thermal': '溫區尚未穩定',
      'conclusion.wait': '預估 {s} 秒後可量測',

      'machine.heading': '機台狀態',
      'machine.hint': '點機台上的部件看數值',
      'machine.selectNone': '尚未選取部件',

      'comp.S1': '感測頭 S1', 'comp.S2': '感測頭 S2', 'comp.S3': '感測頭 S3', 'comp.S4': '感測頭 S4',
      'comp.T1': '溫區 T1', 'comp.T2': '溫區 T2', 'comp.T3': '溫區 T3', 'comp.T4': '溫區 T4',
      'comp.PC1': '擷取主機 PC1', 'comp.PC2': '運算主機 PC2',
      'comp.PLC1': 'PLC 閘道', 'comp.PSU1': '電源 PSU1', 'comp.PSU2': '電源 PSU2',

      'status.ok': '正常', 'status.warn': '偏移', 'status.fault': '故障', 'status.offline': '離線',

      'stage.sense': '感測頭', 'stage.capture': '擷取', 'stage.compute': '拼接運算',
      'stage.gateway': 'PLC 閘道', 'stage.output': '產線輸出',

      'flow.heading': '流程鏈',
      'flow.startHere': '從這裡開始',
      'flow.flowing': '資料流動中',

      'pending.heading': '待處理清單',
      'pending.empty': '目前沒有待處理項目',
      'pending.fix': '修復',
      'pending.recal': '重新校溫',

      'todo.service-down': '重新啟動 PC1 的擷取服務',
      'todo.sensor-offline': '檢查感測頭 S2 接線並重新連線',
      'todo.power-overload': '降載並重置電源 PSU2',
      'todo.temp-drift': '等待溫區回到目標帶，或按重新校溫',

      'temp.heading': '溫度',
      'temp.band': '目標帶',
      'temp.unit': '°C',

      'faults.heading': '注入故障',
      'fault.service-down': '服務當掉',
      'fault.sensor-offline': '感測器斷線',
      'fault.temp-drift': '溫度飄移',
      'fault.power-overload': '電源過載',
      'faults.active': '已注入',
      'faults.resetAll': '全部復位',
      'run.start': '開始量測',
      'run.stop': '停止量測',

      'footer.tagline': '現場的狀態畫面，我就是這樣設計的。',
      'footer.contact': 'dev.tedshen.link'
    },
    en: {
      'app.title': 'DG-1 Demo Measurement Machine',
      'app.subtitle': 'Inline profile measurement · status view',
      'app.sim': 'Simulation only',
      'app.langBtn': '中',

      'conclusion.ready': 'Ready to measure',
      'conclusion.measuring': 'Measuring',
      'conclusion.notready': 'Not ready to measure',

      'reason.service': 'Capture service stopped — no data arriving',
      'reason.sensor': 'A sensor head is offline — one track missing',
      'reason.power': 'Power overload — compute host is down',
      'reason.gateway': 'PLC gateway interrupted',
      'reason.thermal': 'Thermal zone not yet stable',
      'conclusion.wait': '~{s}s until ready',

      'machine.heading': 'Machine status',
      'machine.hint': 'Click a part to see its values',
      'machine.selectNone': 'No part selected',

      'comp.S1': 'Sensor head S1', 'comp.S2': 'Sensor head S2', 'comp.S3': 'Sensor head S3', 'comp.S4': 'Sensor head S4',
      'comp.T1': 'Zone T1', 'comp.T2': 'Zone T2', 'comp.T3': 'Zone T3', 'comp.T4': 'Zone T4',
      'comp.PC1': 'Capture host PC1', 'comp.PC2': 'Compute host PC2',
      'comp.PLC1': 'PLC gateway', 'comp.PSU1': 'Power PSU1', 'comp.PSU2': 'Power PSU2',

      'status.ok': 'OK', 'status.warn': 'Drifting', 'status.fault': 'Fault', 'status.offline': 'Offline',

      'stage.sense': 'Sense', 'stage.capture': 'Capture', 'stage.compute': 'Stitch & compute',
      'stage.gateway': 'PLC gateway', 'stage.output': 'Line output',

      'flow.heading': 'Data flow',
      'flow.startHere': 'Start here',
      'flow.flowing': 'Data flowing',

      'pending.heading': 'To-do',
      'pending.empty': 'Nothing to handle',
      'pending.fix': 'Fix',
      'pending.recal': 'Recalibrate',

      'todo.service-down': 'Restart the capture service on PC1',
      'todo.sensor-offline': 'Check sensor head S2 cabling and reconnect',
      'todo.power-overload': 'Shed load and reset power unit PSU2',
      'todo.temp-drift': 'Wait for the zone to return, or recalibrate',

      'temp.heading': 'Temperature',
      'temp.band': 'Target band',
      'temp.unit': '°C',

      'faults.heading': 'Inject fault',
      'fault.service-down': 'Service down',
      'fault.sensor-offline': 'Sensor offline',
      'fault.temp-drift': 'Thermal drift',
      'fault.power-overload': 'Power overload',
      'faults.active': 'injected',
      'faults.resetAll': 'Reset all',
      'run.start': 'Start measuring',
      'run.stop': 'Stop measuring',

      'footer.tagline': 'This is how I design status screens for the floor.',
      'footer.contact': 'dev.tedshen.link'
    }
  };

  function t(key, lang, vars) {
    var table = STRINGS[lang] || STRINGS.zh;
    var s = table[key] != null ? table[key] : key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace('{' + k + '}', vars[k]);
      });
    }
    return s;
  }

  return { t: t, STRINGS: STRINGS, LANGS: ['zh', 'en'] };
});
