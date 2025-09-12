// ===============================
// Global Variables
// ===============================
let allData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 50;

// ===============================
// Utility Functions
// ===============================
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
    checkAuth();
    loadData();
    updateStats();
    applyFilters();
});

// ===============================
// Authentication
// ===============================
function checkAuth() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(currentUser);
    if (user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('adminName').textContent = user.name || user.username;
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// ===============================
// Data Management
// ===============================
function loadData() {
    // Ambil data dari storage global yang disimpan oleh kasir
    const onProgressData = JSON.parse(localStorage.getItem('allOnProgressData') || '[]');
    const finishedData = JSON.parse(localStorage.getItem('allFinishedData') || '[]');
    
    // Gabungkan data dengan menambahkan status
    const onProgressWithStatus = onProgressData.map(item => ({
        ...item,
        status: 'On Progress',
        tanggalAmbil: '-',
        tanggalBayar: '-',
        metodePembayaran: '-',
        namaSetrika: '-'
    }));
    
    const finishedWithStatus = finishedData.map(item => ({
        ...item,
        status: 'Finished'
    }));
    
    // Gabungkan semua data
    allData = [...onProgressWithStatus, ...finishedWithStatus];
    
    console.log('Loaded data:', allData.length, 'items');
}

// ===============================
// Statistics
// ===============================
function updateStats() {
    const totalRevenue = allData
        .filter(item => item.status === 'Finished')
        .reduce((sum, item) => sum + parseInt(item.harga), 0);
    
    document.getElementById('totalRevenue').textContent = formatRupiah(totalRevenue);
}

// ===============================
// Filters
// ===============================
function applyFilters() {
    const selectedCabang = document.getElementById('filterCabang').value;
    const selectedStatus = document.getElementById('filterStatus').value;
    const selectedPeriod = document.getElementById('filterPeriod').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredData = allData.filter(item => {
        // Filter cabang
        if (selectedCabang && item.cabang !== selectedCabang) return false;
        
        // Filter status
        if (selectedStatus === 'progress' && item.status !== 'On Progress') return false;
        if (selectedStatus === 'finished' && item.status !== 'Finished') return false;
        
        // Filter periode
        if (selectedPeriod !== 'all') {
            const itemDate = new Date(item.tanggalTerima);
            const now = new Date();
            
            switch (selectedPeriod) {
                case 'today':
                    if (itemDate.toDateString() !== now.toDateString()) return false;
                    break;
                case '7days':
                    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (itemDate < sevenDaysAgo) return false;
                    break;
                case '30days':
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (itemDate < thirtyDaysAgo) return false;
                    break;
                case 'thisMonth':
                    if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) return false;
                    break;
            }
        }
        
        // Filter search
        if (searchTerm) {
            const searchFields = [
                item.nomorNota || '',
                item.namaPelanggan || '',
                item.jenisLaundry || '',
                item.cabang || ''
            ].map(field => field.toLowerCase());
            
            if (!searchFields.some(field => field.includes(searchTerm))) return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    renderTable();
    updatePagination();
}

function resetFilters() {
    document.getElementById('filterCabang').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterPeriod').value = 'all';
    document.getElementById('searchInput').value = '';
    applyFilters();
}

function performSearch() {
    applyFilters();
}

// ===============================
// Table Rendering
// ===============================
function renderTable() {
    const tbody = document.getElementById('dataTable');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="empty-state">Tidak ada data untuk ditampilkan</td></tr>';
        document.getElementById('dataCount').textContent = 'Total: 0 data';
        return;
    }
    
    tbody.innerHTML = pageData.map(item => `
        <tr>
            <td><span class="nota-code">${item.nomorNota}</span></td>
            <td>${item.namaPelanggan}</td>
            <td><span class="cabang-badge">${item.cabang}</span></td>
            <td>
                <span class="status-badge ${item.status === 'Finished' ? 'finished' : 'progress'}">
                    ${item.status}
                </span>
            </td>
            <td>${formatDate(item.tanggalTerima)}</td>
            <td>${formatDate(item.tanggalSelesai)}</td>
            <td><span class="jenis-badge">${item.jenisLaundry}</span></td>
            <td>${item.jumlahKg} kg</td>
            <td>${item.tanggalAmbil !== '-' ? formatDate(item.tanggalAmbil) : '-'}</td>
            <td>${item.tanggalBayar !== '-' ? formatDate(item.tanggalBayar) : '-'}</td>
            <td>${item.metodePembayaran !== '-' ? item.metodePembayaran.toUpperCase() : '-'}</td>
            <td>${item.namaSetrika || '-'}</td>
            <td><span class="currency">${formatRupiah(item.harga)}</span></td>
        </tr>
    `).join('');
    
    document.getElementById('dataCount').textContent = `Total: ${filteredData.length} data`;
}

// ===============================
// Pagination
// ===============================
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginationContainer = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');
    
    // Update info
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);
    paginationInfo.textContent = `Menampilkan ${startItem}-${endItem} dari ${filteredData.length} data`;
    
    // Generate pagination
    let paginationHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>`;
    }
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" 
                          onclick="goToPage(${i})">${i}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>`;
    }
    
    paginationContainer.innerHTML = paginationHTML;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
    updatePagination();
}

