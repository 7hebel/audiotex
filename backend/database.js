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
        console.log('Database initialized.');
    } catch (err) {
        console.error('Failed to initialize the database:', err);
    }
}

// Function to fetch all users
function getAllUsers() {
    try {
        const stmt = db.prepare('SELECT * FROM users');
        return stmt.all(); // Returns all rows as an array
    } catch (err) {
        console.error('Error fetching users:', err);
        return [];
    }
}


function insertAudiobook(title, author, total_time, dirpath, total_items) {
    try {
        const stmt = db.prepare(`INSERT INTO audiobooks (title, author, dirpath, total_time, total_tracks, last_listened) VALUES (?, ?, ?, ?, ?, '-')`);
        let res = stmt.run(title, author, dirpath, total_time, total_items);
        console.log(`Inserted audiobook ${title} into DB.`);
        return res.lastInsertRowid;
    } catch (err) {
        console.error(`Error inserting audibook ${title}:`, err);
        return -1
    }
}

function insertTrack(title, filepath, index, total_time, audiobook_id) {
    try {
        const stmt = db.prepare(`INSERT INTO tracks (title, filepath, idx, total_time, audiobook_id) VALUES (?, ?, ?, ?, ?)`);
        let res = stmt.run(title, filepath, index, total_time, audiobook_id);
        console.log(`Inserted track ${title} into DB.`);
        return res.lastInsertRowid;
    } catch (err) {
        console.error(`Error inserting track ${title}:`, err);
        return -1
    }
}

// Function to delete a user
function deleteUser(id) {
    try {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        stmt.run(id);
        console.log(`User with ID ${id} deleted.`);
    } catch (err) {
        console.error('Error deleting user:', err);
    }
}

function closeDatabase() {
    db.close();
}

// Export database functions
module.exports = {
    db,
    initializeDatabase,
    insertAudiobook,
    insertTrack,
    closeDatabase,
};
