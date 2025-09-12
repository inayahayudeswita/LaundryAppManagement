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
// Table Rendering
// ===============================
function renderOnProgressTable() {
    const tbody = document.getElementById('onProgressTable');
    
    if (onProgressData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Tidak ada data on progress</td></tr>';
        return;
    }

    tbody.innerHTML = onProgressData.map((item, index) => `
        <tr>
            <td><span class="nota-code">${item.uid}</span></td>
            <td><span class="nota-code">${item.nomorNota}</span></td>
            <td>${item.namaPelanggan}</td>
            <td>${formatDate(item.tanggalTerima)}</td>
            <td>${formatDate(item.tanggalSelesai)}</td>
            <td><span class="jenis-badge">${item.jenisLaundry}</span></td>
            <td>${item.jumlahKg} kg</td>
            <td><span class="currency">${formatRupiah(item.harga)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon edit" onclick="editData(${index})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon finish" onclick="showFinishForm(${index})" title="Selesai"><i class="fas fa-check"></i></button>
                    <button class="btn-icon delete" onclick="deleteData(${index})" title="Hapus"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
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
                <button class="btn-icon delete" onclick="deleteFinishedData('${item.uid}')" title="Hapus"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// ===============================
// Form Management
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
}

function saveData() {
    const nomorNota = document.getElementById('nomorNota').value;
    const namaPelanggan = document.getElementById('namaPelanggan').value;
    const tanggalTerima = document.getElementById('tanggalTerima').value;
    const tanggalSelesai = document.getElementById('tanggalSelesai').value;
    const jenisLaundry = document.getElementById('jenisLaundry').value;
    const jumlahKg = parseFloat(document.getElementById('jumlahKg').value);
    const harga = parseInt(document.getElementById('harga').value);

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

function deleteFinishedData(uid) {
    if (confirm('Yakin hapus data ini?')) {
        finishedData = finishedData.filter(item => item.uid !== uid);
        saveDataLocal();
        updateCounts();
        renderFinishedTable();
    }
}

// ===============================
// Finish Management
// ===============================
function showFinishForm(index) {
    finishIndex = index;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('finishTanggalAmbil').value = today;
    document.getElementById('finishTanggalBayar').value = today;
    document.getElementById('finishNamaSetrika').value = '';
    
    document.querySelectorAll('.payment-option').forEach(option => option.classList.remove('selected'));
    document.querySelectorAll('input[name="payment"]').forEach(input => input.checked = false);
    
    document.getElementById('finishModal').classList.add('show');
}

function hideFinishForm() {
    document.getElementById('finishModal').classList.remove('show');
}

function selectPayment(method) {
    document.querySelectorAll('.payment-option').forEach(option => option.classList.remove('selected'));
    document.querySelectorAll('input[name="payment"]').forEach(input => input.checked = false);
    
    event.currentTarget.classList.add('selected');
    document.querySelector(`input[value="${method}"]`).checked = true;
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
    
    saveDataLocal();
    updateCounts();
    renderOnProgressTable();
    renderFinishedTable();
    hideFinishForm();
    alert('Laundry berhasil diselesaikan!');
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
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Data tidak ditemukan</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((item, index) => {
        const originalIndex = onProgressData.indexOf(item);
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

// ===============================
// Export Functions
// ===============================
function getTableData() {
    const rows = document.querySelectorAll("#finishedTable tr");
    const data = [];
    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length > 0) {
            data.push(Array.from(cols).slice(1, 12).map(td => td.innerText)); 
        }
    });
    return data;
}

const headers = [
    "No. Nota", "Pelanggan", "Tgl Terima", "Tgl Selesai",
    "Jenis", "Kg", "Tgl Ambil", "Tgl Bayar",
    "Pembayaran", "Nama Setrika", "Harga"
];

function exportExcel() {
    if (finishedData.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
    }

    const tableData = getTableData();
    const sheetData = [
        [`Laporan Data Laundry Finished - ${CABANG}`],
        headers,
        ...tableData
    ];

    const totalHarga = finishedData.reduce((sum, item) => {
        return sum + parseInt(item.harga);
    }, 0);

    sheetData.push([
        "TOTAL", "", "", "", "", "", "", "", "", "", `Rp ${totalHarga.toLocaleString()}`
    ]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    const fileName = `laporan_${CABANG.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

function exportCSV() {
    if (finishedData.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
    }

    const tableData = getTableData();
    let csvContent = `Laporan Data Laundry Finished - ${CABANG}\n`;
    csvContent += headers.join(",") + "\n";

    let totalHarga = 0;
    tableData.forEach(row => {
        let harga = parseInt(row[10]?.replace(/\D/g, "")) || 0;
        totalHarga += harga;
        csvContent += row.join(",") + "\n";
    });

    csvContent += ["TOTAL", "", "", "", "", "", "", "", "", "", `Rp ${totalHarga.toLocaleString()}`].join(",");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const fileName = `laporan_${CABANG.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.download = fileName;
    link.click();
}

function toggleExportDropdown() {
    const dropdown = document.getElementById("exportDropdown");
    dropdown.classList.toggle("show");
}

// ===============================
// Event Listeners
// ===============================
document.addEventListener('click', function(event) {
    if (!event.target.closest('.export-dropdown')) {
        document.getElementById('exportDropdown').classList.remove('show');
    }
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
});

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function checkAuth() {
    if (!sessionStorage.getItem('currentUser')) {
        window.location.href = 'login.html';
    }
}