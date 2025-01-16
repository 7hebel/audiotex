const SHELF_AB_CONTAINER = document.getElementById("audiobooks-container");


function addAudiobookToShelf(ab_id, title, author, cover_src, duration, progress) {
    const abEntry = document.createElement("div");
    abEntry.id = ab_id;
    abEntry.className = "ab-entry";
    abEntry.onclick = () => {
        populateInfoPopup(ab_id);
        openInfoPopup();
    }

    const abCover = document.createElement("div");
    abCover.className = "ab-cover";
    abCover.style = `background-image: url('${cover_src}')`;

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
    document.getElementById("info-author").textContent = "-";
    document.getElementById("info-duration").textContent = "-";
    document.getElementById("info-path").textContent = "-";
    document.getElementById("info-items").textContent = "-";
    document.getElementById("info-progress").textContent = "-";
    document.getElementById("info-recent").textContent = "-";
    document.getElementById("info-bookmarks").textContent = "-";
}

