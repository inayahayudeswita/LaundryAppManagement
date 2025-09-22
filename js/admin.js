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
let branchesData = [];

// ===============================
// LOAD BRANCHES FROM DATABASE
// ===============================
async function loadBranches() {
    try {
        const response = await fetch('backend/get_branches.php');
        const result = await response.json();
        
        if (!result.success) {
            console.error('Failed to load branches:', result.message);
            return;
        }
        
        branchesData = result.branches || [];
        console.log('Branches loaded:', branchesData);
        
        // Update filter dropdown
        populateBranchFilter();
        
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

// ===============================
// POPULATE BRANCH FILTER DROPDOWN
// ===============================
function populateBranchFilter() {
    const filterCabang = document.getElementById('filterCabang');
    if (!filterCabang) return;
    
    // Simpan nilai yang dipilih sebelumnya
    const currentValue = filterCabang.value;
    
    // Clear existing options
    filterCabang.innerHTML = '<option value="">Semua Cabang</option>';
    
    // Add branch options
    branchesData.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch;
        option.textContent = branch;
        filterCabang.appendChild(option);
    });
    
    // Restore previous selection if still valid
    if (currentValue && branchesData.includes(currentValue)) {
        filterCabang.value = currentValue;
    }
}

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

// Format Rupiah input function for forms
function formatRupiahInput(input) {
    let value = input.value.replace(/[^\d]/g, '');
    if (value) {
        value = parseInt(value).toLocaleString('id-ID');
    }
    input.value = value;
}

// Convert formatted rupiah back to number
function parseRupiahValue(formattedValue) {
    return parseInt(formattedValue.replace(/[^\d]/g, '')) || 0;
}

