const shelfContainer = document.getElementById("audiobooks-container");

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

    shelfContainer.appendChild(abEntry);
}

document.getElementById('add-audiobook').addEventListener('click', async () => {
    const ab_data = await window.electron.importNewAudiobook();
    if (ab_data) setTimeout(() => { addAudiobookToShelf(...ab_data) }, 800);
});

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


window.electron.getAllAudiobooks().then(async (audiobooks) => {
    for (const ab of audiobooks) {
        addAudiobookToShelf(ab.id, ab.title, ab.author, ab.cover_src, ab.total_time, ab.progress);
    }
})

window.state.get().then(async (state) => {
    const recentAb = state.recentAudiobook;
    if (recentAb == null) return;
    setupAudiobookPlay(recentAb);
})
