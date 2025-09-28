// Global Variables
let editIndex = null;
let finishIndex = null;
let currentUser = null;
let CABANG = '';

// Service data from database
let servicesData = [];
let currentFinishUid = null;
let ordersData = []; // Global variable to store orders data
let editingUid = null;

// Initialize User & Branch
function initializeUser() {
    const userData = sessionStorage.getItem("currentUser");
    if (userData) {
        currentUser = JSON.parse(userData);
        CABANG = currentUser.branch || 'Unknown';
        
        document.getElementById('currentUser').textContent = currentUser.name || currentUser.username;
        document.getElementById('currentBranch').textContent = CABANG;
        
        // SYNC DATA SAAT INITIALIZE
        syncDataToAdmin();
    } else {
        window.location.href = 'login.html';
    }
}

function generatePaymentBadge(paymentMethod, isOnProgress = false) {
    const method = paymentMethod || 'none';
    const displayText = method === 'none' ? 'BELUM BAYAR' : method.toUpperCase();
    
    if (isOnProgress && method === 'none') {
        return `<span class="payment-status" data-payment="none">${displayText}</span>`;
    } else {
        return `<span class="jenis-badge" data-payment="${method}">${displayText}</span>`;
    }
}

// Format tanggal YYMMDD
function formatDateForNumber(date) {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
}

// Function to get user name abbreviation (first 3 letters from NAME field)
function getUserNameAbbreviation() {
    if (!currentUser || !currentUser.name) {
        return 'PWK'; // fallback to default
    }
    
    // Take first 3 letters of NAME and convert to uppercase
    const name = currentUser.name.replace(/\s+/g, ''); // remove spaces
    const abbreviation = name.substring(0, 3).toUpperCase();
    
    // Ensure minimum 3 characters, pad with 'X' if needed
    return abbreviation.padEnd(3, 'X');
}

function generatePreviewNumber() {
    const dateStr = formatDateForNumber(new Date());
    const userAbbrev = getUserNameAbbreviation();
    const key = `autoNumber_${CABANG}_${dateStr}`;
    let currentNumber = parseInt(localStorage.getItem(key) || "0");
    
    // Hanya preview: angka saat ini + 1 (hanya untuk display)
    const previewNumber = currentNumber + 1;
    return `LRK-${userAbbrev}-${dateStr}-${previewNumber.toString().padStart(3, "0")}`;
}

function generateActualNumber() {
    const dateStr = formatDateForNumber(new Date());
    const userAbbrev = getUserNameAbbreviation();
    const key = `autoNumber_${CABANG}_${dateStr}`;
    let currentNumber = parseInt(localStorage.getItem(key) || "0") + 1;
    return `LRK-${userAbbrev}-${dateStr}-${currentNumber.toString().padStart(3, "0")}`;
}

function getTodayDate() {
    const today = new Date();
    return today.toISOString().split("T")[0]; // format YYYY-MM-DD
}



