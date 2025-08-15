// Main JavaScript file for Online Voting System

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Auto-hide alerts after 5 seconds
    setTimeout(function() {
        var alerts = document.querySelectorAll('.alert-dismissible');
        alerts.forEach(function(alert) {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);

    // Candidate selection for voting
    initializeCandidateSelection();

    // Form validation
    initializeFormValidation();

    // Real-time clock
    initializeClock();

    // Data tables
    initializeDataTables();
});

// Candidate selection functionality
function initializeCandidateSelection() {
    const candidateCards = document.querySelectorAll('.candidate-card');
    const submitButton = document.getElementById('submitVote');
    let selectedCandidate = null;

    candidateCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selection from all cards
            candidateCards.forEach(c => c.classList.remove('selected'));
            
            // Add selection to clicked card
            this.classList.add('selected');
            
            // Get contest ID
            selectedCandidate = this.dataset.contestId;
            
            // Enable submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="bi bi-check-circle"></i> Confirm Vote';
            }
        });
    });

    // Handle vote submission
    if (submitButton) {
        submitButton.addEventListener('click', function() {
            if (selectedCandidate) {
                if (confirm('Are you sure you want to cast your vote? This action cannot be undone.')) {
                    submitVote(selectedCandidate);
                }
            }
        });
    }
}

// Submit vote function
function submitVote(contestId) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = window.location.pathname;
    
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'contest_id';
    input.value = contestId;
    
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
}

// Form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });

    // Password confirmation validation
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirmPassword');
    
    if (passwordField && confirmPasswordField) {
        confirmPasswordField.addEventListener('input', function() {
            if (passwordField.value !== this.value) {
                this.setCustomValidity('Passwords do not match');
            } else {
                this.setCustomValidity('');
            }
        });
    }
}

// Real-time clock
function initializeClock() {
    const clockElement = document.getElementById('currentTime');
    if (clockElement) {
        function updateClock() {
            const now = new Date();
            clockElement.textContent = now.toLocaleString();
        }
        updateClock();
        setInterval(updateClock, 1000);
    }
}

// Data tables initialization
function initializeDataTables() {
    const tables = document.querySelectorAll('.data-table');
    tables.forEach(table => {
        // Add sorting functionality
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.innerHTML += ' <i class="bi bi-arrow-down-up ms-1"></i>';
            
            header.addEventListener('click', function() {
                sortTable(table, this.dataset.sort);
            });
        });
    });
}

// Table sorting function
function sortTable(table, column) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const columnIndex = parseInt(column);
    
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        
        // Try to parse as numbers
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        } else {
            return aValue.localeCompare(bValue);
        }
    });
    
    // Clear tbody and add sorted rows
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

// Utility functions
function showLoading(element) {
    const originalContent = element.innerHTML;
    element.innerHTML = '<span class="spinner"></span> Loading...';
    element.disabled = true;
    
    return function hideLoading() {
        element.innerHTML = originalContent;
        element.disabled = false;
    };
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container').first || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 5000);
}

// API helper functions
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('authToken');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

// Election status helpers
function getElectionStatus(election) {
    const now = new Date();
    const votingStart = new Date(election.voting_start);
    const votingEnd = new Date(election.voting_end);
    
    if (now < votingStart) {
        return { status: 'upcoming', class: 'warning', text: 'Upcoming' };
    } else if (now >= votingStart && now <= votingEnd) {
        return { status: 'active', class: 'success', text: 'Active' };
    } else {
        return { status: 'ended', class: 'secondary', text: 'Ended' };
    }
}

// Format date helpers
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Confirmation dialogs
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Mark notification as read
async function markNotificationRead(notificationId) {
    try {
        await apiRequest(`/voter/notifications/${notificationId}/read`, {
            method: 'POST'
        });
        
        const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notificationElement) {
            notificationElement.classList.add('read');
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Auto-refresh for real-time updates
function enableAutoRefresh(interval = 30000) {
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            location.reload();
        }
    }, interval);
}

// Export functions for use in other scripts
window.VotingSystem = {
    showAlert,
    showLoading,
    apiRequest,
    getElectionStatus,
    formatDate,
    formatDateTime,
    confirmAction,
    markNotificationRead,
    enableAutoRefresh
};
