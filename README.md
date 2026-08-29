# EdgeKWS v2 — Firebase + ESP32-S3 // JARVIS-style HUD

A professional, JARVIS-inspired engineering dashboard for SIH Problem Statement 172.

## What this version does

- Dark sci-fi engineering HUD without a framework
- Responsive desktop-first layout
- Dashboard + KWS + Performance + Power + Network/ASR + Experiments pages
- Firebase Realtime Database adapter
- Automatic DEMO mode fallback when Firebase is not configured/reachable
- Centralized `systemData` object for UI/demo measurements
- Chart.js telemetry visualizations
- ESP32-S3 Firebase telemetry starter sketch
- Firebase Realtime Database rules and schema
- Clear DEMO / SIMULATED labeling
- No database or backend server is required for the frontend

## 1. Configure Firebase

In Firebase Console:

1. Create/select your project.
2. Enable Realtime Database.
3. Create a Web App.
4. Copy the Firebase Web configuration.
5. Copy `firebase-config.example.js` to `firebase-config.js`.
6. Replace the placeholders with your project values.
7. Enable Firebase Authentication (Email/Password or another supported method).
8. Deploy the rules from `firebase/database.rules.json`.

The browser config is client-side configuration, not an admin credential. Database access must be protected with Authentication + Security Rules.

## 2. Database path used by the dashboard

The dashboard listens to:

`devices/esp32s3_001/live`

The adapter is intentionally isolated in `firebase-service.js`. Later it can be replaced with a REST/FastAPI adapter without rewriting the UI.

## 3. Run locally

Recommended:

```bash
python -m http.server 8000
```

Open:

`http://localhost:8000`

You can also open `index.html` directly for the demo UI, but a local server is recommended for Firebase testing.

## 4. GitHub Pages

Push the project to GitHub and enable:

Settings → Pages → Deploy from branch → `main` → `/root`

Make sure `firebase-config.js` is present in the deployed site if you want browser Firebase connectivity.

For a public repository, never commit Firebase Admin SDK service-account JSON or private keys.

## 5. ESP32-S3

See `esp32/edgekws_firebase.ino`.

Install the current `FirebaseClient` Arduino library, enter Wi-Fi/Firebase authentication details, then replace the demonstration telemetry with your actual KWS measurements.

The intended pipeline is:

ESP32-S3 → Wi-Fi → Firebase RTDB → EdgeKWS dashboard

## 6. Data contract

The current UI expects camelCase telemetry:

```json
{
  "state": "LISTENING",
  "cpuPercent": 6.2,
  "ramUsedKb": 147,
  "ramLimitKb": 256,
  "voltage": 3.3,
  "currentMa": 6.0,
  "powerMw": 19.8,
  "inferenceMs": 4.7,
  "confidence": 12.4,
  "threshold": 85,
  "wakeLatencyMs": 85
}
```

## 7. Important engineering honesty

All values shown before hardware telemetry is connected are demonstration/simulated data. The UI explicitly labels DEMO mode. Do not present these numbers as measured ESP32-S3 results until your hardware instrumentation produces them.

## 8. Future architecture

ESP32-S3
→ Firebase / API
→ historical telemetry storage
→ dashboard

Future backend/database options can include PostgreSQL or SQLite with FastAPI, while Firebase can remain the realtime transport for the prototype.

## Firebase live-value test

This build has **no random/demo telemetry generator**. The dashboard waits for Firebase data.

The default Realtime Database path is:

`devices/esp32s3_001/live`

For a first test, create that node in Firebase Realtime Database and paste a JSON object such as:

```json
{
  "state": "LISTENING",
  "confidence": 12.4,
  "threshold": 85,
  "detectionsToday": 18,
  "falseActivations": 0,
  "lastDetection": "--:--:--",
  "inferenceMs": 4.7,
  "wakeLatencyMs": 85,
  "voltage": 3.30,
  "currentMa": 6.0,
  "powerMw": 19.8,
  "cpuPercent": 6.2,
  "ramUsedKb": 147,
  "ramLimitKb": 256
}
```

Then edit one value in Firebase, for example `powerMw` from `19.8` to `25.0`. The deployed page should update automatically through the Realtime Database listener.

You can also test the wake indicator by changing:

`state: "LISTENING"`

to:

`state: "WAKE DETECTED"`

The dashboard will switch its KWS indicator to **KEYWORD DETECTED**.
