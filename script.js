// Tenancy Form Script
const tenancyForm = document.getElementById('tenancyForm');
const recordsSection = document.getElementById('recordsSection');
const recordsList = document.getElementById('recordsList');

// Load records from localStorage
let records = JSON.parse(localStorage.getItem('tenancyRecords')) || [];
let currentFilter = 'all';
let searchQuery = '';

// Initialize
displayRecords();
updateDashboard();

// Tab Navigation
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');

navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Update active states
        navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show target content
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        if (targetTab === 'form') {
            document.getElementById('formView').classList.add('active');
        } else {
            document.getElementById('dashboardView').classList.add('active');
            updateDashboard(); // Refresh dashboard when switching to it
        }
    });
});

// Form submission handler
tenancyForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get form data
    const formData = new FormData(tenancyForm);
    const record = {
        id: Date.now(),
        companyName: formData.get('companyName'),
        roomNumber: formData.get('roomNumber'),
        tenancyPeriod: formData.get('tenancyPeriod'),
        price: parseFloat(formData.get('price')),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        renewalDate: formData.get('renewalDate') || null,
        createdAt: new Date().toISOString()
    };

    // Validate dates
    if (!validateDates(record.startDate, record.endDate)) {
        showNotification('Error: End date must be after start date', 'error');
        return;
    }

    // Save record
    records.push(record);
    saveRecords();
    displayRecords();
    updateDashboard();

    // Show success notification
    showNotification('Record saved successfully!', 'success');

    // Reset form
    tenancyForm.reset();

    // Smooth scroll to records
    recordsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// Validate dates
function validateDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return end > start;
}

// Save records to localStorage
function saveRecords() {
    localStorage.setItem('tenancyRecords', JSON.stringify(records));
}

// Display records (form view)
function displayRecords() {
    if (records.length === 0) {
        recordsSection.style.display = 'none';
        return;
    }

    recordsSection.style.display = 'block';

    recordsList.innerHTML = records
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3) // Show only last 3 records in form view
        .map(record => createRecordCard(record))
        .join('');

    // Add delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const recordId = parseInt(e.target.dataset.id);
            deleteRecord(recordId);
        });
    });
}

// Create record card HTML (form view)
function createRecordCard(record) {
    const startDate = formatDate(record.startDate);
    const endDate = formatDate(record.endDate);
    const renewalDate = record.renewalDate ? formatDate(record.renewalDate) : 'Not set';

    return `
        <div class="record-card">
            <div class="record-header">
                <div class="record-company">${record.companyName}</div>
                <div class="record-room">Room ${record.roomNumber}</div>
            </div>
            <div class="record-details">
                <div class="record-detail">
                    <span class="record-detail-label">Tenancy Period</span>
                    <span class="record-detail-value">${record.tenancyPeriod} months</span>
                </div>
                <div class="record-detail">
                    <span class="record-detail-label">Price</span>
                    <span class="record-detail-value">RM ${record.price.toFixed(2)}</span>
                </div>
                <div class="record-detail">
                    <span class="record-detail-label">Start Date</span>
                    <span class="record-detail-value">${startDate}</span>
                </div>
                <div class="record-detail">
                    <span class="record-detail-label">End Date</span>
                    <span class="record-detail-value">${endDate}</span>
                </div>
            </div>
        </div>
    `;
}

// Dashboard Functions
function updateDashboard() {
    updateStats();
    renderDashboardTable();
}

function updateStats() {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

    const activeTenancies = records.filter(r => {
        const endDate = new Date(r.endDate);
        return endDate >= today;
    });

    const expiringSoon = activeTenancies.filter(r => {
        const endDate = new Date(r.endDate);
        return endDate <= thirtyDaysFromNow;
    });

    const upcomingRenewals = records.filter(r => {
        if (!r.renewalDate) return false;
        const renewalDate = new Date(r.renewalDate);
        return renewalDate >= today && renewalDate <= thirtyDaysFromNow;
    });

    document.getElementById('totalTenancies').textContent = records.length;
    document.getElementById('activeTenancies').textContent = activeTenancies.length;
    document.getElementById('expiringSoon').textContent = expiringSoon.length;
    document.getElementById('upcomingRenewals').textContent = upcomingRenewals.length;
}

