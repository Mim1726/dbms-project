// Main Application Module
class App {
    constructor() {
        this.currentSection = 'home';
        this.init();
    }

    // Initialize application
    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.checkAuthState();
        
        // Show home section by default
        this.showSection('home');
    }

    // Setup event listeners
    setupEventListeners() {
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const navMenu = document.getElementById('navMenu');
        const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
        
        if (mobileMenuToggle && navMenu && mobileMenuBackdrop) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileMenuToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
                mobileMenuBackdrop.classList.toggle('active');
                
                // Prevent body scroll when menu is open
                if (navMenu.classList.contains('active')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            });
            
            // Close mobile menu when clicking on nav links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenuToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                    mobileMenuBackdrop.classList.remove('active');
                    document.body.style.overflow = '';
                });
            });
            
            // Close mobile menu when clicking on backdrop
            mobileMenuBackdrop.addEventListener('click', () => {
                mobileMenuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                mobileMenuBackdrop.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
        
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionName = link.getAttribute('href').substring(1);
                this.showSection(sectionName);
            });
        });

        // Hero buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.hero-buttons button')) {
                const button = e.target.closest('button');
                if (button.onclick) {
                    button.onclick();
                }
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.section) {
                this.showSection(e.state.section, false);
            }
        });
    }

    // Setup navigation behavior
    setupNavigation() {
        // Mobile menu toggle (if needed)
        this.setupMobileMenu();
        
        // Smooth scrolling for anchor links
        this.setupSmoothScrolling();
    }

    // Setup mobile menu
    setupMobileMenu() {
        // Implementation for mobile menu toggle
        if (Utils.isMobile()) {
            this.adaptForMobile();
        }
    }

    // Setup smooth scrolling
    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Show specific section
    showSection(sectionName, addToHistory = true) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;

            // Update navigation
            this.updateNavigation(sectionName);

            // Add to browser history
            if (addToHistory) {
                history.pushState({ section: sectionName }, '', `#${sectionName}`);
            }

            // Dispatch section change event
            document.dispatchEvent(new CustomEvent('sectionChanged', {
                detail: { section: sectionName }
            }));

            // Load section-specific content
            this.loadSectionContent(sectionName);
        }
    }

    // Update navigation active state
    updateNavigation(sectionName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionName}`) {
                link.classList.add('active');
            }
        });
    }

    // Load section-specific content
    loadSectionContent(sectionName) {
        switch (sectionName) {
            case 'elections':
                if (window.Elections) {
                    window.Elections.loadElections();
                }
                break;
            case 'results':
                this.loadResultsSection();
                break;
            case 'about':
                // About section is static, no additional loading needed
                break;
            default:
                // Home section or unknown section
                break;
        }
    }

    // Load results section
    async loadResultsSection() {
        const resultsContainer = document.getElementById('resultsContainer');
        
        Utils.showLoading();
        
        try {
            // Get all elections with results
            const { data: elections, error } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .select(`
                    *,
                    candidates:candidates(
                        *,
                        votes:votes(count)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!elections || elections.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-chart-bar" style="font-size: 64px; color: #a0aec0; margin-bottom: 20px;"></i>
                        <h3>No Election Results</h3>
                        <p>There are no election results available yet.</p>
                    </div>
                `;
                return;
            }

            resultsContainer.innerHTML = elections.map(election => {
                const candidates = election.candidates || [];
                const totalVotes = candidates.reduce((sum, candidate) => {
                    return sum + (candidate.votes?.[0]?.count || 0);
                }, 0);

                // Sort candidates by vote count
                const sortedCandidates = candidates.sort((a, b) => {
                    const aVotes = a.votes?.[0]?.count || 0;
                    const bVotes = b.votes?.[0]?.count || 0;
                    return bVotes - aVotes;
                });

                const status = this.getElectionStatus(election);

                return `
                    <div class="results-container">
                        <div class="results-header">
                            <h3>${Utils.sanitizeHtml(election.title)}</h3>
                            <div class="results-meta">
                                <span class="election-status status-${status.toLowerCase()}">${status}</span>
                                <span class="total-votes">${totalVotes} votes cast</span>
                            </div>
                        </div>

                        <div class="results-list">
                            ${sortedCandidates.length > 0 ? sortedCandidates.map((candidate, index) => {
                                const votes = candidate.votes?.[0]?.count || 0;
                                const percentage = Utils.calculatePercentage(votes, totalVotes);
                                const isWinner = index === 0 && votes > 0;

                                return `
                                    <div class="result-item ${isWinner ? 'winner' : ''}">
                                        <div class="candidate-info">
                                            ${candidate.photo_url ? 
                                                `<img src="${candidate.photo_url}" alt="${candidate.name}" class="candidate-photo">` :
                                                `<div class="candidate-placeholder"><i class="fas fa-user"></i></div>`
                                            }
                                            <div class="candidate-details">
                                                <h4>${Utils.sanitizeHtml(candidate.name)}</h4>
                                                <p>${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                                ${isWinner ? '<span class="winner-badge"><i class="fas fa-crown"></i> Winner</span>' : ''}
                                            </div>
                                        </div>
                                        
                                        <div class="vote-progress">
                                            <div class="progress-bar">
                                                <div class="progress-fill" style="width: ${percentage}%"></div>
                                            </div>
                                            <div class="vote-stats">
                                                <span class="vote-count">${votes} votes</span>
                                                <span class="vote-percentage">${percentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('') : '<p class="no-candidates">No candidates registered yet.</p>'}
                        </div>

                        <div class="results-actions">
                            <button class="btn btn-outline" onclick="window.Elections.viewElectionResults('${election.id}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading results:', error);
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading results. Please try again later.</p>
                </div>
            `;
        } finally {
            Utils.hideLoading();
        }
    }

    // Get election status
    getElectionStatus(election) {
        const now = new Date();
        const startDate = new Date(election.start_date);
        const endDate = new Date(election.end_date);

        if (now < startDate) {
            return 'Upcoming';
        } else if (now >= startDate && now <= endDate) {
            return 'Active';
        } else {
            return 'Ended';
        }
    }

    // Check authentication state on app load
    checkAuthState() {
        // Check if user was previously logged in
        const savedUser = Utils.sessionStorage.get('currentUser');
        const savedRole = Utils.sessionStorage.get('userRole');

        if (savedUser && savedRole && window.Auth) {
            // Restore auth state
            window.Auth.currentUser = savedUser;
            window.Auth.userRole = savedRole;
            window.Auth.updateUIForAuthenticatedUser();
        }
    }

    // Handle window resize
    handleResize() {
        // Adjust layout for different screen sizes
        if (Utils.isMobile()) {
            this.adaptForMobile();
        } else {
            this.adaptForDesktop();
        }
    }

    // Adapt interface for mobile
    adaptForMobile() {
        // Add mobile-specific adaptations
        document.body.classList.add('mobile-view');
    }

    // Adapt interface for desktop
    adaptForDesktop() {
        // Remove mobile-specific adaptations
        document.body.classList.remove('mobile-view');
    }

    // Show loading state
    showLoading() {
        Utils.showLoading();
    }

    // Hide loading state
    hideLoading() {
        Utils.hideLoading();
    }

    // Show toast message
    showToast(message, type = 'info') {
        Utils.showToast(message, type);
    }

    // Get current section
    getCurrentSection() {
        return this.currentSection;
    }

    // Initialize keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            }

            // Ctrl/Cmd + K for search (if implemented)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                // Implement search functionality
            }
        });
    }

    // Handle offline/online status
    setupNetworkStatus() {
        window.addEventListener('online', () => {
            Utils.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            Utils.showToast('Connection lost. Some features may not work.', 'warning');
        });
    }

    // Initialize service worker (for PWA functionality)
    async initServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

