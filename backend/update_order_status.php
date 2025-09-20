<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json");

try {
    include "config.php";

    $input = file_get_contents("php://input");
    $data  = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON: " . json_last_error_msg());
    }

    // --- Ambil Data ---
    $uid          = $data['uid'] ?? null;                // kunci utama sekarang
    $orderId      = $data['id'] ?? null;                 // fallback lama
    $payment      = $data['payment'] ?? ($data['metodePembayaran'] ?? null);
    $tanggalAmbil = $data['tanggalAmbil'] ?? null;
    $tanggalBayar = $data['tanggalBayar'] ?? null;

    // --- Validasi wajib ---
    if (empty($tanggalAmbil) || empty($tanggalBayar) || empty($payment) || (empty($uid) && empty($orderId))) {
        throw new Exception("Data tidak lengkap untuk update order");
    }

    // --- Query update ---
    if (!empty($uid)) {
        $stmt = $conn->prepare("
            UPDATE orders
            SET status = 'finished',
                tanggalAmbil = ?,
                tanggalBayar = ?,
                payment = ?,
                finishedAt = NOW()
            WHERE uid = ?
        ");
        if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
        $stmt->bind_param("ssss", $tanggalAmbil, $tanggalBayar, $payment, $uid);
    } else {
        // fallback: update berdasarkan ID lama
        $stmt = $conn->prepare("
            UPDATE orders
            SET status = 'finished',
                tanggalAmbil = ?,
                tanggalBayar = ?,
                payment = ?,
                finishedAt = NOW()
            WHERE id = ?
        ");
        if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
        $stmt->bind_param("sssi", $tanggalAmbil, $tanggalBayar, $payment, $orderId);
    }

    // --- Eksekusi ---
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }

    echo json_encode([
        "success" => true,
        "message" => "Order berhasil diupdate ke finished"
    ]);

    $stmt->close();

} catch (Exception $e) {
    error_log("update_order_status error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) $conn->close();
}
