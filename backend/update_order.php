<?php
header("Content-Type: application/json");
error_reporting(E_ALL);
ini_set('display_errors', 1);

include "config.php";

try {
    $data = json_decode(file_get_contents("php://input"), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON");
    }

    // Extract data
    $uid            = $data['uid'] ?? '';
    $nomorNota      = $data['nomorNota'] ?? '';
    $namaPelanggan  = $data['namaPelanggan'] ?? '';
    $tanggalTerima  = $data['tanggalTerima'] ?? '';
    $tanggalSelesai = $data['tanggalSelesai'] ?? '';
    $serviceId      = (int)($data['serviceId'] ?? 0);
    $categoryId     = (int)($data['categoryId'] ?? 0);
    $jumlahKg       = (float)($data['jumlahKg'] ?? 0);
    $harga          = (int)($data['harga'] ?? 0);
    $payment        = $data['payment'] ?? 'none';
    $cabang         = $data['cabang'] ?? '';
    $status         = $data['status'] ?? 'progress';
    $tanggalAmbil   = $data['tanggalAmbil'] ?? null;
    $tanggalBayar   = $data['tanggalBayar'] ?? null;
    $finishedAt     = $data['finishedAt'] ?? null;

    // Validasi
    if (!$uid || !$nomorNota || !$namaPelanggan || !$serviceId || !$categoryId || !$jumlahKg) {
        echo json_encode(['success' => false, 'message' => 'Field wajib tidak boleh kosong']);
        exit;
    }

    // Update query sinkron dengan struktur terbaru
    $stmt = $conn->prepare("
    UPDATE orders SET 
        nomorNota = ?, 
        namaPelanggan = ?, 
        tanggalTerima = ?, 
        tanggalSelesai = ?, 
        service_id = ?, 
        category_id = ?, 
        jumlahKg = ?, 
        harga = ?, 
        payment = ?, 
        cabang = ?, 
        status = ?, 
        tanggalAmbil = ?, 
        tanggalBayar = ?, 
        finishedAt = ?
    WHERE uid = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    // Ada 15 kolom update + 1 uid = 16 params
    $stmt->bind_param(
        "ssssiiddsssssss", 
        $nomorNota,      // s
        $namaPelanggan,  // s
        $tanggalTerima,  // s
        $tanggalSelesai, // s
        $serviceId,      // i
        $categoryId,     // i
        $jumlahKg,       // d (decimal/float)
        $harga,          // d (integer juga bisa tapi tetap i/d)
        $payment,        // s
        $cabang,         // s
        $status,         // s
        $tanggalAmbil,   // s
        $tanggalBayar,   // s
        $finishedAt,     // s
        $uid             // s (WHERE)
    );


    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }

    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Order berhasil diupdate', 'uid' => $uid]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Order tidak ditemukan atau tidak ada perubahan']);
    }

    $stmt->close();

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Gagal update order: " . $e->getMessage()]);
}
