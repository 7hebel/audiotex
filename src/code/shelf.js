const audiobooksContainer = document.getElementById("shelf-audiobooks-container");
const foldersContainer = document.getElementById("shelf-folders-container");
const authorsContainer = document.getElementById("shelf-authors-container");
const shelfContainer = document.getElementById("shelf-container");
const createDirForm = document.getElementById("create-dir-form");
const renameDirForm = document.getElementById("rename-dir-form");


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

    audiobooksContainer.appendChild(abEntry);
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
    dirEntry.onclick = async () => {
        const dir = await getDirectory(dirname);
        if (dir == undefined) return buildShelf();

        await buildDirview(dirname, dir.items);
        openDirviewPopup();
    }

    foldersContainer.appendChild(dirEntry);
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

    authorsContainer.appendChild(entry);
}

/// Button: Import audiobook(s)
document.getElementById('add-audiobook').addEventListener('click', async () => {
    await window.backend.importNewAudiobooks();
    await buildShelf();
});

/// Rerender entire shelf.
async function buildShelf() {
    foldersContainer.innerHTML = "";
    audiobooksContainer.innerHTML = "";
    authorsContainer.innerHTML = "";
    
    const state = await window.state.get();

    const directories = state.directories;
    if (directories.length == 0) foldersContainer.innerHTML = `<span span class="blank-shelf-category">There are no folders.</span>`;
    directories.forEach((dir) => {
        const name = dir.dirname;
        const items = dir.items;
        addFolderToShelf(name, items);
    });

    const audiobooks = await window.backend.getAllAudiobooks();
    if (audiobooks.length == 0) audiobooksContainer.innerHTML = `<span class="blank-shelf-category">There are no audiobooks.</span>`;
    audiobooks.forEach((ab) => {
        addAudiobookToShelf(ab.id, ab.title, ab.author, ab.cover_src, ab.total_time, ab.progress);
    })

    const authors = await window.backend.getAuthors();
    if (authors.length == 0) authorsContainer.innerHTML = `<span class="blank-shelf-category">There are no authors.</span>`;
    authors.forEach((author) => {
        addAuthorToShelf(author.author, author.imgUrl, author.items.length);
    })
}

async function createDirectory(name) {
    const state = await window.state.get();
    name = name.trim();
    if (!name) return displayErrorMessage("Invalid folder name.")

    for (const dir of state.directories) {
        if (dir.dirname == name) return displayErrorMessage("Folder with this name already exists.")
    }
    
    state.directories.unshift({
        dirname: name,
        items: []
    });
    await window.state.set(state);
    await buildShelf();
    displayInfoMessage(`Created folder: ${name}`)
}

