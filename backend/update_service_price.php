<?php
include "config.php";
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$service_id = $data['service_id'] ?? 0;
$category   = $data['category_name'] ?? '';
$price      = $data['price'] ?? null;

if(!$service_id || !$category || $price===null){
    echo json_encode(['success'=>false,'message'=>'Data tidak valid']); exit;
}

$stmt = $conn->prepare("UPDATE service_prices sp
                        JOIN price_categories c ON sp.category_id = c.id
                        SET sp.price = ?
                        WHERE sp.service_id = ? AND c.category_name = ?");
$stmt->bind_param("iis", $price, $service_id, $category);
if($stmt->execute()){
    echo json_encode(['success'=>true]);
}else{
    echo json_encode(['success'=>false,'message'=>$conn->error]);
}
