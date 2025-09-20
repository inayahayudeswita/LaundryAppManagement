document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  try {
    const res = await fetch("backend/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem("currentUser", JSON.stringify(data.user));
      if (data.user.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "kasir.html";
      }
    } else {
      errorMsg.textContent = data.message;
    }
  } catch (err) {
    errorMsg.textContent = "Gagal terhubung ke server!";
  }
});
