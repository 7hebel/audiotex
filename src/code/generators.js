const SHELF_AB_CONTAINER = document.getElementById("audiobooks-container");


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
    metaProgress.innerText = progress;
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

    SHELF_AB_CONTAINER.appendChild(abEntry);
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
        document.getElementById("info-progress").textContent = ab.curr_track + "/" + ab.total_tracks + "  " + ((ab.curr_track / ab.total_tracks) * 100) + "%";
        document.getElementById("info-recent").textContent = ab.last_listened;
        document.getElementById("info-bookmarks").textContent = "0 bookmarks";
    })

    const tbody = document.getElementById("info-tracks");
    for (const tr of Array.from(tbody.children)) {
        if (tr.id != "info-table-header") {
            tbody.removeChild(tr);
        }
    }

    window.electron.getTracks(ab_id).then((tracks) => {
        for (const track of tracks) {
            const tr = document.createElement("tr");
            tr.setAttribute("draggable", "true");
            tr.setAttribute("track-id", track.id);

            const tdIndex = document.createElement("td");
            tdIndex.textContent = track.idx;
            
            const tdTitle = document.createElement("td");
            tdTitle.textContent = track.title;
            
            const tdTime = document.createElement("td");
            tdTime.textContent = track.total_time;

            tr.appendChild(tdIndex);
            tr.appendChild(tdTitle);
            tr.appendChild(tdTime);
            tbody.appendChild(tr);
        }
    })
}