// ===============================
// Export Functions
// ===============================
function exportCSV() {
    if (filteredData.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
    }
    
    const headers = [
        'No. Nota', 'Pelanggan', 'Cabang', 'Status', 'Tgl Terima', 'Tgl Selesai',
        'Jenis', 'Kg', 'Tgl Ambil', 'Tgl Bayar', 'Pembayaran', 'Nama Setrika', 'Harga'
    ];
    
    let csvContent = 'Laporan Data Laundry Admin\n';
    csvContent += headers.join(',') + '\n';
    
    let totalHarga = 0;
    
    filteredData.forEach(item => {
        const row = [
            item.nomorNota,
            item.namaPelanggan,
            item.cabang,
            item.status,
            item.tanggalTerima,
            item.tanggalSelesai,
            item.jenisLaundry,
            item.jumlahKg,
            item.tanggalAmbil !== '-' ? item.tanggalAmbil : '',
            item.tanggalBayar !== '-' ? item.tanggalBayar : '',
            item.metodePembayaran !== '-' ? item.metodePembayaran : '',
            item.namaSetrika || '',
            item.harga
        ];
        csvContent += row.join(',') + '\n';
        
        if (item.status === 'Finished') {
            totalHarga += parseInt(item.harga);
        }
    });
    
    // Tambahkan total pendapatan
    csvContent += `\nTotal Pendapatan,,,,,,,,,,,,"Rp ${totalHarga.toLocaleString()}"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `laporan_admin_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function exportExcel() {
    if (filteredData.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
    }
    
    // Prepare data for Excel
    const excelData = filteredData.map(item => ({
        'No. Nota': item.nomorNota,
        'Pelanggan': item.namaPelanggan,
        'Cabang': item.cabang,
        'Status': item.status,
        'Tgl Terima': item.tanggalTerima,
        'Tgl Selesai': item.tanggalSelesai,
        'Jenis': item.jenisLaundry,
        'Kg': item.jumlahKg,
        'Tgl Ambil': item.tanggalAmbil !== '-' ? item.tanggalAmbil : '',
        'Tgl Bayar': item.tanggalBayar !== '-' ? item.tanggalBayar : '',
        'Pembayaran': item.metodePembayaran !== '-' ? item.metodePembayaran : '',
        'Nama Setrika': item.namaSetrika || '',
        'Harga': item.harga
    }));
    
    // Calculate total revenue
    const totalHarga = filteredData
        .filter(item => item.status === 'Finished')
        .reduce((sum, item) => sum + parseInt(item.harga), 0);
    
    // Add summary row
    excelData.push({
        'No. Nota': 'TOTAL PENDAPATAN',
        'Pelanggan': '',
        'Cabang': '',
        'Status': '',
        'Tgl Terima': '',
        'Tgl Selesai': '',
        'Jenis': '',
        'Kg': '',
        'Tgl Ambil': '',
        'Tgl Bayar': '',
        'Pembayaran': '',
        'Nama Setrika': '',
        'Harga': totalHarga
    });
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Admin');
    
    const fileName = `laporan_admin_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ===============================
// Auto Refresh Data
// ===============================
setInterval(() => {
    const prevDataLength = allData.length;
    loadData();
    if (allData.length !== prevDataLength) {
        updateStats();
        applyFilters();
        console.log('Data refreshed, found', allData.length, 'items');
    }
}, 5000); // Refresh setiap 5 detik