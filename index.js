const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const audiobook = require('./backend/audiobook');
const timeutils = require('./backend/timeutils')
const msg = require('./backend/messages');
const db = require('./backend/database');
const state = require("./backend/state");
const path = require('path');


let ROOT_WIN = null;

const createWindow = () => {
    ROOT_WIN = new BrowserWindow({
        width: 1600,
        height: 1000,
        minWidth: 1200,
        minHeight: 800,
        backgroundColor: '#0f0e11',
        icon: __dirname + '/src/icon/app-icon.png',
        titleBarStyle: "hidden",
        titleBarOverlay: {
            color: "#00000000",
            symbolColor: "#BBBBBB",
            height: 28
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
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
        properties: ['openDirectory', 'multiSelections']
    });

    if (!result.canceled) {
        const imported = [];
        const promises = result.filePaths.map((path) =>
            audiobook.importAudiobook(path).then((data) => {
                imported.push(data);
            })
        );

        await Promise.all(promises);
        return imported;
    }

    return false;
});

ipcMain.handle('get-new-ab-cover-file', async (ev, ab_id) => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png'] }]
    });

    if (!result.canceled) {
        const timestamp = new Date().getTime();
        const coverPath = audiobook.saveCoverFromFile(ab_id, result.filePaths[0]) + `?v=${timestamp}`;
        db.db.exec(`
            UPDATE audiobooks
            SET cover_src='${coverPath}'
            WHERE id=${ab_id}
        `);
            
        return coverPath;
    }
    
    return false;
});

ipcMain.handle('get-all-audiobooks', async () => {
    return db.getAllAudiobooks().filter(a => !audiobook.getLostAudiobooks().includes(a.id));
});

ipcMain.handle('get-audiobook-data', async (ev, ab_id) => {
    if (audiobook.getLostAudiobooks().includes(ab_id)) return null;
    let abData = db.getAudiobook(ab_id);
    abData.bookmarksCount = db.countBookmarksInAudiobook(ab_id);
    return abData;
});

ipcMain.handle('get-tracks', async (ev, ab_id) => {
    return db.getAllTracks(ab_id);
});

ipcMain.handle('delete-audiobook', async (ev, ab_id) => {
    audiobook.removeCover(ab_id);
    return db.deleteAudiobookRelated(ab_id);
});

ipcMain.handle('get-track-index', async (ev, ab_id, track_index) => {
    return db.getIndexedTrack(ab_id, track_index);
});

ipcMain.handle('calc-ab-progress', async (ev, ab_id) => {
    return audiobook.calculateProgress(ab_id);
});

ipcMain.handle('get-track-id', async (ev, track_id) => {
    const trackData = db.getTrackById(track_id);
    trackData.bookmarks = db.getBookmarksForTrack(track_id);
    return trackData;
});

ipcMain.handle('play-audiobook', async (ev, ab_id, track_id = null) => {
    const audiobook = db.getAudiobook(ab_id);
    if (!audiobook) return;

    let currentTrack = null;
    if (track_id === null) {
        const currTrackIndex = audiobook.curr_track;
        currentTrack = db.getIndexedTrack(ab_id, currTrackIndex);
    } else {
        currentTrack = db.getTrackById(track_id);
    }

    currentTrack.bookmarks = db.getBookmarksForTrack(currentTrack.id);

    state.STATE.recentAudiobook = parseInt(ab_id);
    state.saveState(state.STATE);

    const trackIndex = currentTrack.idx;
    const totalTracks = audiobook.total_tracks;
    const abProgress = Math.round((trackIndex / totalTracks) * 100);
    
    db.db.exec(`
        UPDATE audiobooks
        SET progress=${abProgress}
        WHERE id=${ab_id}    
    `)

    return {
        audiobook: audiobook,
        track: currentTrack
    }
});

ipcMain.handle('update-ab-state', async (ev, ab_id, track_id, curr_moment_s, speed) => {
    const track = db.getTrackById(parseInt(track_id));
    const trackIndex = track.idx;
    const trackTotalSeconds = track.total_seconds;
    const progress = audiobook.calculateProgress(ab_id);
    const lastPlayed = timeutils.getDate();
    
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

ipcMain.handle('add-bookmark', async (ev, track_id, moment_s, comment) => {
    db.insertBookmark(track_id, moment_s, comment);
})

ipcMain.handle('count-bookmarks', async (ev, ab_id) => {
    return db.countBookmarksInAudiobook(ab_id);
})

ipcMain.handle('count-total-bookmarks', async (ev) => {
    return db.countTotalBookmarks();
})

ipcMain.handle('remove-bookmark', async (ev, bookmark_id) => {
    db.db.exec(`
        DELETE FROM bookmarks
        WHERE id = ${bookmark_id};
    `)
})

ipcMain.handle('prepare-bookmarks-data', async (ev) => {
    const allAudiobooks = db.getAllAudiobooks();
    const bookmarkedAudiobooks = [];
    
    allAudiobooks.forEach((ab) => {
        if (audiobook.getLostAudiobooks().includes(ab.id)) return;
        
        const bookmarksCount = db.countBookmarksInAudiobook(ab.id);
        if (bookmarksCount == 0) return;

        ab.bookmarksCount = bookmarksCount;
        const allTracks = db.getAllTracks(ab.id);
        const bookmarks = [];

        allTracks.forEach((track) => {
            const trackBookmarks = db.getBookmarksForTrack(track.id);
            if (trackBookmarks.length > 0) {
                trackBookmarks.forEach((bookmark) => {
                    bookmark.track_index = track.idx;
                    bookmark.track_title = track.title;
                })
                bookmarks.push(trackBookmarks);
            }
        });
        
        bookmarkedAudiobooks.push({
            audiobook: ab,
            bookmarks: bookmarks
        });
    })

    return bookmarkedAudiobooks;
})

ipcMain.handle('get-authors', async (ev) => {
    const authors = db.getAuthors();
    for (const author of authors) {
        author.imgUrl = await audiobook.getAuthorImage(author.author);
        author.items = db.getAudiobooksByAuthor(author.author);
    }
    return authors;
})

ipcMain.handle('get-author-data', async (ev, name) => {
    const audiobooks = await db.getAudiobooksByAuthor(name).filter(ab => !audiobook.getLostAudiobooks().includes(ab.id));
    const avatar = await audiobook.getAuthorImage(name);
    return {
        audiobooks: audiobooks,
        imgUrl: avatar
    }
})

ipcMain.handle('rename-author', async (ev, oldName, newName) => {
    db.db.exec(`
        UPDATE audiobooks
        SET author='${newName}'
        WHERE author='${oldName}'
    `);

    console.log(`Renamed author ${oldName} to ${newName}`);
})

ipcMain.handle('update-author-avatar', async (ev, name) => {
    return await audiobook.updateAuthorCover(name);
})

ipcMain.handle('get-lost-abs', async (ev) => {
    return audiobook.getLostAudiobooks();
})

ipcMain.handle('open-file-in-explorer', async (ev, path) => {
    shell.openPath(path);
})

ipcMain.handle('get-state', async () => { return state.STATE; })
ipcMain.handle('set-state', async (e, newState) => {
    state.STATE = newState;
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
