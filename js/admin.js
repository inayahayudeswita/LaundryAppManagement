// ===============================
// Global Variables
// ===============================
let allData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 10;

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

        // Update jumlah cabang aktif (hanya role kasir)
        const totalBranchesEl = document.getElementById('totalBranches');
        if (totalBranchesEl) {
            totalBranchesEl.textContent = branchesData.length;
        }
        
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
    
    // Check if XLSX library is loaded
    if (typeof XLSX === 'undefined') {
        console.error('XLSX library not loaded!');
        // Try to disable export button
        const exportBtn = document.querySelector('button[onclick="exportExcel()"]');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Excel Library Error</span>';
            exportBtn.title = 'XLSX library failed to load';
        }
    }
    
    await loadBranches();   
    await loadServicePricing(); 
    await loadData();         
    updateStats();
    applyFilters(); // 🔥 Ini akan memanggil renderTable() dan updatePagination()
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
    
    // Calculate total revenue from finished orders + on progress orders with payment
    const finishedRevenue = allData
        .filter(function(item) { return item.status === 'Finished'; })
        .reduce(function(sum, item) { return sum + parseInt(item.harga); }, 0);
    
    const onProgressPaidRevenue = allData
        .filter(function(item) { 
            return item.status === 'On Progress' && 
                    item.payment && 
                    item.payment !== 'none' && 
                    ['cash', 'transfer', 'qris'].includes(item.payment.toLowerCase()); 
        })
        .reduce(function(sum, item) { return sum + parseInt(item.harga); }, 0);
    
    const totalRevenue = finishedRevenue + onProgressPaidRevenue;
    
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
        finishedRevenue: formatRupiah(finishedRevenue),
        onProgressPaidRevenue: formatRupiah(onProgressPaidRevenue),
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
    
    // 🔥 POTONG DATA BERDASARKAN PAGINATION
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
        // Fixed payment logic with proper class mapping
        let paymentDisplay = 'BELUM BAYAR';
        let paymentClass = 'none'; // This will map to payment-none CSS class

        if (item.status === 'On Progress') {
            if (item.payment && item.payment !== 'none') {
                paymentDisplay = item.payment.toUpperCase();
                paymentClass = item.payment.toLowerCase(); // cash, transfer, qris
            }
        } else if (item.status === 'Finished') {
            if (item.metodePembayaran && item.metodePembayaran !== 'belum bayar' && item.metodePembayaran !== '-') {
                paymentDisplay = item.metodePembayaran.toUpperCase();
                paymentClass = item.metodePembayaran.toLowerCase(); // cash, transfer, qris
            }
        }
        
        // Ensure paymentClass is valid for CSS
        const validPaymentClasses = ['cash', 'transfer', 'qris', 'none'];
        if (!validPaymentClasses.includes(paymentClass)) {
            paymentClass = 'none';
        }
        
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
                <span class="nota-badge">${item.nomorNota || '-'}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100" style="min-width: 120px;">
                <span class="block" title="${item.namaPelanggan || '-'}">${item.namaPelanggan || '-'}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100" style="min-width: 100px;">
                <span class="branch-badge">${item.cabang || '-'}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 text-center" style="min-width: 90px;">
                <span class="badge status-${item.status === 'Finished' ? 'finished' : 'progress'}">${item.status}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 whitespace-nowrap" style="min-width: 100px;">
                ${formatDate(item.tanggalTerima)}
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 whitespace-nowrap" style="min-width: 100px;">
                ${formatDate(item.tanggalSelesai)}
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100" style="min-width: 140px;">
                <span class="service-badge" title="${serviceName}">${serviceName}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100" style="min-width: 120px;">
                <span class="category-badge" title="${serviceCategory}">${serviceCategory}</span>
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
                <span class="payment-badge payment-${paymentClass}">${paymentDisplay}</span>
            </td>
            <td class="py-3 px-4 text-sm border-b border-gray-100 text-right" style="min-width: 120px;">
                <span class="currency">${formatRupiah(item.harga || 0)}</span>
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
    
    if (!paginationContainer || !paginationInfo) {
        console.error('Pagination elements not found!');
        return;
    }
    
    // Update info text
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);
    const totalItems = filteredData.length;
    
    paginationInfo.textContent = `Menampilkan ${startItem}-${endItem} dari ${totalItems} data`;
    
    // Jika tidak ada data atau hanya 1 halaman, sembunyikan pagination
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    const maxVisiblePages = 5;
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <button class="pagination-button" onclick="goToPage(${currentPage - 1})" title="Halaman Sebelumnya">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
    } else {
        paginationHTML += `
            <button class="pagination-button" disabled>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }
    
    // Calculate visible page range
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're at the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page and ellipsis if needed
    if (startPage > 1) {
        paginationHTML += `
            <button class="pagination-button" onclick="goToPage(1)">1</button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `
                <button class="pagination-button active">${i}</button>
            `;
        } else {
            paginationHTML += `
                <button class="pagination-button" onclick="goToPage(${i})">${i}</button>
            `;
        }
    }
    
    // Last page and ellipsis if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `
            <button class="pagination-button" onclick="goToPage(${totalPages})">${totalPages}</button>
        `;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <button class="pagination-button" onclick="goToPage(${currentPage + 1})" title="Halaman Berikutnya">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    } else {
        paginationHTML += `
            <button class="pagination-button" disabled>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }
    
    paginationContainer.innerHTML = paginationHTML;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
    updatePagination();
    
    // Scroll ke atas tabel untuk UX yang lebih baik
    const tableContainer = document.querySelector('.overflow-x-auto');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===============================
