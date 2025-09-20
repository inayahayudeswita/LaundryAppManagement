<?php
include "config.php";
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$name   = $data['service_name'] ?? '';
$regular= $data['regular'] ?? null;
$exp2   = $data['exp2'] ?? null;
$exp1   = $data['exp1'] ?? null;
$exp6   = $data['exp6'] ?? null;

if(!$name) {
    echo json_encode(['success'=>false,'message'=>'Nama service wajib diisi']);
    exit;
}

$conn->begin_transaction();
try {
    $stmt = $conn->prepare("INSERT INTO services(service_name) VALUES(?)");
    $stmt->bind_param("s",$name);
    $stmt->execute();
    $sid = $stmt->insert_id;
    $stmt->close();

    $categories = [
        'Regular'   => $regular,
        'Exp 2 Hari'=> $exp2,
        'Exp 1 Hari'=> $exp1,
        'Exp 6 Jam' => $exp6
    ];
    foreach($categories as $cat => $price){
        $cidQ = $conn->prepare("SELECT id FROM price_categories WHERE category_name=?");
        $cidQ->bind_param("s",$cat);
        $cidQ->execute();
        $cidQ->bind_result($cid);
        $cidQ->fetch();
        $cidQ->close();

        $ins = $conn->prepare("INSERT INTO service_prices(service_id,category_id,price) VALUES(?,?,?)");
        $ins->bind_param("iii",$sid,$cid,$price);
        $ins->execute();
        $ins->close();
    }
    $conn->commit();
    echo json_encode(['success'=>true,'message'=>'Service berhasil ditambahkan']);
} catch(Exception $e){
    $conn->rollback();
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
