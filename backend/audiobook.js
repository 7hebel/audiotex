const { loadMusicMetadata } = require(`music-metadata`);
const { secondsToReadable } = require('./timeutils')
const msg = require('./messages');
const db = require('./database');
const path = require('path');
const fs = require('fs');


function __isDirpathInitialized(dirpath) {
    const stmt = db.db.prepare(`
        SELECT * 
        FROM audiobooks 
        WHERE dirpath = '${dirpath}'
    `);
    return stmt.all().length > 0;
}

async function importAudiobook(dirpath) {
    dirpath = dirpath.replaceAll("\\", "/");
    
    try {
        if (__isDirpathInitialized(dirpath)) return msg.displayError("This audiobook is already imported.");

        const TITLE = path.basename(dirpath);
        const files = await fs.promises.readdir(dirpath, { withFileTypes: true });
        if (files.length == 0) return msg.displayError("No files in the directory.");
        
        const mm = await loadMusicMetadata();

        const dataFilePath = path.join(dirpath, files[0].name);
        const albumMetadata = await mm.parseFile(dataFilePath);
        const AUTHOR = albumMetadata.common.artist || 'Unknown';
        const COVER = albumMetadata.common.picture;
        const TOTAL_ITEMS = files.length;
        
        let isCorrectlyIndexed = albumMetadata.common.track.no != 32;
        
        let TOTAL_SECONDS = 0;
        let index = 1;
        const tracks = [];

        for (const file of files) {
            if (!file.isFile()) continue;

            const filePath = path.join(dirpath, file.name);
            const audioMetadata = await mm.parseFile(filePath);
            const metadata = {
                name: file.name.split(".")[0],
                filepath: filePath,
                trackNumber: isCorrectlyIndexed ? audioMetadata.common.track.no : index,
                length: secondsToReadable(audioMetadata.format.duration),
            };

            tracks.push(metadata);
            TOTAL_SECONDS += audioMetadata.format.duration;
            index++;
        }

        const TOTAL_TIME = secondsToReadable(TOTAL_SECONDS);
        console.log("Successfuly parsed directory.");

        const AB_ID = db.insertAudiobook(TITLE, AUTHOR, TOTAL_TIME, TOTAL_SECONDS, dirpath, TOTAL_ITEMS, "");
        if (AB_ID == -1) return msg.displayError(`Failed to save: ${TITLE}`);
        
        for (let track of tracks) {
            db.insertTrack(track.name, track.filepath, track.trackNumber, track.length, AB_ID);
        }

        let coverPath = null;
        if (COVER) {
            coverPath = saveCover(AB_ID, COVER[0]);
            db.db.exec(`
                UPDATE audiobooks
                SET cover_src='${coverPath}'
                WHERE id=${AB_ID}
            `);
        }
        
        console.log(`Inserted all contents of: ${TITLE} into the DB.`);
        msg.displayInfo(`Imported: ${TITLE}`)
        return [AB_ID, TITLE, AUTHOR, coverPath, TOTAL_TIME, "0"];
        
    } catch (err) {
        console.error(`Error reading directory ${dirpath}:`, err);
        return msg.displayError("Failed to read directory.");
    }
};


/// Covers related stuff

const COVERS_PATH = path.join(require('electron').app.getPath('userData'), 'covers')
if (!fs.existsSync(COVERS_PATH)) fs.mkdirSync(COVERS_PATH, { recursive: true });

function saveCover(ab_id, cover_arr) {
    const coverFilePath = path.join(COVERS_PATH, `${ab_id}.jpg`);
    fs.writeFile(coverFilePath, Buffer.from(cover_arr.data), () => {});
    return coverFilePath.replaceAll("\\", "/");
}

function removeCover(ab_id) {
    const coverFilePath = path.join(COVERS_PATH, `${ab_id}.jpg`);
    if (fs.existsSync(coverFilePath)) fs.unlinkSync(coverFilePath);
}

module.exports = {
    importAudiobook,
    saveCover,
    removeCover,
}
