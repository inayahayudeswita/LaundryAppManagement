// ===============================
// Global Variables
// ===============================
let allData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 50;

// Default pricing
let servicePrices = {
    reg: 5000,
    exp1h: 15000,
    exp2h: 12000,
    cl: 7000,
    set: 3000,
    sat: 10000
};

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
    loadPricing();
    loadData();
    updateStats();
    updatePricingStats();
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
// Pricing Management
// ===============================
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseNumber(str) {
    return parseInt(str.replace(/\./g, "")) || 0;
}

function loadPricing() {
    const savedPrices = localStorage.getItem('servicePrices');
    if (savedPrices) {
        servicePrices = JSON.parse(savedPrices);
    }
    
    // Update input values pakai format ribuan
    Object.keys(servicePrices).forEach(service => {
        const input = document.getElementById('price-' + service);
        if (input) {
            input.value = formatNumber(servicePrices[service]);
        }
    });
}

function savePrice(service) {
    const input = document.getElementById('price-' + service);
    const price = parseNumber(input.value);
    
    servicePrices[service] = price;
    localStorage.setItem('servicePrices', JSON.stringify(servicePrices));
    
    updatePricingStats();
    
    // Show success message
    const currentButton = event.target.closest('.btn-save-price');
    const originalText = currentButton.innerHTML;
    currentButton.innerHTML = '<i class="fas fa-check"></i> Tersimpan';
    currentButton.style.background = '#28a745';
    
    setTimeout(function() {
        currentButton.innerHTML = originalText;
        currentButton.style.background = '#28a745';
    }, 2000);
}

function saveAllPrices() {
    const services = ['reg', 'exp1h', 'exp2h', 'cl', 'set', 'sat'];
    
    services.forEach(function(service) {
        const input = document.getElementById('price-' + service);
        const price = parseNumber(input.value);
        servicePrices[service] = price;
    });
    
    localStorage.setItem('servicePrices', JSON.stringify(servicePrices));
    updatePricingStats();
    
    // Show success message
    alert('Semua harga berhasil disimpan!');
}

function togglePricingTable() {
    const container = document.getElementById('pricingTableContainer');
    const toggle = document.getElementById('pricingToggle');
    
    if (container.style.display === 'none' || !container.style.display) {
        container.style.display = 'block';
        toggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
    } else {
        container.style.display = 'none';
        toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }
}

function updatePricingStats() {
    const prices = Object.values(servicePrices);
    const avgPrice = prices.reduce(function(sum, price) { return sum + price; }, 0) / prices.length;
    
    document.getElementById('avgPrice').textContent = formatRupiah(avgPrice);
}

// Tambahkan auto-format saat user ketik di input harga
document.querySelectorAll("input[id^='price-']").forEach(input => {
    input.addEventListener("input", function() {
        let cursorPos = this.selectionStart;
        let value = this.value.replace(/\./g, ""); // hapus titik lama
        if (!isNaN(value) && value !== "") {
            this.value = formatNumber(value);
        } else {
            this.value = "";
        }
        this.setSelectionRange(cursorPos, cursorPos); // biar kursor gak loncat
    });
});

// ===============================
// Public function to get prices (untuk digunakan di form kasir)
// ===============================
function getServicePrices() {
    return servicePrices;
}

function getServicePrice(service) {
    return servicePrices[service] || 0;
}

// ===============================
// Data Management - DIPERBAIKI
// ===============================
function loadData() {
    // Ambil data dari storage global yang disimpan oleh kasir
    const onProgressData = JSON.parse(localStorage.getItem('allOnProgressData') || '[]');
    const finishedData = JSON.parse(localStorage.getItem('allFinishedData') || '[]');
    
    // Gabungkan data dengan menambahkan status - DIPERBAIKI untuk payment
    const onProgressWithStatus = onProgressData.map(function(item) {
        return {
            ...item,
            status: 'On Progress',
            tanggalAmbil: '-',
            tanggalBayar: '-',
            metodePembayaran: item.payment && item.payment !== 'none' ? item.payment : 'belum bayar',
            namaSetrika: '-'
        };
    });
    
    const finishedWithStatus = finishedData.map(function(item) {
        return {
            ...item,
            status: 'Finished'
        };
    });
    
    // Gabungkan semua data
    allData = [...onProgressWithStatus, ...finishedWithStatus];
    
    console.log('Loaded data:', allData.length, 'items');
}