function __removeItemFromArr(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

async function removeItemFromAllDirs(ab_id) {
    const state = await window.state.get();
    for (const dir of state.directories) {
        await removeItemFromDir(ab_id, dir.dirname)
    }
    await buildShelf();
}

async function getDirectory(dirname) {
    const state = await window.state.get();
    for (const dir of state.directories) {
        if (dir.dirname == dirname) return dir
    }
    return undefined;
}

async function removeDirectory(dirname) { 
    const dir = await getDirectory(dirname);
    if (dir === undefined) return buildShelf();

    const state = await window.state.get();
    state.directories = state.directories.filter((d) => d.dirname !== dirname);
    await window.state.set(state);

    document.getElementById(`dir-${dirname}`)?.remove();
}

async function renameDirectory(targetName, newName) {
    const dir = await getDirectory(targetName);
    if (dir === undefined) return buildShelf();
    if (!newName) return displayErrorMessage("Invalid folder name.")

    const state = await window.state.get();
    for (const d of state.directories) {
        if (d.dirname == newName) return displayErrorMessage("Folder with this name already exists.")
    }
    
    state.directories.forEach((d) => {
        if (d.dirname == targetName) d.dirname = newName;
    });
    document.getElementById(`dir-${targetName}`).id = `dir-${newName}`;
    document.getElementById("dirview-dirname").textContent = newName;
    await window.state.set(state);

}

async function putItemInDir(ab_id, dirname) {
    const state = await window.state.get();
    let dirItemsCount = null;

    state.directories.forEach((dir) => {
        if (dir.dirname == dirname) {
            if (dir.items.includes(ab_id)) return displayErrorMessage("Audiobook already in folder.")
            
            dir.items.push(ab_id)
            dirItemsCount = dir.items.length;
        }
    })

    if (dirItemsCount == null) return;

    document.getElementById(`dir-${dirname}`).querySelector(".ab-author").textContent = dirItemsCount + " items";
    await window.state.set(state);
}

async function removeItemFromDir(ab_id, dirname) {
    const state = await window.state.get();
    let dirItemsCount = null;

    state.directories.forEach((item) => {
        if (item.dirname == dirname) {
            item.items = __removeItemFromArr(item.items, ab_id);
            dirItemsCount = item.items.length;
        }
    })

    if (dirItemsCount == null) return;
    
    document.getElementById(`dir-${dirname}`).querySelector(".ab-author").textContent = dirItemsCount + " items";
    await window.state.set(state);
}


window.state.get().then(async (state) => {
    await buildShelf();

    const recentAb = state.recentAudiobook;
    if (recentAb == null) return;
    setupAudiobookPlay(recentAb);
})



/// Button: Create folder
let createFolderFormUsed = false;
function openCreateFolderForm() {
    if (createFolderFormUsed) return;
    createFolderFormUsed = true;
    
    createDirForm.setAttribute("show", "1");
    setTimeout(() => {
        createDirForm.style.right = "20px";
        createDirForm.style.opacity = "1";
    }, 1)
}

function closeCreateFolderForm() {
    document.getElementById("create-dir-name").value = "";

    createDirForm.style.right = "-400px";
    createDirForm.style.opacity = "0";
    setTimeout(() => { createDirForm.setAttribute("show", "0"); }, 500);
    createFolderFormUsed = false;
}

function acceptCreateFolderForm() {
    const dirname = document.getElementById("create-dir-name").value.trim();
    createDirectory(dirname);
    closeCreateFolderForm();
}


/// Button: Rename folder
let renameFolderFormUsed = false;
function openRenameFolderForm() {
    if (renameFolderFormUsed) return;
    renameFolderFormUsed = true;

    document.getElementById("rename-dir-name").placeholder = document.getElementById("dirview-dirname").textContent;
    renameDirForm.setAttribute("show", "1");
    setTimeout(() => {
        renameDirForm.style.right = "20px";
        renameDirForm.style.opacity = "1";
    }, 1)
}

function closeRenameFolderForm() {
    document.getElementById("rename-dir-name").value = "";

    renameDirForm.style.right = "-400px";
    renameDirForm.style.opacity = "0";
    setTimeout(() => { renameDirForm.setAttribute("show", "0"); }, 500);
    renameFolderFormUsed = false;
}

function acceptRenameFolderForm() {
    const targetDirname = document.getElementById("dirview-dirname").textContent;
    const newDirname = document.getElementById("rename-dir-name").value.trim();
    renameDirectory(targetDirname, newDirname);
    closeRenameFolderForm();
}


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
    
    if (!lastHoveredElement) return;
    if (!lastHoveredElement.matches(":hover")) {
        lastHoveredElement = null;
        draggingItem = null;
        return;
    }

    if (lastHoveredElement) {
        const targetDirname = lastHoveredElement.id.slice(4);
        const draggedAudiobookId = draggingItem.id;
        putItemInDir(parseInt(draggedAudiobookId), targetDirname);
    }
    
    if (lastHoveredElement) lastHoveredElement.setAttribute("item-hovered", "0");

    draggingItem = null;
    lastHoveredElement = null;
});


function switchSectionCollapse(icon, id) {
    const section = document.getElementById(id);

    if (section.getAttribute("collapsed") == "0") {
        section.setAttribute("collapsed", "1");
        icon.style.transform = "rotate(-90deg)";
        
    } else {
        section.setAttribute("collapsed", "0");
        icon.style.transform = "rotate(0deg)";
        
    }
}

