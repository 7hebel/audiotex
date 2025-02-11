const path = require('path');
const fs = require('fs');

const appdataPath = require('electron').app.getPath('userData');
const stateFilePath = path.join(appdataPath, 'state.json');

if (!fs.existsSync(stateFilePath)) fs.open(stateFilePath, 'w', () => {});

type StateT = { volume: number, recentAudiobook: number | null };

export var STATE: StateT = {
    volume: 0.5,
    recentAudiobook: null,
}

try {
    STATE = JSON.parse(fs.readFileSync(stateFilePath));
} catch (err) {
    console.error("Failed to load state. Saving default.");
    saveState(STATE);
}

export function saveState(state: StateT) {
    STATE = state;
    fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), () => {});
}
