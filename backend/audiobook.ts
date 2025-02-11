import { secondsToReadable } from "./timeutils";
import * as COVERS from "./covers";
import * as TRACKS from "./tracks";
import * as STATE from "./state";
import * as MSG from "./messages";
import * as DB from "./database";

const { loadMusicMetadata } = require(`music-metadata`);
const path = require('path');
const fs = require('fs');


// Get all audiobooks' ids which files are missing.
function _getLostAudiobooks(): number[] {
    const lostAudiobooks: number[] = [];
    const allAudiobooks: any = DB.queryAll({table: DB.Tables.audiobooks});
    
    for (const audiobook of allAudiobooks) {
        if (!fs.existsSync(audiobook.dirpath)) {
            lostAudiobooks.push(audiobook.id);
        }
    }

    const recentAudiobook = STATE.STATE.recentAudiobook;
    if (typeof recentAudiobook == "number" && recentAudiobook in lostAudiobooks) {
        STATE.STATE.recentAudiobook = null;
        STATE.saveState(STATE.STATE);
        console.error("Lost recent audiobook.");
    }

    return lostAudiobooks;
}

// Get Audiobook's instance if possible.
export function getAudiobook(audiobookId: number): Audiobook | null {
    if (audiobookId in _getLostAudiobooks()) {
        console.error(`Cannot build Audiobook instance for: "${audiobookId}" as it is marked as MISSING.`);
        return null;
    }
    const audiobookData = DB.querySingle({
        table: DB.Tables.audiobooks,
        whereStmt: `id=${audiobookId}`
    });

    if (audiobookData === false) {
        console.error(`Failed to getAudiobook of id: '${audiobookId}'`);
        return null;
    }

    return new Audiobook(audiobookData);
}


export class Audiobook {
    id: number;
    title: string;
    author: string;
    dirPath: string;
    totalSeconds: number;
    totalTime: string;
    coverSrc: string;
    currTrack: number;
    currMomentS: number;
    playSpeed: number;
    progress: number;
    lastListened: string;
    tracks: TRACKS.Track[];
    bookmarks: TRACKS.Bookmark[];

    constructor(audiobookData: any) {
        this.id = audiobookData.id;
        this.title = audiobookData.title;
        this.author = audiobookData.author;
        this.dirPath = audiobookData.dirpath;
        this.totalSeconds = audiobookData.total_seconds;
        this.currTrack = audiobookData.curr_track;
        this.currMomentS = audiobookData.curr_moment_s;
        this.playSpeed = audiobookData.play_speed;
        this.progress = audiobookData.progress;
        this.lastListened = audiobookData.last_listened;
        
        this.totalTime = secondsToReadable(this.totalSeconds);
        this.coverSrc = COVERS.getCover(this.id);
        this.tracks = TRACKS.getAllTracks(this.id);
        this.bookmarks = TRACKS.getAllBookmarks(this.id);
    }

    public calculateProgress(): number {
        let passedSeconds = this.currMomentS;
        for (const track of this.tracks) {
            if (track.index < this.currTrack) passedSeconds += track.totalSeconds;
        }

        let progress = (passedSeconds / this.totalSeconds) * 100;
        if (progress >= 99.1) progress = 100;
        progress = Math.round(progress);

        if (progress !== this.progress) DB.updateSet(DB.Tables.audiobooks, {progress: progress}, this.id);
        this.progress = progress;
        return progress;
    }

    public delete(): void {
        COVERS.removeCover(this.id);

        if (STATE.STATE.recentAudiobook === this.id) {
            STATE.STATE.recentAudiobook = null;
            STATE.saveState(STATE.STATE);
        }

        DB.deleteFrom(DB.Tables.audiobooks, `id=${this.id}`);
    }

    public updatePlaybackState(trackIndex: number, currMomentS: number, speed: number): void {
        this.currTrack = trackIndex;
        this.currMomentS = currMomentS;
        this.playSpeed = speed;

        DB.updateSet(DB.Tables.audiobooks, {
            curr_track: this.currTrack,
            curr_moment_s: this.currMomentS,
            play_speed: speed
        }, this.id);
    }
}


// Check if audiobook located in this path is already initialized.
function __isDirpathInitialized(dirpath: string): boolean {
    return DB.querySingle({
        table: DB.Tables.audiobooks,
        whereStmt: `dirpath='${dirpath}'`
    }) !== false;
}

// Import new audiobook from it's path.
export async function importAudiobook(dirpath: string): Promise<number | bigint | void> {
    dirpath = dirpath.replaceAll("\\", "/");
    let title: string = path.basename(dirpath);

    if (__isDirpathInitialized(dirpath)) return MSG.displayError(`Audiobook: "${title}" is already imported.`);
    
    try {
        const files = await fs.promises.readdir(dirpath, { withFileTypes: true });
        if (files.length == 0) return MSG.displayError(`No files in the directory: ${title}`);
        
        let albumMetadata: any | null = null;
        let totalSeconds: number = 0;
        let trackIndex: number = 1;
        let coverFile: any | null = null;
        
        const tracks: any[] = [];
        for (const file of files) {
            if (!file.isFile()) continue;

            if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
                coverFile = file;
                continue;
            }

            const filePath = path.join(dirpath, file.name);
            const musicMetaParser = await loadMusicMetadata();
            await musicMetaParser.parseFile(filePath).then((audioMetadata: any) => {
                if (albumMetadata === null) albumMetadata = audioMetadata;
                
                const metadata = {
                    name: file.name.split(".")[0],
                    filepath: filePath,
                    trackNumber: trackIndex,
                    length: secondsToReadable(audioMetadata.format.duration),
                    seconds: audioMetadata.format.duration,
                };
    
                tracks.push(metadata);
                totalSeconds += audioMetadata.format.duration;
                trackIndex++;
            }).catch((e: any) => console.error(`Error while parsing file meta: ${filePath} - ${e} `));
        }
        
        if (tracks.length == 0) return MSG.displayError(`No valid audio files found in: "${title}"`);

        let author = albumMetadata.common.artist || 'Unknown';
        const cover = albumMetadata.common.picture;

        if (author == "Unknown" && title.includes("-")) {
            [author, title] = title.split("-");
            console.log(`Split title to get the author: ${title} ~ ${author}`);
            title = title.trim();
        }
        author = author.trim();

        const abId = DB.insertInto(DB.Tables.audiobooks, {
            title: title,
            author: author,
            dirpath: dirpath,
            total_seconds: totalSeconds,
        });
        if (abId === DB.INSERT_ERROR) return MSG.displayError(`Failed to save: "${title}"`);

        for (let track of tracks) DB.insertInto(DB.Tables.tracks, {
            title: track.name,
            filepath: track.filepath,
            idx: track.trackNumber,
            total_seconds: track.seconds,
            audiobook_id: abId
        });
        
        if (!cover && coverFile) {
            COVERS.saveCoverFromFile(abId, path.join(coverFile.parentPath, coverFile.name));
        } else if (cover) {
            COVERS.saveCover(abId, cover[0]);
        }
        
        console.log(`Inserted all contents of: ${title} into the DB.`);
        MSG.displayInfo(`Imported: ${title}`);

        return abId;
        
    } catch (err) {
        console.error(`Error reading directory ${dirpath}:`, err);
        MSG.displayError(`Failed to read directory of audiobook: "${title}".`);
        return DB.INSERT_ERROR;
    }
};



