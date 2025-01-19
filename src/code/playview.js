const playBar = document.getElementById("play-bar");
const timeHint = document.getElementById("play-bar-hint");
const audioPlayer = document.getElementById("audio-player");
const volumeControl = document.getElementById("volume-bar");
const speedControl = document.getElementById("speed-bar");
const stateIcon = document.getElementById("play-state-icon");

volumeControl.addEventListener("input", (e) => {
    const value = parseInt(volumeControl.value);
    volumeControl.style.setProperty('--volume-bar-value', `${value}%`);
    document.getElementById("volume-info-value").textContent = `${value}%`
    setAudioVolume(value / 100);
})

speedControl.addEventListener("input", (e) => {
    const value = ((speedControl.value - speedControl.min) / (speedControl.max - speedControl.min)) * 100;
    speedControl.style.setProperty('--speed-bar-value', `${value}%`);
    document.getElementById("speed-info-value").textContent = `${speedControl.value}x`
    setPlaybackRate(parseFloat(speedControl.value));
})


Array.from(document.getElementsByClassName("feature-btn")).forEach(el => {
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

function __updatePlayBarLine() {
    const value = ((playBar.value - playBar.min) / (playBar.max - playBar.min)) * 100;
    playBar.style.setProperty('--play-bar-value', `${value}%`);
}

playBar.addEventListener("input", (e) => {
    if (!audioPlayer) return;
    
    const newProgress = playBar.value / 1000;
    const newTime = newProgress * audioPlayer.duration;
    updatePlayTime(newTime, audioPlayer.duration);
    seekAudioAt(newTime);
});

document.addEventListener('mousemove', (e) => {
    if (!playBar.matches(":hover")) return;
    
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

audioPlayer.addEventListener("timeupdate", (e) => {
    const current = audioPlayer.currentTime;
    const total = audioPlayer.duration;
    if (!current || !total) return;
    updatePlayTime(current, total);
})

function setTrackMeta(trackId, abId) {
    audioPlayer.setAttribute("track-id", trackId);
    audioPlayer.setAttribute("ab-id", abId);
}

function setTrackData(trackName, abName) {
    document.getElementById("pv-curr-track").textContent = trackName;
    document.getElementById("pv-curr-audiobook").textContent = abName;
}

function updatePlayTime(curr_s, total_s) {
    const progress = (curr_s / total_s);
    const timeInfo = secondsToReadable(curr_s) + " / " + secondsToReadable(total_s);

    document.getElementById("pv-track-time").textContent = timeInfo;
    document.getElementById("play-bar").value = Math.round(1000 * progress);
    __updatePlayBarLine();
}

function setAudioSource(src) {
    audioPlayer.src = src;
}

function switchPlayState() {
    audioPlayer.paused ? playAudio() : pauseAudio()
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

function setPlaybackRate(rate) {
    audioPlayer.playbackRate = rate;
    document.getElementById("speed-info-value").textContent = `${rate}x`;
    const value = ((rate - speedControl.min) / (speedControl.max - speedControl.min)) * 100;
    speedControl.style.setProperty('--speed-bar-value', `${value}%`);
}

function sendStateUpdate() {
    const abId = audioPlayer.getAttribute("ab-id");
    const trackId = audioPlayer.getAttribute("track-id");
    if (!abId || !trackId) return;

    const currentMoment_s = audioPlayer.currentTime;
    window.electron.updateAudiobookState(abId, trackId, currentMoment_s, speedControl.value);
}


setInterval(() => {
    if (!audioPlayer.paused) {
        sendStateUpdate();
        console.log("updated")
    }
}, 5000)

