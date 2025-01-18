const infoPopupContainer = document.getElementById("ab-info-popup");
const editableElements = Array.from(document.getElementsByClassName("info-editable"));
const tracksTable = document.getElementById("info-tracks-table").children[0];
let _preEditTableCopy = "";

infoPopupContainer.onclick = (ev) => {
    if (ev.target.id === "ab-info-popup") {
        closeInfoPopup();
    }
}

function closeInfoPopup() {
    infoPopupContainer.setAttribute("show", "0");
    infoPopupContainer.setAttribute("target", "-1")
    exitInfoEditMode();
}

function openInfoPopup() {
    infoPopupContainer.setAttribute("show", "1");
}

function enterInfoEditMode() {
    infoPopupContainer.setAttribute("edit", "1");
    editableElements.forEach(el => {
        el.setAttribute("contenteditable", "");
        el.setAttribute("_bak", el.textContent);
    });
    _preEditTableCopy = tracksTable.innerHTML;
}

function exitInfoEditMode() {
    infoPopupContainer.setAttribute("edit", "0");
    editableElements.forEach(el => {
        el.removeAttribute("contenteditable");
        el.removeAttribute("_bak");
    })
}

function cancelInfoEdit() {
    editableElements.forEach(el => {
        el.textContent = el.getAttribute("_bak");
    })
    exitInfoEditMode();
    tracksTable.innerHTML = _preEditTableCopy;
}

function acceptInfoEditChanges() {
    exitInfoEditMode();
    _preEditTableCopy = "";
}

const tableBody = document.querySelector('#info-tracks-table tbody');
let draggingRow = null;

tableBody.addEventListener('dragstart', (e) => {
    if (infoPopupContainer.getAttribute("edit") == "1") {
        draggingRow = e.target;
        e.target.classList.add('dragging');
    }
});

tableBody.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (infoPopupContainer.getAttribute("edit") == "0") return;
    
    const afterElement = getDragAfterElement(tableBody, e.clientY);
    if (afterElement?.id == "info-table-header") return;

    if (afterElement == null) {
        tableBody.appendChild(draggingRow);
    } else {
        tableBody.insertBefore(draggingRow, afterElement);
    }
});

tableBody.addEventListener('dragend', (e) => {
    e.target.classList.remove('dragging');
    draggingRow = null;
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('tr:not(.dragging)')];
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