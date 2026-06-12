/* ============================================================
   ChargeGrid Intelligence — Dashboard Logic
   FIAP x GoodWe Challenge · Sprint 2
   ============================================================ */

// ── Constantes do sistema ────────────────────────────────
const VOLTAGE  = 230;       // Tensão nominal (V)
const PRICE    = 0.85;      // R$/kWh
const LIMIT_KW = 30;        // Demanda máxima contratada (kW)

// ── Estado das estações ──────────────────────────────────
const stations = [
  { active: true,  warn: false, I: 6.5,  Wh: 1820, elapsed: 1680 },
  { active: true,  warn: true,  I: 11.2, Wh: 3040, elapsed: 2520 },
  { active: false, warn: false, I: 0,    Wh: 0,    elapsed: 0    }
];

// ── Estado da sessão ao vivo ─────────────────────────────
let liveSession = false;
let liveWh      = 0;
let liveElapsed = 0;

// ── Gráfico ──────────────────────────────────────────────
let chartData   = [];
let chartLabels = [];
let chart;

// ── Utilitários ──────────────────────────────────────────
function fmt(n, d = 2) {
  return n.toFixed(d).replace('.', ',');
}

function fmtTime(s) {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

// ── Relógio ──────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Barras de demanda por hora ───────────────────────────
function renderBars() {
  const hours = ['08h', '09h', '10h', '11h', '12h', '13h', '14h', 'Agora'];
  const vals  = [8, 14, 22, 18, 11, 25, 19, 0];

  vals[7] = Math.round(
    stations.reduce((a, s) => a + (s.active ? (VOLTAGE * s.I) / 1000 : 0), 0) * 10
  ) / 10;

  const el = document.getElementById('bars');
  el.innerHTML = hours.map((h, i) => {
    const pct   = Math.min(100, (vals[i] / LIMIT_KW) * 100);
    const color = vals[i] > LIMIT_KW * 0.85
      ? '#E24B4A'
      : vals[i] > LIMIT_KW * 0.6
        ? '#EF9F27'
        : '#1D9E75';

    return `
      <div class="bar-row">
        <span class="bar-label">${h}</span>
        <div class="bar-bg">
          <div class="bar-fill" style="width:${pct.toFixed(1)}%; background:${color};"></div>
        </div>
        <span class="bar-val">${fmt(vals[i], 1)} kW</span>
      </div>`;
  }).join('');
}

// ── Atualiza cartões das estações ────────────────────────
function updateStations() {
  const ids = {
    icons:   ['st0-icon',   'st1-icon',   'st2-icon'],
    details: ['st0-detail', 'st1-detail', 'st2-detail'],
    kws:     ['st0-kw',     'st1-kw',     'st2-kw'],
    costs:   ['st0-cost',   'st1-cost',   'st2-cost'],
    times:   ['st0-time',   'st1-time',   'st2-time']
  };

  stations.forEach((s, i) => {
    const kw   = (VOLTAGE * s.I) / 1000;
    const cost = (s.Wh / 1000) * PRICE;
    const iconEl = document.getElementById(ids.icons[i]);

    iconEl.className = 'st-icon ' + (s.active ? (s.warn ? 'warn' : 'on') : 'off');

    if (s.active) {
      document.getElementById(ids.details[i]).innerHTML =
        (s.warn ? 'Demanda alta' : 'Carregando') +
        ' · <span id="' + ids.times[i] + '">' + fmtTime(s.elapsed) + '</span>';
      document.getElementById(ids.kws[i]).textContent   = fmt(kw, 1) + ' kW';
      document.getElementById(ids.costs[i]).textContent = 'R$ ' + fmt(cost);
    } else {
      document.getElementById(ids.details[i]).textContent = 'Disponível';
      document.getElementById(ids.kws[i]).textContent     = '—';
      document.getElementById(ids.costs[i]).textContent   = '';
    }
  });
}

// ── Atualiza métricas gerais ─────────────────────────────
function updateMetrics() {
  const totalKw   = stations.reduce((a, s) => a + (s.active ? (VOLTAGE * s.I) / 1000 : 0), 0);
  const activeCnt = stations.filter(s => s.active).length;
  const totalWh   = stations.reduce((a, s) => a + s.Wh, 0) + liveWh;
  const totalCost = (totalWh / 1000) * PRICE;
  const demandPct = Math.round((totalKw / LIMIT_KW) * 100);

  document.getElementById('m-power').textContent    = fmt(totalKw, 1) + ' kW';
  document.getElementById('m-sessions').textContent = activeCnt + (liveSession ? 1 : 0);
  document.getElementById('m-energy').textContent   = fmt(totalWh / 1000, 2) + ' kWh';
  document.getElementById('m-energy-sub').textContent = 'R$ ' + fmt(totalCost) + ' faturado';
  document.getElementById('m-demand').textContent   = demandPct + '%';

  const demandSub = document.getElementById('m-demand-sub');
  if (demandPct > 85) {
    demandSub.textContent  = 'acima do limite!';
    demandSub.style.color  = '#E24B4A';
  } else {
    demandSub.textContent  = 'dentro do limite';
    demandSub.style.color  = '#555';
  }

  document.getElementById('alert-bar').style.display = stations[1].warn ? 'flex' : 'none';
}

// ── Inicializa gráfico Chart.js ──────────────────────────
function initChart() {
  const ctx = document.getElementById('chartCanvas').getContext('2d');

  for (let i = 0; i < 30; i++) {
    chartLabels.push('');
    chartData.push(0);
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        borderColor: '#185FA5',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 0,
        fill: true,
        backgroundColor: 'rgba(24,95,165,0.08)'
      }]
    },
    options: {
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          min: 0,
          max: 35,
          ticks: { font: { size: 11 }, callback: v => v + ' kW' },
          grid: { color: 'rgba(128,128,128,0.1)' }
        }
      }
    }
  });
}

