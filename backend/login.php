<?php
include "config.php";

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

$sql = "SELECT id, username, name, role, branch, password FROM users WHERE username=?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if ($user && $password === $user['password'])  {
    unset($user['password']); // jangan kirim password ke frontend
    
    echo json_encode([
        "success" => true, 
        "user" => [
            "id" => $user['id'],
            "username" => $user['username'],
            "name" => $user['name'],   // << ini penting
            "role" => $user['role'],
            "branch" => $user['branch']
        ]
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Username atau password salah"]);
}
?>