// Export Functions - FIXED WITH ERROR CHECKING
// ===============================
async function exportExcel() {
    if (filteredData.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
    }

    try {
        // Buat workbook baru dengan ExcelJS
        const workbook = new ExcelJS.Workbook();
        
        // ===== SHEET 1: DATA ORDER =====
        const orderSheet = workbook.addWorksheet('Data Order');

        // === HEADER SHEET 1 ===
        const headers = ['No. Nota', 'Pelanggan', 'Cabang', 'Status', 'Tgl Terima', 'Tgl Selesai', 'Jenis', 'Kg', 'Tgl Ambil', 'Tgl Bayar', 'Pembayaran', 'Harga'];
        
        // Tambah header dengan styling
        const headerRow = orderSheet.addRow(headers);
        headerRow.eachCell((cell, colNumber) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9EAD3' } // Hijau muda
            };
            cell.font = {
                bold: true,
                color: { argb: 'FF000000' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // === DATA TRANSAKSI SHEET 1 ===
        filteredData.forEach(item => {
            let paymentExport = 'BELUM BAYAR';
            if (item.payment && item.payment !== 'none') {
                paymentExport = item.payment.toUpperCase();
            } else if (item.metodePembayaran && item.metodePembayaran !== 'belum-bayar' && item.metodePembayaran !== '-') {
                paymentExport = item.metodePembayaran.toUpperCase();
            }

            const rowData = [
                item.nomorNota || '-',
                item.namaPelanggan || '-',
                item.cabang || '-',
                item.status || '-',
                item.tanggalTerima || '-',
                item.tanggalSelesai || '-',
                item.jenisLaundry || '-',
                item.jumlahKg || 0,
                item.tanggalAmbil !== '-' ? item.tanggalAmbil : '',
                item.tanggalBayar !== '-' ? item.tanggalBayar : '',
                paymentExport,
                item.harga || 0
            ];

            const dataRow = orderSheet.addRow(rowData);
            
            // Styling untuk setiap cell dalam row
            dataRow.eachCell((cell, colNumber) => {
                // Border untuk semua cell
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                // Fill color kuning untuk row BELUM BAYAR
                if (paymentExport === 'BELUM BAYAR') {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFE599' } // Kuning
                    };
                }
                
                // Alignment
                if (colNumber === 8 || colNumber === 12) { // Kg dan Harga
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });
        });

        // === SET COLUMN WIDTHS SHEET 1 ===
        orderSheet.columns = [
            { width: 20 }, // No. Nota
            { width: 15 }, // Pelanggan
            { width: 12 }, // Cabang
            { width: 12 }, // Status
            { width: 12 }, // Tgl Terima
            { width: 12 }, // Tgl Selesai
            { width: 15 }, // Jenis
            { width: 8 },  // Kg
            { width: 12 }, // Tgl Ambil
            { width: 12 }, // Tgl Bayar
            { width: 12 }, // Pembayaran
            { width: 12 }  // Harga
        ];

        // ===== SHEET 2: RINGKASAN LAPORAN =====
        const summarySheet = workbook.addWorksheet('Ringkasan Laporan');

        // === HITUNG STATISTIK ===
        const onProgressData = filteredData.filter(item => item.status === 'On Progress');
        const finishedData = filteredData.filter(item => item.status === 'Finished');

        const onProgressBelumBayar = onProgressData.filter(item => !item.payment || item.payment === 'none');
        const onProgressCash = onProgressData.filter(item => item.payment && item.payment.toLowerCase() === 'cash');
        const onProgressTransfer = onProgressData.filter(item => item.payment && item.payment.toLowerCase() === 'transfer');
        const onProgressQris = onProgressData.filter(item => item.payment && item.payment.toLowerCase() === 'qris');

        const finishedCash = finishedData.filter(item =>
            (item.payment && item.payment.toLowerCase() === 'cash') ||
            (item.metodePembayaran && item.metodePembayaran.toLowerCase() === 'cash')
        );
        const finishedTransfer = finishedData.filter(item =>
            (item.payment && item.payment.toLowerCase() === 'transfer') ||
            (item.metodePembayaran && item.metodePembayaran.toLowerCase() === 'transfer')
        );
        const finishedQris = finishedData.filter(item =>
            (item.payment && item.payment.toLowerCase() === 'qris') ||
            (item.metodePembayaran && item.metodePembayaran.toLowerCase() === 'qris')
        );

        function sumHarga(arr) {
            return arr.reduce((sum, item) => sum + (parseInt(item.harga) || 0), 0);
        }

        // === HEADER RINGKASAN ===
        const summaryMainHeader = summarySheet.addRow(['RINGKASAN LAPORAN']);
        summaryMainHeader.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' } // Biru tua
        };
        summaryMainHeader.getCell(1).font = { 
            bold: true, 
            color: { argb: 'FFFFFFFF' }, // Text putih
            size: 16 
        };
        summaryMainHeader.getCell(1).border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        summaryMainHeader.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Merge cells untuk header utama
        summarySheet.mergeCells('A1:E1');

        summarySheet.addRow([]); // Baris kosong

        // === RINGKASAN UMUM ===
        const generalSummary = [
            ['Kategori', 'Jumlah'],
            ['Total On Progress', onProgressData.length],
            ['Total Finished', finishedData.length],
            ['Total Semua Order', filteredData.length],
            ['Total Pendapatan', sumHarga(onProgressCash) + sumHarga(onProgressTransfer) + sumHarga(onProgressQris) + sumHarga(finishedData)]
        ];

        generalSummary.forEach((rowData, index) => {
            const row = summarySheet.addRow(rowData);
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                if (index === 0) { // Header row
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFB6D7FF' }
                    };
                    cell.font = { bold: true };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    cell.alignment = { 
                        vertical: 'middle', 
                        horizontal: colNumber === 2 ? 'right' : 'left' 
                    };
                }
            });
        });

        summarySheet.addRow([]); // Baris kosong

        // === DETAIL ON PROGRESS ===
        const onProgressHeader = summarySheet.addRow(['DETAIL ON PROGRESS', '', '', '', '']);
        onProgressHeader.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF70AD47' } // Hijau
        };
        onProgressHeader.getCell(1).font = { 
            bold: true, 
            color: { argb: 'FFFFFFFF' },
            size: 14 
        };
        onProgressHeader.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        summarySheet.mergeCells(`A${onProgressHeader.number}:E${onProgressHeader.number}`);

        const onProgressDetail = [
            ['Status Pembayaran', 'Belum Bayar', 'Cash', 'Transfer', 'Qris'],
            ['Jumlah Order', onProgressBelumBayar.length, onProgressCash.length, onProgressTransfer.length, onProgressQris.length],
            ['Nominal Masuk', sumHarga(onProgressBelumBayar), sumHarga(onProgressCash), sumHarga(onProgressTransfer), sumHarga(onProgressQris)]
        ];

        onProgressDetail.forEach((rowData, index) => {
            const row = summarySheet.addRow(rowData);
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                if (index === 0) { // Header row
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFD5E8D4' } // Hijau muda
                    };
                    cell.font = { bold: true };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    cell.alignment = { 
                        vertical: 'middle', 
                        horizontal: colNumber === 1 ? 'left' : 'right' 
                    };
                }
            });
        });

        // === TAMBAH TOTAL ROWS DENGAN MERGED CELLS ===
        
        // Total Nominal Kotor
        const totalKotorRow = summarySheet.addRow(['Total Nominal Kotor', sumHarga(onProgressData)]);
        totalKotorRow.getCell(1).font = { bold: true };
        totalKotorRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        totalKotorRow.getCell(2).font = { bold: true };
        totalKotorRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
        
        // Apply borders to all cells in the row
        for (let col = 1; col <= 5; col++) {
            totalKotorRow.getCell(col).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
        
        // Merge cells B to E for total kotor
        summarySheet.mergeCells(`B${totalKotorRow.number}:E${totalKotorRow.number}`);
        
        // Total Nominal Bersih
        const totalBersihRow = summarySheet.addRow(['Total Nominal Bersih', sumHarga(onProgressCash) + sumHarga(onProgressTransfer) + sumHarga(onProgressQris)]);
        totalBersihRow.getCell(1).font = { bold: true };
        totalBersihRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        totalBersihRow.getCell(2).font = { bold: true };
        totalBersihRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
        
        // Apply borders to all cells in the row
        for (let col = 1; col <= 5; col++) {
            totalBersihRow.getCell(col).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
        
        // Merge cells B to E for total bersih
        summarySheet.mergeCells(`B${totalBersihRow.number}:E${totalBersihRow.number}`);

        summarySheet.addRow([]); // Baris kosong

        // === DETAIL FINISHED ===
        const finishedHeader = summarySheet.addRow(['DETAIL FINISHED', '', '', '', '']);
        finishedHeader.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF4B183' } // Orange
        };
        finishedHeader.getCell(1).font = { 
            bold: true, 
            color: { argb: 'FF000000' },
            size: 14 
        };
        finishedHeader.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        summarySheet.mergeCells(`A${finishedHeader.number}:E${finishedHeader.number}`);

        const finishedDetail = [
            ['Metode Pembayaran', 'Cash', 'Transfer', 'Qris', 'Total'],
            ['Jumlah Order', finishedCash.length, finishedTransfer.length, finishedQris.length, finishedData.length],
            ['Nominal', sumHarga(finishedCash), sumHarga(finishedTransfer), sumHarga(finishedQris), sumHarga(finishedData)]
        ];

        finishedDetail.forEach((rowData, index) => {
            const row = summarySheet.addRow(rowData);
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                if (index === 0) { // Header row
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFCE4D6' } // Orange muda
                    };
                    cell.font = { bold: true };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    cell.alignment = { 
                        vertical: 'middle', 
                        horizontal: colNumber === 1 ? 'left' : 'right' 
                    };
                }
            });
        });

        // === SET COLUMN WIDTHS SHEET 2 ===
        summarySheet.columns = [
            { width: 20 }, // Kategori/Status
            { width: 15 }, // Data 1
            { width: 15 }, // Data 2
            { width: 15 }, // Data 3
            { width: 15 }  // Data 4
        ];

        // === EXPORT FILE ===
        const fileName = `laporan_admin_${new Date().toISOString().split("T")[0]}.xlsx`;
        
        // Generate buffer dan download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('Excel file exported successfully:', fileName);
        alert('Data berhasil diekspor ke file: ' + fileName + '\n\nSheet 1: Data Order\nSheet 2: Ringkasan Laporan');

    } catch (error) {
        console.error('Error exporting Excel:', error);
        alert('Terjadi kesalahan saat mengekspor data Excel: ' + error.message);
    }
}


