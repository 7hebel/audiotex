const { app, BrowserWindow, dialog, ipcMain, nativeImage } = require('electron');
const audibook = require('./backend/audiobook');
const msg = require('./backend/messages');
const db = require('./backend/database');
const state = require("./backend/state");
const path = require('path');

let ROOT_WIN = null;

const createWindow = () => {
    ROOT_WIN = new BrowserWindow({
        width: 1600,
        height: 1000,
        backgroundColor: '#0f0e11',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
        }
    });

    msg.setupWindow(ROOT_WIN);

    ROOT_WIN.setMenu(null);
    ROOT_WIN.loadFile('index.html');
    ROOT_WIN.webContents.openDevTools();
}

ipcMain.handle('import-new-ab', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (!result.canceled) {
        console.log("calling with ", result.filePaths[0]);
        return await audibook.importAudiobook(result.filePaths[0]);
    }

    return false;
});

ipcMain.handle('get-all-audiobooks', async () => {
    return db.getAllAudiobooks();
});

ipcMain.handle('get-audiobook-data', async (ev, ab_id) => {
    return db.getAudiobook(ab_id);
});

ipcMain.handle('get-tracks', async (ev, ab_id) => {
    return db.getAllTracks(ab_id);
});

ipcMain.handle('delete-audiobook', async (ev, ab_id) => {
    audibook.removeCover(ab_id);
    return db.deleteAudiobookRelated(ab_id);
});

ipcMain.handle('get-track-index', async (ev, ab_id, track_index) => {
    return db.getIndexedTrack(ab_id, track_index);
});

ipcMain.handle('play-audiobook', async (ev, ab_id, track_id = null) => {
    const audiobook = db.getAudiobook(ab_id);

    let currentTrack = null;
    if (track_id === null) {
        const currTrackIndex = audiobook.curr_track;
        currentTrack = db.getIndexedTrack(ab_id, currTrackIndex);
    } else {
        currentTrack = db.getTrackById(track_id);
    }

    state.STATE.recentAudiobook = parseInt(ab_id);
    state.saveState(state.STATE);

    return {
        audiobook: db.getAudiobook(ab_id),
        track: currentTrack
    }
});

ipcMain.handle('update-ab-state', async (ev, ab_id, track_id, curr_moment_s, speed) => {
    const currentDateParts = new Date().toISOString().split("T")[0].split("-");
    const year = currentDateParts[0];
    const month = currentDateParts[1];
    const day = currentDateParts[2];
    const lastPlayed = `${day}/${month}/${year}`;

    const track = db.getTrackById(parseInt(track_id));
    const trackIndex = track.idx;
    const trackTotalSeconds = track.total_seconds;
    const abTotalTracks = db.getAudiobook(ab_id).total_tracks;
    const progress = Math.round(trackIndex / abTotalTracks);
    
    db.updatePlayState(ab_id, trackIndex, curr_moment_s, lastPlayed, progress, speed);
    ROOT_WIN.setProgressBar(curr_moment_s / trackTotalSeconds, { mode: "normal" });
});

ipcMain.handle('update-audiobook-meta', async (ev, ab_id, title, author, tracks) => {
    db.db.exec(`
        UPDATE audiobooks
        SET title = '${title}', author = '${author}'
        WHERE id = ${ab_id}    
    `)

    let index = 1;
    for (const track of tracks) {
        const trackId = track[0];
        const currIndex = track[1];

        if (currIndex != index) {
            db.db.exec(`
                UPDATE tracks
                SET idx = ${index}
                WHERE id = ${trackId}
            `)
        }

        index++;
    }

    console.log(`Saved changes in audiobook: ${ab_id}`)
});

ipcMain.handle('get-state', async () => {
    return state.STATE;
})

ipcMain.handle('set-state', async (e, newState) => {
    state.saveState(newState);
})


app.whenReady().then(() => {
    createWindow();
    db.initializeDatabase();
})

app.on('window-all-closed', () => {
    db.db.close();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
