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

