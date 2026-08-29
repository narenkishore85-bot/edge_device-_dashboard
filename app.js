/* EdgeKWS — Firebase live data layer. No random/demo telemetry is generated. */
const systemData = {
  mode: "waiting",
  deviceId: "esp32s3_001",
  cpuPercent: 0,
  ramUsedKb: 0,
  ramLimitKb: 256,
  voltage: 0,
  currentMa: 0,
  powerMw: 0,
  inferenceMs: 0,
  wakeLatencyMs: 0,
  confidence: 0,
  threshold: 85,
  state: "WAITING FOR FIREBASE",
  detectionsToday: 0,
  falseActivations: 0,
  lastDetection: "--:--:--",
  powerHistory: [],
  timeLabels: []
};

const $ = id => document.getElementById(id);
const fmt = (v, d = 1) => Number.isFinite(Number(v)) ? Number(v).toFixed(d) : "--";
let powerChart;

function sourceLabel() {
  return systemData.mode === "firebase" ? "FIREBASE LIVE" : "WAITING";
}

function appendPowerSample(power) {
  if (!Number.isFinite(Number(power))) return;
  const value = Number(power);
  const now = new Date();
  systemData.powerHistory.push(value);
  systemData.timeLabels.push(now.toLocaleTimeString([], { hour12: false }));
  if (systemData.powerHistory.length > 30) {
    systemData.powerHistory.shift();
    systemData.timeLabels.shift();
  }
}

function applyData(incoming = {}) {
  Object.assign(systemData, incoming);
  systemData.mode = "firebase";

  const ramPct = systemData.ramLimitKb ? (Number(systemData.ramUsedKb) / Number(systemData.ramLimitKb)) * 100 : 0;
  const listening = String(systemData.state || "").toUpperCase() !== "WAKE DETECTED";

  $("deviceId").textContent = systemData.deviceId;
  $("sideLink").textContent = sourceLabel();
  $("sideSource").textContent = sourceLabel();
  $("linkStatus").textContent = "LIVE";
  $("footerMode").textContent = "FIREBASE LIVE";
  $("connectionBadge").textContent = "LIVE";
  $("frontendMode").textContent = "FIREBASE LIVE";
  $("firebasePath").textContent = `devices/${systemData.deviceId}/live`;
  $("telemetryUpdate").textContent = new Date().toLocaleTimeString([], { hour12: false });

  $("cpu").textContent = fmt(systemData.cpuPercent) + "%";
  $("cpuBar").style.width = Math.min(Math.max(Number(systemData.cpuPercent) * 10, 0), 100) + "%";
  $("cpuStatus").textContent = Number(systemData.cpuPercent) < 10 ? "TARGET STATUS // PASS" : "TARGET STATUS // ABOVE LIMIT";
  $("ram").textContent = fmt(systemData.ramUsedKb, 0);
  $("ramPercent").textContent = fmt(ramPct) + "%";
  $("ramBar").style.width = Math.min(Math.max(ramPct, 0), 100) + "%";
  $("power").textContent = fmt(systemData.powerMw);
  $("powerFormula").textContent = fmt(systemData.powerMw);
  $("voltage").textContent = fmt(systemData.voltage, 2) + " V";
  $("current").textContent = fmt(systemData.currentMa) + " mA";
  $("powerFormulaText").textContent = `${fmt(systemData.voltage, 2)} V × ${fmt(systemData.currentMa)} mA`;
  $("inference").textContent = fmt(systemData.inferenceMs);
  $("latency").textContent = fmt(systemData.inferenceMs);
  $("confidence").textContent = fmt(systemData.confidence) + "%";
  $("confidenceBar").style.width = Math.min(Math.max(Number(systemData.confidence), 0), 100) + "%";
  $("threshold").textContent = fmt(systemData.threshold, 0) + "%";
  $("thresholdMark").style.left = Math.min(Math.max(Number(systemData.threshold), 0), 100) + "%";
  $("detections").textContent = systemData.detectionsToday ?? 0;
  $("falseActivations").textContent = systemData.falseActivations ?? 0;
  $("lastDetection").textContent = systemData.lastDetection || "--:--:--";

  $("kwsState").textContent = listening ? "LISTENING" : "WAKE DETECTED";
  $("kwsBadge").textContent = listening ? "LISTENING" : "WAKE DETECTED";
  $("modePill").textContent = listening ? "IDLE LISTENING" : "WAKE EVENT ACTIVE";
  $("signalState").textContent = listening ? "DECISION" : "WAKE EVENT";
  $("eventSignal").textContent = listening ? "ARMED" : "TRIGGERED";
  $("eventText").textContent = listening ? "LISTENING FOR WAKE PHRASE" : "KEYWORD DETECTED — START ASR";
  $("eventSubtext").textContent = listening ? "No keyword event detected" : `Confidence ${fmt(systemData.confidence)}%`;
  $("eventIndicator").classList.toggle("detected", !listening);
  $("reactor").classList.toggle("detected", !listening);

  $("demoBanner").innerHTML = "● FIREBASE LIVE TELEMETRY <span>— values below are read directly from Firebase Realtime Database</span>";

  if (Array.isArray(systemData.powerHistory) && systemData.powerHistory.length) {
    if (!Array.isArray(systemData.timeLabels) || systemData.timeLabels.length !== systemData.powerHistory.length) {
      systemData.timeLabels = systemData.powerHistory.map((_, i) => `P-${systemData.powerHistory.length - i - 1}`);
    }
  }

  const p = Array.isArray(systemData.powerHistory) ? systemData.powerHistory : [];
  if (p.length) {
    const numeric = p.map(Number).filter(Number.isFinite);
    if (numeric.length) {
      const avg = numeric.reduce((x, y) => x + y, 0) / numeric.length;
      $("powerAvg").textContent = fmt(avg);
      $("powerRange").textContent = `${fmt(Math.min(...numeric))}–${fmt(Math.max(...numeric))}`;
    }
  } else {
    $("powerAvg").textContent = fmt(systemData.powerMw);
    $("powerRange").textContent = "--";
  }

  updatePowerChart();
}

