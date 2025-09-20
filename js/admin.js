// ===============================
// Global Variables
// ===============================
let allData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 50;

// Service pricing data
let servicesData = [];
let tableVisible = false;

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
document.addEventListener('DOMContentLoaded', async function() {
    checkAuth();
    await loadServicePricing(); 
    await loadData();         
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
// Service Pricing Management
// ===============================

// Load all services with their prices from database
async function loadServicePricing() {
    try {
        const response = await fetch('backend/get_services.php');
        const result = await response.json();
        
        if (!result.success) {
            console.error('Failed to load services:', result.message);
            alert('Gagal memuat data layanan: ' + result.message);
            return;
        }
        
        servicesData = result.services || [];
        renderServiceTable();
        updatePricingStats();
        
    } catch (error) {
        console.error('Error loading services:', error);
        alert('Terjadi kesalahan saat memuat data layanan');
    }
}

// Render service pricing table
function renderServiceTable() {
    const tbody = document.getElementById('serviceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (servicesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Belum ada layanan yang terdaftar</td></tr>';
        return;
    }

    servicesData.forEach(service => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${service.service_name}</strong></td>
            <td>
                <input type="number" 
                       class="price-input" 
                       value="${service.prices['Regular'] || 0}" 
                       onchange="updateServicePrice(${service.id}, 'Regular', this.value)"
                       placeholder="0">
            </td>
            <td>
                <input type="number" 
                       class="price-input" 
                       value="${service.prices['Exp 2 Hari'] || 0}" 
                       onchange="updateServicePrice(${service.id}, 'Exp 2 Hari', this.value)"
                       placeholder="0">
            </td>
            <td>
                <input type="number" 
                       class="price-input" 
                       value="${service.prices['Exp 1 Hari'] || 0}" 
                       onchange="updateServicePrice(${service.id}, 'Exp 1 Hari', this.value)"
                       placeholder="0">
            </td>
            <td>
                <input type="number" 
                       class="price-input" 
                       value="${service.prices['Exp 6 Jam'] || 0}" 
                       onchange="updateServicePrice(${service.id}, 'Exp 6 Jam', this.value)"
                       placeholder="0">
            </td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteService(${service.id})" title="Hapus Layanan">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Update service price
async function updateServicePrice(serviceId, categoryName, newPrice) {
    const price = parseInt(newPrice) || 0;
    
    try {
        const response = await fetch('backend/update_service_price.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                service_id: serviceId, 
                category_name: categoryName, 
                price: price 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update local data
            const serviceIndex = servicesData.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                servicesData[serviceIndex].prices[categoryName] = price;
                updatePricingStats();
            }
            console.log('Price updated successfully');
        } else {
            alert('Gagal mengupdate harga: ' + result.message);
            // Reload to get correct values
            loadServicePricing();
        }
    } catch (error) {
        console.error('Error updating price:', error);
        alert('Terjadi kesalahan saat mengupdate harga');
        loadServicePricing();
    }
}

// Update pricing statistics
function updatePricingStats() {
    const serviceCountEl = document.getElementById('serviceCount');
    const avgPriceEl = document.getElementById('avgPrice');
    
    if (serviceCountEl) {
        serviceCountEl.textContent = servicesData.length;
    }
    
    if (avgPriceEl && servicesData.length > 0) {
        let totalRegular = 0;
        let countRegular = 0;
        
        servicesData.forEach(service => {
            const regularPrice = service.prices['Regular'];
            if (regularPrice && regularPrice > 0) {
                totalRegular += regularPrice;
                countRegular++;
            }
        });
        
        const avgPrice = countRegular > 0 ? Math.round(totalRegular / countRegular) : 0;
        avgPriceEl.textContent = formatRupiah(avgPrice);
    }
}

// Toggle pricing table visibility
function togglePricingTable() {
    const container = document.getElementById('pricingTableContainer');
    const toggleIcon = document.getElementById('pricingToggle');
    
    if (!container || !toggleIcon) return;
    
    tableVisible = !tableVisible;
    
    if (tableVisible) {
        container.style.display = 'block';
        toggleIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
    } else {
        container.style.display = 'none';
        toggleIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }
}

// Modal functions for adding new service
function openAddServiceModal() {
    const modal = document.getElementById('addServiceModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeAddServiceModal() {
    const modal = document.getElementById('addServiceModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('addServiceForm').reset();
    }
}

// Handle add service form submission
document.addEventListener('DOMContentLoaded', function() {
    const addServiceForm = document.getElementById('addServiceForm');
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const serviceData = {
                service_name: formData.get('service_name'),
                regular: parseInt(formData.get('regular')) || 0,
                exp2: parseInt(formData.get('exp2')) || 0,
                exp1: parseInt(formData.get('exp1')) || 0,
                exp6: parseInt(formData.get('exp6')) || 0
            };
            
            try {
                const response = await fetch('backend/save_service.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(serviceData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Layanan berhasil ditambahkan!');
                    closeAddServiceModal();
                    loadServicePricing(); // Reload data
                } else {
                    alert('Gagal menambahkan layanan: ' + result.message);
                }
            } catch (error) {
                console.error('Error adding service:', error);
                alert('Terjadi kesalahan saat menambahkan layanan');
            }
        });
    }
});

