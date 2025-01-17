const contentViewContainer = document.querySelector(".contentview");
const barStateIcon = document.getElementById("switch-contentview").querySelector("i");


function hideContentView() {
    contentViewContainer.style.top = "100%"
    contentViewContainer.style.opacity = "0"
    setTimeout(() => {
        contentViewContainer.setAttribute("show", "0");
    }, 600)
    barStateIcon.style.transform = "rotateX(0deg)";
}

function showContentView() {
    closeInfoPopup();
    contentViewContainer.setAttribute("show", "1");
    setTimeout(() => {
        contentViewContainer.style.top = "0%"
        contentViewContainer.style.opacity = "1"
    }, 1)
    barStateIcon.style.transform = "rotateX(180deg)";
}

function switchContentView() {
    contentViewContainer.getAttribute("show") == "0" ? showContentView() : hideContentView();
}

function populateContentView(audiobook, allTracks, currTrackID) {
    document.getElementById("cv-title").textContent = audiobook.title;
    document.getElementById("cv-author").textContent = audiobook.author;
    contentViewContainer.style.setProperty('--cover-src', `url("${audiobook.cover_src ? audiobook.cover_src : '../default-cover.png'}")`);

    const tracksContainer = document.querySelector(".cv-tracks-container");
    let activeItem = null;
    tracksContainer.innerHTML = "";

    allTracks.forEach(track => {
        const trackItem = document.createElement("div");
        trackItem.className = "cv-track-item";
        trackItem.id = `cv-idx-${track.idx}`;
        trackItem.onclick = async () => {
            setupAudiobookPlay(audiobook.id, track.id).then(() => { playAudio(); });
        }
        
        const itemIndex = document.createElement("span");
        if (track.id == currTrackID) {
            trackItem.setAttribute("active", "");
            activeItem = trackItem;
        }
        
        itemIndex.className = "cv-item-index";
        itemIndex.textContent = track.idx;
        trackItem.appendChild(itemIndex);
        
        const itemTitle = document.createElement("span");
        itemTitle.className = "cv-item-title";
        itemTitle.textContent = track.title;
        trackItem.appendChild(itemTitle);
        
        const itemBookmark = document.createElement("i");
        itemBookmark.className = "cv-item-bookmark fa-solid fa-bookmark";
        trackItem.setAttribute("bookmarked", track.bookmarks.length > 0 ? "1" : "0");
        trackItem.appendChild(itemBookmark);
        
        const itemTime = document.createElement("span");
        itemTime.className = "cv-item-time";
        itemTime.textContent = track.total_time;
        trackItem.appendChild(itemTime);

        tracksContainer.appendChild(trackItem);
    })

    if (activeItem) activeItem.scrollIntoView({ behaviour: 'smooth', block: 'center' });
}

