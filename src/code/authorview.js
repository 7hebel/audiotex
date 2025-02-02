const authorviewContainer = document.getElementById("author-items-container");
const renameAuthorForm = document.getElementById("rename-author-form");
const authorviewPopup = document.getElementById("author-popup");


/// Close the pop-up whenever user clicks outside it.
authorviewPopup.onclick = (ev) => { if (ev.target.id === "author-popup") closeAuthorviewPopup(); }

function openAuthorviewPopup() {
    authorviewPopup.setAttribute("show", "1");

    setTimeout(() => {
        authorviewPopup.style.opacity = "1";
    }, 1)
}

function closeAuthorviewPopup() {
    authorviewPopup.style.opacity = "0";

    setTimeout(() => {
        authorviewPopup.setAttribute("show", "0");
    }, 250)
}


async function buildAuthorview(authorName) {
    const author = await window.backend.getAuthorData(authorName);

    document.getElementById("author-name").textContent = authorName;
    document.getElementById("author-count").textContent = `${author.audiobooks.length} audiobooks`;
    document.getElementById("author-cover").style.backgroundImage = `url('${author.imgUrl}')`;


    authorviewContainer.innerHTML = "";
    author.audiobooks.forEach((audiobook) => {
        const item = document.createElement("div");
        item.className = "authorview-item";
        item.onclick = async () => {
            await populateInfoPopup(audiobook.id);
            closeAuthorviewPopup();
            openInfoPopup();
        }

        const left = document.createElement("div");
        left.className = "authorview-item-left";

        const cover = document.createElement("img");
        cover.className = "authorview-item-cover";
        cover.src = audiobook.cover_src ? audiobook.cover_src : './src/default-cover.png';
        left.appendChild(cover);

        const meta = document.createElement("div");
        meta.className = "authorview-item-meta";

        const title = document.createElement("span");
        title.className = "authorview-item-title";
        title.textContent = audiobook.title;
        meta.appendChild(title);

        const author = document.createElement("span");
        author.className = "authorview-item-author";
        author.textContent = audiobook.author;
        meta.appendChild(author);
        left.appendChild(meta);
        item.appendChild(left);

        const progress = document.createElement("span");
        progress.className = "authorview-ab-progress"
        progress.textContent = `${audiobook.progress}%`;
        item.appendChild(progress)

        authorviewContainer.appendChild(item);
    })
}

/// Button: Rename author
let renameAuthorFormUsed = false;
function openRenameAuthorForm() {
    if (document.getElementById("author-name").textContent == "Unknown") return displayErrorMessage("Cannot rename unknown author.");
    
    if (renameAuthorFormUsed) return;
    renameAuthorFormUsed = true;

    document.getElementById("rename-author-name").placeholder = document.getElementById("author-name").textContent;
    renameAuthorForm.setAttribute("show", "1");
    setTimeout(() => {
        renameAuthorForm.style.right = "20px";
        renameAuthorForm.style.opacity = "1";
    }, 1)
}

function closeRenameAuthorForm() {
    document.getElementById("rename-author-name").value = "";

    renameAuthorForm.style.right = "-400px";
    renameAuthorForm.style.opacity = "0";
    setTimeout(() => { renameAuthorForm.setAttribute("show", "0"); }, 500);
    renameAuthorFormUsed = false;
}

function acceptRenameAuthorForm() {
    const targetAuthor = document.getElementById("author-name").textContent;
    const newName = document.getElementById("rename-author-name").value.trim();
    if (newName) {
        renameAuthor(targetAuthor, newName);
    } else {
        displayErrorMessage("Name cannot be blank.")
    }
    
    closeRenameAuthorForm();
}


async function renameAuthor(targetName, newName) {
    const allAuthors = await window.backend.getAuthors();
    for (const author of allAuthors) {
        if (author.author == newName) return displayErrorMessage("This name is already taken.");
    }

    await window.backend.renameAuthor(targetName, newName);

    if (document.getElementById("cv-author").textContent == targetName) document.getElementById("cv-author").textContent = newName;
    document.getElementById("author-name").textContent = newName;
    Array.from(document.querySelectorAll(".authorview-item-author")).forEach((el) => {
        el.textContent = newName;
    })
    await buildShelf();    
}

async function updateAuthorCover() {
    const authorName = document.getElementById('author-name').textContent;
    const newUrl = await window.backend.updateAuthorAvatar(authorName);
    document.getElementById("author-cover").style.backgroundImage = `url('${newUrl}')`;
    document.getElementById(`author-${authorName}`).querySelector(".ab-cover").style.backgroundImage = `url('${newUrl}')`;
    displayInfoMessage(`Updated cover for ${authorName}`)

}
