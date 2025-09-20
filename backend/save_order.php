<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json");

try {
    include "config.php";

    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON data: " . json_last_error_msg());
    }

    // Ambil data request
    $uid              = $data["uid"] ?? uniqid("ORD_", true);
    $nomorNota        = $data["nomorNota"] ?? "";
    $namaPelanggan    = $data["namaPelanggan"] ?? "";
    $tanggalTerima    = $data["tanggalTerima"] ?? date("Y-m-d");
    $tanggalSelesai   = $data["tanggalSelesai"] ?? "";
    $serviceId        = (int)($data["serviceId"] ?? 0);
    $categoryId       = (int)($data["categoryId"] ?? 0);
    $jumlahKg         = (float)($data["jumlahKg"] ?? 0);
    $harga            = (int)($data["harga"] ?? 0);
    $payment          = $data["payment"] ?? "none";
    $status           = $data["status"] ?? "progress";
    $tanggalAmbil     = $data["tanggalAmbil"] ?? null;
    $tanggalBayar     = $data["tanggalBayar"] ?? null;
    $cabang           = $data["cabang"] ?? null;
    $createdAt        = date("Y-m-d H:i:s");
    $finishedAt       = $data["finishedAt"] ?? null;

    // Validasi minimal
    if (empty($nomorNota) || empty($namaPelanggan) || $serviceId <= 0 || $categoryId <= 0 || $jumlahKg <= 0) {
        throw new Exception("Data tidak lengkap. Pastikan nomorNota, namaPelanggan, service, category, dan jumlahKg terisi.");
    }

    // Cek apakah order sudah ada
    $checkStmt = $conn->prepare("SELECT uid FROM orders WHERE uid = ?");
    $checkStmt->bind_param("s", $uid);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $exists = $result->num_rows > 0;
    $checkStmt->close();

    if ($exists) {
        // UPDATE
        $updateStmt = $conn->prepare("
            UPDATE orders SET 
                nomorNota=?, namaPelanggan=?, tanggalTerima=?, tanggalSelesai=?,
                service_id=?, category_id=?, jumlahKg=?, harga=?,
                payment=?, cabang=?, tanggalAmbil=?, tanggalBayar=?, finishedAt=?, status=?
            WHERE uid=?
        ");
        $updateStmt->bind_param(
            "ssssiiddssssss",
            $nomorNota, $namaPelanggan, $tanggalTerima, $tanggalSelesai,
            $serviceId, $categoryId, $jumlahKg, $harga,
            $payment, $cabang, $tanggalAmbil, $tanggalBayar, $finishedAt, $status,
            $uid
        );
        if ($updateStmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Order berhasil diupdate', 'uid' => $uid]);
        } else {
            throw new Exception("Gagal update order: " . $updateStmt->error);
        }
        $updateStmt->close();

    } else {
        // INSERT
        $insertStmt = $conn->prepare("
            INSERT INTO orders 
            (uid, nomorNota, namaPelanggan, tanggalTerima, tanggalSelesai,
             service_id, category_id, jumlahKg, harga,
             payment, status, cabang, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insertStmt->bind_param(
            "sssssiiidssss",
            $uid, $nomorNota, $namaPelanggan, $tanggalTerima, $tanggalSelesai,
            $serviceId, $categoryId, $jumlahKg, $harga,
            $payment, $status, $cabang, $createdAt
        );
        if ($insertStmt->execute()) {
            echo json_encode(["success" => true, "message" => "Order berhasil disimpan", "uid" => $uid]);
        } else {
            throw new Exception("Gagal insert order: " . $insertStmt->error);
        }
        $insertStmt->close();
    }

} catch (Exception $e) {
    error_log("Save Order Error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Gagal simpan order: " . $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>
