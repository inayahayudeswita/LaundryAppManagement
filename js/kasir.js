// ===============================
// Global Variables
// ===============================
let onProgressData = [];
let finishedData = [];
let editIndex = null;
let finishIndex = null;
let currentUser = null;
let CABANG = '';

// ===============================
// Initialize User & Branch
// ===============================
function initializeUser() {
    const userData = sessionStorage.getItem("currentUser");
    if (userData) {
        currentUser = JSON.parse(userData);
        CABANG = currentUser.branch || 'Unknown';
        
        document.getElementById('currentUser').textContent = currentUser.name || currentUser.username;
        document.getElementById('currentBranch').textContent = CABANG;
    } else {
        window.location.href = 'login.html';
    }
}

// ===============================
// Pricing Functions
// ===============================
function getServicePrices() {
    const savedPrices = localStorage.getItem('servicePrices');
    if (savedPrices) {
        return JSON.parse(savedPrices);
    }
    // Default pricing jika belum ada di localStorage
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

// ===============================
// Utility Functions
// ===============================
function generateUID() {
    return 'UID-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
}

function formatRupiah(amount) {
    return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID');
}

// ===============================
// Initialize App
// ===============================
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
    
    // Add event listeners for price calculation
    document.getElementById('jenisLaundry').addEventListener('change', calculatePrice);
    document.getElementById('jumlahKg').addEventListener('input', calculatePrice);
});

// ===============================
// Data Management
// ===============================
function loadData() {
    const onProgressKey = `onProgressData_${CABANG}`;
    const finishedKey = `finishedData_${CABANG}`;
    
    const savedOnProgress = localStorage.getItem(onProgressKey);
    const savedFinished = localStorage.getItem(finishedKey);
    
    if (savedOnProgress) onProgressData = JSON.parse(savedOnProgress);
    if (savedFinished) finishedData = JSON.parse(savedFinished);

    saveToGlobalStorage();
}

function saveDataLocal() {
    const onProgressKey = `onProgressData_${CABANG}`;
    const finishedKey = `finishedData_${CABANG}`;
    
    localStorage.setItem(onProgressKey, JSON.stringify(onProgressData));
    localStorage.setItem(finishedKey, JSON.stringify(finishedData));
    
    saveToGlobalStorage();
}

function saveToGlobalStorage() {
    let allOnProgress = [];
    let allFinished = [];
    
    const branches = ['Cabang 1', 'Cabang 2'];
    
    branches.forEach(branch => {
        const branchOnProgress = JSON.parse(localStorage.getItem(`onProgressData_${branch}`) || '[]');
        const branchFinished = JSON.parse(localStorage.getItem(`finishedData_${branch}`) || '[]');
        
        allOnProgress = allOnProgress.concat(branchOnProgress);
        allFinished = allFinished.concat(branchFinished);
    });
    
    localStorage.setItem('allOnProgressData', JSON.stringify(allOnProgress));
    localStorage.setItem('allFinishedData', JSON.stringify(allFinished));
}

// ===============================
// Tab Management
// ===============================
function switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// ===============================
// Count Management
// ===============================
function updateCounts() {
    document.getElementById('onProgressCount').textContent = onProgressData.length;
    document.getElementById('finishedCount').textContent = finishedData.length;
}

// ===============================
// Payment Management Functions - DIPERBAIKI
// ===============================
function selectPayment(method, context) {
    // Reset semua pilihan payment dulu
    if (context === 'form') {
        // Reset untuk form modal
        const formOptions = document.querySelectorAll('#formModal .payment-option');
        const formRadios = document.querySelectorAll('input[name="formPayment"]');
        
        formOptions.forEach(option => option.classList.remove('selected'));
        formRadios.forEach(radio => radio.checked = false);
        
        // Set yang dipilih
        const selectedRadio = document.querySelector(`input[name="formPayment"][value="${method}"]`);
        if (selectedRadio) {
            selectedRadio.checked = true;
            selectedRadio.closest('.payment-option').classList.add('selected');
        }
    } else if (context === 'finish') {
        // Reset untuk finish modal
        const finishOptions = document.querySelectorAll('#finishModal .payment-option');
        const finishRadios = document.querySelectorAll('input[name="payment"]');
        
        finishOptions.forEach(option => option.classList.remove('selected'));
        finishRadios.forEach(radio => radio.checked = false);
        
        // Set yang dipilih
        const selectedRadio = document.querySelector(`input[name="payment"][value="${method}"]`);
        if (selectedRadio) {
            selectedRadio.checked = true;
            selectedRadio.closest('.payment-option').classList.add('selected');
        }
    }
}

