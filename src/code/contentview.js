const contentViewContainer = document.querySelector(".contentview");
const barStateIcon = document.getElementById("switch-contentview").querySelector("i");


function hideContentView() {
    contentViewContainer.style.top = "100%"
    contentViewContainer.style.opacity = "0"
    barStateIcon.className = "fa-solid fa-angle-up";
    setTimeout(() => {
        contentViewContainer.setAttribute("show", "0");
    }, 600)
}

function showContentView() {
    contentViewContainer.setAttribute("show", "1");
    setTimeout(() => {
        contentViewContainer.style.top = "0%"
        contentViewContainer.style.opacity = "1"
    }, 1)
    barStateIcon.className = "fa-solid fa-angle-down";
}

function switchContentView() {
    contentViewContainer.getAttribute("show") == "0" ? showContentView() : hideContentView();
}
