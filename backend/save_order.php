<?php
// backend/save_order.php  (paste replace file)
// Robust save (insert / update) for orders — avoids HTML output, logs errors.

error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');
header('Content-Type: application/json; charset=utf-8');

try {
    include __DIR__ . '/config.php';
    if (!isset($conn)) throw new Exception("DB connection not available");

    $raw = file_get_contents('php://input');
    error_log("SAVE_ORDER RAW: " . $raw);

    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON: " . json_last_error_msg());
    }
    error_log("SAVE_ORDER parsed: " . print_r($data, true));

    // --- normalize incoming keys (tolerant)
    $uid            = $data['uid'] ?? uniqid('ORD_', true);
    $nomorNota      = trim($data['nomorNota'] ?? ($data['nomor_note'] ?? ''));
    $namaPelanggan  = trim($data['namaPelanggan'] ?? ($data['nama_pelanggan'] ?? ''));
    $tanggalTerima  = $data['tanggalTerima'] ?? ($data['tanggal_terima'] ?? date('Y-m-d'));
    $tanggalSelesai = $data['tanggalSelesai'] ?? ($data['tanggal_selesai'] ?? '');
    $service_id     = isset($data['serviceId']) ? (int)$data['serviceId'] : (int)($data['service_id'] ?? 0);
    $category_id    = isset($data['categoryId']) ? (int)$data['categoryId'] : (int)($data['category_id'] ?? 0);

    // jumlahKg (float/double)
    $jumlahKgRaw = $data['jumlahKg'] ?? ($data['jumlah_kg'] ?? 0);
    $jumlahKg = is_numeric($jumlahKgRaw) ? (float)$jumlahKgRaw : 0.0;

    $harga    = isset($data['harga']) ? (int)$data['harga'] : (int)($data['price'] ?? 0);
    $payment  = $data['payment'] ?? ($data['metodePembayaran'] ?? 'none');
    $status   = $data['status'] ?? 'progress';
    $cabang   = $data['cabang'] ?? null;

    // Accept tanggalBayar from client OR auto-fill when payment != 'none'
    $tanggalBayar = $data['tanggalBayar'] ?? ($data['tanggal_bayar'] ?? null);
    if ($payment !== 'none' && empty($tanggalBayar)) {
        $tanggalBayar = date('Y-m-d');
    }

    $tanggalAmbil = $data['tanggalAmbil'] ?? ($data['tanggal_ambil'] ?? null);
    $finishedAt   = $data['finishedAt'] ?? null;
    $createdAt    = date('Y-m-d H:i:s');

    // Basic validation
    if (!$nomorNota || !$namaPelanggan || $service_id <= 0 || $category_id <= 0 || $jumlahKg <= 0.0) {
        throw new Exception("Data tidak lengkap. Pastikan nomorNota, namaPelanggan, service, category, dan jumlahKg (>0) terisi. Received jumlahKg: " . var_export($jumlahKg, true));
    }

    // check exists by uid
    $chk = $conn->prepare("SELECT uid FROM orders WHERE uid = ?");
    if (!$chk) throw new Exception("Prepare check failed: " . $conn->error);
    $chk->bind_param("s", $uid);
    $chk->execute();
    $res = $chk->get_result();
    $exists = ($res && $res->num_rows > 0);
    $chk->close();

    if ($exists) {
        // UPDATE — keep columns consistent with INSERT below
        $sql = "UPDATE orders SET 
                    nomorNota = ?, namaPelanggan = ?, tanggalTerima = ?, tanggalSelesai = ?,
                    service_id = ?, category_id = ?, jumlahKg = ?, harga = ?,
                    payment = ?, tanggalBayar = ?, status = ?, cabang = ?, finishedAt = ?
                WHERE uid = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare update failed: " . $conn->error);

        // types: 4s (nomor,nama,tTerima,tSelesai) + 2i + d + i + 5s + s (uid at end)
        $types = str_repeat('s',4) . str_repeat('i',2) . 'd' . 'i' . str_repeat('s',5);
        // That yields: 4s + 2i + d + i + 5s = 13 parameters before uid? Wait we must ensure uid included below
        // We'll append uid at end, so types must include that last 's':
        $types = $types . 's'; // add final uid string type
        // final types: 4s,2i,d,i,5s,1s => total params 14

        $stmt->bind_param(
            $types,
            $nomorNota, $namaPelanggan, $tanggalTerima, $tanggalSelesai,
            $service_id, $category_id, $jumlahKg, $harga,
            $payment, $tanggalBayar, $status, $cabang, $finishedAt,
            $uid
        );

        if (!$stmt->execute()) {
            throw new Exception("Gagal update order: " . $stmt->error);
        }
        $stmt->close();
        echo json_encode(["success" => true, "message" => "Order berhasil diupdate", "uid" => $uid]);
        exit;
    } else {
        // INSERT — columns MUST match bind order below
        $sql = "INSERT INTO orders
                (uid, nomorNota, namaPelanggan, tanggalTerima, tanggalSelesai,
                 service_id, category_id, jumlahKg, harga,
                 payment, tanggalBayar, status, cabang, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare insert failed: " . $conn->error);

        // types: uid(s), nomorNota(s), nama(s), tTerima(s), tSelesai(s) => 5s
        // service_id(i), category_id(i) => 2i
        // jumlahKg(d)
        // harga(i)
        // payment(s), tanggalBayar(s), status(s), cabang(s), createdAt(s) => 5s
        $types = str_repeat('s',5) . str_repeat('i',2) . 'd' . 'i' . str_repeat('s',5); // total 14 types

        $stmt->bind_param(
            $types,
            $uid, $nomorNota, $namaPelanggan, $tanggalTerima, $tanggalSelesai,
            $service_id, $category_id, $jumlahKg, $harga,
            $payment, $tanggalBayar, $status, $cabang, $createdAt
        );

        if (!$stmt->execute()) {
            throw new Exception("Gagal insert order: " . $stmt->error);
        }
        $inserted = $conn->insert_id;
        $stmt->close();
        echo json_encode(["success" => true, "message" => "Order berhasil disimpan", "uid" => $uid, "inserted_id" => $inserted]);
        exit;
    }

} catch (Exception $e) {
    error_log("SAVE_ORDER ERROR: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Gagal simpan order: " . $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>