function renderDashboardTable() {
    const tableBody = document.getElementById('dashboardTableBody');
    const emptyState = document.getElementById('emptyDashboard');

    if (records.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    const filteredRecords = filterRecords();

    if (filteredRecords.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No records match the current filter</td></tr>';
        return;
    }

    tableBody.innerHTML = filteredRecords
        .sort((a, b) => new Date(a.endDate) - new Date(b.endDate)) // Sort by end date (earliest first)
        .map(record => createDashboardRow(record))
        .join('');

    // Add delete listeners
    document.querySelectorAll('.dashboard-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const recordId = parseInt(e.target.dataset.id);
            deleteRecord(recordId);
        });
    });
}

function createDashboardRow(record) {
    const status = getRecordStatus(record);
    const statusClass = status.class;
    const statusText = status.text;

    return `
        <tr class="dashboard-row ${statusClass}">
            <td><strong>${record.companyName}</strong></td>
            <td>${record.roomNumber}</td>
            <td>${record.tenancyPeriod} months</td>
            <td>${formatDate(record.startDate)}</td>
            <td><strong>${formatDate(record.endDate)}</strong></td>
            <td>${record.renewalDate ? formatDate(record.renewalDate) : '—'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="dashboard-delete-btn" data-id="${record.id}" title="Delete">🗑️</button>
            </td>
        </tr>
    `;
}

function getRecordStatus(record) {
    const today = new Date();
    const endDate = new Date(record.endDate);
    const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilEnd < 0) {
        return { class: 'status-expired', text: 'Expired' };
    } else if (daysUntilEnd <= 30) {
        return { class: 'status-expiring', text: `${daysUntilEnd} days left` };
    } else if (daysUntilEnd <= 90) {
        return { class: 'status-active-warning', text: 'Active' };
    } else {
        return { class: 'status-active', text: 'Active' };
    }
}

function filterRecords() {
    let filtered = records;

    // Apply filter
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

    if (currentFilter === 'active') {
        filtered = filtered.filter(r => {
            const endDate = new Date(r.endDate);
            return endDate >= today;
        });
    } else if (currentFilter === 'expiring') {
        filtered = filtered.filter(r => {
            const endDate = new Date(r.endDate);
            return endDate >= today && endDate <= thirtyDaysFromNow;
        });
    } else if (currentFilter === 'renewal') {
        filtered = filtered.filter(r => r.renewalDate !== null);
    }

    // Apply search
    if (searchQuery) {
        filtered = filtered.filter(r =>
            r.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    return filtered;
}

// Filter button handlers
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderDashboardTable();
    });
});

// Search handler
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderDashboardTable();
});

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-MY', options);
}

// Delete record
function deleteRecord(id) {
    if (confirm('Are you sure you want to delete this record?')) {
        records = records.filter(record => record.id !== id);
        saveRecords();
        displayRecords();
        updateDashboard();
        showNotification('Record deleted', 'success');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add styles dynamically
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'hsl(140, 80%, 45%)' : 'hsl(0, 80%, 55%)'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        font-weight: 600;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-out 2.7s;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    .delete-btn, .dashboard-delete-btn {
        padding: 0.5rem 1rem;
        background: hsl(0, 80%, 55%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s ease;
        font-family: inherit;
    }
    
    .delete-btn:hover, .dashboard-delete-btn:hover {
        background: hsl(0, 80%, 45%);
        transform: scale(1.1);
        box-shadow: 0 4px 12px hsla(0, 80%, 55%, 0.4);
    }
    
    .delete-btn:active, .dashboard-delete-btn:active {
        transform: scale(1);
    }
    
    .dashboard-delete-btn {
        padding: 0.4rem 0.6rem;
        font-size: 1.1rem;
        background: transparent;
        transition: all 0.2s ease;
    }
    
    .dashboard-delete-btn:hover {
        background: hsl(0, 80%, 55%);
        transform: scale(1.2);
    }
`;
document.head.appendChild(style);

// Auto-calculate end date based on start date and tenancy period
const startDateInput = document.getElementById('startDate');
const tenancyPeriodInput = document.getElementById('tenancyPeriod');
const endDateInput = document.getElementById('endDate');

function calculateEndDate() {
    const startDate = startDateInput.value;
    const tenancyPeriod = parseInt(tenancyPeriodInput.value);

    if (startDate && tenancyPeriod && tenancyPeriod > 0) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + tenancyPeriod);

        // Format as YYYY-MM-DD
        const endDateString = end.toISOString().split('T')[0];
        endDateInput.value = endDateString;
    }
}

startDateInput.addEventListener('change', calculateEndDate);
tenancyPeriodInput.addEventListener('input', calculateEndDate);
