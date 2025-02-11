const shelfContainer = document.getElementById("shelf-container");
const contextMenu = document.getElementById("shelf-ctx-menu");
let shelfMode = 0;
// 0 = all
// 1 = in progress
// 2 = not started
// 3 = finished
// 4 = authors

// Context menu
function openContextMenu(event, abId) {
    contextMenu.style.left = event.clientX + "px";
    contextMenu.style.top = event.clientY + "px";
    contextMenu.setAttribute("target", abId);
    contextMenu.style.display = "flex";
}

document.addEventListener("click", (ev) => {
    contextMenu.setAttribute("target", "-1");
    contextMenu.style.display = "none";
})

function contextMenu_about() {
    const abId = document.getElementById('shelf-ctx-menu').getAttribute('target');
    populateInfoPopup(abId); 
    openInfoPopup();
}

function contextMenu_play() {
    const abId = document.getElementById('shelf-ctx-menu').getAttribute('target');
    setupAudiobookPlay(abId).then(() => { playAudio(); });
}

function contextMenu_finish() {
    const abId = document.getElementById('shelf-ctx-menu').getAttribute('target');
    window.backend.finishAudiobook(abId).then(() => { buildShelf(); });
}

function contextMenu_delete() {
    const abId = document.getElementById('shelf-ctx-menu').getAttribute('target');
    window.backend.deleteAudiobook(abId).then(() => { buildShelf(); });
}


function addAudiobookToShelf(ab_id, title, author, cover_src, progress) {
    const abEntry = document.createElement("div");
    abEntry.id = ab_id;
    abEntry.className = "ab-entry";
    abEntry.onclick = () => {
        populateInfoPopup(ab_id);
        openInfoPopup();
    }
    abEntry.oncontextmenu = (ev) => {
        openContextMenu(ev, ab_id);
    }


    const abCover = document.createElement("div");
    abCover.className = "ab-cover";
    abCover.style = `background-image: url('${cover_src ? cover_src : 'src/default-cover.png'}')`;

    const metaProgress = document.createElement("span");
    metaProgress.className = "ab-meta";
    metaProgress.innerText = progress + "%";
    abCover.appendChild(metaProgress);
    
    abEntry.appendChild(abCover);

    const abTitle = document.createElement("p");
    abTitle.className = "ab-title";
    abTitle.innerText = title;
    abEntry.appendChild(abTitle);

    const abAuthor = document.createElement("p");
    abAuthor.className = "ab-author";
    abAuthor.innerText = author;
    abEntry.appendChild(abAuthor);

    shelfContainer.appendChild(abEntry);
}

function addAuthorToShelf(name, imgUrl, itemsCount) {
    const entry = document.createElement("div");
    entry.className = "ab-entry ab-entry-author";
    entry.id = `author-${name}`;
    entry.onclick = () => {
        buildAuthorview(name).then(() => {
            openAuthorviewPopup();
        });
    }

    const image = document.createElement("div");
    image.className = "ab-cover";
    image.style.backgroundImage = `url("${imgUrl}")`;
    entry.appendChild(image);

    const title = document.createElement("p");
    title.className = "ab-title";
    title.textContent = name;
    entry.appendChild(title);
    
    const count = document.createElement("p");
    count.className = "ab-author";
    count.textContent = `${itemsCount} audiobooks`;
    entry.appendChild(count);

    shelfContainer.appendChild(entry);
}

/// Button: Import audiobook(s)
document.getElementById('add-audiobook').addEventListener('click', async () => {
    await window.backend.importAudiobooks();
    await buildShelf();
});

/// Rerender entire shelf.
async function buildShelf() {   
    shelfContainer.innerHTML = "";

    const audiobooks = await window.backend.fetchAllAudiobooks();
    if (audiobooks.length == 0) return;
    audiobooks.forEach((ab) => {
        if (shelfMode == 0 || shelfMode == 1 && ab.progress > 0 && ab.progress < 100 || shelfMode == 2 && ab.progress == 0 || shelfMode == 3 && ab.progress == 100) {
            addAudiobookToShelf(ab.id, ab.title, ab.author, ab.coverSrc, ab.progress);
        }
    })

    const authors = await window.backend.fetchAllAuthors();
    if (authors.length == 0) return;
    authors.forEach((author) => {
        if (shelfMode == 0 || shelfMode == 4) {
            addAuthorToShelf(author.name, author.picture, author.audiobooks.length);
        }
    })
}

window.state.get().then(async (state) => {
    await buildShelf();

    const recentAb = state.recentAudiobook;
    if (recentAb == null) return;
    setupAudiobookPlay(recentAb);
})


// Shelf display type switch.
function setDisplayType(activeEl, type) {
    Array.from(document.getElementById("shelf-display-type").children).forEach(e => {
        e.setAttribute("active", "0");
    })

    activeEl.setAttribute("active", "1");
    shelfContainer.setAttribute("displayType", type);
}

function switchShelfMode(activeEl, mode) {
    Array.from(document.getElementById("shelf-category-bar").children).forEach(e => {
        e.setAttribute("active", "0");
    })

    activeEl.setAttribute("active", "1");
    
    shelfMode = mode;
    buildShelf();
}

