/*
 * EdgeKWS Firebase Adapter
 *
 * Firebase Realtime Database is currently the only
 * telemetry source.
 *
 * Future architecture:
 *
 * ESP32-S3
 *     ↓
 * Firebase / API
 *     ↓
 * This adapter
 *     ↓
 * Dashboard
 *
 * No random/demo telemetry is generated here.
 */

import firebaseConfig from "./firebase-config.js";


window.EdgeKWSFirebase = (() => {

    let db = null;
    let listenerRef = null;


    function validConfig() {

        return (
            firebaseConfig &&
            typeof firebaseConfig === "object" &&
            firebaseConfig.apiKey &&
            firebaseConfig.authDomain &&
            firebaseConfig.databaseURL &&
            firebaseConfig.projectId &&
            firebaseConfig.appId &&
            !String(firebaseConfig.apiKey).startsWith("YOUR_") &&
            !String(firebaseConfig.databaseURL).includes("YOUR_")
        );
    }


    async function connect(deviceId, onData, onError) {

        if (!validConfig()) {

            console.error(
                "EdgeKWS: Firebase configuration is missing or invalid."
            );

            if (onError) {
                onError("INVALID_CONFIG");
            }

            return false;
        }


        if (!window.firebase) {

            console.error(
                "EdgeKWS: Firebase SDK is not loaded."
            );

            if (onError) {
                onError("SDK_NOT_LOADED");
            }

            return false;
        }


        try {

            /*
             * Initialize Firebase only once.
             */

            if (!firebase.apps.length) {

                firebase.initializeApp(firebaseConfig);

                console.log(
                    "EdgeKWS: Firebase initialized."
                );
            }


            db = firebase.database();


            /*
             * Firebase path:
             *
             * devices/
             *     esp32s3_001/
             *         live/
             */

            const path = `devices/${deviceId}/live`;

            listenerRef = db.ref(path);


            /*
             * Listen for realtime changes.
             */

            listenerRef.on(
                "value",

                (snapshot) => {

                    const data = snapshot.val();


                    if (data === null) {

                        console.log(
                            `EdgeKWS: No data at ${path}`
                        );

                        if (onError) {
                            onError("NO_DATA");
                        }

                        return;
                    }


                    console.log(
                        "EdgeKWS Firebase update:",
                        data
                    );


                    /*
                     * Pass Firebase data to app.js.
                     */

                    if (typeof onData === "function") {
                        onData(data);
                    }

                },

                (error) => {

                    console.error(
                        "EdgeKWS Firebase listener error:",
                        error
                    );

                    if (onError) {
                        onError(error);
                    }

                }
            );


            console.log(
                `EdgeKWS: Listening at ${path}`
            );


            return true;

        } catch (error) {

            console.error(
                "EdgeKWS: Firebase connection failed:",
                error
            );

            if (onError) {
                onError(error);
            }

            return false;
        }
    }


    function disconnect() {

        if (listenerRef) {

            listenerRef.off();

            listenerRef = null;

            console.log(
                "EdgeKWS: Firebase listener disconnected."
            );
        }
    }


    return {

        connect,
        disconnect

    };

})();
