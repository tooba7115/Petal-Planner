function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.setItem("theme", theme)
}

function setContrast(mode) {
  document.documentElement.setAttribute("data-contrast", mode)
  localStorage.setItem("contrast", mode)
}

function setTextSize(size) {

  document.body.classList.remove("text-small","text-medium","text-large")

  if(size === "small"){
    document.body.classList.add("text-small")
  }

  if(size === "medium"){
    document.body.classList.add("text-medium")
  }

  if(size === "large"){
    document.body.classList.add("text-large")
  }

  localStorage.setItem("textSize", size)
}