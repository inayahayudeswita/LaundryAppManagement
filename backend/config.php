<?php
// Konfigurasi koneksi database
$host = "localhost";   // biasanya localhost
$user = "root";        // user default XAMPP
$pass = "";            // password default kosong (jika pakai XAMPP/Laragon)
$db   = "laundry_app"; // nama database yang tadi kamu buat

// Membuat koneksi
$conn = new mysqli($host, $user, $pass, $db);

// Cek koneksi
if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}
?>
