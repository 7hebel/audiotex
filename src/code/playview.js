const volumeControl = document.getElementById("volume-bar");
const speedControl = document.getElementById("speed-bar");
const audioPlayer = document.getElementById("audio-player");
const stateIcon = document.getElementById("play-state-icon");
const timeHint = document.getElementById("play-bar-hint");
const playBar = document.getElementById("play-bar");


/// Load saved volume level.
window.state.get().then((state) => {
    const value = state.volume * 100;
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
    el.addEventListener("mouseenter", e => { el.setAttribute("showContent", "1"); })
    el.addEventListener("mouseleave", e => {
        const contentElement = el.querySelector(".feature-range-container");
        if (contentElement === null) return;

        const checkInterval = setInterval(() => {
            if (!el.matches(":hover") && !contentElement.matches(":hover")) {
                contentElement.style.opacity = 0;
                setTimeout(() => {
                    el.setAttribute("showContent", "0");
                    contentElement.style.opacity = 1;
                    clearInterval(checkInterval);
                }, 400)
            }
        }, 1500)
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

/// Automatically alter play time information. Play next track if ended.
audioPlayer.addEventListener("timeupdate", (e) => {
    const current = audioPlayer.currentTime;
    const total = audioPlayer.duration;
    if (!current || !total) return;

    if (current == total) {
        playNextTrack();
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

async function setupAudiobookPlay(ab_id, track_id = null) {
    // If track-id is null, resume from the latest session.
    const data = await window.electron.playAudiobook(ab_id, track_id);

    const ab = data.audiobook;
    const track = data.track;

    if (ab.cover_src) document.getElementById("pv-cover").src = ab.cover_src;

    const progress = Math.round((track.idx / ab.total_tracks) * 100) + "%";
    document.getElementById(String(ab_id)).querySelectorAll(".ab-meta")[1].textContent = progress;

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

    const state = await window.state.get();
    setAudioVolume(state.volume);
}

/// Button: Play next track
async function playNextTrack() {
    const ab_id = audioPlayer.getAttribute("ab-id");
    const nextIndex = parseInt(audioPlayer.getAttribute("track-index")) + 1;
    const nextTrack = await window.electron.getIrackByIndex(ab_id, nextIndex);
    if (nextTrack === undefined) return;
    
    setupAudiobookPlay(ab_id, nextTrack.id).then(() => { playAudio() });
}

/// Button: Play previous track
document.getElementById("previous-track-btn").addEventListener('click', async () => {
    const ab_id = audioPlayer.getAttribute("ab-id");
    const nextIndex = parseInt(audioPlayer.getAttribute("track-index")) - 1;
    if (nextIndex < 1) { return; }

    const nextTrack = await window.electron.getIrackByIndex(ab_id, nextIndex);
    if (nextTrack === undefined) return;

    setupAudiobookPlay(ab_id, nextTrack.id).then(() => { playAudio() });
})
