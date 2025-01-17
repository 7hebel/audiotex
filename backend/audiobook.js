const { loadMusicMetadata } = require(`music-metadata`);
const { secondsToReadable } = require('./timeutils')
const db = require('./database');
const path = require('path');
const fs = require('fs');

// audiobook abstraction:

// A id
// v title
// v author
// v total time
// v dirpath
// v total items
// 0 current item
// 0 last listened date


// track abstraction:

// v name
// v filepath
// v total_time
// v index

const importAudiobook = async (dirpath) => {
    try {
        const TITLE = path.basename(dirpath);
        const files = await fs.promises.readdir(dirpath, { withFileTypes: true });
        if (files.length == 0) { return }
        
        const mm = await loadMusicMetadata();

        const dataFilePath = path.join(dirpath, files[0].name);
        const albumMetadata = await mm.parseFile(dataFilePath);
        const AUTHOR = albumMetadata.common.artist;
        const COVER = albumMetadata.common.picture;
        const TOTAL_ITEMS = files.length;
        let TOTAL_TIME = 0;

        let correctlyIndexed = albumMetadata.common.track.no != 32;

        const tracks = [];
        let index = 1;
        for (const file of files) {
            if (file.isFile()) {
                const filePath = path.join(dirpath, file.name);
                const audioMetadata = await mm.parseFile(filePath);
                const metadata = {
                    name: file.name.split(".")[0],
                    filepath: filePath,
                    trackNumber: correctlyIndexed? audioMetadata.common.track.no : index,
                    length: secondsToReadable(audioMetadata.format.duration),
                };

                tracks.push(metadata);
                TOTAL_TIME += audioMetadata.format.duration;
                index++;
            }
        }

        TOTAL_TIME = secondsToReadable(TOTAL_TIME);
        console.log("Successfuly parsed directory.");

        const AB_ID = db.insertAudiobook(TITLE, AUTHOR, TOTAL_TIME, dirpath, TOTAL_ITEMS);
        if (AB_ID == -1) { return; }
        
        for (let track of tracks) {
            db.insertTrack(track.name, track.filepath, track.trackNumber, track.length, AB_ID);
        }

        console.log("Inserted all content into the DB.")
        
    } catch (err) {
        console.error('Error reading directory:', err);
    }
};


// todo: load, save cover

module.exports = {
    importAudiobook
}