// 🔹 Saat simpan berhasil, baru increment counter
async function saveData() {
    try {
        const modal = document.getElementById('formModal');
        const uidEdit = modal?.dataset?.uid || null;
        
        let nomorNota;
        if (!uidEdit) {
            nomorNota = generateActualNumber();
        } else {
            nomorNota = document.getElementById('nomorNota').value || '';
        }

        const namaPelanggan = document.getElementById('namaPelanggan').value?.trim();
        const tanggalTerima = document.getElementById('tanggalTerima').value;
        const tanggalSelesai = document.getElementById('tanggalSelesai').value;
        const serviceId = parseInt(document.getElementById('serviceName').value) || 0;
        const categorySelect = document.getElementById('jenisLaundry');
        const categoryId = parseInt(categorySelect?.value || 0);
        const categoryName = categorySelect?.selectedOptions?.[0]?.dataset?.categoryName || getCategoryNameById(serviceId, categoryId);
        const pricePerKg = parseInt(document.getElementById('harga')?.dataset?.pricePerKg || 0);
        
        // 🔥 PERBAIKAN UTAMA: Pastikan parseFloat dan toFixed untuk presisi
        const jumlahKgRaw = document.getElementById('jumlahKg').value;
        const jumlahKg = parseFloat(jumlahKgRaw) || 0;
        
        // Validasi input decimal
        if (jumlahKg <= 0) {
            alert('Jumlah Kg harus lebih dari 0');
            return;
        }
        
        console.log('🔍 DEBUG jumlahKg:', {
            raw: jumlahKgRaw,
            parsed: jumlahKg,
            type: typeof jumlahKg,
            fixed: jumlahKg.toFixed(2)
        });
        
        const harga = parseInt(document.getElementById('harga').value || (pricePerKg * jumlahKg) || 0);
        const metodePembayaran = document.querySelector("input[name='formPayment']:checked")?.value || 'none';

        let tanggalBayar = null;
        if (metodePembayaran !== 'none') {
            tanggalBayar = new Date().toISOString().split('T')[0]; // isi otomatis hari ini
        }

        if (!nomorNota || !namaPelanggan || !tanggalTerima || !tanggalSelesai || serviceId <= 0 || categoryId <= 0 || jumlahKg <= 0) {
            alert('Lengkapi semua field yang wajib diisi!');
            return;
        }

        const payload = {
            uid: uidEdit || generateUID(),
            nomorNota,
            namaPelanggan,
            tanggalTerima,
            tanggalSelesai,
            serviceId,
            categoryId,
            serviceName: getServiceNameById(serviceId),
            categoryName,
            pricePerKg,
            jumlahKg: jumlahKg, // 🔥 Kirim sebagai number, bukan string
            harga,
            payment: metodePembayaran,
            tanggalBayar: tanggalBayar,
            status: 'progress',
            cabang: document.getElementById('currentBranch')?.textContent || null
        };

        console.log('🔍 DEBUG payload jumlahKg:', payload.jumlahKg, typeof payload.jumlahKg);

        const endpoint = uidEdit ? 'backend/update_order.php' : 'backend/save_order.php';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resp = await res.json();
        
        if (resp.success) {
            if (!uidEdit) { 
                const dateStr = formatDateForNumber(new Date());
                const key = `autoNumber_${CABANG}_${dateStr}`;
                let currentNumber = parseInt(localStorage.getItem(key) || "0");
                localStorage.setItem(key, (currentNumber + 1).toString());
            }

            alert(uidEdit ? 'Order berhasil diupdate!' : 'Order berhasil disimpan!');
            hideForm();
            await loadOrders();
        } else {
            alert("Gagal simpan order: " + resp.message);
        }

    } catch (err) {
        console.error('Error saveData:', err);
        alert('Terjadi kesalahan saat menyimpan order: ' + (err.message || err));
    }
}

// ===============================
// LOAD SERVICES FROM DATABASE
// ===============================
async function loadServices() {
    try {
        const res = await fetch("backend/get_services.php");
        const data = await res.json();
        
        if (data.success) {
            servicesData = data.services; 
            console.log("Services loaded:", servicesData);

            const serviceSelect = document.getElementById("serviceName");
            serviceSelect.innerHTML = '<option value="">Pilih Layanan</option>';

            data.services.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = s.service_name;
                serviceSelect.appendChild(opt);
            });

            // Event listener untuk service selection
            serviceSelect.addEventListener("change", function() {
                const serviceId = parseInt(this.value);
                const service = servicesData.find(s => s.id === serviceId);
                const categorySelect = document.getElementById("jenisLaundry");

                categorySelect.innerHTML = '<option value="">Pilih Jenis Service</option>';
                categorySelect.disabled = true;

                if (service && service.prices) {
                    Object.entries(service.prices).forEach(([categoryName, info]) => {
                        const opt = document.createElement("option");
                        opt.value = info.id; // Use category ID as value
                        opt.textContent = `${categoryName} - ${formatRupiah(info.price)}/kg`;
                        opt.dataset.price = info.price;
                        opt.dataset.categoryName = categoryName;
                        categorySelect.appendChild(opt);
                    });
                    categorySelect.disabled = false;
                }
                
                calculatePrice(); // Recalculate when service changes
            });
            
            // Event listener untuk category selection
            document.getElementById("jenisLaundry").addEventListener("change", calculatePrice);
            document.getElementById("jumlahKg").addEventListener("input", calculatePrice);
        }
    } catch (err) {
        console.error("Error load services:", err);
    }
}

