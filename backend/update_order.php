<?php
// update_order.php

error_reporting(E_ALL);
ini_set('display_errors', 0); // jangan echo error ke browser
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

header("Content-Type: application/json");

try {
    include __DIR__ . "/config.php";

    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid JSON: " . json_last_error_msg()
        ]);
        exit;
    }

    // Ambil data
    $uid            = $data["uid"] ?? null;
    $nomorNota      = $data["nomorNota"] ?? "";
    $namaPelanggan  = $data["namaPelanggan"] ?? "";
    $tanggalTerima  = $data["tanggalTerima"] ?? "";
    $tanggalSelesai = $data["tanggalSelesai"] ?? "";
    $service_id     = isset($data["serviceId"]) ? (int)$data["serviceId"] : 0;
    $category_id    = isset($data["categoryId"]) ? (int)$data["categoryId"] : 0;
    $jumlahKg       = isset($data["jumlahKg"]) ? (float)$data["jumlahKg"] : 0;
    $harga          = isset($data["harga"]) ? (int)$data["harga"] : 0;
    $payment        = $data["payment"] ?? "none";
    $cabang         = $data["cabang"] ?? null;
    $tanggalAmbil   = $data["tanggalAmbil"] ?? null;
    $tanggalBayar   = $data["tanggalBayar"] ?? null;
    $finishedAt     = $data["finishedAt"] ?? null;
    $status         = $data["status"] ?? "progress";

    if (!$uid) {
        echo json_encode(["success"=>false,"message"=>"UID tidak ditemukan"]);
        exit;
    }

    $sql = "UPDATE orders SET 
                nomorNota=?, namaPelanggan=?, tanggalTerima=?, tanggalSelesai=?,
                service_id=?, category_id=?, jumlahKg=?, harga=?,
                payment=?, cabang=?, tanggalAmbil=?, tanggalBayar=?, finishedAt=?, status=?
            WHERE uid=?";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        echo json_encode(["success"=>false,"message"=>"Prepare failed: ".$conn->error]);
        exit;
    }

    // === total 15 field ===
    $stmt->bind_param(
        "ssssiiddsssssss",
        $nomorNota, $namaPelanggan, $tanggalTerima, $tanggalSelesai,
        $service_id, $category_id, $jumlahKg, $harga,
        $payment, $cabang, $tanggalAmbil, $tanggalBayar, $finishedAt, $status,
        $uid
    );

    if (!$stmt->execute()) {
        echo json_encode(["success"=>false,"message"=>"Execute failed: ".$stmt->error]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "Order berhasil diupdate",
        "uid" => $uid
    ]);

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    error_log("Update Order Error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Exception: " . $e->getMessage()
    ]);
}
?>