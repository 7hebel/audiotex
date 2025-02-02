const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
    send: ipcRenderer.send.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer)
});

contextBridge.exposeInMainWorld('backend', {
    importNewAudiobooks: () => ipcRenderer.invoke("import-new-ab"),
    chooseAudiobookCoverFile: (ab_id) => ipcRenderer.invoke("get-new-ab-cover-file", ab_id),
    getAllAudiobooks: () => ipcRenderer.invoke("get-all-audiobooks"),
    getAudiobookData: (ab_id) => ipcRenderer.invoke("get-audiobook-data", ab_id),
    getTrackByIndex: (ab_id, track_index) => ipcRenderer.invoke("get-track-index", ab_id, track_index),
    getTrackById: (track_id) => ipcRenderer.invoke("get-track-id", track_id),
    getAllTracks: (ab_id) => ipcRenderer.invoke("get-tracks", ab_id),
    calculateAudiobookProgress: (ab_id) => ipcRenderer.invoke("calc-ab-progress", ab_id),
    deleteAudiobook: (ab_id) => ipcRenderer.invoke("delete-audiobook", ab_id),
    playAudiobook: (ab_id, track_id = null) => ipcRenderer.invoke("play-audiobook", ab_id, track_id),
    updateAudiobookState: (ab_id, track_id, curr_moment_s, speed) => ipcRenderer.invoke("update-ab-state", ab_id, track_id, curr_moment_s, speed),
    updateAudiobookMeta: (ab_id, title, author, tracks) => ipcRenderer.invoke("update-audiobook-meta", ab_id, title, author, tracks),
    addBookmark: (track_id, moment_s, comment) => ipcRenderer.invoke("add-bookmark", track_id, moment_s, comment),
    removeBookmark: (bookmark_id) => ipcRenderer.invoke("remove-bookmark", bookmark_id),
    countBookmarks: (ab_id) => ipcRenderer.invoke("count-bookmarks", ab_id),
    countTotalBookmarks: () => ipcRenderer.invoke("count-total-bookmarks"),
    getAllBookmarksData: () => ipcRenderer.invoke("prepare-bookmarks-data"),
    getAuthors: () => ipcRenderer.invoke("get-authors"),
    getAuthorData: (name) => ipcRenderer.invoke("get-author-data", name),
    renameAuthor: (oldName, newName) => ipcRenderer.invoke("rename-author", oldName, newName),
    updateAuthorAvatar: (name) => ipcRenderer.invoke("update-author-avatar", name),
    getLostAudiobooks: () => ipcRenderer.invoke("get-lost-abs"),
    openPathInExplorer: (path) => ipcRenderer.invoke("open-file-in-explorer", path),
});

contextBridge.exposeInMainWorld('state', {
    get: () => ipcRenderer.invoke("get-state"),
    set: (state) => ipcRenderer.invoke("set-state", state)
})
