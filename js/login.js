const users = [
  { username: "admin", password: "admin123", role: "admin", name: "Administrator" },
  { username: "kasir1", password: "kasir123", role: "kasir", name: "Kasir Satu", branch: "Cabang 1" },
  { username: "kasir2", password: "kasir123", role: "kasir", name: "Kasir Dua", branch: "Cabang 2" }
];

document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    if (user.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "kasir.html";
    }
  } else {
    errorMsg.textContent = "Username atau password salah!";
  }
});
