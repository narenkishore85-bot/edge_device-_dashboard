/*
 * EdgeKWS — Firebase Live Data Layer
 *
 * Data source:
 * Firebase Realtime Database
 *
 * No random/demo telemetry is generated.
 *
 * Firebase path:
 * devices/esp32s3_001/live
 */

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

    state: "WAITING",

    detectionsToday: 0,
    falseActivations: 0,

    lastDetection: "--:--:--",

    powerHistory: [],
    timeLabels: []
};


const $ = id => document.getElementById(id);


const fmt = (value, decimals = 1) => {

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toFixed(decimals)
        : "--";
};


let powerChart = null;


/* ---------------------------------------------------------
   DATA SOURCE
--------------------------------------------------------- */

function sourceLabel() {

    return systemData.mode === "firebase"
        ? "FIREBASE LIVE"
        : "WAITING";
}


/* ---------------------------------------------------------
   POWER HISTORY
--------------------------------------------------------- */

function appendPowerSample(power) {

    const value = Number(power);

    if (!Number.isFinite(value)) return;

    const now = new Date();

    systemData.powerHistory.push(value);

    systemData.timeLabels.push(
        now.toLocaleTimeString([], {
            hour12: false
        })
    );


    /*
     * Keep only the latest 30 samples.
     */

    if (systemData.powerHistory.length > 30) {

        systemData.powerHistory.shift();

        systemData.timeLabels.shift();
    }
}


/* ---------------------------------------------------------
   NORMALIZE STATE
--------------------------------------------------------- */

function normalizeState(value) {

    if (!value) {
        return "WAITING";
    }


    const state = String(value)
        .trim()
        .toUpperCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");


    /*
     * Supported ESP32 states
     */

    if (
        state === "LISTENING" ||
        state === "IDLE_LISTENING"
    ) {
        return "LISTENING";
    }


    if (
        state === "WAKE_DETECTED" ||
        state === "WAKE_DETECT" ||
        state === "WAKE"
    ) {
        return "WAKE_DETECTED";
    }


    if (
        state === "STREAMING" ||
        state === "ASR_STREAMING"
    ) {
        return "STREAMING";
    }


    if (
        state === "OFFLINE"
    ) {
        return "OFFLINE";
    }


    /*
     * Unknown state.
     */

    return state;
}


/* ---------------------------------------------------------
   UPDATE STATE UI
--------------------------------------------------------- */

function updateStateUI() {

    const state = normalizeState(systemData.state);


    /*
     * LISTENING
     */

    if (state === "LISTENING") {

        $("kwsState").textContent = "LISTENING";

        $("kwsBadge").textContent = "LISTENING";

        $("modePill").textContent = "IDLE LISTENING";

        $("signalState").textContent = "DECISION";

        $("eventSignal").textContent = "ARMED";

        $("eventText").textContent =
            "LISTENING FOR WAKE PHRASE";

        $("eventSubtext").textContent =
            "No keyword event detected";

        $("eventIndicator").classList.remove("detected");

        $("reactor").classList.remove("detected");

        return;
    }


    /*
     * WAKE DETECTED
     */

    if (state === "WAKE_DETECTED") {

        $("kwsState").textContent =
            "WAKE DETECTED";

        $("kwsBadge").textContent =
            "WAKE DETECTED";

        $("modePill").textContent =
            "WAKE EVENT ACTIVE";

        $("signalState").textContent =
            "WAKE EVENT";

        $("eventSignal").textContent =
            "TRIGGERED";

        $("eventText").textContent =
            "KEYWORD DETECTED — START ASR";

        $("eventSubtext").textContent =
            `Confidence ${fmt(systemData.confidence)}%`;

        $("eventIndicator").classList.add("detected");

        $("reactor").classList.add("detected");

        return;
    }


    /*
     * STREAMING
     */

    if (state === "STREAMING") {

        $("kwsState").textContent =
            "STREAMING";

        $("kwsBadge").textContent =
            "ASR STREAMING";

        $("modePill").textContent =
            "AUDIO STREAMING";

        $("signalState").textContent =
            "STREAMING";

        $("eventSignal").textContent =
            "ASR ACTIVE";

        $("eventText").textContent =
            "AUDIO STREAMING TO ASR";

        $("eventSubtext").textContent =
            "Wake phrase detected — remote ASR active";

        $("eventIndicator").classList.add("detected");

        $("reactor").classList.add("detected");

        return;
    }


    /*
     * OFFLINE
     */

    if (state === "OFFLINE") {

        $("kwsState").textContent =
            "OFFLINE";

        $("kwsBadge").textContent =
            "OFFLINE";

        $("modePill").textContent =
            "DEVICE OFFLINE";

        $("signalState").textContent =
            "NO SIGNAL";

        $("eventSignal").textContent =
            "OFFLINE";

        $("eventText").textContent =
            "ESP32-S3 OFFLINE";

        $("eventSubtext").textContent =
            "No active telemetry";

        $("eventIndicator").classList.remove("detected");

        $("reactor").classList.remove("detected");

        return;
    }


    /*
     * Unknown / waiting state
     */

    $("kwsState").textContent =
        state.replace(/_/g, " ");

    $("kwsBadge").textContent =
        state.replace(/_/g, " ");

    $("modePill").textContent =
        state.replace(/_/g, " ");

    $("signalState").textContent =
        "DECISION";

    $("eventSignal").textContent =
        "ARMED";

    $("eventText").textContent =
        "WAITING FOR KWS STATE";

    $("eventSubtext").textContent =
        `Firebase state: ${state}`;

    $("eventIndicator").classList.remove("detected");

    $("reactor").classList.remove("detected");
}


