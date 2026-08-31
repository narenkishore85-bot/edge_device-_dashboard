/*
 * ============================================================
 * EdgeKWS — Firebase Live Telemetry Dashboard
 * ============================================================
 *
 * SOURCE OF TRUTH:
 *
 * ESP32
 *   ↓ Wi-Fi
 * Firebase Realtime Database
 *   ↓
 * firebase-service.js
 *   ↓
 * app.js
 *   ↓
 * Dashboard
 *
 * IMPORTANT:
 *
 * 1. No random telemetry is generated.
 * 2. State comes directly from Firebase.
 * 3. Mic status comes directly from Firebase when available.
 * 4. Confidence comes directly from Firebase.
 * 5. Power is calculated locally:
 *
 *       Power (mW) = Voltage (V) × Current (mA)
 *
 * 6. Last update uses the ESP32/Firebase timestamp when
 *    available instead of the browser clock.
 *
 * 7. The ESP32 does NOT need to generate graph data.
 *
 * ============================================================
 */


/* ============================================================
   CENTRAL TELEMETRY OBJECT
   ============================================================ */

const systemData = {

    mode: "waiting",

    deviceId: "esp32s3_001",

    cpuPercent: 0,

    ramUsedKb: 0,

    ramLimitKb: 256,

    voltage: 0,

    currentMa: 0,

    inferenceMs: 0,

    wakeLatencyMs: 0,

    confidence: 0,

    threshold: 85,

    state: "WAITING FOR FIREBASE",

    micStatus: "UNKNOWN",

    detectionsToday: 0,

    falseActivations: 0,

    lastDetection: "--:--:--",

    /*
     * Actual telemetry timestamp received from ESP32/Firebase.
     */
    timestamp: null,

    /*
     * Browser-side graph history.
     *
     * These do NOT need to exist in Firebase.
     */
    powerHistory: [],

    timeLabels: [],

    /*
     * Used to avoid adding the same Firebase update
     * to the graph multiple times.
     */
    lastSampleKey: null

};


/* ============================================================
   DOM HELPER
   ============================================================ */

const $ = id => document.getElementById(id);


/* ============================================================
   NUMBER FORMATTER
   ============================================================ */

function fmt(value, decimals = 1) {

    const number = Number(value);

    if (!Number.isFinite(number)) {

        return "--";

    }

    return number.toFixed(decimals);

}


/* ============================================================
   SAFE TEXT UPDATE
   ============================================================ */

function setText(id, value) {

    const element = $(id);

    if (!element) {

        return;

    }

    element.textContent = value;

}


/* ============================================================
   POWER CALCULATION
   ============================================================ */

function calculatePower() {

    const voltage =
        Number(systemData.voltage);

    const current =
        Number(systemData.currentMa);


    if (
        !Number.isFinite(voltage) ||
        !Number.isFinite(current)
    ) {

        return 0;

    }


    /*
     * V × mA = mW
     */

    return voltage * current;

}


/* ============================================================
   NORMALIZE STATE
   ============================================================ */

function normalizeState(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "WAITING";

    }


    return String(value)
        .trim()
        .toUpperCase()
        .replace(/-/g, "_");

}


/* ============================================================
   NORMALIZE MICROPHONE STATUS
   ============================================================ */

function getMicStatus() {

    /*
     * Prefer an actual micStatus value from Firebase.
     */

    if (
        systemData.micStatus &&
        systemData.micStatus !== "UNKNOWN"
    ) {

        return String(
            systemData.micStatus
        ).toUpperCase();

    }


    /*
     * If ESP32 doesn't currently send micStatus,
     * infer only the obvious cases.
     *
     * This is a fallback — actual micStatus is preferred.
     */

    const state =
        normalizeState(
            systemData.state
        );


    if (
        state === "WAITING" ||
        state === "WAITING_FOR_FIREBASE"
    ) {

        return "OFFLINE";

    }


    if (
        state === "MIC_ERROR" ||
        state === "ERROR"
    ) {

        return "ERROR";

    }


    return "ACTIVE";

}


