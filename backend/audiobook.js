const { loadMusicMetadata } = require(`music-metadata`);
const { secondsToReadable } = require('./timeutils')
const { GOOGLE_IMG_SCRAP } = require('google-img-scrap');
const msg = require('./messages');
const db = require('./database');
const state = require('./state');
const axios = require('axios');
const path = require('path');
const fs = require('fs');


function getLostAudiobooks() {
    const lostAudiobooks = [];
    const allAudiobooks = db.getAllAudiobooks();

    for (const audiobook of allAudiobooks) {
        if (!fs.existsSync(audiobook.dirpath)) {
            console.error(`Missing path for audiobook: ${audiobook.title}`);
            lostAudiobooks.push(audiobook.id);
        }
    }

    if (lostAudiobooks.includes(state.STATE.recentAudiobook)) {
        state.STATE.recentAudiobook = null;
        state.saveState(state.STATE);
        console.error("Lost recent audiobook.");
    }

    return lostAudiobooks;
}


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

        let TITLE = path.basename(dirpath);
        const files = await fs.promises.readdir(dirpath, { withFileTypes: true });
        if (files.length == 0) return msg.displayError(`No files in the directory: ${TITLE}`);
        
        const mm = await loadMusicMetadata();
        let albumMetadata = null;
        let TOTAL_SECONDS = 0;
        let index = 1;
        let coverFile = null;
        const tracks = [];

        for (const file of files) {
            if (!file.isFile()) continue;

            if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
                coverFile = file;
                console.log(file);
                continue;
            }

            const filePath = path.join(dirpath, file.name);
            await mm.parseFile(filePath).then((audioMetadata) => {
                if (albumMetadata === null) albumMetadata = audioMetadata;
                
                const metadata = {
                    name: file.name.split(".")[0],
                    filepath: filePath,
                    trackNumber: index,
                    length: secondsToReadable(audioMetadata.format.duration),
                    seconds: audioMetadata.format.duration,
                };
    
                tracks.push(metadata);
                TOTAL_SECONDS += audioMetadata.format.duration;
                index++;
            }).catch((e) => console.error(e));
        }
        
        if (tracks.length == 0) return msg.displayError(`No valid audio files found in: ${TITLE}`);

        let AUTHOR = albumMetadata.common.artist || 'Unknown';
        const COVER = albumMetadata.common.picture;
        const TOTAL_ITEMS = tracks.length;
        const TOTAL_TIME = secondsToReadable(TOTAL_SECONDS);
        console.log("Successfuly parsed directory.");

        if (AUTHOR == "Unknown" && TITLE.includes("-")) {
            [AUTHOR, TITLE] = TITLE.split("-");
            console.log(`Split title to get the author: ${TITLE} ~ ${AUTHOR}`)
        }

        const AB_ID = db.insertAudiobook(TITLE, AUTHOR, TOTAL_TIME, TOTAL_SECONDS, dirpath, TOTAL_ITEMS, "");
        if (AB_ID == -1) return msg.displayError(`Failed to save: ${TITLE}`);

        for (let track of tracks) db.insertTrack(track.name, track.filepath, track.trackNumber, track.length, track.seconds, AB_ID);
        
        let coverPath = null;
        if (!COVER && coverFile) {
            const srcPath = path.join(coverFile.parentPath, coverFile.name);
            coverPath = path.join(COVERS_PATH, `${AB_ID}`).replaceAll("\\", "/");
            fs.copyFileSync(srcPath, coverPath);
            console.log(`Used cover from directory: ${coverFile.name}`)
        } else if (COVER) {
            coverPath = saveCover(AB_ID, COVER[0]);
        }
        
        if (coverPath) {
            db.db.exec(`
                UPDATE audiobooks
                SET cover_src='${coverPath}'
                WHERE id=${AB_ID}
            `);    
        } 
        
        console.log(`Inserted all contents of: ${TITLE} into the DB.`);
        msg.displayInfo(`Imported: ${TITLE}`);

        return [AB_ID, TITLE, AUTHOR, coverPath, TOTAL_TIME, "0"];
        
    } catch (err) {
        console.error(`Error reading directory ${dirpath}:`, err);
        return msg.displayError("Failed to read directory.");
    }
};

