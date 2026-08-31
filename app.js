/*
 * ============================================================
 * EdgeKWS — Firebase Live Dashboard
 * ============================================================
 *
 * DATA FLOW:
 *
 * ESP32
 *   ↓
 * Wi-Fi
 *   ↓
 * Firebase Realtime Database
 *   ↓
 * app.js
 *   ↓
 * Dashboard
 *
 * IMPORTANT:
 * - No random telemetry is generated here.
 * - No power value is required in Firebase.
 * - Power is calculated locally:
 *
 *       POWER (mW) = VOLTAGE (V) × CURRENT (mA)
 *
 * Firebase path:
 *
 * devices/{deviceId}/live
 *
 * ============================================================
 */


/* ============================================================
   CENTRAL SYSTEM DATA
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

    detectionsToday: 0,

    falseActivations: 0,

    lastDetection: "--:--:--",

    /*
     * These exist ONLY inside the browser.
     *
     * They are NOT required in Firebase.
     */

    powerHistory: [],

    timeLabels: []

};


/* ============================================================
   DOM HELPER
   ============================================================ */

const $ = id => document.getElementById(id);


/* ============================================================
   NUMBER FORMATTER
   ============================================================ */

const fmt = (value, decimals = 1) => {

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toFixed(decimals)
        : "--";

};


/* ============================================================
   POWER CALCULATION
   ============================================================ */

function calculatePower() {

    const voltage = Number(systemData.voltage);

    const current = Number(systemData.currentMa);


    /*
     * V × mA = mW
     */

    if (
        !Number.isFinite(voltage) ||
        !Number.isFinite(current)
    ) {

        return 0;

    }


    return voltage * current;

}


/* ============================================================
   POWER GRAPH SAMPLE
   ============================================================ */

function appendPowerSample(power) {

    const value = Number(power);


    if (!Number.isFinite(value)) {

        return;

    }


    const now = new Date();


    systemData.powerHistory.push(value);


    systemData.timeLabels.push(

        now.toLocaleTimeString(
            [],
            {
                hour12: false
            }
        )

    );


    /*
     * Keep the last 30 samples.
     */

    if (
        systemData.powerHistory.length > 30
    ) {

        systemData.powerHistory.shift();

        systemData.timeLabels.shift();

    }

}


/* ============================================================
   APPLY FIREBASE DATA
   ============================================================ */

