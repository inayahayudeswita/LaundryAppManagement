<?php
include "config.php";
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

// Handle both camelCase (from frontend) and snake_case parameter names
$service_id = isset($data['serviceId']) ? (int)$data['serviceId'] : 
             (isset($data['service_id']) ? (int)$data['service_id'] : 0);

$category_id = isset($data['categoryId']) ? (int)$data['categoryId'] : 
              (isset($data['category_id']) ? (int)$data['category_id'] : 0);

$price = isset($data['price']) ? (int)$data['price'] : null;

// Debug logging (optional - remove in production)
error_log("Received data: " . json_encode($data));
error_log("Parsed: service_id=$service_id, category_id=$category_id, price=$price");

if ($service_id <= 0 || $category_id <= 0 || $price === null) {
    echo json_encode([
        'success' => false,
        'message' => 'Data tidak valid',
        'debug' => [
            'service_id' => $service_id,
            'category_id' => $category_id,
            'price' => $price,
            'received_data' => $data
        ]
    ]);
    exit;
}

$stmt = $conn->prepare("UPDATE service_prices 
                        SET price = ? 
                        WHERE service_id = ? AND category_id = ?");
$stmt->bind_param("iii", $price, $service_id, $category_id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Harga berhasil diupdate']);
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'Tidak ada data yang diupdate. Periksa service_id dan category_id'
        ]);
    }
} else {
    echo json_encode(['success' => false, 'message' => $conn->error]);
}

$stmt->close();
?>