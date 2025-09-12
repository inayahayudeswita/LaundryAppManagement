document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const snapshot = await db.collection("users")
      .where("username", "==", username)
      .where("password", "==", password)
      .get();

    if (snapshot.empty) {
      alert("Username atau password salah!");
      return;
    }

    const user = snapshot.docs[0].data();

    // Simpan session
    sessionStorage.setItem("role", user.role);
    sessionStorage.setItem("cabang", user.cabang);

    if (user.role === "admin") {
      window.location.href = "pages/admin.html";
    } else if (user.role === "kasir") {
      window.location.href = "pages/kasir.html";
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Terjadi kesalahan login.");
  }
});
