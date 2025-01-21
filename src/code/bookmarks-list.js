const bookmarksListPopup = document.getElementById("bookmarks-list-popup");
const bookmarksListEntriesContainer = document.getElementById("bm-list-window");

/// Close the pop-up whenever user clicks outside it.
bookmarksListPopup.onclick = (ev) => { if (ev.target.id === "bookmarks-list-popup") closeBookmarksListPopup(); }

function openBookmarksListPopup() { bookmarksListPopup.setAttribute("show", "1"); }
function closeBookmarksListPopup() { bookmarksListPopup.setAttribute("show", "0"); }


function insertAudiobookEntry(audiobook, bookmarks) {
    const entry = document.createElement("div");
    entry.className = "bm-list-ab-entry";
    entry.setAttribute("folded", "0");

    const header = document.createElement("div");
    header.className = "bm-list-ab-header";
    
    const headerMeta = document.createElement("div");
    headerMeta.className = "bm-list-ab-header-meta";

    const foldIcon = document.createElement("i");
    foldIcon.className = "fa-solid fa-angle-down ab-list-entry-fold-icon";
    foldIcon.onclick = () => {
        if (entry.getAttribute("folded") == "1") {
            entry.setAttribute("folded", "0");
            itemsContainer.style.height = itemsContainer.scrollHeight + 'px';
            setTimeout(() => {
                itemsContainer.style.height = 'auto';
            }, 250)
        } else {
            entry.setAttribute("folded", "1");
            itemsContainer.style.height = itemsContainer.scrollHeight + 'px';
            requestAnimationFrame(() => {
                itemsContainer.style.height = '0px';
            });
        }
    }
    headerMeta.appendChild(foldIcon);

    const cover = document.createElement("img");
    cover.className = "ab-list-entry-cover";
    cover.src = audiobook.cover_src ? audiobook.cover_src : "./src/default-cover.png";
    headerMeta.appendChild(cover);
    
    const metaContainer = document.createElement("div");
    metaContainer.className = "ab-list-entry-meta-container";    
    
    const abTitle = document.createElement("span");
    abTitle.className = "ab-list-entry-title";
    abTitle.textContent = audiobook.title;
    metaContainer.appendChild(abTitle);
    
    const abAuthor = document.createElement("span");
    abAuthor.className = "ab-list-entry-author";
    abAuthor.textContent = audiobook.author;
    metaContainer.appendChild(abAuthor);
    
    headerMeta.appendChild(metaContainer);
    header.appendChild(headerMeta);

    const bookmarksCount = document.createElement("div");
    bookmarksCount.className = "bm-list-header-bm-count";
    bookmarksCount.innerHTML = `${audiobook.bookmarksCount} <i class="fa-solid fa-bookmark"></i>`;
    header.appendChild(bookmarksCount);

    entry.appendChild(header);

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "bm-list-items-container";
    itemsContainer.style.height = "auto";

    bookmarks.forEach((trackBookmarks) => {
        const trackHeader = document.createElement("span");
        trackHeader.className = "bm-list-track-name";
        trackHeader.innerHTML = `
            <span class="bm-list-track-index">${trackBookmarks[0].track_index}</span>
            ${trackBookmarks[0].track_title}
        `;
        itemsContainer.appendChild(trackHeader)

        trackBookmarks.forEach((bookmark) => {
            const item = document.createElement("div");
            item.className = "bm-list-item";
    
            const trackTime = document.createElement("span");
            trackTime.className = "bm-list-track-time";
            trackTime.innerHTML = `<i class="fa-solid fa-clock"></i> ${secondsToReadable(bookmark.moment_s)}`;
            item.appendChild(trackTime);
    
            const comment = document.createElement("span");
            comment.className = "bm-list-track-comment";
            comment.textContent = bookmark.comment;
            item.appendChild(comment);
    
            const rightSide = document.createElement("div");
            rightSide.className = "bm-list-item-right";
    
            const dateAdd = document.createElement("span");
            dateAdd.className = "bm-list-track-time";
            dateAdd.innerHTML = `<i class="fa-solid fa-calendar-plus"></i> ${bookmark.date_add}`;
            rightSide.appendChild(dateAdd);
            
            const deleteBtn = document.createElement("i");
            deleteBtn.className = "fa-solid fa-trash bm-list-item-btn-delete";
            deleteBtn.onclick = async () => {
                item.remove();
                await window.electron.removeBookmark(bookmark.id);

                const track = await window.electron.getTrackById(bookmark.track_id);
                if (audiobook.id == audioPlayer.getAttribute("ab-id")) {
                    if (track.bookmarks.length == 0) {
                        document.getElementById(`cv-idx-${bookmark.track_index}`).setAttribute("bookmarked", "0");
                    }

                    if (bookmark.track_id == audioPlayer.getAttribute("track-id")) placeBarBookmarks(track);
                }

                if (track.bookmarks.length == 0) {
                    trackHeader.remove();

                    const abBookmarksCount = await window.electron.countBookmarks(audiobook.id);
                    if (abBookmarksCount == 0) entry.remove();
                }

                updateTotalBookmarksCount();
                if (bookmarksListEntriesContainer.innerHTML == '') closeBookmarksListPopup();
            };
            rightSide.appendChild(deleteBtn);
            
            const playBtn = document.createElement("i");
            playBtn.className = "fa-solid fa-play bm-list-item-btn-play";
            playBtn.onclick = () => {
                setupAudiobookPlay(audiobook.id, bookmark.track_id).then(() => {
                    seekAudioAt(bookmark.moment_s);
                    playAudio();
                });
            };
            rightSide.appendChild(playBtn);
    
            item.appendChild(rightSide);
            itemsContainer.appendChild(item);
        })
    })

    entry.appendChild(itemsContainer);
    bookmarksListEntriesContainer.appendChild(entry);
}

async function buildBookmarksListPopup() {
    bookmarksListEntriesContainer.innerHTML = "";

    const bookmarksData = await window.electron.getAllBookmarksData();
    if (bookmarksData.length == 0) {
        bookmarksListEntriesContainer.innerHTML = `<span class="no-bookmarks">There are no bookmarks.</span>`;
        return;
    }
    
    bookmarksData.forEach((data) => {
        const audiobook = data.audiobook;
        const bookmarks = data.bookmarks;
        insertAudiobookEntry(audiobook, bookmarks);
    }) 
}

buildBookmarksListPopup();
