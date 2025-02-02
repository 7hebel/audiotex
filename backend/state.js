const path = require('path');
const fs = require('fs');

const appdataPath = require('electron').app.getPath('userData');
const stateFilePath = path.join(appdataPath, 'state.json');

if (!fs.existsSync(stateFilePath)) fs.open(stateFilePath, 'w', () => {});

var STATE = {
    volume: 0.5,
    recentAudiobook: null,
}

try {
    STATE = JSON.parse(fs.readFileSync(stateFilePath));
} catch (err) {
    console.error("Failed to load state. Saving default.");
    saveState(STATE);
}

function saveState(state) {
    STATE = state;
    fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), () => {});
}


module.exports = {
    STATE,
    saveState
}