// ===============================
// Table Rendering - DIPERBAIKI
// ===============================
function renderOnProgressTable() {
    const tbody = document.getElementById('onProgressTable');
    
    if (onProgressData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Tidak ada data on progress</td></tr>';
        return;
    }

    tbody.innerHTML = onProgressData.map((item, index) => {
        // Fix payment status display
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
                        <button class="btn-icon edit" onclick="editData(${index})" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon finish" onclick="showFinishForm(${index})" title="Selesai"><i class="fas fa-check"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderFinishedTable() {
    const tbody = document.getElementById('finishedTable');
    
    if (finishedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="empty-state">Tidak ada data finished</td></tr>';
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
            <td>${item.namaSetrika || '-'}</td>
            <td><span class="currency">${formatRupiah(item.harga)}</span></td>
            <td>
                <button class="btn-icon edit" onclick="editFinishedData('${item.uid}')" title="Edit"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

// ===============================
// Form Management - DIPERBAIKI
// ===============================
function showForm() {
    document.getElementById('modalTitle').textContent = 'Tambah Data Laundry';
    document.getElementById('saveButtonText').textContent = 'Simpan';
    clearForm();
    document.getElementById('formModal').classList.add('show');
    editIndex = null;
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
    
    // Reset payment options - Default ke "Belum Bayar"
    const formOptions = document.querySelectorAll('#formModal .payment-option');
    const formRadios = document.querySelectorAll('input[name="formPayment"]');
    
    formOptions.forEach(option => option.classList.remove('selected'));
    formRadios.forEach(radio => radio.checked = false);
    
    // Set default "none" (Belum Bayar)
    const noneOption = document.querySelector('#formModal .payment-option');
    const noneRadio = document.querySelector('input[name="formPayment"][value="none"]');
    if (noneRadio) {
        noneRadio.checked = true;
        noneOption.classList.add('selected');
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

    // Get payment info - DIPERBAIKI
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
        payment, // Pastikan payment selalu tersimpan
        cabang: CABANG,
        createdAt: editIndex !== null ? onProgressData[editIndex].createdAt : new Date().toISOString()
    };

    if (editIndex !== null) {
        onProgressData[editIndex] = data;
        editIndex = null;
    } else {
        onProgressData.push(data);
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
    
    // Reset semua payment options dulu
    const formOptions = document.querySelectorAll('#formModal .payment-option');
    const formRadios = document.querySelectorAll('input[name="formPayment"]');
    
    formOptions.forEach(option => option.classList.remove('selected'));
    formRadios.forEach(radio => radio.checked = false);
    
    // Set payment data yang ada
    const paymentValue = data.payment || 'none';
    const paymentRadio = document.querySelector(`input[name="formPayment"][value="${paymentValue}"]`);
    if (paymentRadio) {
        paymentRadio.checked = true;
        paymentRadio.closest('.payment-option').classList.add('selected');
    }
    
    editIndex = index;
    document.getElementById('formModal').classList.add('show');
}

function deleteData(index) {
    if (confirm('Yakin hapus data ini?')) {
        onProgressData.splice(index, 1);
        saveDataLocal();
        updateCounts();
        renderOnProgressTable();
    }
}

function editFinishedData(uid) {
    const item = finishedData.find(data => data.uid === uid);
    if (!item) return;

    // Isi modal dengan data lama
    document.getElementById('finishTanggalAmbil').value = item.tanggalAmbil || new Date().toISOString().split('T')[0];
    document.getElementById('finishTanggalBayar').value = item.tanggalBayar || new Date().toISOString().split('T')[0];
    document.getElementById('finishNamaSetrika').value = item.namaSetrika || '';

    // Reset payment options
    const finishOptions = document.querySelectorAll('#finishModal .payment-option');
    const finishRadios = document.querySelectorAll('input[name="payment"]');
    finishOptions.forEach(option => option.classList.remove('selected'));
    finishRadios.forEach(radio => radio.checked = false);

    // Set metode pembayaran lama
    if (item.metodePembayaran) {
        const paymentRadio = document.querySelector(`input[name="payment"][value="${item.metodePembayaran}"]`);
        if (paymentRadio) {
            paymentRadio.checked = true;
            paymentRadio.closest('.payment-option').classList.add('selected');
        }
    }

    // Simpan index editing
    finishIndex = finishedData.findIndex(data => data.uid === uid);

    // Tampilkan modal
    document.getElementById('finishModal').classList.add('show');
}


// ===============================
// Finish Management - DIPERBAIKI
// ===============================
function showPaymentInfo(paymentMethod) {
    // Remove existing payment info if any
    const existingInfo = document.querySelector('.payment-already-made-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Create info element
    const paymentGroup = document.querySelector('#finishModal .form-group:has([name="payment"])');
    const infoDiv = document.createElement('div');
    infoDiv.className = 'payment-already-made-info';
    infoDiv.innerHTML = `
        <div style="background: #d1fae5; color: #065f46; padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-size: 14px;">
            <i class="fas fa-check-circle"></i> Pembayaran sudah dilakukan via <strong>${paymentMethod.toUpperCase()}</strong>
        </div>
    `;
    
    if (paymentGroup) {
        paymentGroup.appendChild(infoDiv);
    }
}

function showFinishForm(index) {
    finishIndex = index;
    const data = onProgressData[index];
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('finishTanggalAmbil').value = today;
    document.getElementById('finishTanggalBayar').value = today;
    document.getElementById('finishNamaSetrika').value = '';
    
    // Reset semua payment options di finish modal
    const finishOptions = document.querySelectorAll('#finishModal .payment-option');
    const finishRadios = document.querySelectorAll('input[name="payment"]');
    
    finishOptions.forEach(option => {
        option.classList.remove('selected');
        option.classList.remove('disabled');
    });
    finishRadios.forEach(input => {
        input.checked = false;
        input.disabled = false;
    });
    
    // Hapus info pembayaran lama jika ada
    const existingInfo = document.querySelector('.payment-already-made-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Jika sudah ada pembayaran sebelumnya, set sebagai default
    if (data.payment && data.payment !== 'none') {
        const existingPaymentRadio = document.querySelector(`input[name="payment"][value="${data.payment}"]`);
        if (existingPaymentRadio) {
            existingPaymentRadio.checked = true;
            existingPaymentRadio.closest('.payment-option').classList.add('selected');
            
            // Tampilkan info bahwa pembayaran sudah dilakukan
            showPaymentInfo(data.payment);
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
    const namaSetrika = document.getElementById('finishNamaSetrika').value;

    if (!tanggalAmbil || !tanggalBayar || !metodePembayaran) {
        alert('Lengkapi field yang wajib diisi!');
        return;
    }

    if (finishIndex !== null && finishIndex < finishedData.length) {
        // EDIT FINISHED DATA
        finishedData[finishIndex] = {
            ...finishedData[finishIndex],
            tanggalAmbil,
            tanggalBayar,
            metodePembayaran,
            namaSetrika,
            updatedAt: new Date().toISOString()
        };
        alert('Data finished berhasil diperbarui!');
    } else {
        // PINDAH dari On Progress ke Finished
        const data = onProgressData[finishIndex];
        const finishedItem = { 
            ...data, 
            tanggalAmbil, 
            tanggalBayar, 
            metodePembayaran, 
            namaSetrika,
            finishedAt: new Date().toISOString()
        };
        
        finishedData.push(finishedItem);
        onProgressData.splice(finishIndex, 1);
        alert('Laundry berhasil diselesaikan!');
    }
    
    saveDataLocal();
    updateCounts();
    renderOnProgressTable();
    renderFinishedTable();
    hideFinishForm();
    finishIndex = null;
}


// ===============================
// Search Functions
// ===============================
function performSearch(type) {
    const searchInput = type === 'onprogress' ? 
        document.getElementById('searchOnProgress') : 
        document.getElementById('searchFinished');
    
    const searchTerm = searchInput.value.toLowerCase();
    
    if (type === 'onprogress') {
        const filteredData = onProgressData.filter(item => 
            item.nomorNota.toLowerCase().includes(searchTerm) ||
            item.namaPelanggan.toLowerCase().includes(searchTerm) ||
            item.jenisLaundry.toLowerCase().includes(searchTerm)
        );
        renderFilteredOnProgressTable(filteredData);
    } else {
        const filteredData = finishedData.filter(item =>
            item.nomorNota.toLowerCase().includes(searchTerm) ||
            item.namaPelanggan.toLowerCase().includes(searchTerm) ||
            item.jenisLaundry.toLowerCase().includes(searchTerm)
        );
        renderFilteredFinishedTable(filteredData);
    }
}

function renderFilteredOnProgressTable(data) {
    const tbody = document.getElementById('onProgressTable');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Data tidak ditemukan</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item, index) => {
        const originalIndex = onProgressData.indexOf(item);
        
        // Fix payment status display
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
                        <button class="btn-icon edit" onclick="editData(${originalIndex})"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon finish" onclick="showFinishForm(${originalIndex})"><i class="fas fa-check"></i></button>
                        <button class="btn-icon delete" onclick="deleteData(${originalIndex})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderFilteredFinishedTable(data) {
    const tbody = document.getElementById('finishedTable');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="empty-state">Data tidak ditemukan</td></tr>';
        return;
    }

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
            <td>${item.namaSetrika || '-'}</td>
            <td><span class="currency">${formatRupiah(item.harga)}</span></td>
            <td>
                <button class="btn-icon delete" onclick="deleteFinishedData('${item.uid}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}


function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function checkAuth() {
    if (!sessionStorage.getItem('currentUser')) {
        window.location.href = 'login.html';
    }
}