const audiobooksContainer = document.getElementById("shelf-audiobooks-container");
const foldersContainer = document.getElementById("shelf-folders-container");
const authorsContainer = document.getElementById("shelf-authors-container");
const shelfContainer = document.getElementById("shelf-container");


function addAudiobookToShelf(ab_id, title, author, cover_src, duration, progress) {
    const abEntry = document.createElement("div");
    abEntry.id = ab_id;
    abEntry.className = "ab-entry";

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
    audiobooksContainer.innerHTML = "";
    authorsContainer.innerHTML = "";

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

window.state.get().then(async (state) => {
    await buildShelf();

    const recentAb = state.recentAudiobook;
    if (recentAb == null) return;
    setupAudiobookPlay(recentAb);
})

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

