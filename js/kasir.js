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

// Auto Number Generation System
function generateAutoNumber(date = new Date()) {
    const dateStr = formatDateForNumber(date);
    const key = `autoNumber_${CABANG}_${dateStr}`;
    
    let currentNumber = parseInt(localStorage.getItem(key) || '0');
    currentNumber++;
    localStorage.setItem(key, currentNumber.toString());
    
    return `${dateStr}-${currentNumber.toString().padStart(3, '0')}`;
}

function formatDateForNumber(date) {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

function generateUID() {
    const now = new Date();
    const dateStr = formatDateForNumber(now);
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0');
    const randomStr = Math.random().toString(36).substr(2, 3).toUpperCase();
    
    return `${CABANG.replace(/\s/g, '').slice(0, 3).toUpperCase()}-${dateStr}-${timeStr}-${randomStr}`;
}

async function saveOrderToDB(data) {
    try {
        const res = await fetch("backend/save_order.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (error) {
        console.error("Gagal simpan order:", error);
        return { success: false, message: "Gagal terhubung ke server" };
    }
}

// ===============================
// LOAD SERVICES FROM DATABASE
// ===============================
async function loadServices() {
    try {
        const res = await fetch("backend/get_services.php"); // endpoint baru ambil services+prices
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

            // pas pilih layanan
            serviceSelect.addEventListener("change", function() {
                const serviceId = parseInt(this.value);
                const service = servicesData.find(s => s.id === serviceId);
                const categorySelect = document.getElementById("jenisLaundry");

                categorySelect.innerHTML = '<option value="">Pilih Jenis Service</option>';
                categorySelect.disabled = true;

                if (service && service.prices) {
                    Object.keys(service.prices).forEach(cat => {
                        const opt = document.createElement("option");
                        opt.value = cat;
                        opt.textContent = `${cat} - Rp ${service.prices[cat].toLocaleString("id-ID")}/kg`;
                        opt.dataset.price = service.prices[cat]; // simpan harga per kg
                        opt.dataset.categoryId = service.prices_id ? service.prices_id[cat] : 0;
                        categorySelect.appendChild(opt);
                    });
                    categorySelect.disabled = false;
                }
            });
        }
    } catch (err) {
        console.error("Error load services:", err);
    }
}

// Populate service dropdown with dynamic data
function populateServiceOptions() {
    const serviceSelect = document.getElementById('serviceName');
    const categorySelect = document.getElementById('jenisLaundry');
    if (!serviceSelect) return;

    serviceSelect.innerHTML = '<option value="">Pilih Layanan</option>';
    servicesData.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id; // service id
        opt.textContent = s.service_name;
        serviceSelect.appendChild(opt);
    });

    // clear category
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Pilih Jenis Service</option>';
        categorySelect.disabled = true;
    }

    // bind change jika belum ada
    serviceSelect.onchange = () => updateCategoryOptions();
}

// Update category options based on selected service
function updateCategoryOptions() {
    const serviceSelect = document.getElementById('serviceName');
    const categorySelect = document.getElementById('jenisLaundry');
    if (!serviceSelect || !categorySelect) return;

    categorySelect.innerHTML = '<option value="">Pilih Jenis Service</option>';
    const sid = parseInt(serviceSelect.value) || 0;
    if (!sid) {
        categorySelect.disabled = true;
        calculatePrice();
        return;
    }

    const svc = servicesData.find(s => s.id === sid);
    if (!svc) {
        categorySelect.disabled = true;
        return;
    }

    // svc.prices: { 'Regular': {id, price}, ... }
    Object.entries(svc.prices).forEach(([categoryName, info]) => {
        // info = { id, price }
        const opt = document.createElement('option');
        opt.value = info.id; // **value = category_id** (penting)
        opt.textContent = `${categoryName} - ${formatRupiah(info.price)}/kg`;
        // simpan metadata untuk akses cepat
        opt.dataset.categoryName = categoryName;
        opt.dataset.price = info.price;
        opt.dataset.categoryId = info.id;
        categorySelect.appendChild(opt);
    });

    categorySelect.disabled = false;

    // attach calculate listeners
    categorySelect.onchange = () => calculatePrice();
    const jumlahKgEl = document.getElementById('jumlahKg');
    if (jumlahKgEl) jumlahKgEl.oninput = () => calculatePrice();

    // recalc jika diperlukan
    calculatePrice();
}


// Ambil harga berdasarkan serviceId dan categoryName
function getServicePriceByIdCategory(serviceId, categoryId) {
    const svc = servicesData.find(s => s.id === parseInt(serviceId));
    if (!svc) return 0;
    for (const [catName, info] of Object.entries(svc.prices)) {
        if (info && (info.id == categoryId || catName == categoryId)) return info.price;
    }
    return 0;
}

// Get service name by ID
function getServiceNameById(serviceId) {
    const service = servicesData.find(s => s.id === parseInt(serviceId));
    return service ? service.service_name : 'Unknown Service';
}

