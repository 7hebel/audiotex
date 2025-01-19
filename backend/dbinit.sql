CREATE TABLE IF NOT EXISTS audiobooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    dirpath TEXT NOT NULL, -- Directory path where the audiobook files are stored
    total_time TEXT NOT NULL, -- Total audiobook time in the HH: MM format
    total_seconds INTEGER NOT NULL,
    total_tracks INTEGER NOT NULL,
    cover_src TEXT NOT NULL,
    curr_track INTEGER NOT NULL DEFAULT 1,
    curr_moment_s INTEGER NOT NULL DEFAULT 0,
    play_speed REAL NOT NULL DEFAULT 1,
    progress REAL NOT NULL DEFAULT 0,
    last_listened TEXT NOT NULL DEFAULT '-'
);

CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    filepath TEXT NOT NULL, -- Filename of the audio file (rel. to the dirpath)
    idx INTEGER NOT NULL, -- Index of the track in the audiobook
    total_time TEXT NOT NULL,
    audiobook_id INTEGER NOT NULL,
    FOREIGN KEY (audiobook_id) REFERENCES audiobooks (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment TEXT, -- Optional comment for the bookmark
    moment_s INTEGER NOT NULL, -- Moment in seconds where the bookmark is set
    track_id INTEGER NOT NULL, -- Foreign key referencing tracks table
    FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
);
