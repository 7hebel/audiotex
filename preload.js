const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
    send: ipcRenderer.send.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer)
});

contextBridge.exposeInMainWorld('electron', {
    importNewAudiobook: () => ipcRenderer.invoke("import-new-ab"),
    getAllAudiobooks: () => ipcRenderer.invoke("get-all-audiobooks"),
    getAudiobookData: (ab_id) => ipcRenderer.invoke("get-audiobook-data", ab_id),
    getIrackByIndex: (ab_id, track_index) => ipcRenderer.invoke("get-track-index", ab_id, track_index),
    getIrackById: (track_id) => ipcRenderer.invoke("get-track-id", track_id),
    getAllTracks: (ab_id) => ipcRenderer.invoke("get-tracks", ab_id),
    calculateAudiobookProgress: (ab_id) => ipcRenderer.invoke("calc-ab-progress", ab_id),
    deleteAudiobook: (ab_id) => ipcRenderer.invoke("delete-audiobook", ab_id),
    playAudiobook: (ab_id, track_id = null) => ipcRenderer.invoke("play-audiobook", ab_id, track_id),
    updateAudiobookState: (ab_id, track_id, curr_moment_s, speed) => ipcRenderer.invoke("update-ab-state", ab_id, track_id, curr_moment_s, speed),
    updateAudiobookMeta: (ab_id, title, author, tracks) => ipcRenderer.invoke("update-audiobook-meta", ab_id, title, author, tracks),
    addBookmark: (track_id, moment_s, comment) => ipcRenderer.invoke("add-bookmark", track_id, moment_s, comment),
    removeBookmark: (bookmark_id) => ipcRenderer.invoke("remove-bookmark", bookmark_id)
});

contextBridge.exposeInMainWorld('state', {
    get: () => ipcRenderer.invoke("get-state"),
    set: (state) => ipcRenderer.invoke("set-state", state)
})
