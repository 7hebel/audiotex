const editableElements = Array.from(document.getElementsByClassName("info-editable"));
const tracksContainer = document.getElementById("info-tracks-table");
const infoPopupContainer = document.getElementById("ab-info-popup");
let tracksTableBackupCopy = "";  // Backup for the tracks table. Used when changes are canceled.


/// Close the pop-up whenever user clicks outside it.
infoPopupContainer.onclick = (ev) => { if (ev.target.id === "ab-info-popup") closeInfoPopup(); }

function openInfoPopup() { infoPopupContainer.setAttribute("show", "1"); }

function closeInfoPopup() {
    infoPopupContainer.setAttribute("show", "0");
    infoPopupContainer.setAttribute("target", "-1");

    exitInfoEditMode();
}

function enterInfoEditMode() {
    tracksTableBackupCopy = tracksContainer.innerHTML;
    infoPopupContainer.setAttribute("edit", "1");
    editableElements.forEach(el => {
        el.setAttribute("contenteditable", "");
        el.setAttribute("_bak", el.textContent);
    });
}

function exitInfoEditMode() {
    infoPopupContainer.setAttribute("edit", "0");
    editableElements.forEach(el => {
        el.removeAttribute("contenteditable");
        el.removeAttribute("_bak");
    })
}

function cancelInfoEdit() {
    editableElements.forEach(el => { el.textContent = el.getAttribute("_bak"); })
    tracksContainer.innerHTML = tracksTableBackupCopy;

    exitInfoEditMode();
}

function acceptInfoEditChanges() {
    tracksTableBackupCopy = "";
    
    let index = 0;
    Array.from(tracksContainer.children).forEach(tr => { 
        tr.children[0].innerHTML = ++index; 
    })

    exitInfoEditMode();
}

/// Button: Play audiobook.
document.getElementById("play-selected-ab-btn").addEventListener('click', async () => {
    const ab_id = infoPopupContainer.getAttribute("target");
    if (ab_id == "-1") return;

    await setupAudiobookPlay(ab_id);
    playAudio();
    closeInfoPopup();
})

/// Edit mode table dragging handling.
let draggingRow = null;

tracksContainer.addEventListener('dragstart', (e) => {
    if (infoPopupContainer.getAttribute("edit") == "1") {
        draggingRow = e.target;
        e.target.classList.add('dragging');
    }
});

tracksContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (infoPopupContainer.getAttribute("edit") == "0") return;
    
    const afterElement = getDragAfterElement(tracksContainer, e.clientY);

    if (afterElement == null) tracksContainer.appendChild(draggingRow)
    else tracksContainer.insertBefore(draggingRow, afterElement)
});

tracksContainer.addEventListener('dragend', (e) => {
    e.target.classList.remove('dragging');
    draggingRow = null;
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.info-track-item:not(.dragging)')];
    return draggableElements.reduce(
        (closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        },
        { offset: Number.NEGATIVE_INFINITY }
    ).element;
}