// Get service name by ID
function getServiceNameById(serviceId) {
    const service = servicesData.find(s => s.id === parseInt(serviceId));
    return service ? service.service_name : 'Unknown Service';
}

// Get category name by service ID and category ID
function getCategoryNameById(serviceId, categoryId) {
    const service = servicesData.find(s => s.id === parseInt(serviceId));
    if (!service || !service.prices) return 'Unknown Category';
    
    for (const [categoryName, info] of Object.entries(service.prices)) {
        if (info.id == categoryId) return categoryName;
    }
    return 'Unknown Category';
}

// Get service price by service ID and category ID
function getServicePriceByIdCategory(serviceId, categoryId) {
    const service = servicesData.find(s => s.id === parseInt(serviceId));
    if (!service || !service.prices) return 0;
    
    for (const [categoryName, info] of Object.entries(service.prices)) {
        if (info.id == categoryId) return info.price;
    }
    return 0;
}

// Calculate total price
function calculatePrice() {
    const serviceSelect = document.getElementById('serviceName');
    const categorySelect = document.getElementById('jenisLaundry');
    const jumlahKgInput = document.getElementById('jumlahKg');
    const hargaInput = document.getElementById('harga');

    const serviceId = serviceSelect ? parseInt(serviceSelect.value) : 0;
    const categoryId = categorySelect ? categorySelect.value : '';
    
    // 🔥 PERBAIKAN: Pastikan parseFloat konsisten
    const jumlahKgRaw = jumlahKgInput.value;
    const jumlahKg = parseFloat(jumlahKgRaw) || 0;
    
    console.log('🔍 calculatePrice DEBUG:', {
        raw: jumlahKgRaw,
        parsed: jumlahKg,
        serviceId,
        categoryId
    });

    if (serviceId && categoryId && jumlahKg > 0) {
        const pricePerKg = getServicePriceByIdCategory(serviceId, categoryId);
        const totalHarga = Math.round(pricePerKg * jumlahKg); // Round untuk menghindari floating point error
        hargaInput.value = totalHarga;
        hargaInput.dataset.pricePerKg = pricePerKg; 
        
        console.log('🔍 Calculation:', {
            pricePerKg,
            jumlahKg,
            totalHarga
        });
    } else {
        hargaInput.value = '';
        hargaInput.dataset.pricePerKg = 0;
    }
}

// ===============================
// LOAD ORDERS FUNCTION
// ===============================
async function loadOrders() {
    try {
        const res = await fetch("backend/get_orders.php");
        const data = await res.json();

        if (!data.success) {
            console.error("Gagal ambil orders:", data.message);
            return;
        }

        // Save to global variable
        ordersData = data.data;
        console.log("OrdersData setelah fetch:", ordersData.length, "items");

        // Render tables with loaded data
        const onProgressOrders = ordersData.filter(o => o.status === "progress");
        const finishedOrders = ordersData.filter(o => o.status === "finished");
        
        renderOnProgressTable(onProgressOrders);
        renderFinishedTable(finishedOrders);

        // Update counter
        updateCounts(onProgressOrders.length, finishedOrders.length);

    } catch (err) {
        console.error("Error loadOrders:", err);
        alert("Gagal memuat data orders dari server");
    }
}

// Utility Functions
function formatRupiah(amount) {
    return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID');
}

