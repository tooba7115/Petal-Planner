// THEME

function applyTheme(theme) {
document.documentElement.setAttribute("data-theme", theme)
localStorage.setItem("theme", theme)
}


// CONTRAST

function setContrast(mode) {
document.documentElement.setAttribute("data-contrast", mode)
localStorage.setItem("contrast", mode)
}


// TEXT SIZE

function setTextSize(size) {

if(size === "small") {
document.documentElement.style.fontSize = "14px"
}

if(size === "medium") {
document.documentElement.style.fontSize = "16px"
}

if(size === "large") {
document.documentElement.style.fontSize = "18px"
}

localStorage.setItem("textSize", size)

}


// MOTION

function setMotion(mode) {
document.documentElement.setAttribute("data-motion", mode)
localStorage.setItem("motion", mode)
}


// LOAD SAVED SETTINGS

document.addEventListener("DOMContentLoaded", () => {

const savedTheme = localStorage.getItem("theme")
if(savedTheme) applyTheme(savedTheme)

const savedContrast = localStorage.getItem("contrast")
if(savedContrast) setContrast(savedContrast)

const savedTextSize = localStorage.getItem("textSize")
if(savedTextSize) setTextSize(savedTextSize)

const savedMotion = localStorage.getItem("motion")
if(savedMotion) setMotion(savedMotion)

})