// ===============================
// Date Filter Functions
// ===============================
function handlePeriodChange() {
    const selectedPeriod = document.getElementById('filterPeriod').value;
    const customDateSection = document.getElementById('customDateSection');
    
    if (selectedPeriod === 'custom') {
        customDateSection.classList.remove('hidden');
        // Set default to single date mode
        document.getElementById('dateMode').value = 'single';
        handleDateModeChange();
    } else {
        customDateSection.classList.add('hidden');
        resetDateFilterInfo();
    }
    
    applyFilters();
}

function handleDateModeChange() {
    const dateMode = document.getElementById('dateMode').value;
    const singleDateInput = document.getElementById('singleDateInput');
    const rangeDateInputs = document.getElementById('rangeDateInputs');
    
    if (dateMode === 'single') {
        singleDateInput.classList.remove('hidden');
        rangeDateInputs.classList.add('hidden');
    } else {
        singleDateInput.classList.add('hidden');
        rangeDateInputs.classList.remove('hidden');
    }
    
    // Clear previous date values
    document.getElementById('singleDate').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    resetDateFilterInfo();
    applyFilters();
}

function resetDateFilter() {
    document.getElementById('filterPeriod').value = 'all';
    document.getElementById('customDateSection').classList.add('hidden');
    document.getElementById('singleDate').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    resetDateFilterInfo();
    applyFilters();
}

