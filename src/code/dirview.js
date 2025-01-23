const dirviewContainer = document.getElementById("dirview-container");
const dirviewPopup = document.getElementById("dirview-popup");

/// Close the pop-up whenever user clicks outside it.
dirviewPopup.onclick = (ev) => { if (ev.target.id === "dirview-popup") closeDirviewPopup(); }

function openDirviewPopup() {
    dirviewPopup.setAttribute("show", "1");

    setTimeout(() => {
        dirviewPopup.style.opacity = "1";
    }, 1)
}

function closeDirviewPopup() {
    dirviewPopup.style.opacity = "0";

    setTimeout(() => {
        dirviewPopup.setAttribute("show", "0");
    }, 250)
}

async function buildDirview(dirname, items) {
    document.getElementById("dirview-dirname").textContent = dirname;
    
    dirviewContainer.innerHTML = "";
    items.forEach(async (ab_id) => {
        const audiobook = await window.backend.getAudiobookData(ab_id);

        const item = document.createElement("div");
        item.className = "dirview-item";
        item.onclick = async () => {
            await populateInfoPopup(ab_id);
            openInfoPopup();
        }

        const left = document.createElement("div");
        left.className = "dirview-item-left";

        const cover = document.createElement("img");
        cover.className = "dirview-item-cover";
        cover.src = audiobook.cover_src ? audiobook.cover_src : './src/default-cover.png';
        left.appendChild(cover);

        const meta = document.createElement("div");
        meta.className = "dirview-item-meta";

        const title = document.createElement("span");
        title.className = "dirview-item-title";
        title.textContent = audiobook.title;
        meta.appendChild(title);

        const author = document.createElement("span");
        author.className = "dirview-item-author";
        author.textContent = audiobook.author;
        meta.appendChild(author);

        left.appendChild(meta);
        item.appendChild(left);

        const rmIcon = document.createElement("i");
        rmIcon.className = "fa-solid fa-folder-minus dirview-rm-icon";
        rmIcon.onclick = async () => {
            removeItemFromDir(ab_id, dirname);
            item.remove();
        };
        item.appendChild(rmIcon);

        dirviewContainer.appendChild(item);

    })
}



