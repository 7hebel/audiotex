const timeutils = require('./timeutils');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');


const appdataPath = require('electron').app.getPath('userData');
const dbPath = path.join(appdataPath, 'app.db');
const db = new Database(dbPath);


function initializeDatabase() {
    try {
        const initContentPath = path.join(__dirname, 'dbinit.sql');
        const dbInitContent = fs.readFileSync(initContentPath, 'utf8');
        db.exec(dbInitContent);
    } catch (err) { console.error('Failed to initialize the database:', err); }
}

function getAudiobook(ab_id) {
    try {
        return db.prepare(`
            SELECT * 
            FROM audiobooks 
            WHERE id = ${ab_id}
        `).all()[0];
    } catch (err) { console.error(`Error fetching audiobook ${ab_id}:`, err); }
}

function updatePlayState(ab_id, curr_track_idx, curr_moment_s, curr_date, progress, speed) {
    try {
        db.exec(`
            UPDATE audiobooks
            SET curr_track=${curr_track_idx}, curr_moment_s=${curr_moment_s}, last_listened='${curr_date}', progress=${progress}, play_speed=${speed}
            WHERE id = ${ab_id}
        `);
    } catch (err) { console.error(`Error updating audiobook ${ab_id} state :`, err); }
}

function getAllAudiobooks() {
    try {
        return db.prepare(`
            SELECT *
            FROM audiobooks
            ORDER BY id DESC
        `).all();
    } catch (err) {
        console.error('Error fetching audiobooks:', err);
        return [];
    }
}

function getAllTracks(ab_id) {
    try {
        const tracks = db.prepare(`
            SELECT *
            FROM tracks
            WHERE audiobook_id = ${ab_id}
            ORDER BY idx ASC
        `).all();

        tracks.forEach((track) => {
            track.bookmarks = getBookmarksForTrack(track.id);
        })

        return tracks;
    } catch (err) {
        console.error(`Error fetching tracks for ${ab_id}:`, err);
        return [];
    }
}

function countBookmarksInAudiobook(ab_id) {
    try {
        return db.prepare(`
            SELECT Count(*) as count
            FROM bookmarks
            WHERE track_id IN (
                SELECT id
                FROM tracks
                WHERE audiobook_id=${ab_id}
            )
        `).get().count;
    } catch (err) {
        console.error(`Error counting bookmarks for ${ab_id}:`, err);
        return 0;
    }
}

function countTotalBookmarks() {
    try {
        return db.prepare(`
            SELECT Count(*) as count
            FROM bookmarks
        `).get().count;
    } catch (err) {
        console.error(`Error counting all bookmarks`, err);
        return 0;
    }
}

function getTrackById(track_id) {
    try {
        return db.prepare(`
            SELECT *
            FROM tracks
            WHERE id = ${track_id}
        `).all()[0];
    } catch (err) { console.error(`Error fetching track ${track_id}:`, err); }
}

function getIndexedTrack(ab_id, index) {
    try {
        return db.prepare(`
            SELECT *
            FROM tracks
            WHERE audiobook_id = ${ab_id}
                AND idx = ${index}
        `).all()[0];
    } catch (err) { console.error(`Error fetching tracks for ${ab_id}:`, err); }
}

function insertAudiobook(title, author, total_time, total_seconds, dirpath, total_items, cover_src) {
    try {
        const stmt = db.prepare(`
            INSERT INTO audiobooks
                (title, author, dirpath, total_time, total_seconds, total_tracks, cover_src)
            VALUES
                (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const res = stmt.run(title, author ? author : 'unknown', dirpath, total_time, total_seconds, total_items, cover_src);
        console.log(`Inserted audiobook ${title} into the DB.`);
        return res.lastInsertRowid;
    } catch (err) {
        console.error(`Error inserting audibook ${title}:`, err);
        return -1;
    }
}

function insertTrack(title, filepath, index, total_time, total_seconds, audiobook_id) {
    try {
        db.prepare(`
            INSERT INTO tracks
                (title, filepath, idx, total_time, total_seconds, audiobook_id)
            VALUES
                (?, ?, ?, ?, ?, ?)
        `).run(title, filepath, index, total_time, total_seconds, audiobook_id);

        console.log(`Inserted track ${title} into DB.`);
    } catch (err) { console.error(`Error inserting track ${title}:`, err); }
}

function insertBookmark(track_id, curr_moment_s, comment) {
    const dateAdd = timeutils.getDate();

    try {
        db.exec(`
            INSERT INTO bookmarks
                (comment, moment_s, track_id, date_add)
            VALUES
                ('${comment}', ${curr_moment_s}, ${track_id}, '${dateAdd}')    
        `);
    } catch (err) { console.error(`Error inserting bookmark to: ${track_id}`, err); }

}

function getBookmarksForTrack(track_id) {
    try {
        return db.prepare(`
            SELECT *
            FROM bookmarks
            WHERE track_id=${track_id}    
        `).all()
    } catch (err) {
        console.error(`Failed to fetch bookmarks for track: ${track_id}`, err);
        return [];
    }
}

function deleteAudiobookRelated(ab_id) {
    try {
        db.exec(`
            DELETE FROM bookmarks
            WHERE track_id IN (
                SELECT id 
                FROM tracks
                WHERE audiobook_id = ${ab_id}
            );
    
            DELETE FROM tracks
            WHERE audiobook_id = ${ab_id};
            
            DELETE FROM audiobooks
            WHERE id = ${ab_id};
        `);

        console.log(`Data related to audiobook: ${ab_id} has been deleted`);
    } catch (err) {
        console.error(`Error deleting audiobook ${ab_id}:`, err);
    }
}

function getAuthors() {
    try {
        return db.prepare(`
            SELECT DISTINCT author
            FROM audiobooks
        `).all();
    } catch (err) {
        console.error(`Error getting authors data`, err);
        return [];
    }
}

function getAudiobooksByAuthor(name) {
    try {
        return db.prepare(`
            SELECT *
            FROM audiobooks
            WHERE author='${name}'
        `).all();
    } catch (err) {
        console.error(`Error getting ABS for author: ${name}`, err);
        return [];
    }
}


module.exports = {
    db,
    initializeDatabase,
    insertAudiobook,
    insertTrack,
    getAudiobook,
    getAllAudiobooks,
    getAllTracks,
    getTrackById,
    getIndexedTrack,
    deleteAudiobookRelated,
    insertBookmark,
    getBookmarksForTrack,
    countBookmarksInAudiobook,
    countTotalBookmarks,
    updatePlayState,
    getAuthors,
    getAudiobooksByAuthor
};
