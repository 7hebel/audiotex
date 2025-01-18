const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const audibook = require('./backend/audiobook');
const msg = require('./backend/messages');
const db = require('./backend/database');
const path = require('path');


let ROOT_WIN = null;

const createWindow = () => {
    ROOT_WIN = new BrowserWindow({
        width: 1600,
        height: 1000,
        backgroundColor: '#0f0e11',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    msg._setWin(ROOT_WIN);
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
    return db.getTracks(ab_id);
});

ipcMain.handle('delete-audiobook', async (ev, ab_id) => {
    audibook.removeCover(ab_id);
    return db.deleteAudiobookRelated(ab_id);
});

ipcMain.handle('play-audiobook', async (ev, ab_id) => {
    const audiobook = db.getAudiobook(ab_id);
    const currTrackIndex = audiobook.curr_track;
    const currentTrack = db.getIndexedTrack(ab_id, currTrackIndex);
    console.log(currTrackIndex, currentTrack)

    return {
        audiobook: db.getAudiobook(ab_id),
        track: currentTrack
    }
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


app.whenReady().then(() => {
    createWindow();
    db.initializeDatabase();
})

app.on('window-all-closed', () => {
    db.closeDatabase();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