// Hitung total harga
function calculatePrice() {
    const serviceSelect = document.getElementById('serviceName');
    const categorySelect = document.getElementById('jenisLaundry');
    const jumlahKg = parseFloat(document.getElementById('jumlahKg').value) || 0;
    const hargaInput = document.getElementById('harga');

    const sid = serviceSelect ? parseInt(serviceSelect.value) : 0;
    const cid = categorySelect ? categorySelect.value : '';

    if (sid && cid && jumlahKg > 0) {
        const pricePerKg = getServicePriceByIdCategory(sid, cid);
        const totalHarga = pricePerKg * jumlahKg;
        hargaInput.value = totalHarga;
        hargaInput.dataset.pricePerKg = pricePerKg; 
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
    
    if (data.serviceName && data.jenisLaundry) {
        serviceName = getServiceNameById(data.serviceName);
        categoryName = data.jenisLaundry;
        pricePerKg = getServicePriceByIdCategory(data.serviceName, data.jenisLaundry);
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
            <span>${data.jumlahKg} kg</span>
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

// Initialize App
document.addEventListener('DOMContentLoaded', async function() {
    await loadServices(); // Load services first
    initializeUser();
    await loadOrders();

    // set default tanggal hari ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggalTerima').value = today;

    if (document.getElementById('finishTanggalAmbil')) {
        document.getElementById('finishTanggalAmbil').value = today;
    }
    if (document.getElementById('finishTanggalBayar')) {
        document.getElementById('finishTanggalBayar').value = today;
    }

    // Event listeners
    document.getElementById('serviceName').addEventListener('change', updateCategoryOptions);
    document.getElementById('jenisLaundry').addEventListener('change', calculatePrice);
    document.getElementById('jumlahKg').addEventListener('input', calculatePrice);
});

// Tab Management
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

// Payment Management
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
// TABLE RENDERING - UPDATED
// ===============================
function renderOnProgressTable(data) {
    const tbody = document.getElementById('onProgressTable');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Tidak ada data on progress</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item) => {
        let paymentDisplay = '<span class="payment-status belum-bayar">BELUM BAYAR</span>';
        if (item.payment && item.payment !== 'none') {
            paymentDisplay = `<span class="jenis-badge">${item.payment.toUpperCase()}</span>`;
        }

        // gunakan langsung serviceName & categoryName dari backend
        const serviceName = item.serviceName || 'Unknown Service';
        const categoryName = item.categoryName || 'Unknown Category';

        return `
            <tr>
                <td><span class="nota-code">${item.uid}</span></td>
                <td><span class="nota-code">${item.nomorNota}</span></td>
                <td>${item.namaPelanggan}</td>
                <td>${formatDate(item.tanggalTerima)}</td>
                <td>${formatDate(item.tanggalSelesai)}</td>
                <td><span class="jenis-badge">${serviceName} - ${categoryName}</span></td>
                <td>${item.jumlahKg} kg</td>
                <td><span class="currency">${formatRupiah(item.harga)}</span></td>
                <td>${paymentDisplay}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon print" onclick='showReceiptModal(${JSON.stringify(item)})' title="Cetak">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="btn-icon edit" onclick="editData('${item.uid}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon finish" 
                                onclick="showFinishForm('${item.uid}', '${item.payment || 'none'}')" 
                                title="Selesai">
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
        // langsung ambil dari backend
        const serviceName = item.serviceName || 'Unknown Service';
        const categoryName = item.categoryName || 'Unknown Category';

        return `
            <tr>
                <td>${item.uid}</td>
                <td>${item.nomorNota}</td>
                <td>${item.namaPelanggan}</td>
                <td>${formatDate(item.tanggalTerima)}</td>
                <td>${formatDate(item.tanggalSelesai)}</td>
                <td>${serviceName} - ${categoryName}</td>
                <td>${item.jumlahKg} kg</td>
                <td>${formatDate(item.tanggalAmbil)}</td>
                <td>${formatDate(item.tanggalBayar)}</td>
                <td>${item.payment || "-"}</td>
                <td><span class="currency">${formatRupiah(item.harga)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon print" onclick='printFinishedOrder(${JSON.stringify(item)})' title="Cetak">
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

// ===============================
// FORM MANAGEMENT - UPDATED
// ===============================
function showForm() {
    const modal = document.getElementById('formModal');
    modal.dataset.uid = "";  // Clear uid for add mode
    
    document.getElementById('modalTitle').textContent = "Tambah Data Laundry";
    document.getElementById('saveButtonText').textContent = "Simpan";
    
    clearForm();
    modal.classList.add('show');
}

function hideForm() {
    document.getElementById('formModal').classList.remove('show');
}

function clearForm() {
    document.getElementById('nomorNota').value = generateAutoNumber();
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
// SAVE DATA - UPDATED
// ===============================
async function saveData() {
    try {
        const modal = document.getElementById('formModal');
        const uidEdit = modal?.dataset?.uid || null; // kalau edit, modal dataset.uid di-set di editData()
        const uid = uidEdit || generateUID();

        const nomorNota = document.getElementById('nomorNota').value || generateAutoNumber();
        const namaPelanggan = document.getElementById('namaPelanggan').value?.trim();
        const tanggalTerima = document.getElementById('tanggalTerima').value;
        const tanggalSelesai = document.getElementById('tanggalSelesai').value;
        const serviceId = parseInt(document.getElementById('serviceName').value) || 0;
        const categorySelect = document.getElementById('jenisLaundry');
        const categoryId = parseInt(categorySelect?.value || 0);
        const categoryName = categorySelect?.selectedOptions?.[0]?.dataset?.categoryName || '';
        const pricePerKg = parseInt(document.getElementById('harga')?.dataset?.pricePerKg || 0);
        const jumlahKg = parseFloat(document.getElementById('jumlahKg').value) || 0;
        const harga = parseInt(document.getElementById('harga').value || (pricePerKg * jumlahKg) || 0);
        const metodePembayaran = document.querySelector("input[name='formPayment']:checked")?.value || 'none';

        // Validasi
        if (!nomorNota || !namaPelanggan || !tanggalTerima || !tanggalSelesai || serviceId <= 0 || categoryId <= 0 || jumlahKg <= 0) {
            alert('Lengkapi semua field yang wajib diisi!');
            return;
        }

        const payload = {
            uid,
            nomorNota,
            namaPelanggan,
            tanggalTerima,
            tanggalSelesai,
            serviceId,
            categoryId,
            serviceName: getServiceNameById(serviceId),
            categoryName,
            pricePerKg,
            jumlahKg,
            harga,
            payment: metodePembayaran,
            status: 'progress',
            cabang: document.getElementById('currentBranch')?.textContent || null
        };

        console.log('Saving order: ', payload);

        const endpoint = uidEdit ? 'backend/update_order.php' : 'backend/save_order.php';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resp = await res.json();
        if (resp.success) {
            alert(uidEdit ? 'Order berhasil diupdate!' : 'Order berhasil disimpan!');
            // clear edit state
            editingUid = null;
            if (modal) modal.dataset.uid = '';
            hideForm();
            clearForm();
            await loadOrders(); // refresh dari DB
        } else {
            console.error('Server error:', resp);
            alert('Gagal simpan order: ' + resp.message);
        }

    } catch (err) {
        console.error('Error saveData:', err);
        alert('Terjadi kesalahan saat menyimpan order: ' + (err.message || err));
    }
}



// ===============================
// EDIT DATA FUNCTION - UPDATED
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

    // isi form
    document.getElementById('nomorNota').value = item.nomorNota || '';
    document.getElementById('namaPelanggan').value = item.namaPelanggan || '';
    document.getElementById('tanggalTerima').value = item.tanggalTerima || '';
    document.getElementById('tanggalSelesai').value = item.tanggalSelesai || '';
    // set service
    if (item.serviceId) {
        document.getElementById('serviceName').value = item.serviceId;
        updateCategoryOptions(); // akan populate jenis laundry
        // setelah populate, set categoryId (option.value adalah category_id)
        const catSelect = document.getElementById('jenisLaundry');
        if (catSelect && item.categoryId) {
            catSelect.value = item.categoryId;
        }
    }
    document.getElementById('jumlahKg').value = item.jumlahKg || '';
    document.getElementById('harga').value = item.harga || '';
    // set payment radio
    const radio = document.querySelector(`input[name="formPayment"][value="${item.payment || 'none'}"]`);
    if (radio) radio.checked = true;

    // ubah title & button text
    document.getElementById('modalTitle').textContent = 'Edit Data Laundry';
    document.getElementById('saveButtonText').textContent = 'Update';

    // tampilkan modal
    document.getElementById('formModal').classList.add('show');
}

// ===============================
// UPDATE ORDER STATUS
// ===============================
async function updateOrderStatus(uid, tanggalAmbil, tanggalBayar, payment) {
    try {
        const payload = { uid, tanggalAmbil, tanggalBayar, payment };
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
// FINISH MANAGEMENT
// ===============================
function showFinishForm(uid, payment = null) {
    currentFinishUid = uid;

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("finishTanggalAmbil").value = today;
    document.getElementById("finishTanggalBayar").value = today;

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
    const tanggalBayar = document.getElementById("finishTanggalBayar").value;
    const metodePembayaran = document.querySelector('input[name="payment"]:checked')?.value;

    if (!tanggalAmbil || !tanggalBayar || !metodePembayaran) {
        alert("Lengkapi field yang wajib diisi!");
        return;
    }

    try {
        const result = await updateOrderStatus(
            currentFinishUid,
            tanggalAmbil,
            tanggalBayar,
            metodePembayaran
        );

        console.log("Hasil update order:", result);

        if (result.success) {
            alert("Laundry berhasil diselesaikan & tersimpan di database!");
            hideFinishForm();
            await loadOrders(); // Refresh data from DB
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
                item.jenisLaundry.toLowerCase().includes(searchTerm) ||
                item.uid.toLowerCase().includes(searchTerm) ||
                getServiceNameById(item.serviceName).toLowerCase().includes(searchTerm)
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
                item.jenisLaundry.toLowerCase().includes(searchTerm) ||
                item.uid.toLowerCase().includes(searchTerm) ||
                getServiceNameById(item.serviceName).toLowerCase().includes(searchTerm)
            );
            renderFinishedTable(filteredData);
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