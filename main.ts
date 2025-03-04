import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron';
const path = require('path');

import * as TIMEUTILS from './backend/timeutils';
import * as TRACK from './backend/tracks';
import * as STATE from './backend/state';
import * as COVER from './backend/covers';
import * as MSG from './backend/messages';
import * as DB from './backend/database';
import * as AB from './backend/audiobook';


let mainWindow: BrowserWindow | null = null;

function initializeWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#00000000',
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
        },
    });

    MSG.setupWindow(mainWindow);
    
    mainWindow.setMenu(null);
    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools();

    console.log(path.join(__dirname, '/src/icon/prev.png'));

    mainWindow.setThumbarButtons([
        {
            tooltip: 'Previous',
            icon: nativeImage.createFromPath(path.join(__dirname, '../src/icon/prev.png')),
            click: () => {
                mainWindow?.webContents.send('CTRL:prev');
            }
        },
        {
            tooltip: 'Play/Pause',
            icon: nativeImage.createFromPath(path.join(__dirname, '../src/icon/pause.png')),
            click: () => {
                mainWindow?.webContents.send('CTRL:playPause');
            }
        },
        {
            tooltip: 'Next',
            icon: nativeImage.createFromPath(path.join(__dirname, '../src/icon/next.png')),
            click: () => {
                mainWindow?.webContents.send('CTRL:next');
            }
        }
    ]);
}

app.whenReady().then(() => {
    initializeWindow();
    DB.initializeDatabase();
})


// STATE bridge signals handlers:

ipcMain.handle('STATE:get', async () => { return STATE.STATE; })
ipcMain.handle('STATE:set', async (ev, newState: { volume: number, recentAudiobook: number | null }) => { STATE.saveState(newState); })


// AUDIOBOOKS bridge signals handlers:

ipcMain.handle('AB:fetch', async (ev, abId: number): Promise<AB.Audiobook | null> => { return AB.getAudiobook(abId); });
ipcMain.handle('AB:fetchAll', async (): Promise<AB.Audiobook[]> => { 
    const audiobooks: AB.Audiobook[] = [];
    DB.queryAll({table: DB.Tables.audiobooks, cols: "id"}).forEach((abData: any) => {
        const audiobook = AB.getAudiobook(abData?.id);
        if (audiobook !== null) audiobooks.push(audiobook);
    })
    return audiobooks;
});
ipcMain.handle('AB:import', async (): Promise<void> => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'multiSelections']
    });
    if (result.canceled) return;
    for (const path of result.filePaths) await AB.importAudiobook(path);
});
ipcMain.handle('AB:delete', async (ev, abId: number): Promise<void> => {
    const audiobook = AB.getAudiobook(abId);
    if (audiobook === null) return console.error(`Failed to delete audiobook: ${abId} (not found).`);

    audiobook.delete();
});
ipcMain.handle('AB:calcProgress', async (ev, abId: number): Promise<number | undefined> => {
    const audiobook = AB.getAudiobook(abId);
    if (audiobook === null) return;
    return audiobook.calculateProgress();
});
ipcMain.handle('AB:playbackUpdate', async (ev, abId: string, trackIndex: number, currMomentS: number, speed: number): Promise<void> => {
    const audiobook = AB.getAudiobook(parseInt(abId));
    if (audiobook === null) return;

    STATE.STATE.recentAudiobook = audiobook.id;
    STATE.saveState(STATE.STATE);
    audiobook.updatePlaybackState(trackIndex, currMomentS, speed);
});
ipcMain.handle('AB:edit', async (ev, abId: number, title: string, author: string, tracksIdIndex: [[number, number]]): Promise<void> => {
    const audiobook = AB.getAudiobook(abId);
    if (audiobook === null) return;
    
    DB.updateSet(DB.Tables.audiobooks, {
        title: title,
        author: author
    }, abId)

    let index = 1;
    for (const track of tracksIdIndex) {
        const [trackId, currIndex] = track;
        if (currIndex != index) DB.updateSet(DB.Tables.tracks, {idx: index}, trackId)
        index++;
    }
});
ipcMain.handle('AB:openPath', async (ev, path: string): Promise<void> => { shell.openPath(path); });
ipcMain.handle('AB:switchCover', async (ev, abId: number): Promise<string | false> => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png'] }]
    });

    if (!result.canceled) {
        const timestamp = new Date().getTime();
        const coverPath = COVER.saveCoverFromFile(abId, result.filePaths[0]) + `?v=${timestamp}`;
        return coverPath;
    }
    
    return false;
});
ipcMain.handle('AB:finish', async (ev, abId: number): Promise<void> => { 
    DB.updateSet(DB.Tables.audiobooks, {progress: 100, curr_track: 1, curr_moment_s: 0}, abId);
});


