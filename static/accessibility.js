function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.setItem("theme", theme)
}

function setContrast(mode) {
  document.documentElement.setAttribute("data-contrast", mode)
  localStorage.setItem("contrast", mode)
}

function setTextSize(size) {

  if(size === "small"){
    document.documentElement.style.fontSize = "14px"
  }

  if(size === "medium"){
    document.documentElement.style.fontSize = "16px"
  }

  if(size === "large"){
    document.documentElement.style.fontSize = "18px"
  }

  localStorage.setItem("textSize", size)
}

function setMotion(mode) {
  document.documentElement.setAttribute("data-motion", mode)
  localStorage.setItem("motion", mode)
}