// Global functions for onclick handlers
function showSection(sectionName) {
    if (window.App) {
        window.App.showSection(sectionName);
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const icon = document.getElementById(inputId + 'Icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Show user profile modal
async function showUserProfile() {
    if (!window.Auth || !window.Auth.isAuthenticated()) {
        Utils.showToast('Please log in to view profile', 'warning');
        return;
    }

    const modal = document.getElementById('userProfileModal');
    const content = document.getElementById('userProfileContent');
    
    Utils.showLoading();
    
    try {
        const currentUser = window.Auth.getCurrentUser();
        const userRole = window.Auth.getUserRole();
        
        let userData = null;
        let profileData = {};
        
        if (userRole === 'admin') {
            // Get admin details
            const { data, error } = await supabase
                .from('admin')
                .select('*')
                .eq('admin_id', currentUser.id)
                .single();
                
            if (error) throw error;
            userData = data;
            
            profileData = {
                name: userData.full_name || userData.email,
                email: userData.email,
                role: 'Admin',
                phone: userData.phone || 'Not provided',
                permissions: userData.permissions || 'Full Access',
                created_at: userData.created_at,
                last_login: 'Just now'
            };
            
        } else if (userRole === 'voter') {
            // Get voter details
            const { data, error } = await supabase
                .from('voter')
                .select('*')
                .eq('voter_id', currentUser.id)
                .single();
                
            if (error) throw error;
            userData = data;
            
            profileData = {
                name: userData.full_name || userData.email,
                email: userData.email,
                role: 'Voter',
                phone: userData.phone || 'Not provided',
                address: userData.address || 'Not provided',
                dob: userData.dob ? new Date(userData.dob).toLocaleDateString() : 'Not provided',
                verification_status: userData.is_verified === 'Y' ? 'verified' : 'pending',
                registered_at: userData.created_at
            };
        }
        
        // Generate profile HTML
        const profileHTML = generateProfileHTML(profileData, userRole);
        content.innerHTML = profileHTML;
        
        // Show modal
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        Utils.showToast('Error loading profile data', 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Generate profile HTML
function generateProfileHTML(profileData, userRole) {
    const firstLetter = profileData.name.charAt(0).toUpperCase();
    
    return `
        <div class="user-profile">
            <div class="profile-header">
                <div class="profile-avatar">
                    ${firstLetter}
                </div>
                <div class="profile-name">${Utils.sanitizeHtml(profileData.name)}</div>
                <span class="profile-role role-${userRole.toLowerCase()}">${profileData.role}</span>
            </div>
            
            <div class="profile-details">
                <div class="profile-section">
                    <h3><i class="fas fa-user"></i> Personal Information</h3>
                    <div class="profile-field">
                        <span class="profile-field-label">Full Name</span>
                        <span class="profile-field-value">${Utils.sanitizeHtml(profileData.name)}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Email</span>
                        <span class="profile-field-value">${Utils.sanitizeHtml(profileData.email)}</span>
                    </div>
                    <div class="profile-field">
                        <span class="profile-field-label">Phone</span>
                        <span class="profile-field-value">${Utils.sanitizeHtml(profileData.phone)}</span>
                    </div>
                    ${userRole === 'voter' ? `
                        <div class="profile-field">
                            <span class="profile-field-label">Address</span>
                            <span class="profile-field-value">${Utils.sanitizeHtml(profileData.address)}</span>
                        </div>
                        <div class="profile-field">
                            <span class="profile-field-label">Date of Birth</span>
                            <span class="profile-field-value">${Utils.sanitizeHtml(profileData.dob)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="profile-section">
                    <h3><i class="fas fa-shield-alt"></i> Account Status</h3>
                    <div class="profile-field">
                        <span class="profile-field-label">Role</span>
                        <span class="profile-field-value">${profileData.role}</span>
                    </div>
                    ${userRole === 'voter' ? `
                        <div class="profile-field">
                            <span class="profile-field-label">Verification Status</span>
                            <span class="profile-field-value">
                                <span class="verification-status ${profileData.verification_status}">
                                    ${profileData.verification_status === 'verified' ? 'Verified' : 'Pending Verification'}
                                </span>
                            </span>
                        </div>
                        <div class="profile-field">
                            <span class="profile-field-label">Registered</span>
                            <span class="profile-field-value">${formatDate(profileData.registered_at)}</span>
                        </div>
                    ` : `
                        <div class="profile-field">
                            <span class="profile-field-label">Permissions</span>
                            <span class="profile-field-value">${Utils.sanitizeHtml(profileData.permissions)}</span>
                        </div>
                        <div class="profile-field">
                            <span class="profile-field-label">Last Login</span>
                            <span class="profile-field-value">${profileData.last_login}</span>
                        </div>
                    `}
                </div>
            </div>
            
            <div class="profile-actions">
                <button class="btn btn-outline" onclick="closeUserProfile()">
                    <i class="fas fa-times"></i> Close
                </button>
                <button class="btn btn-primary" onclick="editUserProfile()">
                    <i class="fas fa-edit"></i> Edit Profile
                </button>
            </div>
        </div>
    `;
}

// Close user profile modal
function closeUserProfile() {
    const modal = document.getElementById('userProfileModal');
    modal.style.display = 'none';
}

// Edit user profile (placeholder)
async function editUserProfile() {
    if (!window.Auth || !window.Auth.isAuthenticated()) {
        Utils.showToast('Please log in to edit profile', 'warning');
        return;
    }

    const editModal = document.getElementById('editProfileModal');
    const editContent = document.getElementById('editProfileContent');
    
    Utils.showLoading();
    
    try {
        const currentUser = window.Auth.getCurrentUser();
        const userRole = window.Auth.getUserRole();
        
        let userData = null;
        
        if (userRole === 'admin') {
            // Get admin details
            const { data, error } = await supabase
                .from('admin')
                .select('*')
                .eq('admin_id', currentUser.id)
                .single();
                
            if (error) throw error;
            userData = data;
        } else if (userRole === 'voter') {
            // Get voter details
            const { data, error } = await supabase
                .from('voter')
                .select('*')
                .eq('voter_id', currentUser.id)
                .single();
                
            if (error) throw error;
            userData = data;
        }
        
        // Generate edit form HTML
        const editFormHTML = generateEditFormHTML(userData, userRole);
        editContent.innerHTML = editFormHTML;
        
        // Close profile modal and show edit modal
        closeUserProfile();
        editModal.style.display = 'block';
        
        // Setup form handler
        setupEditProfileForm(userData, userRole);
        
    } catch (error) {
        console.error('Error loading edit profile:', error);
        Utils.showToast('Error loading profile for editing', 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Generate edit form HTML
function generateEditFormHTML(userData, userRole) {
    if (userRole === 'admin') {
        return `
            <div class="edit-profile-form">
                <div class="form-section">
                    <h3><i class="fas fa-user"></i> Personal Information</h3>
                    <div class="form-group">
                        <label for="editFullName">Full Name</label>
                        <input type="text" id="editFullName" value="${Utils.sanitizeHtml(userData.full_name || '')}" required>
                    </div>
                    <div class="form-group">
                        <label for="editEmail">Email</label>
                        <input type="email" id="editEmail" value="${Utils.sanitizeHtml(userData.email || '')}" readonly>
                        <small>Email cannot be changed for security reasons</small>
                    </div>
                    <div class="form-group">
                        <label for="editPhone">Phone Number</label>
                        <input type="tel" id="editPhone" value="${Utils.sanitizeHtml(userData.phone || '')}" placeholder="Enter phone number">
                    </div>
                </div>
                
                <div class="form-section">
                    <h3><i class="fas fa-lock"></i> Change Password</h3>
                    <div class="form-group">
                        <label for="editCurrentPassword">Current Password</label>
                        <input type="password" id="editCurrentPassword" placeholder="Enter current password">
                    </div>
                    <div class="form-group">
                        <label for="editNewPassword">New Password</label>
                        <input type="password" id="editNewPassword" placeholder="Enter new password (leave blank to keep current)">
                    </div>
                    <div class="form-group">
                        <label for="editConfirmPassword">Confirm New Password</label>
                        <input type="password" id="editConfirmPassword" placeholder="Confirm new password">
                    </div>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="edit-profile-form">
                <div class="form-section">
                    <h3><i class="fas fa-user"></i> Personal Information</h3>
                    <div class="form-group">
                        <label for="editFullName">Full Name</label>
                        <input type="text" id="editFullName" value="${Utils.sanitizeHtml(userData.full_name || '')}" required>
                    </div>
                    <div class="form-group">
                        <label for="editEmail">Email</label>
                        <input type="email" id="editEmail" value="${Utils.sanitizeHtml(userData.email || '')}" readonly>
                        <small>Email cannot be changed for security reasons</small>
                    </div>
                    <div class="form-group">
                        <label for="editPhone">Phone Number</label>
                        <input type="tel" id="editPhone" value="${Utils.sanitizeHtml(userData.phone || '')}" placeholder="Enter phone number">
                    </div>
                    <div class="form-group">
                        <label for="editAddress">Address</label>
                        <textarea id="editAddress" rows="3" placeholder="Enter your address">${Utils.sanitizeHtml(userData.address || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editDob">Date of Birth</label>
                        <input type="date" id="editDob" value="${userData.dob ? userData.dob.split('T')[0] : ''}">
                    </div>
                </div>
                
                <div class="form-section">
                    <h3><i class="fas fa-lock"></i> Change Password</h3>
                    <div class="form-group">
                        <label for="editCurrentPassword">Current Password</label>
                        <input type="password" id="editCurrentPassword" placeholder="Enter current password">
                    </div>
                    <div class="form-group">
                        <label for="editNewPassword">New Password</label>
                        <input type="password" id="editNewPassword" placeholder="Enter new password (leave blank to keep current)">
                    </div>
                    <div class="form-group">
                        <label for="editConfirmPassword">Confirm New Password</label>
                        <input type="password" id="editConfirmPassword" placeholder="Confirm new password">
                    </div>
                </div>
            </div>
        `;
    }
}

// Setup edit profile form handler
function setupEditProfileForm(userData, userRole) {
    const form = document.getElementById('editProfileForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        Utils.showLoading();
        
        try {
            const formData = new FormData(form);
            const updates = {};
            
            // Get form values
            const fullName = document.getElementById('editFullName').value.trim();
            const phone = document.getElementById('editPhone').value.trim();
            const currentPassword = document.getElementById('editCurrentPassword').value;
            const newPassword = document.getElementById('editNewPassword').value;
            const confirmPassword = document.getElementById('editConfirmPassword').value;
            
            // Validate required fields
            if (!fullName) {
                Utils.showToast('Full name is required', 'error');
                return;
            }
            
            // Password validation
            if (newPassword && newPassword !== confirmPassword) {
                Utils.showToast('New passwords do not match', 'error');
                return;
            }
            
            if (newPassword && newPassword.length < 6) {
                Utils.showToast('New password must be at least 6 characters', 'error');
                return;
            }
            
            // Prepare updates object
            updates.full_name = fullName;
            updates.phone = phone;
            
            if (userRole === 'voter') {
                const address = document.getElementById('editAddress').value.trim();
                const dob = document.getElementById('editDob').value;
                
                updates.address = address;
                if (dob) updates.dob = dob;
            }
            
            // Update profile in database
            const table = userRole === 'admin' ? 'admin' : 'voter';
            const idField = userRole === 'admin' ? 'admin_id' : 'voter_id';
            const userId = window.Auth.getCurrentUser().id;
            
            const { error: updateError } = await supabase
                .from(table)
                .update(updates)
                .eq(idField, userId);
            
            if (updateError) throw updateError;
            
            // Handle password change if requested
            if (newPassword && currentPassword) {
                try {
                    const { error: passwordError } = await supabase.auth.updateUser({
                        password: newPassword
                    });
                    
                    if (passwordError) {
                        Utils.showToast('Profile updated but password change failed: ' + passwordError.message, 'warning');
                    } else {
                        Utils.showToast('Profile and password updated successfully!', 'success');
                    }
                } catch (passError) {
                    Utils.showToast('Profile updated but password change failed', 'warning');
                }
            } else {
                Utils.showToast('Profile updated successfully!', 'success');
            }
            
            // Close edit modal
            closeEditProfile();
            
            // Refresh profile display if it's open
            const profileModal = document.getElementById('userProfileModal');
            if (profileModal.style.display === 'block') {
                showUserProfile();
            }
            
        } catch (error) {
            console.error('Error updating profile:', error);
            Utils.showToast('Failed to update profile: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    });
}

// Close edit profile modal
function closeEditProfile() {
    const modal = document.getElementById('editProfileModal');
    modal.style.display = 'none';
    
    // Clear form
    const form = document.getElementById('editProfileForm');
    if (form) form.reset();
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'Not available';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.App = new App();
    
    // Clear any auto-filled password fields
    clearAutoFilledPasswords();
    
    // Setup keyboard shortcuts
    window.App.setupKeyboardShortcuts();
    
    // Setup network status monitoring
    window.App.setupNetworkStatus();
    
    // Initialize service worker
    window.App.initServiceWorker();
});

// Clear auto-filled password fields on page load
function clearAutoFilledPasswords() {
    setTimeout(() => {
        const passwordFields = [
            'loginPassword',
            'registerPassword', 
            'registerConfirmPassword'
        ];
        
        passwordFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value) {
                field.value = '';
            }
        });
    }, 100); // Small delay to ensure DOM is fully loaded
}

// Export App class
window.App = App;