function applyData(incoming = {}) {

    /*
     * Copy Firebase values into our central data object.
     */

    Object.assign(
        systemData,
        incoming
    );


    systemData.mode = "firebase";


    /* ========================================================
       RAM PERCENTAGE
       ======================================================== */

    const ramLimit =
        Number(systemData.ramLimitKb);

    const ramUsed =
        Number(systemData.ramUsedKb);


    const ramPct =
        ramLimit > 0
            ? (ramUsed / ramLimit) * 100
            : 0;


    /* ========================================================
       STATE
       ======================================================== */

    const currentState =
        String(
            systemData.state || ""
        ).toUpperCase();


    const listening =
        currentState === "LISTENING";


    const wakeDetected =
        currentState === "WAKE_DETECTED" ||
        currentState === "WAKE DETECTED";


    const streaming =
        currentState === "STREAMING";


    /* ========================================================
       POWER
       ======================================================== */

    const calculatedPower =
        calculatePower();


    /*
     * Store calculated power locally.
     *
     * This does NOT send it back to Firebase.
     */

    systemData.powerMw =
        calculatedPower;


    /* ========================================================
       BASIC CONNECTION UI
       ======================================================== */

    $("deviceId").textContent =
        systemData.deviceId;


    $("sideLink").textContent =
        "FIREBASE LIVE";


    $("sideSource").textContent =
        "FIREBASE LIVE";


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
        new Date().toLocaleTimeString(
            [],
            {
                hour12: false
            }
        );


    /* ========================================================
       CPU
       ======================================================== */

    $("cpu").textContent =
        fmt(
            systemData.cpuPercent
        ) + "%";


    const cpu =
        Number(systemData.cpuPercent);


    $("cpuBar").style.width =
        Math.min(
            Math.max(
                cpu * 10,
                0
            ),
            100
        ) + "%";


    $("cpuStatus").textContent =
        cpu < 10
            ? "TARGET STATUS // PASS"
            : "TARGET STATUS // ABOVE LIMIT";


    /* ========================================================
       RAM
       ======================================================== */

    $("ram").textContent =
        fmt(
            systemData.ramUsedKb,
            0
        );


    $("ramPercent").textContent =
        fmt(
            ramPct
        ) + "%";


    $("ramBar").style.width =
        Math.min(
            Math.max(
                ramPct,
                0
            ),
            100
        ) + "%";


    /* ========================================================
       VOLTAGE
       ======================================================== */

    $("voltage").textContent =
        fmt(
            systemData.voltage,
            2
        ) + " V";


    /* ========================================================
       CURRENT
       ======================================================== */

    $("current").textContent =
        fmt(
            systemData.currentMa
        ) + " mA";


    /* ========================================================
       CALCULATED POWER
       ======================================================== */

    $("power").textContent =
        fmt(
            calculatedPower
        );


    $("powerFormula").textContent =
        fmt(
            calculatedPower
        );


    $("powerFormulaText").textContent =
        `${fmt(systemData.voltage, 2)} V × ${fmt(systemData.currentMa)} mA`;


    /* ========================================================
       INFERENCE
       ======================================================== */

    $("inference").textContent =
        fmt(
            systemData.inferenceMs
        );


    $("latency").textContent =
        fmt(
            systemData.inferenceMs
        );


    /* ========================================================
       CONFIDENCE
       ======================================================== */

    const confidence =
        Number(
            systemData.confidence
        );


    $("confidence").textContent =
        fmt(
            confidence
        ) + "%";


    $("confidenceBar").style.width =
        Math.min(
            Math.max(
                confidence,
                0
            ),
            100
        ) + "%";


    /* ========================================================
       THRESHOLD
       ======================================================== */

    const threshold =
        Number(
            systemData.threshold
        );


    $("threshold").textContent =
        fmt(
            threshold,
            0
        ) + "%";


    $("thresholdMark").style.left =
        Math.min(
            Math.max(
                threshold,
                0
            ),
            100
        ) + "%";


    /* ========================================================
       DETECTIONS
       ======================================================== */

    $("detections").textContent =
        systemData.detectionsToday ?? 0;


    $("falseActivations").textContent =
        systemData.falseActivations ?? 0;


    $("lastDetection").textContent =
        systemData.lastDetection ||
        "--:--:--";


    /* ========================================================
       KWS STATE
       ======================================================== */

    let displayState = "LISTENING";


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

        /*
         * Show whatever state Firebase sent.
         */

        displayState =
            currentState || "WAITING";

    }


    $("kwsState").textContent =
        displayState;


    $("kwsBadge").textContent =
        displayState;


    /* ========================================================
       MODE PILL
       ======================================================== */

    if (wakeDetected) {

        $("modePill").textContent =
            "WAKE EVENT ACTIVE";

    }

    else if (streaming) {

        $("modePill").textContent =
            "ASR STREAMING";

    }

    else {

        $("modePill").textContent =
            "IDLE LISTENING";

    }


    /* ========================================================
       SIGNAL STATE
       ======================================================== */

    if (wakeDetected) {

        $("signalState").textContent =
            "WAKE EVENT";

    }

    else if (streaming) {

        $("signalState").textContent =
            "STREAMING";

    }

    else {

        $("signalState").textContent =
            "DECISION";

    }


    /* ========================================================
       EVENT SIGNAL
       ======================================================== */

    if (wakeDetected) {

        $("eventSignal").textContent =
            "TRIGGERED";

    }

    else if (streaming) {

        $("eventSignal").textContent =
            "STREAMING";

    }

    else {

        $("eventSignal").textContent =
            "ARMED";

    }


    /* ========================================================
       EVENT TEXT
       ======================================================== */

    if (wakeDetected) {

        $("eventText").textContent =
            "KEYWORD DETECTED — START ASR";


        $("eventSubtext").textContent =
            `Confidence ${fmt(confidence)}%`;

    }

    else if (streaming) {

        $("eventText").textContent =
            "AUDIO STREAMING TO ASR";


        $("eventSubtext").textContent =
            "Remote processing active";

    }

    else {

        $("eventText").textContent =
            "LISTENING FOR WAKE PHRASE";


        $("eventSubtext").textContent =
            "No keyword event detected";

    }


    /* ========================================================
       VISUAL DETECTION STATE
       ======================================================== */

    $("eventIndicator")
        .classList
        .toggle(
            "detected",
            wakeDetected || streaming
        );


    $("reactor")
        .classList
        .toggle(
            "detected",
            wakeDetected || streaming
        );


    /* ========================================================
       DEMO / LIVE BANNER
       ======================================================== */

    $("demoBanner").innerHTML =
        "● FIREBASE LIVE TELEMETRY " +
        "<span>— values below are read directly from Firebase Realtime Database</span>";


    /* ========================================================
       POWER HISTORY
       ======================================================== */

    /*
     * Add the newly calculated power value.
     */

    if (
        Number.isFinite(
            calculatedPower
        )
    ) {

        appendPowerSample(
            calculatedPower
        );

    }


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


        $("powerAvg").textContent =
            fmt(
                average
            );


        $("powerRange").textContent =
            `${fmt(minimum)}–${fmt(maximum)}`;

    }

    else {

        $("powerAvg").textContent =
            fmt(
                calculatedPower
            );


        $("powerRange").textContent =
            "--";

    }


    /* ========================================================
       UPDATE POWER CHART
       ======================================================== */

    updatePowerChart();

}


