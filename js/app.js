// app.js - Main Application Logic

// Application State
class LaundryApp {
    constructor() {
        this.currentUser = null;
        this.filteredData = [];
        this.editingItemId = null;
        this.currentFilters = {
            cabang: '',
            status: '',
            period: 'all',
            search: ''
        };
        
        this.init();
    }

    init() {
        this.currentUser = checkAuth();
        if (!this.currentUser) return;
        
        this.setupEventListeners();
        this.loadData();
        this.updateUI();
    }

    setupEventListeners() {
        // Modal close on outside click
        const modal = document.getElementById('formModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideForm();
                }
            });
        }

        // Form submission
        const form = document.getElementById('laundryForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveData();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            });
        }

        // Filter changes
        ['filterCabang', 'filterStatus', 'filterPeriod'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideForm();
            }
        });
    }

    loadData() {
        if (this.currentUser.role === 'admin') {
            this.filteredData = dataManager.getAllItems(this.currentUser);
        } else {
            // For kasir, load only their branch data
            const onProgress = dataManager.getOnProgressItems(this.currentUser);
            const finished = dataManager.getFinishedItems(this.currentUser);
            this.filteredData = [...onProgress, ...finished];
        }
    }

    updateUI() {
        this.displayUserInfo();
        this.updateStats();
        this.renderTables();
    }

    displayUserInfo() {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.textContent = this.currentUser.name;
        }

        const cabangInfoElement = document.getElementById('cabangInfo');
        if (cabangInfoElement && this.currentUser.cabang) {
            cabangInfoElement.innerHTML = `<i class="fas fa-store"></i> ${this.currentUser.name}`;
        }
    }

    updateStats() {
        const stats = dataManager.getStats(this.currentUser);
        
        // Update stat elements
        const elements = {
            'totalProgress': stats.onProgressCount,
            'totalFinished': stats.finishedCount,
            'totalRevenue': formatCurrency(stats.totalRevenue),
            'onProgressCount': stats.onProgressCount,
            'finishedCount': stats.finishedCount
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Update data count
        const dataCountElement = document.getElementById('dataCount');
        if (dataCountElement) {
            dataCountElement.textContent = `Total: ${this.filteredData.length} data`;
        }
    }

    // Modal Management
    showForm(editId = null) {
        const modal = document.getElementById('formModal');
        const title = document.getElementById('modalTitle');
        const saveButton = document.getElementById('saveButtonText');
        
        if (!modal) return;

        this.editingItemId = editId;
        modal.classList.add('show');

        if (editId) {
            title.textContent = 'Edit Data Laundry';
            saveButton.textContent = 'Update';
            this.populateForm(editId);
        } else {
            title.textContent = 'Tambah Data Laundry';
            saveButton.textContent = 'Simpan';
            this.resetForm();
        }
    }

    hideForm() {
        const modal = document.getElementById('formModal');
        if (modal) {
            modal.classList.remove('show');
            this.resetForm();
            this.editingItemId = null;
        }
    }

    resetForm() {
        const cabang = this.currentUser.cabang || 'A';
        const elements = {
            'nomorNota': dataManager.generateNomorNota(cabang),
            'namaPelanggan': '',
            'tanggalTerima': getTodayDate(),
            'tanggalSelesai': '',
            'harga': '',
            'jenisLaundry': 'reg',
            'jumlahKg': ''
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }

    populateForm(id) {
        const item = this.filteredData.find(item => item.id === id);
        if (!item) return;

        const elements = {
            'nomorNota': item.nomorNota,
            'namaPelanggan': item.namaPelanggan,
            'tanggalTerima': item.tanggalTerima,
            'tanggalSelesai': item.tanggalSelesai,
            'harga': item.harga,
            'jenisLaundry': item.jenisLaundry,
            'jumlahKg': item.jumlahKg
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || '';
            }
        });
    }

    // CRUD Operations
    saveData() {
        const formData = this.getFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            if (this.editingItemId) {
                dataManager.updateItem(this.editingItemId, formData, this.currentUser);
            } else {
                dataManager.addItem(formData, this.currentUser);
            }

            this.hideForm();
            this.loadData();
            this.applyFilters();
            this.showNotification('Data berhasil disimpan!', 'success');
        } catch (error) {
            this.showNotification('Gagal menyimpan data: ' + error.message, 'error');
        }
    }

    getFormData() {
        return {
            nomorNota: document.getElementById('nomorNota')?.value || '',
            namaPelanggan: document.getElementById('namaPelanggan')?.value || '',
            tanggalTerima: document.getElementById('tanggalTerima')?.value || '',
            tanggalSelesai: document.getElementById('tanggalSelesai')?.value || '',
            harga: parseInt(document.getElementById('harga')?.value) || 0,
            jenisLaundry: document.getElementById('jenisLaundry')?.value || 'reg',
            jumlahKg: parseFloat(document.getElementById('jumlahKg')?.value) || 0
        };
    }

    validateFormData(data) {
        const requiredFields = ['nomorNota', 'namaPelanggan', 'tanggalTerima', 'tanggalSelesai'];
        
        for (const field of requiredFields) {
            if (!data[field]) {
                this.showNotification(`Field ${field} harus diisi!`, 'error');
                return false;
            }
        }

        if (data.harga <= 0) {
            this.showNotification('Harga harus lebih dari 0!', 'error');
            return false;
        }

        if (data.jumlahKg <= 0) {
            this.showNotification('Jumlah kg harus lebih dari 0!', 'error');
            return false;
        }

        return true;
    }

    editItem(id) {
        this.showForm(id);
    }

    finishItem(id) {
        if (confirm('Apakah Anda yakin ingin menyelesaikan item ini?')) {
            try {
                dataManager.finishItem(id, this.currentUser);
                this.loadData();
                this.applyFilters();
                this.showNotification('Item berhasil diselesaikan!', 'success');
            } catch (error) {
                this.showNotification('Gagal menyelesaikan item: ' + error.message, 'error');
            }
        }
    }

    deleteItem(id) {
        if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
            try {
                dataManager.deleteItem(id, this.currentUser);
                this.loadData();
                this.applyFilters();
                this.showNotification('Data berhasil dihapus!', 'success');
            } catch (error) {
                this.showNotification('Gagal menghapus data: ' + error.message, 'error');
            }
        }
    }

    updateFinishedField(id, field, value) {
        try {
            const updateData = { [field]: value };
            dataManager.updateItem(id, updateData, this.currentUser);
            this.showNotification('Data berhasil diupdate!', 'success');
        } catch (error) {
            this.showNotification('Gagal mengupdate data: ' + error.message, 'error');
        }
    }

    // Filtering and Search
    applyFilters() {
        this.currentFilters = {
            cabang: document.getElementById('filterCabang')?.value || '',
            status: document.getElementById('filterStatus')?.value || '',
            period: document.getElementById('filterPeriod')?.value || 'all',
            search: document.getElementById('searchInput')?.value || ''
        };

        let filtered = [...this.filteredData];

        // Apply cabang filter
        if (this.currentFilters.cabang) {
            filtered = filtered.filter(item => item.cabang === this.currentFilters.cabang);
        }

        // Apply status filter
        if (this.currentFilters.status) {
            filtered = filtered.filter(item => item.status === this.currentFilters.status);
        }

        // Apply period filter
        if (this.currentFilters.period !== 'all') {
            filtered = dataManager.filterByPeriod(filtered, this.currentFilters.period);
        }

        // Apply search filter
        if (this.currentFilters.search) {
            filtered = dataManager.searchItems(filtered, this.currentFilters.search);
        }

        this.renderTables(filtered);
        this.updateFilteredStats(filtered);
    }

    resetFilters() {
        // Reset filter inputs
        const filterElements = ['filterCabang', 'filterStatus', 'filterPeriod', 'searchInput'];
        const defaultValues = ['', '', 'all', ''];
        
        filterElements.forEach((id, index) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = defaultValues[index];
            }
        });

        this.currentFilters = { cabang: '', status: '', period: 'all', search: '' };
        this.applyFilters();
    }

    updateFilteredStats(filteredData) {
        const dataCountElement = document.getElementById('dataCount');
        if (dataCountElement) {
            dataCountElement.textContent = `Total: ${filteredData.length} data`;
        }
    }

    // Rendering
    renderTables(data = null) {
        const displayData = data || this.filteredData;
        
        if (this.currentUser.role === 'admin') {
            this.renderAdminTable(displayData);
        } else {
            this.renderKasirTables(displayData);
        }
    }

    renderAdminTable(data) {
        const tbody = document.getElementById('dataTable');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        Tidak ada data untuk ditampilkan
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td><span class="nota-code">${item.nomorNota}</span></td>
                <td>${item.namaPelanggan}</td>
                <td><span class="cabang-badge cabang-${item.cabang.toLowerCase()}">${item.cabang}</span></td>
                <td>${formatDate(item.tanggalTerima)}</td>
                <td><span class="status-badge status-${item.status}">${item.status === 'progress' ? 'On Progress' : 'Finished'}</span></td>
                <td>${item.jenisLaundry}</td>
                <td>${item.jumlahKg} kg</td>
                <td class="currency">${formatCurrency(item.harga)}</td>
            </tr>
        `).join('');
    }

    renderKasirTables(data) {
        const onProgress = data.filter(item => item.status === 'progress');
        const finished = data.filter(item => item.status === 'finished');
        
        this.renderOnProgressTable(onProgress);
        this.renderFinishedTable(finished);
    }

    renderOnProgressTable(data) {
        const tbody = document.getElementById('onProgressTable');
        const count = document.getElementById('onProgressCount');
        
        if (!tbody || !count) return;

        count.textContent = data.length;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        Belum ada data laundry yang sedang diproses
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td><span class="nota-code">${item.nomorNota}</span></td>
                <td>${item.namaPelanggan}</td>
                <td>${formatDate(item.tanggalTerima)}</td>
                <td>${formatDate(item.tanggalSelesai)}</td>
                <td><span class="jenis-badge">${item.jenisLaundry}</span></td>
                <td>${item.jumlahKg} kg</td>
                <td class="currency">${formatCurrency(item.harga)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon edit" onclick="app.editItem(${item.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon finish" onclick="app.finishItem(${item.id})" title="Selesai">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-icon delete" onclick="app.deleteItem(${item.id})" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderFinishedTable(data) {
        const tbody = document.getElementById('finishedTable');
        const count = document.getElementById('finishedCount');
        
        if (!tbody || !count) return;

        count.textContent = data.length;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        Belum ada data laundry yang selesai
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td><span class="nota-code">${item.nomorNota}</span></td>
                <td>${item.namaPelanggan}</td>
                <td>
                    <input
                        type="date"
                        value="${item.tanggalAmbil || ''}"
                        onchange="app.updateFinishedField(${item.id}, 'tanggalAmbil', this.value)"
                        class="inline-input"
                    />
                </td>
                <td>
                    <input
                        type="date"
                        value="${item.tanggalBayar || ''}"
                        onchange="app.updateFinishedField(${item.id}, 'tanggalBayar', this.value)"
                        class="inline-input"
                    />
                </td>
                <td>
                    <input
                        type="text"
                        value="${item.kodeBayar || ''}"
                        onchange="app.updateFinishedField(${item.id}, 'kodeBayar', this.value)"
                        placeholder="Kode bayar"
                        class="inline-input"
                    />
                </td>
                <td>
                    <input
                        type="text"
                        value="${item.namaSetrika || ''}"
                        onchange="app.updateFinishedField(${item.id}, 'namaSetrika', this.value)"
                        placeholder="Nama setrika"
                        class="inline-input"
                    />
                </td>
                <td class="currency">${formatCurrency(item.harga)}</td>
                <td>
                    <button class="btn-icon delete" onclick="app.deleteItem(${item.id})" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Export and Print
    exportCSV() {
        const dataToExport = this.getFilteredData();
        ExportManager.exportToCSV(dataToExport, 'laporan-laundry');
        this.showNotification('Data berhasil diexport ke CSV!', 'success');
    }

    printReport() {
        const dataToExport = this.getFilteredData();
        const title = this.getReportTitle();
        ExportManager.print(dataToExport, title);
    }

    getFilteredData() {
        // Get current filtered data for export/print
        let data = [...this.filteredData];

        if (this.currentFilters.cabang) {
            data = data.filter(item => item.cabang === this.currentFilters.cabang);
        }

        if (this.currentFilters.status) {
            data = data.filter(item => item.status === this.currentFilters.status);
        }

        if (this.currentFilters.period !== 'all') {
            data = dataManager.filterByPeriod(data, this.currentFilters.period);
        }

        if (this.currentFilters.search) {
            data = dataManager.searchItems(data, this.currentFilters.search);
        }

        return data;
    }

    getReportTitle() {
        let title = 'Laporan Data Laundry';
        
        if (this.currentFilters.cabang) {
            title += ` - Cabang ${this.currentFilters.cabang}`;
        }
        
        if (this.currentFilters.period !== 'all') {
            const periods = {
                'today': 'Hari Ini',
                'week': 'Minggu Ini',
                'month': 'Bulan Ini'
            };
            title += ` - ${periods[this.currentFilters.period]}`;
        }
        
        return title;
    }

    // Notification System
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                min-width: 250px;
            `;
            document.body.appendChild(notification);
        }

        // Set notification style based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        notification.style.transform = 'translateX(0)';

        // Auto hide after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
        }, 3000);
    }

    // Logout
    logout() {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            userManager.logout();
            window.location.href = 'login.html';
        }
    }
}

// Global functions for backward compatibility
let app;

function showForm() {
    app.showForm();
}

function hideForm() {
    app.hideForm();
}

function saveData() {
    app.saveData();
}

function editItem(id) {
    app.editItem(id);
}

function finishItem(id) {
    app.finishItem(id);
}

function deleteItem(id) {
    app.deleteItem(id);
}

function updateFinishedField(id, field, value) {
    app.updateFinishedField(id, field, value);
}

function applyFilters() {
    app.applyFilters();
}

function resetFilters() {
    app.resetFilters();
}

function exportCSV() {
    app.exportCSV();
}

function printReport() {
    app.printReport();
}

function logout() {
    app.logout();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    app = new LaundryApp();
});