/* Firebase adapter. Keep this file isolated so a future REST/FastAPI adapter can replace it. */
import firebaseConfig from "./firebase-config.js";

window.EdgeKWSFirebase = (() => {
  let db = null;
  function validConfig(){
    const c=window.EDGEKWS_FIREBASE_CONFIG;
    return c && c.apiKey && !c.apiKey.startsWith("YOUR_") && c.databaseURL && !c.databaseURL.includes("YOUR_PROJECT");
  }
  async function connect(deviceId,onData){
    if(!validConfig() || !window.firebase) return false;
    if(!firebase.apps.length) firebase.initializeApp(window.EDGEKWS_FIREBASE_CONFIG);
    db=firebase.database();
    const ref=db.ref(`devices/${deviceId}/live`);
    ref.on("value", snap=>{
      const v=snap.val();
      if(v) onData(v);
    }, err=>console.warn("Firebase RTDB listener:",err));
    return true;
  }
  return {connect};
})();