/* ---------------------------------------------------------
   APPLY FIREBASE DATA
--------------------------------------------------------- */

function applyData(incoming = {}) {

    Object.assign(systemData, incoming);

    systemData.mode = "firebase";


    /*
     * Normalize Firebase state.
     */

    systemData.state =
        normalizeState(systemData.state);


    /*
     * RAM percentage
     */

    const ramLimit =
        Number(systemData.ramLimitKb);

    const ramUsed =
        Number(systemData.ramUsedKb);


    const ramPct =
        ramLimit > 0
            ? (ramUsed / ramLimit) * 100
            : 0;


    /* -----------------------------------------------------
       CONNECTION
    ----------------------------------------------------- */

    $("deviceId").textContent =
        systemData.deviceId;

    $("sideLink").textContent =
        sourceLabel();

    $("sideSource").textContent =
        sourceLabel();

    $("linkStatus").textContent =
        "LIVE";

    $("footerMode").textContent =
        "FIREBASE LIVE";

    $("connectionBadge").textContent =
        "LIVE";

    $("frontendMode").textContent =
        "FIREBASE LIVE";

    $("firebasePath").textContent =
        `devices/${systemData.deviceId}/live`;

    $("telemetryUpdate").textContent =
        new Date().toLocaleTimeString([], {
            hour12: false
        });


    /* -----------------------------------------------------
       CPU
    ----------------------------------------------------- */

    const cpu =
        Number(systemData.cpuPercent);


    $("cpu").textContent =
        fmt(cpu) + "%";


    $("cpuBar").style.width =
        Math.min(
            Math.max(cpu * 10, 0),
            100
        ) + "%";


    $("cpuStatus").textContent =
        cpu < 10
            ? "TARGET STATUS // PASS"
            : "TARGET STATUS // ABOVE LIMIT";


    /* -----------------------------------------------------
       RAM
    ----------------------------------------------------- */

    $("ram").textContent =
        fmt(ramUsed, 0);


    $("ramPercent").textContent =
        fmt(ramPct) + "%";


    $("ramBar").style.width =
        Math.min(
            Math.max(ramPct, 0),
            100
        ) + "%";


    /* -----------------------------------------------------
       POWER
    ----------------------------------------------------- */

    const power =
        Number(systemData.powerMw);

    const voltage =
        Number(systemData.voltage);

    const current =
        Number(systemData.currentMa);


    $("power").textContent =
        fmt(power);


    $("powerFormula").textContent =
        fmt(power);


    $("voltage").textContent =
        fmt(voltage, 2) + " V";


    $("current").textContent =
        fmt(current) + " mA";


    $("powerFormulaText").textContent =
        `${fmt(voltage, 2)} V × ${fmt(current)} mA`;


    /* -----------------------------------------------------
       KWS PERFORMANCE
    ----------------------------------------------------- */

    $("inference").textContent =
        fmt(systemData.inferenceMs);


    $("latency").textContent =
        fmt(systemData.inferenceMs);


    $("confidence").textContent =
        fmt(systemData.confidence) + "%";


    $("confidenceBar").style.width =
        Math.min(
            Math.max(
                Number(systemData.confidence),
                0
            ),
            100
        ) + "%";


    $("threshold").textContent =
        fmt(systemData.threshold, 0) + "%";


    $("thresholdMark").style.left =
        Math.min(
            Math.max(
                Number(systemData.threshold),
                0
            ),
            100
        ) + "%";


    /* -----------------------------------------------------
       DETECTIONS
    ----------------------------------------------------- */

    $("detections").textContent =
        systemData.detectionsToday ?? 0;


    $("falseActivations").textContent =
        systemData.falseActivations ?? 0;


    $("lastDetection").textContent =
        systemData.lastDetection || "--:--:--";


    /* -----------------------------------------------------
       STATE
    ----------------------------------------------------- */

    updateStateUI();


    /* -----------------------------------------------------
       DATA STATUS
    ----------------------------------------------------- */

    $("demoBanner").innerHTML =
        "● FIREBASE LIVE TELEMETRY " +
        "<span>— values below are read directly from Firebase Realtime Database</span>";


    /* -----------------------------------------------------
       POWER HISTORY
    ----------------------------------------------------- */

    if (
        Array.isArray(systemData.powerHistory) &&
        systemData.powerHistory.length
    ) {

        if (
            !Array.isArray(systemData.timeLabels) ||
            systemData.timeLabels.length !==
            systemData.powerHistory.length
        ) {

            systemData.timeLabels =
                systemData.powerHistory.map(
                    (_, index) =>
                        `P-${systemData.powerHistory.length - index - 1}`
                );
        }
    }


    const history =
        Array.isArray(systemData.powerHistory)
            ? systemData.powerHistory
            : [];


    if (history.length) {

        const numeric =
            history
                .map(Number)
                .filter(Number.isFinite);


        if (numeric.length) {

            const avg =
                numeric.reduce(
                    (a, b) => a + b,
                    0
                ) / numeric.length;


            $("powerAvg").textContent =
                fmt(avg);


            $("powerRange").textContent =
                `${fmt(Math.min(...numeric))}–${fmt(Math.max(...numeric))}`;
        }

    } else {

        $("powerAvg").textContent =
            fmt(power);

        $("powerRange").textContent =
            "--";
    }


    updatePowerChart();
}