/* ============================================================
   TELEMETRY TIMESTAMP
   ============================================================ */

function getTelemetryTime() {

    const value =
        systemData.timestamp;


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "--";

    }


    /*
     * Firebase Server Timestamp may arrive as a number.
     */

    if (
        typeof value === "number"
    ) {

        const date =
            new Date(value);


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date.toLocaleTimeString(
                [],
                {
                    hour12: false
                }
            );

        }

    }


    /*
     * ISO timestamp / date string.
     */

    const parsed =
        new Date(value);


    if (
        !Number.isNaN(
            parsed.getTime()
        )
    ) {

        return parsed.toLocaleTimeString(
            [],
            {
                hour12: false
            }
        );

    }


    /*
     * If ESP32 sends an already formatted time,
     * display it directly.
     */

    return String(value);

}


/* ============================================================
   ADD POWER SAMPLE
   ============================================================ */

function appendPowerSample(power, sampleKey = null) {

    const value =
        Number(power);


    if (
        !Number.isFinite(value)
    ) {

        return;

    }


    /*
     * Don't add the same Firebase update twice.
     */

    if (
        sampleKey !== null &&
        sampleKey === systemData.lastSampleKey
    ) {

        return;

    }


    systemData.lastSampleKey =
        sampleKey;


    const label =
        getTelemetryTime() !== "--"
            ? getTelemetryTime()
            : new Date().toLocaleTimeString(
                [],
                {
                    hour12: false
                }
            );


    systemData.powerHistory.push(
        value
    );


    systemData.timeLabels.push(
        label
    );


    /*
     * Keep only the latest 30 samples.
     */

    while (
        systemData.powerHistory.length > 30
    ) {

        systemData.powerHistory.shift();

        systemData.timeLabels.shift();

    }

}


/* ============================================================
   APPLY FIREBASE TELEMETRY
   ============================================================ */