function generateUID() {
    return 'uid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Receipt Generation
function generateReceipt(data) {
    const now = new Date();
    const receiptContent = document.getElementById('receiptContent');
    const receiptBranch = document.getElementById('receiptBranch');
    
    receiptBranch.textContent = CABANG;
    
    // Get service and category names for display
    let serviceName = 'Unknown Service';
    let categoryName = 'Unknown Category';
    let pricePerKg = 0;
    
    if (data.serviceId && data.categoryId) {
        serviceName = getServiceNameById(data.serviceId);
        categoryName = getCategoryNameById(data.serviceId, data.categoryId);
        pricePerKg = getServicePriceByIdCategory(data.serviceId, data.categoryId);
    }
    
    receiptContent.innerHTML = `
        <div class="receipt-row">
            <span>Tanggal:</span>
            <span>${formatDate(now.toISOString().split('T')[0])}</span>
        </div>
        <div class="receipt-row">
            <span>Waktu:</span>
            <span>${now.toLocaleTimeString('id-ID')}</span>
        </div>
        <div class="receipt-row">
            <span>Kasir:</span>
            <span>${currentUser.name || currentUser.username}</span>
        </div>
        <div style="border-bottom: 1px dashed #333; margin: 10px 0;"></div>
        <div class="receipt-row">
            <span>No. Nota:</span>
            <span>${data.nomorNota}</span>
        </div>
        <div class="receipt-row">
            <span>Pelanggan:</span>
            <span>${data.namaPelanggan}</span>
        </div>
        <div class="receipt-row">
            <span>Layanan:</span>
            <span>${serviceName}</span>
        </div>
        <div class="receipt-row">
            <span>Jenis:</span>
            <span>${categoryName}</span>
        </div>
        <div class="receipt-row">
            <span>Berat:</span>
            <span>${formatDecimal(data.jumlahKg)} kg</span>
        </div>
        <div class="receipt-row">
            <span>Harga/kg:</span>
            <span>${formatRupiah(pricePerKg)}</span>
        </div>
        <div class="receipt-row">
            <span>Tgl Terima:</span>
            <span>${formatDate(data.tanggalTerima)}</span>
        </div>
        <div class="receipt-row">
            <span>Tgl Selesai:</span>
            <span>${formatDate(data.tanggalSelesai)}</span>
        </div>
        <div class="receipt-total">
            <div class="receipt-row">
                <span>TOTAL:</span>
                <span>${formatRupiah(data.harga)}</span>
            </div>
            <div class="receipt-row">
                <span>Pembayaran:</span>
                <span>${data.payment === 'none' ? 'BELUM BAYAR' : data.payment.toUpperCase()}</span>
            </div>
        </div>
        <div class="receipt-footer">
            <p>Terima kasih atas kepercayaan Anda</p>
            <p>Barang hilang/rusak bukan tanggungan kami</p>
            <p>Klaim max 3x24 jam</p>
        </div>
    `;
}

function showReceiptModal(data) {
    generateReceipt(data);
    document.getElementById('receiptModal').classList.add('show');
}

function hideReceiptModal() {
    document.getElementById('receiptModal').classList.remove('show');
}

function printReceipt() {
    window.print();
}

// ===============================
// Data Sync untuk Admin
// ===============================
function syncDataToAdmin() {
    try {
        const allOnProgressData = [];
        const allFinishedData = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key && key.startsWith('onProgressData_')) {
                const cabangData = JSON.parse(localStorage.getItem(key) || '[]');
                allOnProgressData.push(...cabangData);
            }
            
            if (key && key.startsWith('finishedData_')) {
                const cabangData = JSON.parse(localStorage.getItem(key) || '[]');
                allFinishedData.push(...cabangData);
            }
        }
        
        localStorage.setItem('allOnProgressData', JSON.stringify(allOnProgressData));
        localStorage.setItem('allFinishedData', JSON.stringify(allFinishedData));
        
        console.log('Data synced to admin:', {
            onProgress: allOnProgressData.length,
            finished: allFinishedData.length
        });
        
    } catch (error) {
        console.error('Error syncing data to admin:', error);
    }
}