// ===============================
// Statistics
// ===============================
function updateStats() {
    const totalRevenue = allData
        .filter(function(item) { return item.status === 'Finished'; })
        .reduce(function(sum, item) { return sum + parseInt(item.harga); }, 0);
    
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
    
    filteredData = allData.filter(function(item) {
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
            ].map(function(field) { return field.toLowerCase(); });
            
            if (!searchFields.some(function(field) { return field.includes(searchTerm); })) return false;
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
// Table Rendering - DIPERBAIKI
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
    
    tbody.innerHTML = pageData.map(function(item) {
        // Format payment display untuk On Progress
       // Format payment display - DIPERBAIKI
let paymentDisplay = 'BELUM BAYAR';
if (item.status === 'On Progress') {
    if (item.payment && item.payment !== 'none') {
        paymentDisplay = item.payment.toUpperCase();
    }
} else if (item.status === 'Finished') {
    if (item.metodePembayaran && item.metodePembayaran !== 'belum bayar' && item.metodePembayaran !== '-') {
        paymentDisplay = item.metodePembayaran.toUpperCase();
    }
}

        
        return '<tr>' +
            '<td><span class="nota-code">' + item.nomorNota + '</span></td>' +
            '<td>' + item.namaPelanggan + '</td>' +
            '<td><span class="cabang-badge">' + item.cabang + '</span></td>' +
            '<td><span class="status-badge ' + (item.status === 'Finished' ? 'finished' : 'progress') + '">' + item.status + '</span></td>' +
            '<td>' + formatDate(item.tanggalTerima) + '</td>' +
            '<td>' + formatDate(item.tanggalSelesai) + '</td>' +
            '<td><span class="jenis-badge">' + item.jenisLaundry + '</span></td>' +
            '<td>' + item.jumlahKg + ' kg</td>' +
            '<td>' + (item.tanggalAmbil !== '-' ? formatDate(item.tanggalAmbil) : '-') + '</td>' +
            '<td>' + (item.tanggalBayar !== '-' ? formatDate(item.tanggalBayar) : '-') + '</td>' +
            '<td>' + paymentDisplay + '</td>' +
            '<td>' + (item.namaSetrika || '-') + '</td>' +
            '<td><span class="currency">' + formatRupiah(item.harga) + '</span></td>' +
        '</tr>';
    }).join('');
    
    document.getElementById('dataCount').textContent = 'Total: ' + filteredData.length + ' data';
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
    paginationInfo.textContent = 'Menampilkan ' + startItem + '-' + endItem + ' dari ' + filteredData.length + ' data';
    
    // Generate pagination
    let paginationHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += '<button class="page-btn" onclick="goToPage(' + (currentPage - 1) + ')"><i class="fas fa-chevron-left"></i></button>';
    }
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += '<button class="page-btn ' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += '<button class="page-btn" onclick="goToPage(' + (currentPage + 1) + ')"><i class="fas fa-chevron-right"></i></button>';
    }
    
    paginationContainer.innerHTML = paginationHTML;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
    updatePagination();
}

// ===============================
// Export Functions - DIPERBAIKI dengan logic tambahan
// ===============================
function exportExcel() {
    if (filteredData.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
    }
    
    // Prepare data for Excel
    const excelData = filteredData.map(function(item) {
        // Format payment untuk export - perbaiki logic
        let paymentExport = 'BELUM BAYAR';
        if (item.metodePembayaran && item.metodePembayaran !== 'belum-bayar' && item.metodePembayaran !== '-') {
            paymentExport = item.metodePembayaran;
        }
        
        return {
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
            'Pembayaran': paymentExport,
            'Nama Setrika': item.namaSetrika || '',
            'Harga': item.harga
        };
    });
    
    // LOGIC TAMBAHAN - Hitung statistik
    const onProgressCount = filteredData.filter(function(item) { return item.status === 'On Progress'; }).length;
    const finishedCount = filteredData.filter(function(item) { return item.status === 'Finished'; }).length;
    
    // Calculate total revenue (hanya dari finished)
    const totalHarga = filteredData
        .filter(function(item) { return item.status === 'Finished'; })
        .reduce(function(sum, item) { return sum + parseInt(item.harga); }, 0);

    // Calculate total belum bayar
    const totalBelumBayar = filteredData
        .filter(function(item) { return !item.metodePembayaran || item.metodePembayaran === 'belum bayar' || item.metodePembayaran === '-'; })
        .reduce(function(sum, item) { return sum + parseInt(item.harga); }, 0);
    
    // LOGIC NAMA SETRIKA - Hitung total kg per nama setrika
    const setrikaStats = {};
    filteredData
        .filter(function(item) { return item.status === 'Finished' && item.namaSetrika && item.namaSetrika !== '-'; })
        .forEach(function(item) {
            const nama = item.namaSetrika;
            if (!setrikaStats[nama]) {
                setrikaStats[nama] = 0;
            }
            setrikaStats[nama] += parseFloat(item.jumlahKg) || 0;
        });
    
    // Add summary rows
    excelData.push({
        'No. Nota': '',
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
        'Harga': ''
    });
    
    excelData.push({
        'No. Nota': 'RINGKASAN LAPORAN',
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
        'Harga': ''
    });
    
    excelData.push({
        'No. Nota': 'Total On Progress',
        'Pelanggan': onProgressCount ,
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
        'Harga': ''
    });
    
    excelData.push({
        'No. Nota': 'Total Finished',
        'Pelanggan': finishedCount ,
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
        'Harga': ''
    });

     excelData.push({
        'No. Nota': 'TOTAL BELUM BAYAR',
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
        'Harga': totalBelumBayar
    });
    
    
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
    
    // Add separator
    excelData.push({
        'No. Nota': '',
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
        'Harga': ''
    });
    
    excelData.push({
        'No. Nota': 'STATISTIK PETUGAS SETRIKA',
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
        'Harga': ''
    });
    
    // Add setrika stats
    Object.keys(setrikaStats).forEach(function(nama) {
        excelData.push({
            'No. Nota': nama,
            'Pelanggan': setrikaStats[nama] + ' kg',
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
            'Harga': ''
        });
    });
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Admin');
    
    const fileName = 'laporan_admin_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

// ===============================
// Auto Refresh Data
// ===============================
setInterval(function() {
    const prevDataLength = allData.length;
    loadData();
    if (allData.length !== prevDataLength) {
        updateStats();
        applyFilters();
        console.log('Data refreshed, found', allData.length, 'items');
    }
}, 5000); // Refresh setiap 5 detik

// ===============================
// Make pricing functions available globally
// ===============================
window.getServicePrices = getServicePrices;
window.getServicePrice = getServicePrice;