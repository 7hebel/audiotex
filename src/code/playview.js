const bookmarkFormContainer = document.querySelector(".add-bookmark-form");
const volumeControl = document.getElementById("volume-bar");
const speedControl = document.getElementById("speed-bar");
const audioPlayer = document.getElementById("audio-player");
const stateIcon = document.getElementById("play-state-icon");
const timeHint = document.getElementById("play-bar-hint");
const playBar = document.getElementById("play-bar");


/// Load saved volume level.
window.state.get().then((state) => {
    const value = parseFloat((state.volume * 100).toFixed(2));
    volumeControl.value = value;
    volumeControl.style.setProperty('--volume-bar-value', `${value}%`);
    document.getElementById("volume-info-value").textContent = `${value}%`
})

/// Volume range input -- update style and apply change.
volumeControl.addEventListener("input", async (e) => {
    const value = parseInt(volumeControl.value);
    volumeControl.style.setProperty('--volume-bar-value', `${value}%`);
    document.getElementById("volume-info-value").textContent = `${value}%`

    const state = await window.state.get();
    state.volume = parseFloat((volumeControl.value / 100).toFixed(2));
    window.state.set(state);

    setAudioVolume(value / 100);
})

/// Speed range input -- update style and apply change.
speedControl.addEventListener("input", (e) => {
    const value = ((speedControl.value - speedControl.min) / (speedControl.max - speedControl.min)) * 100;
    speedControl.style.setProperty('--speed-bar-value', `${value}%`);
    document.getElementById("speed-info-value").textContent = `${speedControl.value}x`

    setPlaySpeed(parseFloat(speedControl.value));
})

/// Manage feature buttons visibility on hover.
Array.from(document.getElementsByClassName("feature-btn")).forEach(el => {
    el.addEventListener("click", e => { el.setAttribute("showContent", "1"); })
    el.addEventListener("mouseenter", e => { 
        setTimeout(() => {
            if (!el.matches(":hover")) return;
            el.setAttribute("showContent", "1"); 
            const contentElement = el.querySelector(".feature-range-container");
            if (contentElement) setTimeout(() => { contentElement.style.opacity = "1"; }, 1);
        }, 300)
    })
    el.addEventListener("mouseleave", e => {
        const contentElement = el.querySelector(".feature-range-container");
        if (contentElement === null) return;

        setTimeout(() => {
            if (el.matches(":hover") || contentElement.matches(":hover")) return;
            contentElement.style.opacity = "0";
            setTimeout(() => {el.setAttribute("showContent", "0")}, 450)
        }, 800)
    })
})

/// Manually seek track.
playBar.addEventListener("input", (e) => {
    if (!audioPlayer) return;

    const newProgress = playBar.value / 1000;
    const newTime = newProgress * audioPlayer.duration;
    updateTimeInformation(newTime, audioPlayer.duration);
    seekAudioAt(newTime);
});

/// Track mouse movement to display time hint on playbar.
document.addEventListener('mousemove', (e) => {
    if (!playBar.matches(":hover") || isNaN(audioPlayer.duration)) return;

    const barRect = playBar.getBoundingClientRect();
    const mx = e.clientX;
    timeHint.style.left = `${mx - 20}px`;

    const point = mx - barRect.x;
    const progress = point / barRect.width;
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;

    const time_s = audioPlayer.duration * progress;
    timeHint.textContent = secondsToReadable(time_s);
});

/// Automatically alter play time and progress information. Play next track if ended.
audioPlayer.addEventListener("timeupdate", async (e) => {
    const current = audioPlayer.currentTime;
    const total = audioPlayer.duration;
    if (!current || !total) return;

    if (current == total) playNextTrack();

    const ab_id = parseInt(audioPlayer.getAttribute("ab-id"));
    if (ab_id) {
        const progress = await window.electron.calculateAudiobookProgress(ab_id);
        document.getElementById(String(ab_id)).querySelectorAll(".ab-meta")[1].textContent = `${progress}%`;
    }

    updateTimeInformation(current, total);
})

function __updatePlayBarLine() {
    /// Apply background gradient style on playbar based on the input's value.
    const value = ((playBar.value - playBar.min) / (playBar.max - playBar.min)) * 100;
    playBar.style.setProperty('--play-bar-value', `${value}%`);
}

function setTrackMeta(trackId, trackIndex, abId) {
    /// Save audiobook's ID, track's index and ID for easier access in future. 
    audioPlayer.setAttribute("ab-id", abId);
    audioPlayer.setAttribute("track-id", trackId);
    audioPlayer.setAttribute("track-index", trackIndex);
}

function setTrackData(trackName, abName) {
    /// Set track's and audiobook's names.
    document.getElementById("pv-curr-track").textContent = trackName;
    document.getElementById("pv-curr-audiobook").textContent = abName;
}

function updateTimeInformation(curr_s, total_s) {
    /// Update current play-time information. (00:00 / 00:00) 
    const progress = (curr_s / total_s);
    const timeInfo = secondsToReadable(curr_s) + " / " + secondsToReadable(total_s);

    document.getElementById("pv-track-time").textContent = timeInfo;
    document.getElementById("play-bar").value = Math.round(1000 * progress);
    __updatePlayBarLine();
}

