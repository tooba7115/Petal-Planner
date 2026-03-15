function toggleMenu() {
  const menu = document.getElementById("dropdownMenu");
  menu.classList.toggle("show");
}

document.addEventListener("click", function(event) {
  const menu = document.getElementById("dropdownMenu");
  const button = document.querySelector(".hamburger-btn");

  if (!button.contains(event.target) && !menu.contains(event.target)) {
    menu.classList.remove("show");
  }
});