// ===============================
// Initialize App
// ===============================
document.addEventListener('DOMContentLoaded', async function() {
    checkAuth();
    await loadBranches();   
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

// Render service pricing table with Tailwind styling
function renderServiceTable() {
    const tbody = document.getElementById('serviceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (servicesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Belum ada layanan yang terdaftar</td></tr>';
        return;
    }

    servicesData.forEach(service => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';

        let priceCols = '';
        const categories = ["Regular", "Exp 2 Hari", "Exp 1 Hari", "Exp 6 Jam"];
        categories.forEach(cat => {
            const priceInfo = service.prices[cat];
            const priceVal = priceInfo && typeof priceInfo === 'object' ? priceInfo.price : (priceInfo || 0);
            const categoryId = priceInfo && typeof priceInfo === 'object' ? priceInfo.id : 0;

            priceCols += `
                <td class="py-3 px-4 border-b border-gray-100">
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-500 text-sm">Rp</span>
                        <input type="text" 
                               class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" 
                               value="${priceVal.toLocaleString('id-ID')}" 
                               onchange="updateServicePriceFormatted(${service.id}, ${categoryId}, this)"
                               oninput="formatRupiahInput(this)"
                               placeholder="0">
                    </div>
                </td>
            `;
        });

        tr.innerHTML = `
            <td class="py-3 px-4 border-b border-gray-100">
                <span class="font-medium text-gray-900">${service.service_name}</span>
            </td>
            ${priceCols}
            <td class="py-3 px-4 border-b border-gray-100">
                <button 
                    class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors duration-200" 
                    onclick="deleteService(${service.id})" 
                    title="Hapus Layanan">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Update service price with formatted input
async function updateServicePriceFormatted(serviceId, categoryId, inputElement) {
    try {
        const newPrice = parseRupiahValue(inputElement.value);
        const res = await fetch("backend/update_service_price.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceId, categoryId, price: newPrice })
        });
        const data = await res.json();
        if (!data.success) {
            alert("Gagal update harga: " + data.message);
            // Reset input value on error
            inputElement.value = "0";
        } else {
            // Refresh pricing stats after successful update
            await loadServicePricing();
        }
    } catch (err) {
        console.error("Error update harga:", err);
        alert("Terjadi kesalahan saat update harga");
        inputElement.value = "0";
    }
}

// Update service price (legacy function for compatibility)
async function updateServicePrice(serviceId, categoryId, newPrice) {
    try {
        const res = await fetch("backend/update_service_price.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceId, categoryId, price: parseInt(newPrice) || 0 })
        });
        const data = await res.json();
        if (!data.success) {
            alert("Gagal update harga: " + data.message);
        }
    } catch (err) {
        console.error("Error update harga:", err);
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
            const regularPriceInfo = service.prices['Regular'];
            const regularPrice = regularPriceInfo && typeof regularPriceInfo === 'object' ? 
                                regularPriceInfo.price : (regularPriceInfo || 0);
            
            if (regularPrice && regularPrice > 0) {
                totalRegular += regularPrice;
                countRegular++;
            }
        });
        
        const avgPrice = countRegular > 0 ? Math.round(totalRegular / countRegular) : 0;
        if (avgPrice >= 1000) {
            avgPriceEl.textContent = 'Rp ' + Math.round(avgPrice / 1000) + 'K';
        } else {
            avgPriceEl.textContent = formatRupiah(avgPrice);
        }
    }
}

// Toggle pricing table visibility
function togglePricingTable() {
    const container = document.getElementById('pricingTableContainer');
    const toggleIcon = document.getElementById('pricingToggle');
    
    if (!container || !toggleIcon) return;
    
    tableVisible = !tableVisible;
    
    if (tableVisible) {
        container.classList.remove('hidden');
        toggleIcon.innerHTML = '<i class="fas fa-chevron-up text-white"></i>';
    } else {
        container.classList.add('hidden');
        toggleIcon.innerHTML = '<i class="fas fa-chevron-down text-white"></i>';
    }
}

// Modal functions for adding new service
function openAddServiceModal() {
    const modal = document.getElementById('addServiceModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeAddServiceModal() {
    const modal = document.getElementById('addServiceModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('addServiceForm').reset();
    }
}

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
function getServicePrice(serviceName) {
    const service = servicesData.find(s => s.service_name === serviceName);
    if (!service) return 0;
    
    const regularPriceInfo = service.prices['Regular'];
    return regularPriceInfo && typeof regularPriceInfo === 'object' ? 
           regularPriceInfo.price : (regularPriceInfo || 0);
}

// Get price by service name and category
function getServicePriceByCategory(serviceName, category) {
    const service = servicesData.find(s => s.service_name === serviceName);
    if (!service) return 0;
    
    const priceInfo = service.prices[category];
    return priceInfo && typeof priceInfo === 'object' ? 
           priceInfo.price : (priceInfo || 0);
}

function getServicePriceByIdCategory(serviceId, categoryId) {
    const svc = servicesData.find(s => s.id === parseInt(serviceId));
    if (!svc) return 0;
    
    for (const [catName, priceInfo] of Object.entries(svc.prices)) {
        if (priceInfo && typeof priceInfo === 'object') {
            if (priceInfo.id == categoryId || catName == categoryId) {
                return priceInfo.price;
            }
        }
    }
    return 0;
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
// Table Rendering with Separated Service Name and Category
// ===============================
function renderTable() {
    const tbody = document.getElementById('dataTable');
    if (!tbody) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="text-center py-16 text-gray-500 italic">Tidak ada data untuk ditampilkan</td></tr>';
        const dataCount = document.getElementById('dataCount');
        if (dataCount) dataCount.textContent = 'Total: 0 data';
        return;
    }
    
    tbody.innerHTML = pageData.map(function(item, index) {
        let paymentDisplay = 'BELUM BAYAR';
        let paymentClass = 'bg-yellow-100 text-yellow-800';
        
        if (item.status === 'On Progress') {
            if (item.payment && item.payment !== 'none') {
                paymentDisplay = item.payment.toUpperCase();
                paymentClass = 'bg-blue-100 text-blue-800';
            }
        } else if (item.status === 'Finished') {
            if (item.metodePembayaran && item.metodePembayaran !== 'belum bayar' && item.metodePembayaran !== '-') {
                paymentDisplay = item.metodePembayaran.toUpperCase();
                paymentClass = 'bg-green-100 text-green-800';
            }
        }
        
        const statusClass = item.status === 'Finished' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
        
        // Parse service name and category from jenisLaundry field
        let serviceName = 'Unknown Service';
        let serviceCategory = 'Unknown Category';
        
        if (item.jenisLaundry && item.jenisLaundry.includes(' - ')) {
            const parts = item.jenisLaundry.split(' - ');
            serviceName = parts[0] || 'Unknown Service';
            serviceCategory = parts[1] || 'Unknown Category';
        } else {
            serviceName = item.jenisLaundry || 'Unknown Service';
        }
        
        return `<tr class="hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}">
            <td class="py-3 px-4 text-sm border-b border-gray-100" style="min-width: 140px;">
                <span class="font-mono text-blue-600 whitespace-nowrap">${item.nomorNota || '-'}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100" style="min-width: 120px;">
                <span class="block" title="${item.namaPelanggan || '-'}">${item.namaPelanggan || '-'}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100" style="min-width: 100px;">
                <span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs inline-block">${item.cabang || '-'}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 text-center" style="min-width: 90px;">
                <span class="px-2 py-1 ${statusClass} rounded-full text-xs font-medium inline-block">${item.status}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 whitespace-nowrap" style="min-width: 100px;">
                ${formatDate(item.tanggalTerima)}
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 whitespace-nowrap" style="min-width: 100px;">
                ${formatDate(item.tanggalSelesai)}
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100" style="min-width: 140px;">
                <span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs inline-block" title="${serviceName}">${serviceName}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100" style="min-width: 120px;">
                <span class="px-2 py-1 bg-green-50 text-green-700 rounded text-xs inline-block" title="${serviceCategory}">${serviceCategory}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 text-center font-medium" style="min-width: 60px;">
                ${item.jumlahKg || 0} kg
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 whitespace-nowrap" style="min-width: 100px;">
                ${item.tanggalAmbil !== '-' ? formatDate(item.tanggalAmbil) : '-'}
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 whitespace-nowrap" style="min-width: 100px;">
                ${item.tanggalBayar !== '-' ? formatDate(item.tanggalBayar) : '-'}
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 text-center" style="min-width: 100px;">
                <span class="px-2 py-1 ${paymentClass} rounded-full text-xs font-medium inline-block">${paymentDisplay}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 text-right font-semibold text-green-600" style="min-width: 120px;">
                ${formatRupiah(item.harga || 0)}
            </td>
        </tr>`;
    }).join('');
    
    const dataCount = document.getElementById('dataCount');
    if (dataCount) dataCount.textContent = 'Total: ' + filteredData.length + ' data';
}

// ===============================
// Pagination with Tailwind
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
        paginationHTML += `<button class="px-3 py-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-l-md transition-colors" onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>`;
    }
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
        paginationHTML += `<button class="px-3 py-1 border ${activeClass} transition-colors" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (currentPage < totalPages) {
        paginationHTML += `<button class="px-3 py-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-r-md transition-colors" onclick="goToPage(${currentPage + 1})">
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
// Auto Refresh Data
// ===============================
setInterval(async function() {
    const prevDataLength = allData.length;
    const prevBranchesLength = branchesData.length;
    
    await Promise.allSettled([loadData(), loadBranches()]);
    
    let hasUpdates = false;
    
    if (allData.length !== prevDataLength) {
        updateStats();
        applyFilters();
        hasUpdates = true;
        console.log('Orders refreshed:', allData.length);
    }
    
    if (branchesData.length !== prevBranchesLength) {
        applyFilters();
        hasUpdates = true;
        console.log('Branches refreshed:', branchesData.length);
    }
    
    if (hasUpdates) {
        console.log('Auto-refresh at:', new Date().toLocaleTimeString());
    }
}, 30000);

// ===============================
// Global Functions
// ===============================
window.getServicePrice = getServicePrice;
window.getServicePriceByCategory = getServicePriceByCategory;
window.getServicePriceByIdCategory = getServicePriceByIdCategory;
window.togglePricingTable = togglePricingTable;
window.openAddServiceModal = openAddServiceModal;
window.closeAddServiceModal = closeAddServiceModal;