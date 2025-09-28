<?php
include "config.php";
header("Content-Type: application/json");

try {
    // Ambil cabang unik hanya dari role kasir
    $sql = "SELECT DISTINCT branch 
            FROM users 
            WHERE role = 'kasir'
              AND branch IS NOT NULL 
              AND branch != '' 
            ORDER BY branch";
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception($conn->error);
    }
    
    $branches = [];
    while ($row = $result->fetch_assoc()) {
        $branches[] = $row['branch'];
    }
    
    echo json_encode([
        'success' => true, 
        'branches' => $branches
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
