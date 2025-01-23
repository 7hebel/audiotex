const editableElements = Array.from(document.getElementsByClassName("info-editable"));
const tracksContainer = document.getElementById("info-tracks-table");
const infoPopupContainer = document.getElementById("ab-info-popup");
let tracksTableBackupCopy = "";  // Backup for the tracks table. Used when changes are canceled.


/// Close the pop-up whenever user clicks outside it.
infoPopupContainer.onclick = (ev) => { if (ev.target.id === "ab-info-popup") closeInfoPopup(); }

function openInfoPopup() {
    infoPopupContainer.setAttribute("show", "1"); 

    setTimeout(() => {
        infoPopupContainer.style.opacity = "1";
    }, 1)
}

function closeInfoPopup() {
    infoPopupContainer.style.opacity = "0";

    setTimeout(() => {
        infoPopupContainer.setAttribute("show", "0");
        infoPopupContainer.setAttribute("target", "-1");
    }, 250)

    exitInfoEditMode();
}

function enterInfoEditMode() {
    tracksTableBackupCopy = tracksContainer.innerHTML;
    infoPopupContainer.setAttribute("edit", "1");
    editableElements.forEach(el => {
        el.setAttribute("contenteditable", "");
        el.setAttribute("_bak", el.textContent);
    });
}

function exitInfoEditMode() {
    infoPopupContainer.setAttribute("edit", "0");
    editableElements.forEach(el => {
        el.removeAttribute("contenteditable");
        el.removeAttribute("_bak");
    })
}

function cancelInfoEdit() {
    editableElements.forEach(el => { el.textContent = el.getAttribute("_bak"); })
    tracksContainer.innerHTML = tracksTableBackupCopy;

    exitInfoEditMode();
}

function acceptInfoEditChanges() {
    tracksTableBackupCopy = "";
    
    let index = 0;
    Array.from(tracksContainer.children).forEach(tr => { 
        tr.children[0].innerHTML = ++index; 
    })
    
    buildShelf();
    exitInfoEditMode();
}

/// Button: Play audiobook.
document.getElementById("play-selected-ab-btn").addEventListener('click', async () => {
    const ab_id = infoPopupContainer.getAttribute("target");
    if (ab_id == "-1") return;

    await setupAudiobookPlay(ab_id);
    playAudio();
    closeInfoPopup();
})

/// Edit mode table dragging handling.
let draggingRow = null;

tracksContainer.addEventListener('dragstart', (e) => {
    if (infoPopupContainer.getAttribute("edit") == "1") {
        draggingRow = e.target;
        e.target.classList.add('dragging');
    }
});

tracksContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (infoPopupContainer.getAttribute("edit") == "0") return;
    
    const afterElement = getDragAfterElement(tracksContainer, e.clientY);

    if (afterElement == null) tracksContainer.appendChild(draggingRow)
    else tracksContainer.insertBefore(draggingRow, afterElement)
});

tracksContainer.addEventListener('dragend', (e) => {
    e.target.classList.remove('dragging');
    draggingRow = null;
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.info-track-item:not(.dragging)')];
    return draggableElements.reduce(
        (closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        },
        { offset: Number.NEGATIVE_INFINITY }
    ).element;
}

function populateInfoPopup(ab_id) {
    document.getElementById("ab-info-popup").setAttribute("target", ab_id);

    window.backend.getAudiobookData(ab_id).then((ab) => {
        document.getElementById("info-cover").src = ab.cover_src ? ab.cover_src : 'src/default-cover.png';
        document.getElementById("info-author").textContent = ab.author;
        document.getElementById("info-title").textContent = ab.title;
        document.getElementById("info-duration").textContent = ab.total_time;
        document.getElementById("info-path").textContent = ab.dirpath;
        document.getElementById("info-items").textContent = ab.total_tracks + " items";
        document.getElementById("info-progress").textContent = ab.curr_track + "/" + ab.total_tracks + " - " + ab.progress + "%";
        document.getElementById("info-recent").textContent = ab.last_listened;
        document.getElementById("info-bookmarks").textContent = (ab.bookmarksCount == 0) ? "No bookmarks" : ab.bookmarksCount + " bookmarks";
    })

    const tracksContainer = document.getElementById("info-tracks-table");
    tracksContainer.innerHTML = "";

    window.backend.getAllTracks(ab_id).then((tracks) => {
        for (const track of tracks) {
            const trackItem = document.createElement("div");
            trackItem.className = "info-track-item";
            trackItem.setAttribute("draggable", "true");
            trackItem.setAttribute("track-id", track.id);

            const index = document.createElement("span");
            index.className = "info-track-item-index";
            index.textContent = track.idx;
            trackItem.appendChild(index);

            const title = document.createElement("span");
            title.className = "info-track-item-title";
            title.innerHTML = `${track.title} <i class="fa-solid fa-play"></i>`;
            title.onclick = () => {
                setupAudiobookPlay(ab_id, track.id).then(() => {
                    playAudio();
                    closeInfoPopup();
                });
            }
            trackItem.appendChild(title);

            const bookmarks = document.createElement("span");
            const bookmarksCount = track.bookmarks.length;
            bookmarks.className = "info-track-item-bookmarks";
            if (bookmarksCount > 0) {
                bookmarks.innerHTML = `${bookmarksCount} <i class="fa-solid fa-bookmark"></i>`
                bookmarks.onclick = () => { openBookmarksListPopup(); }
            }
            trackItem.appendChild(bookmarks);

            const time = document.createElement("span");
            time.className = "info-track-item-time";
            time.textContent = track.total_time;
            trackItem.appendChild(time);

            tracksContainer.appendChild(trackItem);
        }
    })
}

/// Accept info popup audiobook changes.
const saveAudiobookBtn = document.getElementById("save-ab-btn");
saveAudiobookBtn.addEventListener('click', async () => {
    const ab_id = parseInt(document.getElementById("ab-info-popup").getAttribute("target"));
    const newTitle = document.getElementById("info-title").textContent;
    const newAuthor = document.getElementById("info-author").textContent;

    if (!newTitle.trim()) return displayErrorMessage("Title cannot be blank.");
    if (!newAuthor.trim()) return displayErrorMessage("Author cannot be blank.");

    let newTracksOrder = []
    Array.from(document.getElementById("info-tracks-table").children).forEach((trackEl) => {
        newTracksOrder.push([
            parseInt(trackEl.getAttribute("track-id")),
            parseInt(trackEl.children[0].textContent)
        ])
    });

    await window.backend.updateAudiobookMeta(ab_id, newTitle, newAuthor, newTracksOrder);
    acceptInfoEditChanges();

    if (ab_id == audioPlayer.getAttribute("ab-id")) {
        document.getElementById("pv-curr-audiobook").textContent = newTitle;
        const audiobook = await window.backend.getAudiobookData(ab_id);
        const allTracks = await window.backend.getAllTracks(ab_id);
        populateContentView(audiobook, allTracks, parseInt(audioPlayer.getAttribute("track-id")));
    }

    displayInfoMessage("Changes saved.");
})

/// Remove audiobook button.
const deleteAudiobookBtn = document.getElementById('delete-ab-btn');
deleteAudiobookBtn.addEventListener('click', async () => {
    const ab_id = parseInt(document.getElementById("ab-info-popup").getAttribute("target"));
    await window.backend.deleteAudiobook(ab_id);
    closeInfoPopup();
    document.getElementById(String(ab_id)).remove();
    displayInfoMessage('Removed audiobook from shelf.')
});