/* ============================================================
   POWER CHART
   ============================================================ */

let powerChart = null;


/* ============================================================
   UPDATE POWER CHART
   ============================================================ */

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


    $("clock").textContent =
        now.toLocaleTimeString(
            [],
            {
                hour12: false
            }
        );


    $("date").textContent =
        now.toLocaleDateString(
            [],
            {
                month: "short",

                day: "2-digit",

                year: "numeric"

            }
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


                        $("sidebar")
                            .classList
                            .remove(
                                "open"
                            );

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

                $("sidebar")
                    .classList
                    .toggle(
                        "open"
                    );

            }
        );

    }

}


/* ============================================================
   FIREBASE CONNECTION
   ============================================================ */

async function initializeFirebase() {

    if (
        !window.EdgeKWSFirebase
    ) {

        console.warn(
            "EdgeKWSFirebase adapter not found."
        );

        $("demoBanner").innerHTML =
            "! FIREBASE ADAPTER NOT FOUND " +
            "<span>— check firebase-service.js</span>";


        $("connectionBadge").textContent =
            "ERROR";


        $("frontendMode").textContent =
            "ADAPTER ERROR";


        $("linkStatus").textContent =
            "ERROR";


        return;

    }


    try {

        const connected =
            await window.EdgeKWSFirebase.connect(

                systemData.deviceId,

                data => {

                    /*
                     * Firebase sent new telemetry.
                     */

                    if (!data) {

                        return;

                    }


                    /*
                     * Copy Firebase data.
                     *
                     * No random/demo data is added.
                     */

                    const incoming =
                        {
                            ...data
                        };


                    /*
                     * Convert numeric fields safely.
                     */

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


                    /*
                     * IMPORTANT:
                     *
                     * We deliberately do NOT read:
                     *
                     * incoming.powerMw
                     *
                     * because power is calculated from:
                     *
                     * voltage × currentMa
                     */


                    applyData(
                        incoming
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


            $("sideLink").textContent =
                "OFFLINE";


            $("sideSource").textContent =
                "NOT CONNECTED";


            return;

        }

    }

    catch (error) {

        console.error(
            "Firebase connection failed:",
            error
        );


        $("demoBanner").innerHTML =
            "! FIREBASE CONNECTION ERROR " +
            "<span>— check Firebase configuration and database rules</span>";


        $("connectionBadge").textContent =
            "ERROR";


        $("frontendMode").textContent =
            "CONNECTION ERROR";


        $("linkStatus").textContent =
            "ERROR";


        $("sideLink").textContent =
            "ERROR";


        $("sideSource").textContent =
            "FIREBASE ERROR";

    }

}


/* ============================================================
   APPLICATION START
   ============================================================ */

window.addEventListener(
    "load",
    async () => {

        /*
         * Navigation
         */

        initNavigation();


        /*
         * Clock
         */

        updateClock();


        setInterval(
            updateClock,
            1000
        );


        /*
         * Chart
         */

        initPowerChart();


        /*
         * Firebase
         */

        await initializeFirebase();

    }
);