function updatePowerChart() {
  if (!powerChart) return;
  powerChart.data.labels = systemData.timeLabels;
  powerChart.data.datasets[0].data = systemData.powerHistory;
  powerChart.update("none");
}

function initPowerChart() {
  const c = $("powerChart");
  if (!c || !window.Chart) return;
  powerChart = new Chart(c.getContext("2d"), {
    type: "line",
    data: {
      labels: systemData.timeLabels,
      datasets: [{
        data: systemData.powerHistory,
        borderColor: "#55f2a5",
        backgroundColor: "rgba(85,242,165,.045)",
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        fill: true,
        tension: .3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
      scales: {
        x: { grid: { color: "rgba(57,220,255,.05)" }, ticks: { color: "#4e6a75", font: { family: "JetBrains Mono", size: 8 } } },
        y: { grid: { color: "rgba(57,220,255,.06)" }, ticks: { color: "#4e6a75", font: { family: "JetBrains Mono", size: 8 } } }
      }
    }
  });
}

function updateClock() {
  const n = new Date();
  $("clock").textContent = n.toLocaleTimeString([], { hour12: false });
  $("date").textContent = n.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" });
}

function initNavigation() {
  document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    $("page-" + b.dataset.page).classList.add("active");
    $("sidebar").classList.remove("open");
  }));
  $("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
}

window.addEventListener("load", async () => {
  initNavigation();
  updateClock();
  setInterval(updateClock, 1000);
  initPowerChart();

  if (window.EdgeKWSFirebase) {
    try {
      const connected = await window.EdgeKWSFirebase.connect(systemData.deviceId, data => {
        if (!data) return;

        const incoming = { ...data };
        if (Number.isFinite(Number(incoming.powerMw))) appendPowerSample(incoming.powerMw);
        if (Array.isArray(data.powerHistory)) {
          incoming.powerHistory = data.powerHistory.map(Number).filter(Number.isFinite);
          incoming.timeLabels = Array.isArray(data.timeLabels) ? data.timeLabels : [];
        }
        applyData(incoming);
      });

      if (!connected) {
        $("demoBanner").innerHTML = "! FIREBASE NOT CONFIGURED <span>— add firebase-config.js with your Firebase Web App configuration</span>";
        $("connectionBadge").textContent = "OFFLINE";
        $("frontendMode").textContent = "CONFIG REQUIRED";
        $("linkStatus").textContent = "OFFLINE";
      }
    } catch (e) {
      console.error("Firebase connection failed:", e);
      $("demoBanner").innerHTML = "! FIREBASE CONNECTION ERROR <span>— check firebase-config.js and Realtime Database rules</span>";
      $("connectionBadge").textContent = "ERROR";
      $("frontendMode").textContent = "CONNECTION ERROR";
      $("linkStatus").textContent = "ERROR";
    }
  }
});
