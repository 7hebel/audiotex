const shelfContainer = document.getElementById("audiobooks-container");


function addAudiobookToShelf(ab_id, title, author, cover_src, duration, progress) {
    const abEntry = document.createElement("div");
    abEntry.id = ab_id;
    abEntry.className = "ab-entry";

    const abCover = document.createElement("div");
    abCover.className = "ab-cover";
    abCover.style = `background-image: url('${cover_src? cover_src : 'src/default-cover.png'}')`;
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

function populateInfoPopup(ab_id) {
    document.getElementById("ab-info-popup").setAttribute("target", ab_id);
    
    window.electron.getAudiobookData(ab_id).then((ab) => {
        document.getElementById("info-cover").src = ab.cover_src ? ab.cover_src : 'src/default-cover.png';
        document.getElementById("info-author").textContent = ab.author;
        document.getElementById("info-title").textContent = ab.title;
        document.getElementById("info-duration").textContent = ab.total_time;
        document.getElementById("info-path").textContent = ab.dirpath;
        document.getElementById("info-items").textContent = ab.total_tracks + " items";
        document.getElementById("info-progress").textContent = ab.curr_track + "/" + ab.total_tracks + " - " + ab.progress + "%";
        document.getElementById("info-recent").textContent = ab.last_listened;
        document.getElementById("info-bookmarks").textContent = ab.bookmarksCount + " bookmarks";
    })

    const tracksContainer = document.getElementById("info-tracks-table");
    tracksContainer.innerHTML = "";

    window.electron.getAllTracks(ab_id).then((tracks) => {
        for (const track of tracks ) {
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