/* ---------------------------------------------------------
   POWER CHART
--------------------------------------------------------- */

function updatePowerChart() {

    if (!powerChart) return;


    powerChart.data.labels =
        systemData.timeLabels;


    powerChart.data.datasets[0].data =
        systemData.powerHistory;


    powerChart.update("none");
}


/* ---------------------------------------------------------
   INITIALIZE POWER CHART
--------------------------------------------------------- */

function initPowerChart() {

    const canvas =
        $("powerChart");


    if (!canvas || !window.Chart) {
        return;
    }


    powerChart = new Chart(
        canvas.getContext("2d"),
        {

            type: "line",

            data: {

                labels:
                    systemData.timeLabels,

                datasets: [

                    {

                        label:
                            "Power",

                        data:
                            systemData.powerHistory,

                        borderColor:
                            "#55f2a5",

                        backgroundColor:
                            "rgba(85,242,165,.045)",

                        borderWidth:
                            2,

                        pointRadius:
                            2,

                        pointHoverRadius:
                            4,

                        fill:
                            true,

                        tension:
                            0.3
                    }

                ]
            },


            options: {

                responsive:
                    true,

                maintainAspectRatio:
                    false,

                animation:
                    false,


                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        mode:
                            "index",

                        intersect:
                            false
                    }
                },


                scales: {

                    x: {

                        grid: {
                            color:
                                "rgba(57,220,255,.05)"
                        },

                        ticks: {

                            color:
                                "#4e6a75",

                            font: {
                                family:
                                    "JetBrains Mono",

                                size:
                                    8
                            }
                        }
                    },


                    y: {

                        grid: {
                            color:
                                "rgba(57,220,255,.06)"
                        },

                        ticks: {

                            color:
                                "#4e6a75",

                            font: {
                                family:
                                    "JetBrains Mono",

                                size:
                                    8
                            }
                        }
                    }
                }
            }
        }
    );
}