function applyData(incoming = {}) {

    /*
     * Copy Firebase telemetry into central data object.
     */

    Object.assign(
        systemData,
        incoming
    );


    systemData.mode =
        "firebase";


    /* ========================================================
       STATE
       ======================================================== */

    const state =
        normalizeState(
            systemData.state
        );


    const wakeDetected =
        state === "WAKE_DETECTED";


    const streaming =
        state === "STREAMING";


    const listening =
        state === "LISTENING";


    /* ========================================================
       MIC STATUS
       ======================================================== */

    const micStatus =
        getMicStatus();


    /* ========================================================
       RAM
       ======================================================== */

    const ramLimit =
        Number(
            systemData.ramLimitKb
        );


    const ramUsed =
        Number(
            systemData.ramUsedKb
        );


    const ramPct =
        ramLimit > 0
            ? (ramUsed / ramLimit) * 100
            : 0;


    /* ========================================================
       POWER
       ======================================================== */

    const power =
        calculatePower();


    /*
     * Store calculated power locally.
     *
     * We intentionally DO NOT expect powerMw
     * from Firebase.
     */

    systemData.powerMw =
        power;


    /* ========================================================
       DEVICE
       ======================================================== */

    setText(
        "deviceId",
        systemData.deviceId
    );


    setText(
        "sideLink",
        "FIREBASE LIVE"
    );


    setText(
        "sideSource",
        "FIREBASE LIVE"
    );


    setText(
        "linkStatus",
        "LIVE"
    );


    setText(
        "footerMode",
        "FIREBASE LIVE"
    );


    setText(
        "connectionBadge",
        "LIVE"
    );


    setText(
        "frontendMode",
        "FIREBASE LIVE"
    );


    setText(
        "firebasePath",
        `devices/${systemData.deviceId}/live`
    );


    /*
     * IMPORTANT:
     *
     * This is now the actual telemetry timestamp,
     * not simply the browser's current time.
     */

    setText(
        "telemetryUpdate",
        getTelemetryTime()
    );


    /* ========================================================
       CPU
       ======================================================== */

    const cpu =
        Number(
            systemData.cpuPercent
        );


    setText(
        "cpu",
        fmt(cpu) + "%"
    );


    const cpuBar =
        $("cpuBar");


    if (cpuBar) {

        cpuBar.style.width =
            Math.min(
                Math.max(
                    cpu * 10,
                    0
                ),
                100
            ) + "%";

    }


    setText(
        "cpuStatus",
        cpu < 10
            ? "TARGET STATUS // PASS"
            : "TARGET STATUS // ABOVE LIMIT"
    );


    /* ========================================================
       RAM
       ======================================================== */

    setText(
        "ram",
        fmt(
            ramUsed,
            0
        )
    );


    setText(
        "ramPercent",
        fmt(ramPct) + "%"
    );


    const ramBar =
        $("ramBar");


    if (ramBar) {

        ramBar.style.width =
            Math.min(
                Math.max(
                    ramPct,
                    0
                ),
                100
            ) + "%";

    }


    /* ========================================================
       VOLTAGE
       ======================================================== */

    setText(
        "voltage",
        fmt(
            systemData.voltage,
            2
        ) + " V"
    );


    /* ========================================================
       CURRENT
       ======================================================== */

    setText(
        "current",
        fmt(
            systemData.currentMa
        ) + " mA"
    );


    /* ========================================================
       POWER
       ======================================================== */

    setText(
        "power",
        fmt(power)
    );


    setText(
        "powerFormula",
        fmt(power)
    );


    setText(
        "powerFormulaText",
        `${fmt(systemData.voltage, 2)} V × ${fmt(systemData.currentMa)} mA`
    );


    /* ========================================================
       KWS INFERENCE
       ======================================================== */

    setText(
        "inference",
        fmt(
            systemData.inferenceMs
        )
    );


    setText(
        "latency",
        fmt(
            systemData.inferenceMs
        )
    );


    /* ========================================================
       CONFIDENCE
       ======================================================== */

    const confidence =
        Number(
            systemData.confidence
        );


    setText(
        "confidence",
        fmt(confidence) + "%"
    );


    const confidenceBar =
        $("confidenceBar");


    if (confidenceBar) {

        confidenceBar.style.width =
            Math.min(
                Math.max(
                    confidence,
                    0
                ),
                100
            ) + "%";

    }


    /* ========================================================
       THRESHOLD
       ======================================================== */

    const threshold =
        Number(
            systemData.threshold
        );


    setText(
        "threshold",
        fmt(
            threshold,
            0
        ) + "%"
    );


    const thresholdMark =
        $("thresholdMark");


    if (thresholdMark) {

        thresholdMark.style.left =
            Math.min(
                Math.max(
                    threshold,
                    0
                ),
                100
            ) + "%";

    }


    /* ========================================================
       DETECTION COUNTERS
       ======================================================== */

    setText(
        "detections",
        systemData.detectionsToday ?? 0
    );


    setText(
        "falseActivations",
        systemData.falseActivations ?? 0
    );


    setText(
        "lastDetection",
        systemData.lastDetection ||
        "--:--:--"
    );


    /* ========================================================
       MICROPHONE / KWS STATE
       ======================================================== */

    /*
     * STATE IS NOW DIRECTLY FROM FIREBASE.
     *
     * We do NOT say:
     *
     * confidence > threshold → WAKE DETECTED
     *
     * because the ESP32's KWS algorithm should make
     * that decision.
     */

    let displayState;


    if (wakeDetected) {

        displayState =
            "WAKE DETECTED";

    }

    else if (streaming) {

        displayState =
            "STREAMING";

    }

    else if (listening) {

        displayState =
            "LISTENING";

    }

    else {

        displayState =
            state
                .replace(/_/g, " ");

    }


    setText(
        "kwsState",
        displayState
    );


    setText(
        "kwsBadge",
        displayState
    );


    /* ========================================================
       MODE PILL
       ======================================================== */

    if (wakeDetected) {

        setText(
            "modePill",
            "WAKE EVENT ACTIVE"
        );

    }

    else if (streaming) {

        setText(
            "modePill",
            "ASR STREAMING"
        );

    }

    else if (listening) {

        setText(
            "modePill",
            "IDLE LISTENING"
        );

    }

    else {

        setText(
            "modePill",
            displayState
        );

    }


    /* ========================================================
       SIGNAL STATE
       ======================================================== */

    if (wakeDetected) {

        setText(
            "signalState",
            "WAKE EVENT"
        );

    }

    else if (streaming) {

        setText(
            "signalState",
            "STREAMING"
        );

    }

    else if (listening) {

        setText(
            "signalState",
            "DECISION"
        );

    }

    else {

        setText(
            "signalState",
            displayState
        );

    }


    /* ========================================================
       EVENT SIGNAL
       ======================================================== */

    if (wakeDetected) {

        setText(
            "eventSignal",
            "TRIGGERED"
        );

    }

    else if (streaming) {

        setText(
            "eventSignal",
            "STREAMING"
        );

    }

    else if (listening) {

        setText(
            "eventSignal",
            "ARMED"
        );

    }

    else {

        setText(
            "eventSignal",
            "WAITING"
        );

    }


    /* ========================================================
       EVENT MESSAGE
       ======================================================== */

    if (wakeDetected) {

        setText(
            "eventText",
            "KEYWORD DETECTED — START ASR"
        );


        setText(
            "eventSubtext",
            `Confidence ${fmt(confidence)}%`
        );

    }

    else if (streaming) {

        setText(
            "eventText",
            "AUDIO STREAMING TO ASR"
        );


        setText(
            "eventSubtext",
            "Remote processing active"
        );

    }

    else if (listening) {

        setText(
            "eventText",
            "LISTENING FOR WAKE PHRASE"
        );


        setText(
            "eventSubtext",
            `Microphone ${micStatus}`
        );

    }

    else {

        setText(
            "eventText",
            displayState
        );


        setText(
            "eventSubtext",
            `Microphone ${micStatus}`
        );

    }


    /* ========================================================
       VISUAL DETECTION
       ======================================================== */

    const eventIndicator =
        $("eventIndicator");


    if (eventIndicator) {

        eventIndicator.classList.toggle(
            "detected",
            wakeDetected || streaming
        );

    }


    const reactor =
        $("reactor");


    if (reactor) {

        reactor.classList.toggle(
            "detected",
            wakeDetected || streaming
        );

    }


    /* ========================================================
       POWER HISTORY
       ======================================================== */

    /*
     * Use Firebase/ESP32 timestamp as the sample identity
     * whenever possible.
     */

    const sampleKey =
        systemData.timestamp ||
        `${systemData.voltage}-${systemData.currentMa}`;


    appendPowerSample(
        power,
        sampleKey
    );


    /* ========================================================
       POWER STATISTICS
       ======================================================== */

    const powerValues =
        systemData.powerHistory
            .map(Number)
            .filter(
                Number.isFinite
            );


    if (
        powerValues.length > 0
    ) {

        const average =
            powerValues.reduce(
                (total, value) =>
                    total + value,
                0
            ) /
            powerValues.length;


        const minimum =
            Math.min(
                ...powerValues
            );


        const maximum =
            Math.max(
                ...powerValues
            );


        setText(
            "powerAvg",
            fmt(average)
        );


        setText(
            "powerRange",
            `${fmt(minimum)}–${fmt(maximum)}`
        );

    }

    else {

        setText(
            "powerAvg",
            fmt(power)
        );


        setText(
            "powerRange",
            "--"
        );

    }


    /* ========================================================
       LIVE BANNER
       ======================================================== */

    const demoBanner =
        $("demoBanner");


    if (demoBanner) {

        demoBanner.innerHTML =
            "● FIREBASE LIVE TELEMETRY " +
            "<span>— values below are read directly from Firebase Realtime Database</span>";

    }


    /* ========================================================
       UPDATE CHART
       ======================================================== */

    updatePowerChart();

}


