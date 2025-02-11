import { secondsToReadable } from "./timeutils";
import * as DB from "./database";


export class Track {
    id: number;
    title: string;
    filepath: string;
    index: number;
    totalSeconds: number;
    totalTime: string;
    bookmarks: Bookmark[];

    constructor(trackData: any) {
        this.id = trackData.id;
        this.title = trackData.title;
        this.filepath = trackData.filepath;
        this.index = trackData.idx;
        this.totalSeconds = trackData.total_seconds;
        this.totalTime = secondsToReadable(this.totalSeconds);
        this.bookmarks = getBookmarksForTrack(this.id);
    }
}


export function getAllTracks(abId: number | bigint): Track[] {
    const tracks: Track[] = [];

    DB.queryAll({
        table: DB.Tables.tracks,
        whereStmt: `audiobook_id=${abId}`,
        orderById: 'idx',
        orederByDirection: 'ASC'
    }).forEach(trackData => tracks.push(new Track(trackData)));

    return tracks;
}


export interface Bookmark {
    id: number;
    comment: string | null;
    moment_s: number;
    track_id: number;
    date_add: string
}


export function getAllBookmarks(abId: number | bigint): Bookmark[] {
    return DB.queryAll({
        table: DB.Tables.bookmarks,
        whereStmt: `track_id IN (SELECT id FROM tracks WHERE audiobook_id=${abId})`
    });
}

function getBookmarksForTrack(trackId: number): Bookmark[] {
    return DB.queryAll({
        table: DB.Tables.bookmarks,
        whereStmt: `track_id=${trackId}`
    })
}

