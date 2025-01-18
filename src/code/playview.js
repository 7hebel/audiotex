
document.getElementById("play-bar").addEventListener("input", (e) => {
    const value = ((e.target.value - e.target.min) / (e.target.max - e.target.min)) * 100;
    e.target.style.setProperty('--play-bar-value', `${value}%`);
})