// TRACKS bridge signals handlers:

ipcMain.handle('TRACK:getById', async (ev, trackId: number): Promise<TRACK.Track | null> => { 
    const trackData = DB.querySingle({
        table: DB.Tables.tracks,
        whereStmt: `id=${trackId}`
    });

    if (trackData === false) return null;
    return new TRACK.Track(trackData);
});
ipcMain.handle('TRACK:getByIndex', async (ev, abId: number, trackIndex: number): Promise<TRACK.Track | null> => { 
    const audiobook = AB.getAudiobook(abId);
    if (audiobook === null) return null;
    
    console.log(trackIndex)

    for (const track of audiobook.tracks) {
        if (track.index == trackIndex) return track;
    }

    return null;
});


// BOOKMARKS bridge signals handlers:

ipcMain.handle('BOOKMARK:add', async (ev, trackId: number, momentS: number, comment: string | undefined): Promise<void> => { 
    DB.insertInto(DB.Tables.bookmarks, {
        track_id: trackId,
        moment_s: momentS,
        comment: comment || null,
        date_add: TIMEUTILS.getDate()
    });
});
ipcMain.handle('BOOKMARK:delete', async (ev, bookmarkId: number): Promise<void> => { DB.deleteFrom(DB.Tables.bookmarks, `id=${bookmarkId}`); });
ipcMain.handle('BOOKMARK:getAll', async (ev, bookmarkId: number): Promise<any[]> => {
    const rawAudiobooks = DB.queryAll({table: DB.Tables.audiobooks});
    const allAudiobooks: AB.Audiobook[] = [];
    for (const rawAudiobook of rawAudiobooks) allAudiobooks.push(new AB.Audiobook(rawAudiobook));
    
    const bookmarkedAudiobooks: any[] = [];
    
    allAudiobooks.forEach((ab) => {
        if (ab.bookmarks.length == 0) return;

        const allTracks = TRACK.getAllTracks(ab.id);
        const bookmarks: any[] = [];

        allTracks.forEach((track) => {
            const trackBookmarks = DB.queryAll({
                table: DB.Tables.bookmarks,
                whereStmt: `track_id=${track.id}`
            })
            
            if (trackBookmarks.length > 0) {
                trackBookmarks.forEach((bookmark) => {
                    bookmark.track_index = track.index;
                    bookmark.track_title = track.title;
                })
                bookmarks.push(trackBookmarks);
            }
        });
        
        bookmarkedAudiobooks.push({
            audiobook: ab,
            bookmarksData: bookmarks
        });
    })

    return bookmarkedAudiobooks;
});


// AUTHORS bridge signals handlers:
type AuthorT = {name: string, picture: string, audiobooks: AB.Audiobook[]};

ipcMain.handle('AUTHOR:fetch', async (ev, name: string): Promise<AuthorT> => { 
    const rawAudiobooks = DB.queryAll({
        table: DB.Tables.audiobooks,
        whereStmt: `author='${name}'`
    });

    const audiobooks: AB.Audiobook[] = [];
    for (const rawAudiobook of rawAudiobooks) audiobooks.push(new AB.Audiobook(rawAudiobook));

    const authorData: AuthorT = {
        name: name,
        picture: await COVER.getAuthorImage(name),
        audiobooks: audiobooks
    }

    return authorData;
});
ipcMain.handle('AUTHOR:fetchAll', async (): Promise<AuthorT[]> => { 
    const authorsData: AuthorT[] = [];
    const authorNames = DB.queryAll({
        table: DB.Tables.audiobooks,
        cols: "author",
        distinct: true
    });

    for (const author of authorNames) {
        const name = author.author;
        const audiobooks = DB.queryAll({
            table: DB.Tables.audiobooks,
            whereStmt: `author='${name}'`
        });

        authorsData.push({
            name: name,
            picture: await COVER.getAuthorImage(name),
            audiobooks: audiobooks
        })
    }

    return authorsData;
});
ipcMain.handle('AUTHOR:rename', async (ev, oldName: string, newName: string): Promise<void> => { 
    DB.updateSetWhere(DB.Tables.audiobooks, {author: newName}, `author='${oldName}'`);
});
ipcMain.handle('AUTHOR:shufflePicture', async (ev, name: string): Promise<string> => { return await COVER.updateAuthorCover(name); });



