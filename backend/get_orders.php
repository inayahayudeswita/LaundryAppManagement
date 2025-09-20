<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "config.php";

try {
    $sql = "
        SELECT 
            o.*,
            s.service_name AS service_display_name,
            pc.category_name AS category_display_name,
            sp.price AS price_per_kg
        FROM orders o
        LEFT JOIN services s ON o.service_id = s.id
        LEFT JOIN price_categories pc ON o.category_id = pc.id
        LEFT JOIN service_prices sp ON o.service_id = sp.service_id AND o.category_id = sp.category_id
        ORDER BY o.createdAt DESC
    ";

    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception("Query error: " . $conn->error);
    }

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $order = [
            'uid'           => $row['uid'],
            'nomorNota'     => $row['nomorNota'],
            'namaPelanggan' => $row['namaPelanggan'],
            'tanggalTerima' => $row['tanggalTerima'],
            'tanggalSelesai'=> $row['tanggalSelesai'],
            'serviceId'     => (int)$row['service_id'],
            'categoryId'    => (int)$row['category_id'],
            // 🔑 langsung ambil dari join
            'serviceName'   => $row['service_display_name'] ?: "Unknown Service",
            'categoryName'  => $row['category_display_name'] ?: "Unknown Category",
            'jumlahKg'      => (float)$row['jumlahKg'],
            'harga'         => (int)$row['harga'],
            'status'        => $row['status'],
            'payment'       => $row['payment'],
            'cabang'        => $row['cabang'],
            'tanggalAmbil'  => $row['tanggalAmbil'],
            'tanggalBayar'  => $row['tanggalBayar'],
            'createdAt'     => $row['createdAt'],
            'finishedAt'    => $row['finishedAt']
        ];
        $orders[] = $order;
    }


    echo json_encode([
        "success" => true,
        "data"    => $orders,
        "count"   => count($orders)
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Gagal ambil data: " . $e->getMessage(),
        "data"    => []
    ]);
} finally {
    if (isset($conn)) $conn->close();
}
?>
