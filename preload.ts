const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
    send: ipcRenderer.send.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer)
});

contextBridge.exposeInMainWorld('state', {
    get: () => ipcRenderer.invoke("STATE:get"),
    set: (state: { volume: number, recentAudiobook: number | null }) => ipcRenderer.invoke("STATE:set", state)
})

contextBridge.exposeInMainWorld('backend', {
    // Audiobook.
    fetchAudiobook: (abId: number) => ipcRenderer.invoke("AB:fetch", abId),
    fetchAllAudiobooks: (abId: number) => ipcRenderer.invoke("AB:fetchAll", abId),
    getAudiobookProgress: (abId: number) => ipcRenderer.invoke("AB:calcProgress", abId),
    importAudiobooks: () => ipcRenderer.invoke("AB:import"),
    deleteAudiobook: (abId: number) => ipcRenderer.invoke("AB:delete", abId),
    updatePlaybackState: (abId: number, trackIndex: number, currMomentS: number, speed: number) => ipcRenderer.invoke("AB:playbackUpdate", abId, trackIndex, currMomentS, speed),
    editAudiobook: (abId: number, title: string, author: string, tracksIdIndex: number[]) => ipcRenderer.invoke("AB:edit", abId, title, author, tracksIdIndex),
    openPathInExplorer: (path: string) => ipcRenderer.invoke("AB:openPath", path),
    switchAudiobookCover: (abId: number) => ipcRenderer.invoke("AB:switchCover", abId),
    finishAudiobook: (abId: number) => ipcRenderer.invoke("AB:finish", abId),

    // Track.
    getTrackById: (trackId: number) => ipcRenderer.invoke("TRACK:getById", trackId),
    getTrackByIndex: (abId: number, trackIndex: number) => ipcRenderer.invoke("TRACK:getByIndex", abId, trackIndex),
    
    // Bookmark.
    addBookmark: (trackId: number, momentS: number, comment?: string) => ipcRenderer.invoke("BOOKMARK:add", trackId, momentS, comment),
    deleteBookmark: (bookmarkId: number) => ipcRenderer.invoke("BOOKMARK:delete", bookmarkId),
    getAllBookmarksData: () => ipcRenderer.invoke("BOOKMARK:getAll"),
    
    // Author.
    fetchAuthor: (name: string) => ipcRenderer.invoke("AUTHOR:fetch", name),
    fetchAllAuthors: () => ipcRenderer.invoke("AUTHOR:fetchAll"),
    renameAuthor: (oldName: string, newName: string) => ipcRenderer.invoke("AUTHOR:rename", oldName, newName),
    shuffleAuthorPicture: (name: string) => ipcRenderer.invoke("AUTHOR:shufflePicture", name),
})


// playAudiobook -- fetchAudiobook(abId) - ab, fetchAudiobook(abId).tracks, fetchAudiobook(abId).currTrack
// getAllTracks -- fetchAudiobook(abid).tracks;
// countBookmarks -- fetchAudiobook(abId).bookmarksCount
// getAllBookmarksData -- fetchAllAudiobooks() - ab.bookmarks[]