function resetDateFilterInfo() {
    const dateFilterInfo = document.getElementById('dateFilterInfo');
    if (dateFilterInfo) {
        dateFilterInfo.classList.add('hidden');
    }
}

function updateDateFilterInfo(text) {
    const dateFilterInfo = document.getElementById('dateFilterInfo');
    const dateFilterText = document.getElementById('dateFilterText');
    
    if (dateFilterInfo && dateFilterText) {
        dateFilterText.textContent = text;
        dateFilterInfo.classList.remove('hidden');
    }
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
        
        // Handle date filtering
        if (selectedPeriod !== 'all') {
            const itemDate = new Date(item.tanggalTerima);
            const now = new Date();
            
            if (selectedPeriod === 'custom') {
                // Handle custom date filtering
                const dateMode = document.getElementById('dateMode') ? document.getElementById('dateMode').value : 'single';
                
                if (dateMode === 'single') {
                    const singleDate = document.getElementById('singleDate') ? document.getElementById('singleDate').value : '';
                    if (singleDate) {
                        const selectedDate = new Date(singleDate);
                        const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                        const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                        
                        if (itemDateOnly.getTime() !== selectedDateOnly.getTime()) return false;
                        
                        // Update filter info
                        updateDateFilterInfo(`Filter: ${selectedDate.toLocaleDateString('id-ID')}`);
                    }
                } else {
                    const startDate = document.getElementById('startDate') ? document.getElementById('startDate').value : '';
                    const endDate = document.getElementById('endDate') ? document.getElementById('endDate').value : '';
                    
                    if (startDate && endDate) {
                        const startDateTime = new Date(startDate);
                        const endDateTime = new Date(endDate);
                        
                        // Set time to cover full day range
                        startDateTime.setHours(0, 0, 0, 0);
                        endDateTime.setHours(23, 59, 59, 999);
                        
                        if (itemDate < startDateTime || itemDate > endDateTime) return false;
                        
                        // Update filter info
                        updateDateFilterInfo(`Filter: ${startDateTime.toLocaleDateString('id-ID')} - ${endDateTime.toLocaleDateString('id-ID')}`);
                    } else if (startDate) {
                        const startDateTime = new Date(startDate);
                        startDateTime.setHours(0, 0, 0, 0);
                        
                        if (itemDate < startDateTime) return false;
                        
                        // Update filter info
                        updateDateFilterInfo(`Filter: Dari ${startDateTime.toLocaleDateString('id-ID')}`);
                    } else if (endDate) {
                        const endDateTime = new Date(endDate);
                        endDateTime.setHours(23, 59, 59, 999);
                        
                        if (itemDate > endDateTime) return false;
                        
                        // Update filter info
                        updateDateFilterInfo(`Filter: Sampai ${endDateTime.toLocaleDateString('id-ID')}`);
                    }
                }
            } else {
                // Handle predefined periods
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