let current_win = null;


function _setWin(win) {
    current_win = win;
}

function displayInfo(message) {
    if (current_win) {
        current_win.webContents.send('msg-info', message)
    } else {
        console.error(`Failed to send message (win not initalized): ${message}`)
    }
}

function displayError(message) {
    if (current_win) {
        current_win.webContents.send('msg-error', message)
    } else {
        console.error(`Failed to send error (win not initalized): ${message}`)
    }
}


module.exports = {
    _setWin,
    displayInfo,
    displayError
}
