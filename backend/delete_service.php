<?php
include "config.php";
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$service_id = $data['service_id'] ?? 0;

if (!$service_id) {
    echo json_encode(['success' => false, 'message' => 'Service ID tidak valid']);
    exit;
}

$conn->begin_transaction();
try {
    // Delete service prices first (foreign key constraint)
    $stmt = $conn->prepare("DELETE FROM service_prices WHERE service_id = ?");
    $stmt->bind_param("i", $service_id);
    $stmt->execute();
    $stmt->close();
    
    // Delete the service
    $stmt = $conn->prepare("DELETE FROM services WHERE id = ?");
    $stmt->bind_param("i", $service_id);
    $stmt->execute();
    
    if ($stmt->affected_rows > 0) {
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Service berhasil dihapus']);
    } else {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'Service tidak ditemukan']);
    }
    
    $stmt->close();
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>