/* ============================================================
   POWER CHART
   ============================================================ */

let powerChart = null;


function updatePowerChart() {

    if (
        !powerChart
    ) {

        return;

    }


    powerChart.data.labels =
        systemData.timeLabels;


    powerChart.data.datasets[0].data =
        systemData.powerHistory;


    powerChart.update(
        "none"
    );

}


/* ============================================================
   INITIALIZE POWER CHART
   ============================================================ */

function initPowerChart() {

    const canvas =
        $("powerChart");


    if (
        !canvas ||
        !window.Chart
    ) {

        return;

    }


    powerChart =
        new Chart(
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

                            display:
                                false

                        },


                        tooltip: {

                            mode:
                                "index",

                            intersect:
                                false,

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            " Power: " +
                                            Number(
                                                context.parsed.y
                                            ).toFixed(2) +
                                            " mW"
                                        );

                                    }

                            }

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

                                },

                                callback:
                                    function(value) {

                                        return (
                                            value +
                                            " mW"
                                        );

                                    }

                            }

                        }

                    }

                }

            }

        );

}


/* ============================================================
   CLOCK
   ============================================================ */

function updateClock() {

    const now =
        new Date();


    setText(
        "clock",
        now.toLocaleTimeString(
            [],
            {
                hour12: false
            }
        )
    );


    setText(
        "date",
        now.toLocaleDateString(
            [],
            {
                month: "short",
                day: "2-digit",
                year: "numeric"
            }
        )
    );

}


