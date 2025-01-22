const shelfContainer = document.getElementById("audiobooks-container");

function addAudiobookToShelf(ab_id, title, author, cover_src, duration, progress) {
    const abEntry = document.createElement("div");
    abEntry.id = ab_id;
    abEntry.className = "ab-entry";
    abEntry.setAttribute("draggable", "true")


    const abCover = document.createElement("div");
    abCover.className = "ab-cover";
    abCover.style = `background-image: url('${cover_src ? cover_src : 'src/default-cover.png'}')`;
    abCover.onclick = () => {
        populateInfoPopup(ab_id);
        openInfoPopup();
    }

    const metaTime = document.createElement("span");
    metaTime.className = "ab-meta";
    metaTime.innerText = duration;
    abCover.appendChild(metaTime);

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

function addFolderToShelf(dirname, items) {
    const dirEntry = document.createElement("div");
    dirEntry.className = "ab-entry shelf-dir";
    dirEntry.id = `dir-${dirname}`;
    dirEntry.innerHTML = `
        <div class="ab-cover">
            <i class="fa-solid fa-folder"></i>
        </div>
        <p class="ab-title">${dirname}</p>
        <p class="ab-author">${items.length} items</p>
    `;

    shelfContainer.appendChild(dirEntry);

}

/// Button: Import audiobook(s)
document.getElementById('add-audiobook').addEventListener('click', async () => {
    await window.electron.importNewAudiobooks();
    await buildShelf();
});

/// Button: Open bookmarks window.
document.getElementById('bookmarks-opener').addEventListener('click', async () => {
    buildBookmarksListPopup().then(() => {
        openBookmarksListPopup();
    });
});

function updateTotalBookmarksCount() {
    window.electron.countTotalBookmarks().then((count) => {
        document.getElementById("totalbookmarks-count").textContent = count;
    })
}

updateTotalBookmarksCount();

/// Load state.
async function buildShelf() {
    Array.from(shelfContainer.children).forEach((childEL) => {
        if (!childEL.className.includes("ab-default-entry")) childEL.remove();
    })
    
    const state = await window.state.get();
    const arrangement = state.shelfArrangement;

    for (const item of arrangement) {
        if (Number.isInteger(item)) {
            // Audiobook
            const ab = await window.electron.getAudiobookData(item);
            if (ab) addAudiobookToShelf(ab.id, ab.title, ab.author, ab.cover_src, ab.total_time, ab.progress);
        } else {
            // Folder
            const name = item.dirname;
            const items = item.items;
            addFolderToShelf(name, items);
        }
    }
}

async function createDirectory(name) {
    const state = await window.state.get();

    for (const item of state.shelfArrangement) {
        if (item.dirname == name) return displayErrorMessage("Folder with this name already exists.")
    }
    
    state.shelfArrangement.unshift({
        dirname: name,
        items: []
    });
    await window.state.set(state);
    await buildShelf();
}


function __removeItemFromArr(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

async function putItemInDir(ab_id, dirname) {
    const state = await window.state.get();
    if (!state.shelfArrangement.includes(ab_id)) return;
    let dirItemsCount = null;

    state.shelfArrangement = __removeItemFromArr(state.shelfArrangement, ab_id);
    state.shelfArrangement.forEach((item) => {
        if (!Number.isInteger(item) && item.dirname == dirname) {
            item.items.push(ab_id)
            dirItemsCount = item.items.length;
        }
    })

    if (dirItemsCount == null) return;

    document.getElementById(`dir-${dirname}`).querySelector(".ab-author").textContent = dirItemsCount + " items";
    await window.state.set(state);
}

async function removeItemFromDir(ab_id, dirname) {
    const state = await window.state.get();
    let dirItemsCount = null;

    state.shelfArrangement.forEach((item) => {
        if (!Number.isInteger(item) && item.dirname == dirname) {
            item.items = __removeItemFromArr(item.items, ab_id);
            dirItemsCount = item.items.length;
        }
    })

    if (dirItemsCount == null) return;
    
    state.shelfArrangement.unshift(ab_id);
    document.getElementById(`dir-${dirname}`).querySelector(".ab-author").textContent = dirItemsCount + " items";
    await window.state.set(state);

    await buildShelf();
}

window.state.get().then(async (state) => {
    await buildShelf();

    const recentAb = state.recentAudiobook;
    if (recentAb == null) return;
    setupAudiobookPlay(recentAb);
})


/// Dragging items to the folders handling.

let draggingItem = null;
let lastHoveredElement = null;

shelfContainer.addEventListener('dragstart', (e) => {
    draggingItem = e.target;
    e.target.classList.add('dragging');
    lastHoveredElement = null;
});

shelfContainer.addEventListener('dragover', (e) => {
    e.preventDefault();

    const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
    if (hoveredElement && hoveredElement !== draggingItem && hoveredElement.classList.contains('ab-cover')) {
        if (hoveredElement !== lastHoveredElement && hoveredElement.parentElement.classList.contains('shelf-dir')) {
            lastHoveredElement = hoveredElement.parentElement;
            lastHoveredElement.setAttribute("item-hovered", "1");
            return;
        }
    }

    if (lastHoveredElement) lastHoveredElement.setAttribute("item-hovered", "0");
});

shelfContainer.addEventListener('dragend', (e) => {
    e.target.classList.remove('dragging');
    
    if (lastHoveredElement) {
        const targetDirname = lastHoveredElement.id.slice(4);
        const draggedAudiobookId = draggingItem.id;
        draggingItem.remove();
        putItemInDir(parseInt(draggedAudiobookId), targetDirname);
    }
    
    if (lastHoveredElement) lastHoveredElement.setAttribute("item-hovered", "0");

    draggingItem = null;
    lastHoveredElement = null;
});

