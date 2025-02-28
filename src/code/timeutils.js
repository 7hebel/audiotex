function secondsToReadable(s) {
    // 1675.1020408163265 -> 27:55
    let minutes = Math.floor(s / 60);
    let seconds = Math.round(s % 60);
    let hours = 0;

    if (minutes >= 60) {
        hours = Math.floor(minutes / 60);
        minutes = Math.round(minutes % 60);
    }

    if (minutes < 10) {
        minutes = `0${minutes}`;
    }

    if (seconds < 10) {
        seconds = `0${seconds}`;
    }

    if (hours > 0) {
        return `${hours}:${minutes}:${seconds}`;
    }

    return `${minutes}:${seconds}`;
}

function getDate() {
    // Returns current date in: DD/MM/YYYY format.
    const currentDateParts = new Date().toISOString().split("T")[0].split("-");
    const year = currentDateParts[0];
    const month = currentDateParts[1];
    const day = currentDateParts[2];
    return `${day}/${month}/${year}`;
}

try { module.exports = { secondsToReadable, getDate }} catch {}
