const playBar = document.getElementById("play-bar");
const audioPlayer = document.getElementById("audio-player");
const volumeControl = document.getElementById("volume-bar");
const speedControl = document.getElementById("speed-bar");

volumeControl.addEventListener("input", (e) => {
    const value = parseInt(volumeControl.value);
    volumeControl.style.setProperty('--volume-bar-value', `${value}%`);
    setAudioVolume(value / 100);
})

speedControl.addEventListener("input", (e) => {
    const value = ((speedControl.value - speedControl.min) / (speedControl.max - speedControl.min)) * 100;
    speedControl.style.setProperty('--speed-bar-value', `${value}%`);
    setPlaybackRate(parseFloat(speedControl.value));
})


Array.from(document.getElementsByClassName("feature-btn")).forEach(el => {
    el.addEventListener("mouseenter", e => {el.setAttribute("showContent", "1")})
    el.addEventListener("mouseleave", e => {
        const contentElement = el.querySelector(".feature-range-container");
        const checkInterval = setInterval(() => {
            if (!el.matches(":hover") && !contentElement.matches(":hover")) {
                el.setAttribute("showContent", "0");
                clearInterval(checkInterval);
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

audioPlayer.addEventListener("timeupdate", (e) => {
    const current = audioPlayer.currentTime;
    const total = audioPlayer.duration;

    updatePlayTime(current, total);
})

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

function playAudio() {
    audioPlayer.play();
}

function pauseAudio() {
    audioPlayer.pause();
}

function setAudioVolume(volume) {
    // voulme: [0, 1]
    audioPlayer.volume = volume;
}

function seekAudioAt(secs) {
    audioPlayer.currentTime = secs;
}

function setPlaybackRate(rate) {
    audioPlayer.playbackRate = rate;
}

