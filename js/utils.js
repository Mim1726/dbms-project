// Utility Functions
class Utils {
    // Show loading spinner
    static showLoading() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    }

    // Hide loading spinner
    static hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    // Show toast notification
    static showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }

    // Format date for display
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Format date for input fields
    static formatDateForInput(dateString) {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    }

    // Validate email format
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate password strength
    static validatePassword(password) {
        const errors = [];
        
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Sanitize HTML to prevent XSS
    static sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Debounce function for search inputs
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Generate random ID
    static generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Copy text to clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy: ', err);
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    // Download data as JSON file
    static downloadJson(data, filename) {
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    // Download data as CSV file
    static downloadCsv(data, filename) {
        if (!data.length) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');
        
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    // Validate file upload
    static validateFile(file, maxSize = CONFIG.MAX_FILE_SIZE, allowedTypes = CONFIG.ALLOWED_IMAGE_TYPES) {
        const errors = [];
        
        if (file.size > maxSize) {
            errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
        }
        
        if (!allowedTypes.includes(file.type)) {
            errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Resize image before upload
    static resizeImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, file.type, quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    // Calculate percentage
    static calculatePercentage(value, total) {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    }

    // Sort array of objects by property
    static sortBy(array, property, direction = 'asc') {
        return array.sort((a, b) => {
            const aVal = a[property];
            const bVal = b[property];
            
            if (direction === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    }

    // Group array of objects by property
    static groupBy(array, property) {
        return array.reduce((groups, item) => {
            const key = item[property];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    }

    // Check if user is on mobile device
    static isMobile() {
        return window.innerWidth <= 768;
    }

    // Smooth scroll to element
    static scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Local storage helpers
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
        },
        
        get(key) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                return null;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('Error removing from localStorage:', error);
            }
        },
        
        clear() {
            try {
                localStorage.clear();
            } catch (error) {
                console.error('Error clearing localStorage:', error);
            }
        }
    };

    // Session storage helpers
    static sessionStorage = {
        set(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('Error saving to sessionStorage:', error);
            }
        },
        
        get(key) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (error) {
                console.error('Error reading from sessionStorage:', error);
                return null;
            }
        },
        
        remove(key) {
            try {
                sessionStorage.removeItem(key);
            } catch (error) {
                console.error('Error removing from sessionStorage:', error);
            }
        },
        
        clear() {
            try {
                sessionStorage.clear();
            } catch (error) {
                console.error('Error clearing sessionStorage:', error);
            }
        }
    };
}

// Policy Modal Functions
function openPrivacyModal() {
    document.getElementById('privacyModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closePrivacyModal() {
    document.getElementById('privacyModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

function openTermsModal() {
    document.getElementById('termsModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeTermsModal() {
    document.getElementById('termsModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const privacyModal = document.getElementById('privacyModal');
    const termsModal = document.getElementById('termsModal');
    
    if (event.target === privacyModal) {
        closePrivacyModal();
    }
    
    if (event.target === termsModal) {
        closeTermsModal();
    }
});

// Close modals with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const privacyModal = document.getElementById('privacyModal');
        const termsModal = document.getElementById('termsModal');
        
        if (privacyModal.style.display === 'block') {
            closePrivacyModal();
        }
        
        if (termsModal.style.display === 'block') {
            closeTermsModal();
        }
    }
});

// Toast close button event listener
document.getElementById('toastClose').addEventListener('click', () => {
    document.getElementById('toast').classList.remove('show');
});

// Export Utils class
window.Utils = Utils;
