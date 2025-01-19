const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(require('electron').app.getPath('userData'), 'app.db');
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
        `).all();
    } catch (err) {
        console.error('Error fetching audiobooks:', err);
        return [];
    }
}

function getAllTracks(ab_id) {
    try {
        return db.prepare(`
            SELECT *
            FROM tracks
            WHERE audiobook_id = ${ab_id}
            ORDER BY idx ASC
        `).all();
    } catch (err) {
        console.error(`Error fetching tracks for ${ab_id}:`, err);
        return [];
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

function insertTrack(title, filepath, index, total_time, audiobook_id) {
    try {
        db.prepare(`
            INSERT INTO tracks
                (title, filepath, idx, total_time, audiobook_id)
            VALUES
                (?, ?, ?, ?, ?)
        `).run(title, filepath, index, total_time, audiobook_id);

        console.log(`Inserted track ${title} into DB.`);
    } catch (err) { console.error(`Error inserting track ${title}:`, err); }
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
    updatePlayState,
};