// ── Atualiza gráfico de potência ─────────────────────────
function updateChart() {
  const totalKw = stations.reduce((a, s) => a + (s.active ? (VOLTAGE * s.I) / 1000 : 0), 0);
  const noise   = (Math.random() - 0.5) * 0.4;
  const val     = Math.max(0, totalKw + noise);

  chartData.push(parseFloat(val.toFixed(2)));
  chartData.shift();
  chart.update('none');
}

// ── Controle de sessão ───────────────────────────────────
function startSession() {
  if (liveSession) return;
  liveSession = true;
  liveWh      = 0;
  liveElapsed = 0;

  document.getElementById('live-session').style.display = 'flex';

  stations[2].active  = true;
  stations[2].I       = 7.8;
  stations[2].Wh      = 0;
  stations[2].elapsed = 0;
}

function stopSession() {
  if (!liveSession) return;
  liveSession = false;

  stations[2].active = false;
  stations[2].I      = 0;

  document.getElementById('live-session').style.display = 'none';
}

// ── Loop principal (1 segundo) ───────────────────────────
function tick() {
  updateClock();

  stations.forEach(s => {
    if (!s.active) return;
    s.I      += (Math.random() - 0.5) * 0.3;
    s.I       = Math.max(1, Math.min(13, s.I));
    s.Wh     += (VOLTAGE * s.I) / 3600;
    s.elapsed++;
    s.warn    = s.I > 10;
  });

  if (liveSession) {
    const liveI  = stations[2].I;
    liveWh      += (VOLTAGE * liveI) / 3600;
    liveElapsed++;
    const liveCost = (liveWh / 1000) * PRICE;
    document.getElementById('live-val').textContent =
      fmt(liveWh / 1000, 3) + ' kWh · R$ ' + fmt(liveCost);
  }

  updateStations();
  updateMetrics();
  updateChart();
  renderBars();
}

// ── Inicialização ────────────────────────────────────────
initChart();
renderBars();
updateClock();
setInterval(tick, 1000);