// ===============================
// FORM MANAGEMENT - DIPERBAIKI
// ===============================
function showForm() {
    const modal = document.getElementById('formModal');
    modal.dataset.uid = "";  // Clear uid for add mode
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Tambah Data Laundry';
    document.getElementById('saveButtonText').textContent = "Simpan";
    
    clearForm();
    
    // 🔹 HANYA TAMPILKAN PREVIEW NOMOR TANPA MENAIKKAN COUNTER
    const previewNumber = generatePreviewNumber();
    document.getElementById('nomorNota').value = previewNumber;
    
    modal.classList.add('show');
}

function hideForm() {
    document.getElementById('formModal').classList.remove('show');
}

function clearForm() {
    // 🔹 Biarkan nomor nota kosong, akan diisi oleh showForm() dengan preview
    document.getElementById('nomorNota').value = '';
    document.getElementById('namaPelanggan').value = '';
    document.getElementById('tanggalTerima').value = new Date().toISOString().split('T')[0];
    document.getElementById('tanggalSelesai').value = '';
    document.getElementById('serviceName').value = '';
    document.getElementById('jenisLaundry').value = '';
    document.getElementById('jenisLaundry').disabled = true;
    document.getElementById('jumlahKg').value = '';
    document.getElementById('harga').value = '';
    
    // Reset payment options - Default "Belum Bayar"
    const formOptions = document.querySelectorAll('#formModal .payment-option');
    const formRadios = document.querySelectorAll('input[name="formPayment"]');
    
    formOptions.forEach(option => option.classList.remove('selected'));
    formRadios.forEach(radio => radio.checked = false);
    
    const noneRadio = document.querySelector('input[name="formPayment"][value="none"]');
    if (noneRadio) {
        noneRadio.checked = true;
        noneRadio.closest('.payment-option').classList.add('selected');
    }
}

// ===============================
// EDIT DATA FUNCTION - DIPERBAIKI
// ===============================
function editData(uid) {
    editingUid = uid;
    const modal = document.getElementById('formModal');
    if (modal) modal.dataset.uid = uid;

    if (!ordersData || ordersData.length === 0) {
        alert('Data belum dimuat, silakan tunggu sebentar');
        loadOrders();
        return;
    }

    const item = ordersData.find(o => o.uid === uid);
    if (!item) {
        alert('Data order tidak ditemukan (UID: ' + uid + ')');
        return;
    }

    // Isi form
    document.getElementById('nomorNota').value = item.nomorNota || '';
    document.getElementById('namaPelanggan').value = item.namaPelanggan || '';
    document.getElementById('tanggalTerima').value = item.tanggalTerima || '';
    document.getElementById('tanggalSelesai').value = item.tanggalSelesai || '';
    
    // Set service
    if (item.serviceId) {
        document.getElementById('serviceName').value = item.serviceId;
        const event = new Event('change', { bubbles: true });
        document.getElementById('serviceName').dispatchEvent(event);
        
        setTimeout(() => {
            const catSelect = document.getElementById('jenisLaundry');
            if (catSelect && item.categoryId) {
                catSelect.value = item.categoryId;
            }
        }, 100);
    }
    
    // 🔥 PERBAIKAN UTAMA: Set value dengan format yang tepat
    const jumlahKgValue = parseFloat(item.jumlahKg) || 0;
    
    // Untuk input, gunakan format yang bisa diedit user
    if (jumlahKgValue % 1 === 0) {
        document.getElementById('jumlahKg').value = jumlahKgValue.toString(); // "2"
    } else {
        document.getElementById('jumlahKg').value = jumlahKgValue.toFixed(2); // "2.50"
    }
    
    document.getElementById('harga').value = item.harga || '';
    
    console.log('🔍 editData DEBUG:', {
        itemJumlahKg: item.jumlahKg,
        parsed: jumlahKgValue,
        inputValue: document.getElementById('jumlahKg').value
    });
    
    // Set payment radio
    const paymentOptions = document.querySelectorAll('#formModal .payment-option');
    const paymentRadios = document.querySelectorAll('input[name="formPayment"]');
    
    paymentOptions.forEach(option => option.classList.remove('selected'));
    paymentRadios.forEach(radio => radio.checked = false);
    
    const selectedRadio = document.querySelector(`input[name="formPayment"][value="${item.payment || 'none'}"]`);
    if (selectedRadio) {
        selectedRadio.checked = true;
        selectedRadio.closest('.payment-option').classList.add('selected');
    }

    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Data Laundry';
    document.getElementById('saveButtonText').textContent = 'Update';

    document.getElementById('formModal').classList.add('show');
}