/* ---------------------------------------------------------
   CLOCK
--------------------------------------------------------- */

function updateClock() {

    const now =
        new Date();


    $("clock").textContent =
        now.toLocaleTimeString([], {
            hour12: false
        });


    $("date").textContent =
        now.toLocaleDateString([], {

            month:
                "short",

            day:
                "2-digit",

            year:
                "numeric"
        });
}


/* ---------------------------------------------------------
   NAVIGATION
--------------------------------------------------------- */

function initNavigation() {

    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".nav-item")
                        .forEach(item =>
                            item.classList.remove("active")
                        );


                    document
                        .querySelectorAll(".page")
                        .forEach(page =>
                            page.classList.remove("active")
                        );


                    button.classList.add("active");


                    const page =
                        $("page-" + button.dataset.page);


                    if (page) {
                        page.classList.add("active");
                    }


                    $("sidebar")
                        .classList
                        .remove("open");
                }
            );
        });


    $("mobileMenu").addEventListener(
        "click",
        () =>
            $("sidebar")
                .classList
                .toggle("open")
    );
}


/* ---------------------------------------------------------
   FIREBASE CONNECTION
--------------------------------------------------------- */

window.addEventListener(
    "load",
    async () => {

        initNavigation();

        updateClock();

        setInterval(
            updateClock,
            1000
        );

        initPowerChart();


        /*
         * Firebase service should already be
         * available from firebase-service.js.
         */

        if (!window.EdgeKWSFirebase) {

            console.error(
                "EdgeKWS: Firebase service not available."
            );

            $("demoBanner").innerHTML =
                "! FIREBASE SERVICE NOT LOADED " +
                "<span>— check firebase-service.js</span>";

            $("connectionBadge").textContent =
                "ERROR";

            $("frontendMode").textContent =
                "SERVICE ERROR";

            $("linkStatus").textContent =
                "ERROR";

            return;
        }


        try {

            const connected =
                await window.EdgeKWSFirebase.connect(

                    systemData.deviceId,

                    /*
                     * Firebase data callback
                     */

                    data => {

                        if (!data) return;


                        const incoming =
                            { ...data };


                        /*
                         * Add a power sample when
                         * Firebase sends powerMw.
                         */

                        if (
                            Number.isFinite(
                                Number(incoming.powerMw)
                            )
                        ) {

                            appendPowerSample(
                                incoming.powerMw
                            );
                        }


                        /*
                         * If Firebase itself provides
                         * historical power data,
                         * use it.
                         */

                        if (
                            Array.isArray(
                                data.powerHistory
                            )
                        ) {

                            incoming.powerHistory =
                                data.powerHistory
                                    .map(Number)
                                    .filter(
                                        Number.isFinite
                                    );


                            incoming.timeLabels =
                                Array.isArray(
                                    data.timeLabels
                                )
                                    ? data.timeLabels
                                    : [];
                        }


                        /*
                         * Update entire dashboard.
                         */

                        applyData(incoming);
                    },


                    /*
                     * Firebase error callback
                     */

                    error => {

                        console.error(
                            "Firebase telemetry error:",
                            error
                        );
                    }
                );


            if (!connected) {

                $("demoBanner").innerHTML =
                    "! FIREBASE NOT CONFIGURED " +
                    "<span>— check firebase-config.js</span>";


                $("connectionBadge").textContent =
                    "OFFLINE";


                $("frontendMode").textContent =
                    "CONFIG REQUIRED";


                $("linkStatus").textContent =
                    "OFFLINE";
            }

        } catch (error) {

            console.error(
                "Firebase connection failed:",
                error
            );


            $("demoBanner").innerHTML =
                "! FIREBASE CONNECTION ERROR " +
                "<span>— check Firebase configuration and Realtime Database rules</span>";


            $("connectionBadge").textContent =
                "ERROR";


            $("frontendMode").textContent =
                "CONNECTION ERROR";


            $("linkStatus").textContent =
                "ERROR";
        }
    }
);