function playAudio() {
    audioPlayer.play();
    if (!audioPlayer.paused) stateIcon.className = "fa-solid fa-pause";
}

function pauseAudio() {
    audioPlayer.pause();
    if (audioPlayer.paused) stateIcon.className = "fa-solid fa-play";
}

function setAudioVolume(volume) {
    audioPlayer.volume = volume;

    const iconEl = document.getElementById("volume-icon");
    if (volume == 0) {
        iconEl.className = "fa-solid fa-volume-xmark";
    } else if (volume <= 0.33) {
        iconEl.className = "fa-solid fa-volume-off";
    } else if (volume <= 0.75) {
        iconEl.className = "fa-solid fa-volume-low";
    } else {
        iconEl.className = "fa-solid fa-volume-high";
    }
}

function seekAudioAt(secs) {
    audioPlayer.currentTime = secs;
}

function setPlaySpeed(rate) {
    audioPlayer.playbackRate = rate;

    document.getElementById("speed-info-value").textContent = `${rate}x`;
    const valuePercentage = ((rate - speedControl.min) / (speedControl.max - speedControl.min)) * 100;
    speedControl.style.setProperty('--speed-bar-value', `${valuePercentage}%`);
}

/// Save play state into the DB every second.
setInterval(() => {
    if (!audioPlayer.paused) {
        const abId = audioPlayer.getAttribute("ab-id");
        const trackId = audioPlayer.getAttribute("track-id");
        if (!abId || !trackId) return;

        const currentMoment_s = audioPlayer.currentTime;
        window.electron.updateAudiobookState(abId, trackId, currentMoment_s, speedControl.value);
    }
}, 1000)


function placeBarBookmarks(track) {
    /// Place all bookmarks from this track on the play bar.
    const bookmarksContainer = document.getElementById("bar-bookmarks");
    bookmarksContainer.innerHTML = "";

    track.bookmarks.forEach((bookmark) => {
        const timePercentage = (bookmark.moment_s / track.total_seconds) * 100;
    
        const bookmarkItem = document.createElement("div");
        bookmarkItem.className = "on-bar-bookmark";
        bookmarkItem.style = `left: calc(${timePercentage}% - 4px)`;
        bookmarkItem.setAttribute("hovered", "0");
        bookmarkItem.innerHTML = `<i class="fa-solid fa-bookmark" onclick="seekAudioAt(${bookmark.moment_s});"></i>`;
    
        const bookmarkComment = document.createElement("span");
        bookmarkComment.className = "bookmark-comment";
        if (bookmark.comment) bookmarkComment.textContent = bookmark.comment;

        const rmBookmarkIcon = document.createElement("img");
        rmBookmarkIcon.src = "src/icon/bookmark-slash.svg";
        rmBookmarkIcon.className = "rm-bookmark-icon";
        rmBookmarkIcon.onclick = async () => {
            bookmarksContainer.removeChild(bookmarkItem);
            await window.electron.removeBookmark(bookmark.id);
            document.getElementById(`cv-idx-${track.idx}`).setAttribute("bookmarked", "0");
            updateTotalBookmarksCount();
            displayInfoMessage(`Removed bookmark: ${secondsToReadable(bookmark.moment_s)}`);

            if (infoPopupContainer.getAttribute("target") == track.audiobook_id) {
                const infoItem = document.querySelector(`.info-track-item[track-id="${bookmark.track_id}"] .info-track-item-bookmarks`);
                const count = parseInt(infoItem.textContent) - 1;

                if (count == 0) {
                    infoItem.innerHTML = "";
                    document.getElementById("info-bookmarks").textContent = "No bookmarks"
                } else {
                    infoItem.innerHTML = `${count} <i class="fa-solid fa-bookmark"></i>`;
                    document.getElementById("info-bookmarks").textContent = `${count} bookmarks`
                }
            }
        }
    
        const bookmarkMeta = document.createElement("div");
        bookmarkMeta.className = "bookmark-meta";
    
        const bookmarkTimeInfo = document.createElement("span");
        bookmarkTimeInfo.className = "bookmark-meta-info";
        bookmarkTimeInfo.textContent = secondsToReadable(bookmark.moment_s);
        bookmarkMeta.appendChild(bookmarkTimeInfo);
    
        const bookmarkDateInfo = document.createElement("span");
        bookmarkDateInfo.className = "bookmark-meta-info";
        bookmarkDateInfo.textContent = bookmark.date_add;
        bookmarkMeta.appendChild(bookmarkDateInfo);
    
        bookmarkItem.addEventListener("mouseenter", () => {
            setTimeout(() => {
                if (!bookmarkItem.matches(":hover")) return;
                bookmarkItem.setAttribute("hovered", "1");
                setTimeout(() => { bookmarkComment.style.opacity = "1"; }, 1);
            }, 600)
        })
        bookmarkItem.addEventListener("mouseleave", () => {
            setTimeout(() => {
                if (bookmarkItem.matches(":hover")) return;
                bookmarkComment.style.opacity = "0"
                setTimeout(() => {
                    bookmarkItem.setAttribute("hovered", "0");
                }, 450)
            }, 500)
        })
        
        bookmarkComment.appendChild(rmBookmarkIcon);
        bookmarkComment.appendChild(bookmarkMeta);
        bookmarkItem.appendChild(bookmarkComment);
        bookmarksContainer.appendChild(bookmarkItem);
    })
}