/* ============================================================
   NAVIGATION
   ============================================================ */

function initNavigation() {

    document
        .querySelectorAll(".nav-item")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".nav-item"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        document
                            .querySelectorAll(
                                ".page"
                            )
                            .forEach(
                                page =>
                                    page.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        const page =
                            $("page-" +
                              button.dataset.page);


                        if (page) {

                            page.classList.add(
                                "active"
                            );

                        }


                        const sidebar =
                            $("sidebar");


                        if (sidebar) {

                            sidebar.classList.remove(
                                "open"
                            );

                        }

                    }
                );

            }
        );


    const mobileMenu =
        $("mobileMenu");


    if (mobileMenu) {

        mobileMenu.addEventListener(
            "click",
            () => {

                const sidebar =
                    $("sidebar");


                if (sidebar) {

                    sidebar.classList.toggle(
                        "open"
                    );

                }

            }
        );

    }

}


/* ============================================================
   FIREBASE INITIALIZATION
   ============================================================ */

async function initializeFirebase() {

    if (
        !window.EdgeKWSFirebase
    ) {

        console.error(
            "EdgeKWSFirebase adapter not found."
        );


        setText(
            "demoBanner",
            "FIREBASE ADAPTER NOT FOUND"
        );


        setText(
            "connectionBadge",
            "ERROR"
        );


        setText(
            "frontendMode",
            "ADAPTER ERROR"
        );


        setText(
            "linkStatus",
            "ERROR"
        );


        return;

    }


    try {

        const connected =
            await window.EdgeKWSFirebase.connect(

                systemData.deviceId,

                data => {

                    /*
                     * =================================================
                     * FIREBASE UPDATE RECEIVED
                     * =================================================
                     */

                    if (
                        !data
                    ) {

                        return;

                    }


                    /*
                     * Create a clean copy.
                     */

                    const incoming =
                        {
                            ...data
                        };


                    /* ================================================
                       NUMERIC FIELDS
                       ================================================ */

                    const numericFields = [

                        "cpuPercent",

                        "ramUsedKb",

                        "ramLimitKb",

                        "voltage",

                        "currentMa",

                        "inferenceMs",

                        "wakeLatencyMs",

                        "confidence",

                        "threshold",

                        "detectionsToday",

                        "falseActivations"

                    ];


                    numericFields.forEach(
                        field => {

                            if (
                                incoming[field] !== undefined &&
                                incoming[field] !== null &&
                                incoming[field] !== ""
                            ) {

                                const value =
                                    Number(
                                        incoming[field]
                                    );


                                if (
                                    Number.isFinite(
                                        value
                                    )
                                ) {

                                    incoming[field] =
                                        value;

                                }

                            }

                        }
                    );


                    /* ================================================
                       STATE
                       ================================================ */

                    if (
                        incoming.state !== undefined &&
                        incoming.state !== null
                    ) {

                        incoming.state =
                            String(
                                incoming.state
                            );

                    }


                    /* ================================================
                       MICROPHONE STATUS
                       ================================================ */

                    if (
                        incoming.micStatus !== undefined &&
                        incoming.micStatus !== null
                    ) {

                        incoming.micStatus =
                            String(
                                incoming.micStatus
                            );

                    }


                    /* ================================================
                       TIMESTAMP
                       ================================================ */

                    /*
                     * Support several possible field names so you
                     * don't need to rewrite the dashboard later.
                     *
                     * Preferred:
                     *
                     * timestamp
                     *
                     * Also accepted:
                     *
                     * lastUpdate
                     * updatedAt
                     * time
                     */

                    if (
                        incoming.timestamp === undefined
                    ) {

                        if (
                            incoming.lastUpdate !== undefined
                        ) {

                            incoming.timestamp =
                                incoming.lastUpdate;

                        }

                        else if (
                            incoming.updatedAt !== undefined
                        ) {

                            incoming.timestamp =
                                incoming.updatedAt;

                        }

                        else if (
                            incoming.time !== undefined
                        ) {

                            incoming.timestamp =
                                incoming.time;

                        }

                    }


                    /*
                     * Apply actual Firebase telemetry.
                     */

                    applyData(
                        incoming
                    );

                }

            );


        if (!connected) {

            const banner =
                $("demoBanner");


            if (banner) {

                banner.innerHTML =
                    "! FIREBASE NOT CONFIGURED " +
                    "<span>— check firebase-config.js</span>";

            }


            setText(
                "connectionBadge",
                "OFFLINE"
            );


            setText(
                "frontendMode",
                "CONFIG REQUIRED"
            );


            setText(
                "linkStatus",
                "OFFLINE"
            );


            setText(
                "sideLink",
                "OFFLINE"
            );


            setText(
                "sideSource",
                "NOT CONNECTED"
            );


            return;

        }

    }

    catch (error) {

        console.error(
            "Firebase connection failed:",
            error
        );


        const banner =
            $("demoBanner");


        if (banner) {

            banner.innerHTML =
                "! FIREBASE CONNECTION ERROR " +
                "<span>— check Firebase configuration and Realtime Database rules</span>";

        }


        setText(
            "connectionBadge",
            "ERROR"
        );


        setText(
            "frontendMode",
            "CONNECTION ERROR"
        );


        setText(
            "linkStatus",
            "ERROR"
        );


        setText(
            "sideLink",
            "ERROR"
        );


        setText(
            "sideSource",
            "FIREBASE ERROR"
        );

    }

}


/* ============================================================
   START APPLICATION
   ============================================================ */

window.addEventListener(
    "load",
    async () => {

        /*
         * Navigation
         */

        initNavigation();


        /*
         * Browser clock.
         *
         * This is only the current browser time.
         * It is NOT used as telemetry update time.
         */

        updateClock();


        setInterval(
            updateClock,
            1000
        );


        /*
         * Power chart.
         */

        initPowerChart();


        /*
         * Firebase.
         */

        await initializeFirebase();

    }
);
