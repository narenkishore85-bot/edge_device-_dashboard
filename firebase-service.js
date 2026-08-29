/* Firebase adapter.
   Firebase is the only data source for live ESP32 telemetry.
   No random/demo values are generated here.
*/

import firebaseConfig from "./firebase-config.js";

window.EdgeKWSFirebase = (() => {

    let db = null;

    function validConfig() {
        return (
            firebaseConfig &&
            firebaseConfig.apiKey &&
            !firebaseConfig.apiKey.startsWith("YOUR_") &&
            firebaseConfig.databaseURL &&
            !firebaseConfig.databaseURL.includes("YOUR_PROJECT")
        );
    }

    async function connect(deviceId, onData) {

        if (!validConfig()) {
            console.error("EdgeKWS: Firebase configuration is missing or invalid.");
            return false;
        }

        if (!window.firebase) {
            console.error("EdgeKWS: Firebase SDK is not loaded.");
            return false;
        }

        try {

            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            db = firebase.database();

            const ref = db.ref(`devices/${deviceId}/live`);

            ref.on(
                "value",
                (snapshot) => {

                    const data = snapshot.val();

                    if (data !== null) {
                        console.log("EdgeKWS Firebase data:", data);
                        onData(data);
                    } else {
                        console.log("EdgeKWS: No data at Firebase path.");
                    }
                },
                (error) => {
                    console.error(
                        "EdgeKWS Firebase listener error:",
                        error
                    );
                }
            );

            console.log(
                `EdgeKWS connected to devices/${deviceId}/live`
            );

            return true;

        } catch (error) {

            console.error(
                "EdgeKWS Firebase connection failed:",
                error
            );

            return false;
        }
    }

    return {
        connect
    };

})();