async function setupAudiobookPlay(ab_id, track_id = null) {
    // If track-id is null, resume from the latest session.
    const data = await window.electron.playAudiobook(ab_id, track_id);
    const allTracks = await window.electron.getAllTracks(ab_id);

    const ab = data.audiobook;
    const track = data.track;

    document.getElementById("pv-cover").src = ab.cover_src ? ab.cover_src : './src/default-cover.png';

    const progress = await window.electron.calculateAudiobookProgress(ab_id);
    document.getElementById(String(ab_id)).querySelectorAll(".ab-meta")[1].textContent = `${progress}%`;

    audioPlayer.src = track.filepath;
    setTrackMeta(track.id, track.idx, ab.id);
    setTrackData(track.title, ab.title);
    setPlaySpeed(ab.play_speed);

    if (track_id === null) seekAudioAt(ab.curr_moment_s);
    else {
        playBar.value = 0;
        playBar.style.setProperty('--play-bar-value', `0%`);
        document.getElementById("pv-track-time").textContent = "00:00 / " + track.total_time;
    }

    placeBarBookmarks(track);

    const state = await window.state.get();
    setAudioVolume(state.volume);
    populateContentView(ab, allTracks, track.id);
}

/// Button: Play next track
async function playNextTrack() {
    const ab_id = audioPlayer.getAttribute("ab-id");
    const nextIndex = parseInt(audioPlayer.getAttribute("track-index")) + 1;
    const nextTrack = await window.electron.getTrackByIndex(ab_id, nextIndex);
    if (nextTrack === undefined) return;
    
    setupAudiobookPlay(ab_id, nextTrack.id).then(() => { playAudio() });
}

/// Button: Play previous track
document.getElementById("previous-track-btn").addEventListener('click', async () => {
    const ab_id = audioPlayer.getAttribute("ab-id");
    const nextIndex = parseInt(audioPlayer.getAttribute("track-index")) - 1;
    if (nextIndex < 1) { return; }

    const nextTrack = await window.electron.getTrackByIndex(ab_id, nextIndex);
    if (nextTrack === undefined) return;

    setupAudiobookPlay(ab_id, nextTrack.id).then(() => { playAudio() });
})

/// Button: Add bookmark
let addBookmarkFormUsed = false;

document.getElementById("add-bookmark").addEventListener('click', async () => {
    if (addBookmarkFormUsed) return;
    addBookmarkFormUsed = true;

    const moment_s = audioPlayer.currentTime;
    if (isNaN(moment_s)) return;

    document.getElementById("add-bookmark-time").textContent = secondsToReadable(moment_s);
    bookmarkFormContainer.setAttribute("target-s", parseInt(moment_s));

    bookmarkFormContainer.setAttribute("show", "1");
    setTimeout(() => {
        bookmarkFormContainer.style.right = "20px";
        bookmarkFormContainer.style.opacity = "1";
    }, 1)
})

async function acceptBookmarkForm() {
    const moment_s = parseInt(bookmarkFormContainer.getAttribute("target-s"));
    if (moment_s == -1) { return cancelBookmarkForm(); }

    const comment = document.getElementById("add-bookmark-comment").value;
    document.getElementById("add-bookmark-comment").value = "";

    const trackId = parseInt(audioPlayer.getAttribute("track-id"));
    await window.electron.addBookmark(trackId, moment_s, comment);
    
    const track = await window.electron.getTrackById(trackId);
    placeBarBookmarks(track);

    document.getElementById(`cv-idx-${track.idx}`).setAttribute("bookmarked", "1");

    if (infoPopupContainer.getAttribute("target") == audioPlayer.getAttribute("ab-id")) {
        const infoItem = document.querySelector(`.info-track-item[track-id="${trackId}"] .info-track-item-bookmarks`);
        const count = (parseInt(infoItem.textContent) || 0) + 1;

        infoItem.innerHTML = `${count} <i class="fa-solid fa-bookmark"></i>`;
        document.getElementById("info-bookmarks").textContent = `${count} bookmarks`
    }

    cancelBookmarkForm();
    updateTotalBookmarksCount();
    setTimeout(() => { displayInfoMessage(`Placed bookmark at: ${secondsToReadable(moment_s)}`); }, 500)
}

function cancelBookmarkForm() {
    bookmarkFormContainer.style.right = "-400px";
    bookmarkFormContainer.style.opacity = "0";
    bookmarkFormContainer.setAttribute("target-s", "-1");
    document.getElementById("add-bookmark-comment").value = ""
    setTimeout(() => { bookmarkFormContainer.setAttribute("show", "0"); }, 500);
    addBookmarkFormUsed = false;
}