// ===============================
// UPDATE ORDER STATUS - DIPERBAIKI
// ===============================
async function updateOrderStatus(uid, tanggalAmbil, metodePembayaran) {
    try {
        // 🔹 TANGGAL BAYAR OTOMATIS: hanya diisi jika bukan "belum bayar"
        let tanggalBayar = null;
        if (metodePembayaran && metodePembayaran !== 'none') {
            tanggalBayar = tanggalAmbil; // Gunakan tanggal ambil sebagai tanggal bayar
        }

        const payload = { uid, tanggalAmbil, tanggalBayar, payment: metodePembayaran };
        console.log("DEBUG: updateOrderStatus payload:", payload);

        const res = await fetch("backend/update_order_status.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("HTTP error! status: " + res.status);

        const data = await res.json();
        console.log("DEBUG: update_order_status.php response:", data);
        return data;
    } catch (err) {
        console.error("updateOrderStatus error:", err);
        throw err;
    }
}

// ===============================
// FINISH MANAGEMENT - DIPERBAIKI
// ===============================
function showFinishForm(uid, payment = null) {
    currentFinishUid = uid;

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("finishTanggalAmbil").value = today;
    // 🔹 HAPUS INPUT TANGGAL BAYAR - tidak perlu lagi

    // Reset payment options
    const finishOptions = document.querySelectorAll('#finishModal .payment-option');
    const finishRadios = document.querySelectorAll('input[name="payment"]');
    
    finishOptions.forEach(option => option.classList.remove('selected'));
    finishRadios.forEach(radio => (radio.checked = false));

    // If there's existing payment, set as default
    if (payment && payment !== "none") {
        const existingPaymentRadio = document.querySelector(
            `input[name="payment"][value="${payment}"]`
        );
        if (existingPaymentRadio) {
            existingPaymentRadio.checked = true;
            existingPaymentRadio.closest(".payment-option").classList.add("selected");
        }
    }

    document.getElementById("finishModal").classList.add("show");
}

function hideFinishForm() {
    document.getElementById('finishModal').classList.remove('show');
}

async function confirmFinish() {
    if (!currentFinishUid) {
        alert("Tidak ada order yang dipilih untuk diselesaikan.");
        return;
    }

    const tanggalAmbil = document.getElementById("finishTanggalAmbil").value;
    const metodePembayaran = document.querySelector('input[name="payment"]:checked')?.value || 'none';

    if (!tanggalAmbil || !metodePembayaran) {
        alert("Lengkapi field yang wajib diisi!");
        return;
    }

    // 🔥 Auto isi tanggal bayar jika ada pembayaran
    let tanggalBayar = null;
    if (metodePembayaran !== 'none') {
        tanggalBayar = new Date().toISOString().split('T')[0];
    }

    try {
        const result = await updateOrderStatus(
            currentFinishUid,
            tanggalAmbil,
            metodePembayaran,
            tanggalBayar   // ⬅️ kirim otomatis ke backend
        );

        console.log("Hasil update order:", result);

        if (result.success) {
            alert("Laundry berhasil diselesaikan & tersimpan di database!");
            hideFinishForm();
            await loadOrders();
        } else {
            alert("Gagal update ke database. Status tetap progress.");
        }
    } catch (err) {
        console.error("Error confirmFinish:", err);
        alert("Terjadi kesalahan saat update order.");
    } finally {
        currentFinishUid = null;
    }
}

// ===============================
// TABLE RENDERING - DIPERBAIKI
// ===============================
function renderOnProgressTable(data) {
    const tbody = document.getElementById('onProgressTable');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Tidak ada data on progress</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item) => {
let paymentDisplay;
if (item.payment && item.payment !== 'none') {
    paymentDisplay = `<span class="jenis-badge" data-payment="${item.payment}">${item.payment.toUpperCase()}</span>`;
} else {
    paymentDisplay = '<span class="payment-status" data-payment="none">BELUM BAYAR</span>';
}


        // Get service and category names
        const serviceName = item.serviceName || getServiceNameById(item.serviceId) || 'Unknown Service';
        const categoryName = item.categoryName || getCategoryNameById(item.serviceId, item.categoryId) || 'Unknown Category';

        return `
            <tr>
                <td><span class="nota-code">${item.nomorNota}</span></td>
                <td>${item.namaPelanggan}</td>
                <td>${formatDate(item.tanggalTerima)}</td>
                <td>${formatDate(item.tanggalSelesai)}</td>
                <td><span class="service-badge">${serviceName}</span></td>
                <td><span class="jenis-badge">${categoryName}</span></td>
                <td>${formatDecimal(item.jumlahKg)} kg</td>
                <td><span class="currency">${formatRupiah(item.harga)}</span></td>
                <td>${paymentDisplay}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon print" onclick='showReceiptModal(${JSON.stringify(item)})' title="Cetak Struk">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="btn-icon edit" onclick="editData('${item.uid}')" title="Edit Data">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon finish" 
                                onclick="showFinishForm('${item.uid}', '${item.payment || 'none'}')" 
                                title="Selesaikan">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}


function renderFinishedTable(orders) {
    const tbody = document.getElementById('finishedTable');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="empty-state">Tidak ada data finished</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map((item) => {
        // Get service and category names
        const serviceName = item.serviceName || getServiceNameById(item.serviceId) || 'Unknown Service';
        const categoryName = item.categoryName || getCategoryNameById(item.serviceId, item.categoryId) || 'Unknown Category';

        return `
            <tr>
                <td><span class="nota-code">${item.nomorNota}</span></td>
                <td>${item.namaPelanggan}</td>
                <td>${formatDate(item.tanggalTerima)}</td>
                <td>${formatDate(item.tanggalSelesai)}</td>
                <td><span class="service-badge">${serviceName}</span></td>
                <td><span class="jenis-badge">${categoryName}</span></td>
                <td>${formatDecimal(item.jumlahKg)} kg</td>
                <td>${formatDate(item.tanggalAmbil)}</td>
                <td>${item.tanggalBayar ? formatDate(item.tanggalBayar) : '-'}</td>
                <td><span class="jenis-badge" data-payment="${item.payment || 'none'}">${item.payment ? item.payment.toUpperCase() : "BELUM BAYAR"}</span></td>
                <td><span class="currency">${formatRupiah(item.harga)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon print" onclick='printFinishedOrder(${JSON.stringify(item)})' title="Cetak Struk">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function printFinishedOrder(order) {
    showReceiptModal(order);
}

function formatDecimal(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    // 🔥 PERBAIKAN: Tampilkan hingga 2 desimal, tapi hilangkan .00 untuk bilangan bulat
    if (num % 1 === 0) {
        return num.toString(); // Tampilkan "2" bukan "2.00"
    } else {
        return num.toFixed(2); // Tampilkan "2.50" untuk decimal
    }
}

// ===============================
// SEARCH FUNCTIONS
// ===============================
function performSearch(type) {
    const searchInput = type === 'onprogress' ? 
        document.getElementById('searchOnProgress') : 
        document.getElementById('searchFinished');
    
    const searchTerm = searchInput.value.toLowerCase();
    
    if (type === 'onprogress') {
        const allOnProgress = ordersData.filter(o => o.status === "progress");
        if (searchTerm === '') {
            renderOnProgressTable(allOnProgress);
        } else {
            const filteredData = allOnProgress.filter(item => 
                item.nomorNota.toLowerCase().includes(searchTerm) ||
                item.namaPelanggan.toLowerCase().includes(searchTerm) ||
                item.uid.toLowerCase().includes(searchTerm) ||
                getServiceNameById(item.serviceId).toLowerCase().includes(searchTerm) ||
                getCategoryNameById(item.serviceId, item.categoryId).toLowerCase().includes(searchTerm)
            );
            renderOnProgressTable(filteredData);
        }
    } else {
        const allFinished = ordersData.filter(o => o.status === "finished");
        if (searchTerm === '') {
            renderFinishedTable(allFinished);
        } else {
            const filteredData = allFinished.filter(item =>
                item.nomorNota.toLowerCase().includes(searchTerm) ||
                item.namaPelanggan.toLowerCase().includes(searchTerm) ||
                item.uid.toLowerCase().includes(searchTerm) ||
                getServiceNameById(item.serviceId).toLowerCase().includes(searchTerm) ||
                getCategoryNameById(item.serviceId, item.categoryId).toLowerCase().includes(searchTerm)
            );
            renderFinishedTable(filteredData);
        }
    }
}

// ===============================
// TAB MANAGEMENT & UTILITIES
// ===============================
function switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
}

function updateCounts(onProgressCount, finishedCount) {
    document.getElementById('onProgressCount').textContent = onProgressCount || 0;
    document.getElementById('finishedCount').textContent = finishedCount || 0;
}

function selectPayment(method, context) {
    if (context === 'form') {
        const formOptions = document.querySelectorAll('#formModal .payment-option');
        const formRadios = document.querySelectorAll('input[name="formPayment"]');
        
        formOptions.forEach(option => option.classList.remove('selected'));
        formRadios.forEach(radio => radio.checked = false);
        
        const selectedRadio = document.querySelector(`input[name="formPayment"][value="${method}"]`);
        if (selectedRadio) {
            selectedRadio.checked = true;
            selectedRadio.closest('.payment-option').classList.add('selected');
        }
    } else if (context === 'finish') {
        const finishOptions = document.querySelectorAll('#finishModal .payment-option');
        const finishRadios = document.querySelectorAll('input[name="payment"]');
        
        finishOptions.forEach(option => option.classList.remove('selected'));
        finishRadios.forEach(radio => radio.checked = false);
        
        const selectedRadio = document.querySelector(`input[name="payment"][value="${method}"]`);
        if (selectedRadio) {
            selectedRadio.checked = true;
            selectedRadio.closest('.payment-option').classList.add('selected');
        }
    }
}

// ===============================
// AUTO SYNC & STORAGE LISTENERS
// ===============================
setInterval(function() {
    syncDataToAdmin();
}, 10000); // Sync every 10 seconds

window.addEventListener('storage', function(e) {
    if (e.key && (e.key.startsWith('onProgressData_') || e.key.startsWith('finishedData_'))) {
        console.log('Storage changed, syncing data to admin...');
        syncDataToAdmin();
    }
});

// Initialize App
document.addEventListener('DOMContentLoaded', async function() {
    await loadServices(); // Load services first
    initializeUser();
    await loadOrders();

    // Set default tanggal hari ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggalTerima').value = today;

    if (document.getElementById('finishTanggalAmbil')) {
        document.getElementById('finishTanggalAmbil').value = today;
    }
    // 🔹 HAPUS SET DEFAULT TANGGAL BAYAR - tidak perlu lagi karena sudah otomatis
});