function calculateProgress(ab_id) {
    const audiobook = db.getAudiobook(ab_id);
    const allTracks = db.getAllTracks(ab_id);

    let passedSeconds = audiobook.curr_moment_s;
    allTracks.forEach((track) => {
        if (track.idx < audiobook.curr_track) passedSeconds += track.total_seconds;
    })

    let progress = (passedSeconds / audiobook.total_seconds) * 100;
    if (progress >= 99.1) progress = 100;
    return parseInt(progress);
}


/// Covers related stuff
const COVERS_PATH = path.join(require('electron').app.getPath('userData'), 'covers')
if (!fs.existsSync(COVERS_PATH)) fs.mkdirSync(COVERS_PATH, { recursive: true });

function saveCover(ab_id, cover_arr) {
    const coverFilePath = path.join(COVERS_PATH, `${ab_id}`);
    fs.writeFileSync(coverFilePath, Buffer.from(cover_arr.data));
    return coverFilePath.replaceAll("\\", "/");
}

function saveCoverFromFile(ab_id, new_cover_path) {
    const coverFilePath = path.join(COVERS_PATH, `${ab_id}`);
    if (fs.existsSync(coverFilePath)) fs.unlinkSync(coverFilePath);
    fs.copyFileSync(new_cover_path, coverFilePath);
    return coverFilePath.replaceAll("\\", "/");
}

function removeCover(ab_id) {
    const coverFilePath = path.join(COVERS_PATH, `${ab_id}`);
    if (fs.existsSync(coverFilePath)) fs.unlinkSync(coverFilePath);
}


/// Authors images related stuff
const AUTHORS_PICS_PATH = path.join(require('electron').app.getPath('userData'), 'authors')
if (!fs.existsSync(AUTHORS_PICS_PATH)) fs.mkdirSync(AUTHORS_PICS_PATH, { recursive: true });


async function __fetchAuthorImageURL(name, randomize = false) {
    let url;

    if (!randomize) {
        const result = await GOOGLE_IMG_SCRAP({
            search: name,
            limit: 1
        });
        url = result.result[0]?.url;

    } else {
        const allResults = await GOOGLE_IMG_SCRAP({
            search: name,
            limit: 20
        });
        url = allResults.result[Math.floor(Math.random() * allResults.result.length)]?.url;
    }

    const defaultAvatar = "./src/default-author.png";

    if (url) {
        try {
            const authorPicPath = path.join(AUTHORS_PICS_PATH, name);
            const response = await axios({
                url: url,
                method: 'GET',
                responseType: 'stream'
            });

            const timestamp = new Date().getTime();
            const writer = fs.createWriteStream(authorPicPath);

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`Downloaded author's image: ${name}`);
            return authorPicPath.replaceAll('\\', "/") + `?v=${timestamp}`;
        } catch (error) {
            console.error(`Error downloading author image: ${error.message}`);
            return defaultAvatar;
        }
    }

    return defaultAvatar;
}

async function getAuthorImage(name) {
    if (name == "Unknown") return `./src/default-author.png`;
    
    const authorPicPath = path.join(AUTHORS_PICS_PATH, name);
    if (fs.existsSync(authorPicPath)) return authorPicPath.replaceAll('\\', "/");
    
    const timestamp = new Date().getTime();
    const imagePath = await __fetchAuthorImageURL(name);
    return imagePath.replaceAll('\\', "/") + `?v=${timestamp}`;
}


async function updateAuthorCover(name) {
    if (name == "Unknown") return `./src/default-author.png`;
    const imagePath = await __fetchAuthorImageURL(name, true);
    return imagePath.replaceAll('\\', "/");
}


module.exports = {
    importAudiobook,
    saveCover,
    saveCoverFromFile,
    removeCover,
    calculateProgress,
    getAuthorImage,
    updateAuthorCover,
    getLostAudiobooks
}
