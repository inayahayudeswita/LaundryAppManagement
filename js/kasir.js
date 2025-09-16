// Global Variables
let onProgressData = [];
let finishedData = [];
let editIndex = null;
let finishIndex = null;
let currentUser = null;
let CABANG = '';

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

// Pricing Functions
function getServicePrices() {
    const savedPrices = localStorage.getItem('servicePrices');
    if (savedPrices) {
        return JSON.parse(savedPrices);
    }
    return {
        reg: 5000,
        exp1h: 15000,
        exp2h: 12000,
        cl: 7000,
        set: 3000,
        sat: 10000
    };
}

function getServicePrice(service) {
    const prices = getServicePrices();
    return prices[service] || 0;
}

function getServiceName(serviceCode) {
    const serviceNames = {
        reg: 'Regular',
        exp1h: 'Express 1 Jam',
        exp2h: 'Express 2 Jam',
        cl: 'Cuci Lipat',
        set: 'Setrika',
        sat: 'Satuan'
    };
    return serviceNames[serviceCode] || serviceCode;
}

function calculatePrice() {
    const jenisLaundry = document.getElementById('jenisLaundry').value;
    const jumlahKg = parseFloat(document.getElementById('jumlahKg').value) || 0;
    const hargaInput = document.getElementById('harga');
    
    if (jenisLaundry && jumlahKg > 0) {
        const pricePerKg = getServicePrice(jenisLaundry);
        const totalHarga = pricePerKg * jumlahKg;
        hargaInput.value = totalHarga;
    } else {
        hargaInput.value = '';
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
            <span>Jenis:</span>
            <span>${getServiceName(data.jenisLaundry)}</span>
        </div>
        <div class="receipt-row">
            <span>Berat:</span>
            <span>${data.jumlahKg} kg</span>
        </div>
        <div class="receipt-row">
            <span>Harga/kg:</span>
            <span>${formatRupiah(getServicePrice(data.jenisLaundry))}</span>
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
// Data Sync untuk Admin - SISTEM BARU
// ===============================
function syncDataToAdmin() {
    try {
        // Ambil semua data onProgress dari semua cabang
        const allOnProgressData = [];
        const allFinishedData = [];
        
        // Loop semua keys di localStorage untuk mencari data cabang
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Cari data onProgress per cabang
            if (key && key.startsWith('onProgressData_')) {
                const cabangData = JSON.parse(localStorage.getItem(key) || '[]');
                allOnProgressData.push(...cabangData);
            }
            
            // Cari data finished per cabang  
            if (key && key.startsWith('finishedData_')) {
                const cabangData = JSON.parse(localStorage.getItem(key) || '[]');
                allFinishedData.push(...cabangData);
            }
        }
        
        // Simpan data gabungan untuk admin
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
document.addEventListener('DOMContentLoaded', function() {
    initializeUser();
    loadData();
    updateCounts();
    renderOnProgressTable();
    renderFinishedTable();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggalTerima').value = today;
    
    if (document.getElementById('finishTanggalAmbil')) {
        document.getElementById('finishTanggalAmbil').value = today;
    }
    if (document.getElementById('finishTanggalBayar')) {
        document.getElementById('finishTanggalBayar').value = today;
    }
    
    document.getElementById('jenisLaundry').addEventListener('change', calculatePrice);
    document.getElementById('jumlahKg').addEventListener('input', calculatePrice);
});

// Data Management - DIUPDATE DENGAN SYNC
function loadData() {
    const onProgressKey = `onProgressData_${CABANG}`;
    const finishedKey = `finishedData_${CABANG}`;
    
    const savedOnProgress = localStorage.getItem(onProgressKey);
    const savedFinished = localStorage.getItem(finishedKey);
    
    if (savedOnProgress) onProgressData = JSON.parse(savedOnProgress);
    if (savedFinished) finishedData = JSON.parse(savedFinished);
    
    // Sync data setelah load
    syncDataToAdmin();
}

function saveDataLocal() {
    const onProgressKey = `onProgressData_${CABANG}`;
    const finishedKey = `finishedData_${CABANG}`;
    
    localStorage.setItem(onProgressKey, JSON.stringify(onProgressData));
    localStorage.setItem(finishedKey, JSON.stringify(finishedData));
    
    // SYNC KE ADMIN SETIAP KALI SAVE
    syncDataToAdmin();
}

// Tab Management
function switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
}

function updateCounts() {
    document.getElementById('onProgressCount').textContent = onProgressData.length;
    document.getElementById('finishedCount').textContent = finishedData.length;
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

// Table Rendering
function renderOnProgressTable() {
    const tbody = document.getElementById('onProgressTable');
    
    if (onProgressData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Tidak ada data on progress</td></tr>';
        return;
    }

    tbody.innerHTML = onProgressData.map((item, index) => {
        let paymentDisplay = '<span class="payment-status belum-bayar">BELUM BAYAR</span>';
        if (item.payment && item.payment !== 'none') {
            paymentDisplay = `<span class="jenis-badge">${item.payment.toUpperCase()}</span>`;
        }
        
        return `
            <tr>
                <td><span class="nota-code">${item.uid}</span></td>
                <td><span class="nota-code">${item.nomorNota}</span></td>
                <td>${item.namaPelanggan}</td>
                <td>${formatDate(item.tanggalTerima)}</td>
                <td>${formatDate(item.tanggalSelesai)}</td>
                <td><span class="jenis-badge">${item.jenisLaundry}</span></td>
                <td>${item.jumlahKg} kg</td>
                <td><span class="currency">${formatRupiah(item.harga)}</span></td>
                <td>${paymentDisplay}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon print" onclick="showReceiptModal(onProgressData[${index}])" title="Cetak">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="btn-icon edit" onclick="editData(${index})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon finish" onclick="showFinishForm(${index})" title="Selesai">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderFinishedTable() {
    const tbody = document.getElementById('finishedTable');
    
    if (finishedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="empty-state">Tidak ada data finished</td></tr>';
        return;
    }

    tbody.innerHTML = finishedData.map(item => `
        <tr>
            <td><span class="nota-code">${item.uid}</span></td>
            <td><span class="nota-code">${item.nomorNota}</span></td>
            <td>${item.namaPelanggan}</td>
            <td>${formatDate(item.tanggalTerima)}</td>
            <td>${formatDate(item.tanggalSelesai)}</td>
            <td><span class="jenis-badge">${item.jenisLaundry}</span></td>
            <td>${item.jumlahKg} kg</td>
            <td>${formatDate(item.tanggalAmbil)}</td>
            <td>${formatDate(item.tanggalBayar)}</td>
            <td><span class="jenis-badge">${item.metodePembayaran?.toUpperCase()}</span></td>
            <td><span class="currency">${formatRupiah(item.harga)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon print" onclick="showReceiptModal(finishedData.find(x => x.uid === '${item.uid}'))" title="Cetak">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Form Management
function showForm() {
    document.getElementById('modalTitle').textContent = 'Tambah Data Laundry';
    document.getElementById('saveButtonText').textContent = 'Simpan';
    clearForm();
    document.getElementById('formModal').classList.add('show');
    editIndex = null;
    
    const autoNumber = generateAutoNumber();
    document.getElementById('nomorNota').value = autoNumber;
}

function hideForm() {
    document.getElementById('formModal').classList.remove('show');
}

function clearForm() {
    document.getElementById('nomorNota').value = '';
    document.getElementById('namaPelanggan').value = '';
    document.getElementById('tanggalTerima').value = new Date().toISOString().split('T')[0];
    document.getElementById('tanggalSelesai').value = '';
    document.getElementById('jenisLaundry').value = '';
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

function saveData() {
    const nomorNota = document.getElementById('nomorNota').value;
    const namaPelanggan = document.getElementById('namaPelanggan').value;
    const tanggalTerima = document.getElementById('tanggalTerima').value;
    const tanggalSelesai = document.getElementById('tanggalSelesai').value;
    const jenisLaundry = document.getElementById('jenisLaundry').value;
    const jumlahKg = parseFloat(document.getElementById('jumlahKg').value);
    const harga = parseInt(document.getElementById('harga').value);

    const paymentRadio = document.querySelector('input[name="formPayment"]:checked');
    const payment = paymentRadio ? paymentRadio.value : 'none';

    if (!nomorNota || !namaPelanggan || !tanggalTerima || !tanggalSelesai || !jenisLaundry || !jumlahKg || !harga) {
        alert('Lengkapi semua field!');
        return;
    }

    const data = {
        uid: editIndex !== null ? onProgressData[editIndex].uid : generateUID(),
        nomorNota, 
        namaPelanggan, 
        tanggalTerima, 
        tanggalSelesai, 
        jenisLaundry, 
        jumlahKg, 
        harga,
        payment,
        cabang: CABANG,
        createdAt: editIndex !== null ? onProgressData[editIndex].createdAt : new Date().toISOString()
    };

    if (editIndex !== null) {
        onProgressData[editIndex] = data;
        editIndex = null;
    } else {
        onProgressData.push(data);
        // Auto show receipt for new entries
        setTimeout(() => showReceiptModal(data), 500);
    }

    saveDataLocal();
    updateCounts();
    renderOnProgressTable();
    hideForm();
    alert('Data berhasil disimpan!');
}

function editData(index) {
    const data = onProgressData[index];
    
    document.getElementById('modalTitle').textContent = 'Edit Data';
    document.getElementById('saveButtonText').textContent = 'Update';
    
    document.getElementById('nomorNota').value = data.nomorNota;
    document.getElementById('namaPelanggan').value = data.namaPelanggan;
    document.getElementById('tanggalTerima').value = data.tanggalTerima;
    document.getElementById('tanggalSelesai').value = data.tanggalSelesai;
    document.getElementById('jenisLaundry').value = data.jenisLaundry;
    document.getElementById('jumlahKg').value = data.jumlahKg;
    document.getElementById('harga').value = data.harga;
    
    // Set payment options
    const formOptions = document.querySelectorAll('#formModal .payment-option');
    const formRadios = document.querySelectorAll('input[name="formPayment"]');
    
    formOptions.forEach(option => option.classList.remove('selected'));
    formRadios.forEach(radio => radio.checked = false);
    
    const paymentValue = data.payment || 'none';
    const paymentRadio = document.querySelector(`input[name="formPayment"][value="${paymentValue}"]`);
    if (paymentRadio) {
        paymentRadio.checked = true;
        paymentRadio.closest('.payment-option').classList.add('selected');
    }
    
    editIndex = index;
    document.getElementById('formModal').classList.add('show');
}

// Finish Management
function showFinishForm(index) {
    finishIndex = index;
    const data = onProgressData[index];
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('finishTanggalAmbil').value = today;
    document.getElementById('finishTanggalBayar').value = today;
    
    const finishOptions = document.querySelectorAll('#finishModal .payment-option');
    const finishRadios = document.querySelectorAll('input[name="payment"]');
    
    finishOptions.forEach(option => option.classList.remove('selected'));
    finishRadios.forEach(radio => radio.checked = false);
    
    if (data.payment && data.payment !== 'none') {
        const existingPaymentRadio = document.querySelector(`input[name="payment"][value="${data.payment}"]`);
        if (existingPaymentRadio) {
            existingPaymentRadio.checked = true;
            existingPaymentRadio.closest('.payment-option').classList.add('selected');
        }
    }
    
    document.getElementById('finishModal').classList.add('show');
}

function hideFinishForm() {
    document.getElementById('finishModal').classList.remove('show');
}

function confirmFinish() {
    const tanggalAmbil = document.getElementById('finishTanggalAmbil').value;
    const tanggalBayar = document.getElementById('finishTanggalBayar').value;
    const metodePembayaran = document.querySelector('input[name="payment"]:checked')?.value;

    if (!tanggalAmbil || !tanggalBayar || !metodePembayaran) {
        alert('Lengkapi field yang wajib diisi!');
        return;
    }

    const data = onProgressData[finishIndex];
    const finishedItem = { 
        ...data, 
        tanggalAmbil, 
        tanggalBayar, 
        metodePembayaran, 
        finishedAt: new Date().toISOString()
    };
    
    finishedData.push(finishedItem);
    onProgressData.splice(finishIndex, 1);
    
    saveDataLocal();
    updateCounts();
    renderOnProgressTable();
    renderFinishedTable();
    hideFinishForm();
    
    alert('Laundry berhasil diselesaikan!');
    finishIndex = null;
}

// Search Functions
function performSearch(type) {
    const searchInput = type === 'onprogress' ? 
        document.getElementById('searchOnProgress') : 
        document.getElementById('searchFinished');
    
    const searchTerm = searchInput.value.toLowerCase();
    
    if (type === 'onprogress') {
        if (searchTerm === '') {
            renderOnProgressTable();
        } else {
            const filteredData = onProgressData.filter(item => 
                item.nomorNota.toLowerCase().includes(searchTerm) ||
                item.namaPelanggan.toLowerCase().includes(searchTerm) ||
                item.jenisLaundry.toLowerCase().includes(searchTerm)
            );
            renderFilteredTable(filteredData, 'onProgressTable', 10);
        }
    } else {
        if (searchTerm === '') {
            renderFinishedTable();
        } else {
            const filteredData = finishedData.filter(item =>
                item.nomorNota.toLowerCase().includes(searchTerm) ||
                item.namaPelanggan.toLowerCase().includes(searchTerm) ||
                item.jenisLaundry.toLowerCase().includes(searchTerm)
            );
            renderFilteredTable(filteredData, 'finishedTable', 12);
        }
    }
}

function renderFilteredTable(data, tableId, colspan) {
    const tbody = document.getElementById(tableId);
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">Data tidak ditemukan</td></tr>`;
        return;
    }

    if (tableId === 'onProgressTable') {
        tbody.innerHTML = data.map(item => {
            const originalIndex = onProgressData.indexOf(item);
            let paymentDisplay = '<span class="payment-status belum-bayar">BELUM BAYAR</span>';
            if (item.payment && item.payment !== 'none') {
                paymentDisplay = `<span class="jenis-badge">${item.payment.toUpperCase()}</span>`;
            }
            
            return `
                <tr>
                    <td><span class="nota-code">${item.uid}</span></td>
                    <td><span class="nota-code">${item.nomorNota}</span></td>
                    <td>${item.namaPelanggan}</td>
                    <td>${formatDate(item.tanggalTerima)}</td>
                    <td>${formatDate(item.tanggalSelesai)}</td>
                    <td><span class="jenis-badge">${item.jenisLaundry}</span></td>
                    <td>${item.jumlahKg} kg</td>
                    <td><span class="currency">${formatRupiah(item.harga)}</span></td>
                    <td>${paymentDisplay}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon print" onclick="showReceiptModal(onProgressData[${originalIndex}])" title="Cetak">
                                <i class="fas fa-print"></i>
                            </button>
                            <button class="btn-icon edit" onclick="editData(${originalIndex})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon finish" onclick="showFinishForm(${originalIndex})" title="Selesai">
                                <i class="fas fa-check"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        tbody.innerHTML = data.map(item => `
            <tr>
                <td><span class="nota-code">${item.uid}</span></td>
                <td><span class="nota-code">${item.nomorNota}</span></td>
                <td>${item.namaPelanggan}</td>
                <td>${formatDate(item.tanggalTerima)}</td>
                <td>${formatDate(item.tanggalSelesai)}</td>
                <td><span class="jenis-badge">${item.jenisLaundry}</span></td>
                <td>${item.jumlahKg} kg</td>
                <td>${formatDate(item.tanggalAmbil)}</td>
                <td>${formatDate(item.tanggalBayar)}</td>
                <td><span class="jenis-badge">${item.metodePembayaran?.toUpperCase()}</span></td>
                <td><span class="currency">${formatRupiah(item.harga)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon print" onclick="showReceiptModal(finishedData.find(x => x.uid === '${item.uid}'))" title="Cetak">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

// ===============================
// Auto Sync Berkala - TAMBAHAN
// ===============================
setInterval(function() {
    syncDataToAdmin();
}, 10000); // Sync setiap 10 detik

// Event listener untuk perubahan data di tab lain
window.addEventListener('storage', function(e) {
    if (e.key && (e.key.startsWith('onProgressData_') || e.key.startsWith('finishedData_'))) {
        console.log('Storage changed, syncing data to admin...');
        syncDataToAdmin();
    }
});