// Delete service function
async function deleteService(serviceId) {
    if (!confirm('Apakah Anda yakin ingin menghapus layanan ini?')) {
        return;
    }
    
    try {
        const response = await fetch('backend/delete_service.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ service_id: serviceId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Layanan berhasil dihapus!');
            loadServicePricing(); // Reload data
        } else {
            alert('Gagal menghapus layanan: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        alert('Terjadi kesalahan saat menghapus layanan');
    }
}

// Public functions for getting service prices (used by kasir)
function getServicePrices() {
    const prices = {};
    servicesData.forEach(service => {
        prices[service.service_name] = service.prices['Regular'] || 0;
    });
    return prices;
}

function getServicePrice(serviceName) {
    const service = servicesData.find(s => s.service_name === serviceName);
    return service ? (service.prices['Regular'] || 0) : 0;
}

// Get price by service name and category
function getServicePriceByCategory(serviceName, category) {
    const service = servicesData.find(s => s.service_name === serviceName);
    return service ? (service.prices[category] || 0) : 0;
}

// ===============================
// Data Management - FETCH FROM DATABASE
// ===============================
async function loadData() {
    try {
        console.log('Loading data from database...');
        const response = await fetch('backend/get_orders.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            console.error('Failed to load data:', result.message);
            allData = [];
            alert('Gagal memuat data: ' + result.message);
            return;
        }
        
        // Transform data dari database ke format yang dibutuhkan admin
        allData = result.data.map(function(item) {
            return {
                uid: item.uid,
                nomorNota: item.nomorNota,
                namaPelanggan: item.namaPelanggan,
                cabang: item.cabang || 'Unknown',
                status: item.status === 'finished' ? 'Finished' : 'On Progress',
                tanggalTerima: item.tanggalTerima,
                tanggalSelesai: item.tanggalSelesai,
                jenisLaundry: (item.serviceName || 'Unknown Service') + 
                             (item.categoryName ? ' - ' + item.categoryName : ''),
                jumlahKg: parseFloat(item.jumlahKg) || 0,
                harga: parseInt(item.harga) || 0,
                tanggalAmbil: item.tanggalAmbil || '-',
                tanggalBayar: item.tanggalBayar || '-',
                metodePembayaran: (item.payment && item.payment !== 'none') ? item.payment : 'belum bayar',
                payment: item.payment,
                createdAt: item.createdAt,
                finishedAt: item.finishedAt,
                serviceId: item.serviceId,
                categoryId: item.categoryId
            };
        });
        
        console.log('Data loaded from database:', allData.length, 'items');
        
        // Log sample data untuk debugging
        if (allData.length > 0) {
            console.log('Sample data:', allData[0]);
        }
        
    } catch (error) {
        console.error('Error loading data from database:', error);
        allData = [];
        alert('Gagal memuat data dari database: ' + error.message);
    }
}

// ===============================
// Statistics - UPDATED
// ===============================
function updateStats() {
    console.log('Updating stats with data:', allData.length, 'items');
    
    const totalRevenue = allData
        .filter(function(item) { return item.status === 'Finished'; })
        .reduce(function(sum, item) { return sum + parseInt(item.harga); }, 0);
    
    const totalTransactions = allData.length;
    const onProgressCount = allData.filter(function(item) { return item.status === 'On Progress'; }).length;
    const finishedCount = allData.filter(function(item) { return item.status === 'Finished'; }).length;
    
    // Update revenue display
    const revenueElement = document.getElementById('totalRevenue');
    if (revenueElement) {
        revenueElement.textContent = formatRupiah(totalRevenue);
    }
    
    // Update other stats if elements exist
    const totalTransElement = document.getElementById('totalTransactions');
    if (totalTransElement) {
        totalTransElement.textContent = totalTransactions;
    }
    
    const onProgressElement = document.getElementById('onProgressCount');
    if (onProgressElement) {
        onProgressElement.textContent = onProgressCount;
    }
    
    const finishedElement = document.getElementById('finishedCount');
    if (finishedElement) {
        finishedElement.textContent = finishedCount;
    }
    
    console.log('Stats updated:', {
        totalRevenue: formatRupiah(totalRevenue),
        totalTransactions,
        onProgressCount,
        finishedCount
    });
}

// ===============================
// Filters
// ===============================
function applyFilters() {
    const selectedCabang = document.getElementById('filterCabang') ? document.getElementById('filterCabang').value : '';
    const selectedStatus = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : '';
    const selectedPeriod = document.getElementById('filterPeriod') ? document.getElementById('filterPeriod').value : 'all';
    const searchTerm = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
    
    filteredData = allData.filter(function(item) {
        if (selectedCabang && item.cabang !== selectedCabang) return false;
        
        if (selectedStatus === 'progress' && item.status !== 'On Progress') return false;
        if (selectedStatus === 'finished' && item.status !== 'Finished') return false;
        
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
        
        if (searchTerm) {
            const searchFields = [
                item.nomorNota || '',
                item.namaPelanggan || '',
                item.jenisLaundry || '',
                item.cabang || '',
                item.uid || ''
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
    const filterCabang = document.getElementById('filterCabang');
    const filterStatus = document.getElementById('filterStatus');
    const filterPeriod = document.getElementById('filterPeriod');
    const searchInput = document.getElementById('searchInput');
    
    if (filterCabang) filterCabang.value = '';
    if (filterStatus) filterStatus.value = '';
    if (filterPeriod) filterPeriod.value = 'all';
    if (searchInput) searchInput.value = '';
    
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
    if (!tbody) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="empty-state">Tidak ada data untuk ditampilkan</td></tr>';
        const dataCount = document.getElementById('dataCount');
        if (dataCount) dataCount.textContent = 'Total: 0 data';
        return;
    }
    
    tbody.innerHTML = pageData.map(function(item) {
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
            '<td><span class="nota-code">' + (item.nomorNota || '-') + '</span></td>' +
            '<td>' + (item.namaPelanggan || '-') + '</td>' +
            '<td><span class="cabang-badge">' + (item.cabang || '-') + '</span></td>' +
            '<td><span class="status-badge ' + (item.status === 'Finished' ? 'finished' : 'progress') + '">' + item.status + '</span></td>' +
            '<td>' + formatDate(item.tanggalTerima) + '</td>' +
            '<td>' + formatDate(item.tanggalSelesai) + '</td>' +
            '<td><span class="jenis-badge">' + (item.jenisLaundry || '-') + '</span></td>' +
            '<td>' + (item.jumlahKg || 0) + ' kg</td>' +
            '<td>' + (item.tanggalAmbil !== '-' ? formatDate(item.tanggalAmbil) : '-') + '</td>' +
            '<td>' + (item.tanggalBayar !== '-' ? formatDate(item.tanggalBayar) : '-') + '</td>' +
            '<td>' + paymentDisplay + '</td>' +
            '<td><span class="currency">' + formatRupiah(item.harga || 0) + '</span></td>' +
        '</tr>';
    }).join('');
    
    const dataCount = document.getElementById('dataCount');
    if (dataCount) dataCount.textContent = 'Total: ' + filteredData.length + ' data';
}

// ===============================
// Pagination
// ===============================
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginationContainer = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (!paginationContainer || !paginationInfo) return;
    
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);
    paginationInfo.textContent = 'Menampilkan ' + startItem + '-' + endItem + ' dari ' + filteredData.length + ' data';
    
    let paginationHTML = '';
    
    if (currentPage > 1) {
        paginationHTML += '<button class="page-btn" onclick="goToPage(' + (currentPage - 1) + ')"><i class="fas fa-chevron-left"></i></button>';
    }
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += '<button class="page-btn ' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
    }
    
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
// Export Functions
// ===============================
function exportExcel() {
    if (filteredData.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
    }
    
    const excelData = filteredData.map(function(item) {
        let paymentExport = 'BELUM BAYAR';
        if (item.metodePembayaran && item.metodePembayaran !== 'belum-bayar' && item.metodePembayaran !== '-') {
            paymentExport = item.metodePembayaran;
        }
        
        return {
            'No. Nota': item.nomorNota || '-',
            'Pelanggan': item.namaPelanggan || '-',
            'Cabang': item.cabang || '-',
            'Status': item.status || '-',
            'Tgl Terima': item.tanggalTerima || '-',
            'Tgl Selesai': item.tanggalSelesai || '-',
            'Jenis': item.jenisLaundry || '-',
            'Kg': item.jumlahKg || 0,
            'Tgl Ambil': item.tanggalAmbil !== '-' ? item.tanggalAmbil : '',
            'Tgl Bayar': item.tanggalBayar !== '-' ? item.tanggalBayar : '',
            'Pembayaran': paymentExport,
            'Harga': item.harga || 0
        };
    });
    
    const onProgressCount = filteredData.filter(function(item) { return item.status === 'On Progress'; }).length;
    const finishedCount = filteredData.filter(function(item) { return item.status === 'Finished'; }).length;
    
    const totalHarga = filteredData
        .filter(function(item) { return item.status === 'Finished'; })
        .reduce(function(sum, item) { return sum + parseInt(item.harga || 0); }, 0);

    const totalBelumBayar = filteredData
        .filter(function(item) { return !item.metodePembayaran || item.metodePembayaran === 'belum bayar' || item.metodePembayaran === '-'; })
        .reduce(function(sum, item) { return sum + parseInt(item.harga || 0); }, 0);
    
    // Add summary
    excelData.push({}, {
        'No. Nota': 'RINGKASAN LAPORAN'
    }, {
        'No. Nota': 'Total On Progress',
        'Pelanggan': onProgressCount
    }, {
        'No. Nota': 'Total Finished',
        'Pelanggan': finishedCount
    }, {
        'No. Nota': 'TOTAL BELUM BAYAR',
        'Harga': totalBelumBayar
    }, {
        'No. Nota': 'TOTAL PENDAPATAN',
        'Harga': totalHarga
    });
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Admin');
    
    const fileName = 'laporan_admin_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, fileName);
}

// ===============================
// Auto Refresh Data - UPDATED
// ===============================
setInterval(async function() {
    const prevDataLength = allData.length;
    await loadData();
    if (allData.length !== prevDataLength) {
        updateStats();
        applyFilters();
        console.log('Data refreshed automatically. New count:', allData.length);
    }
}, 30000); // Refresh every 30 seconds

// ===============================
// Global Functions
// ===============================
window.getServicePrices = getServicePrices;
window.getServicePrice = getServicePrice;
window.getServicePriceByCategory = getServicePriceByCategory;
window.togglePricingTable = togglePricingTable;
window.openAddServiceModal = openAddServiceModal;
window.closeAddServiceModal = closeAddServiceModal;