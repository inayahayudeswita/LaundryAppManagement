<?php
include "config.php";
header("Content-Type: application/json");

try {
    // Ambil service + category + price + category id
    $sql = "
        SELECT s.id AS service_id, s.service_name,
               c.id AS category_id, c.category_name,
               p.price
        FROM services s
        JOIN service_prices p ON s.id = p.service_id
        JOIN price_categories c ON p.category_id = c.id
        ORDER BY s.id, c.id
    ";
    $res = $conn->query($sql);
    if (!$res) throw new Exception($conn->error);

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $sid = (int)$row['service_id'];
        if (!isset($data[$sid])) {
            $data[$sid] = [
                'id' => $sid,
                'service_name' => $row['service_name'],
                'prices' => [] // akan berisi: "Regular" => { id: 1, price: 7000 }
            ];
        }
        $catName = $row['category_name'];
        $data[$sid]['prices'][$catName] = [
            'id' => (int)$row['category_id'],
            'price' => (int)$row['price']
        ];
    }

    echo json_encode(['success' => true, 'services' => array_values($data)]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
