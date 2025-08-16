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

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.App = new App();
    
    // Setup keyboard shortcuts
    window.App.setupKeyboardShortcuts();
    
    // Setup network status monitoring
    window.App.setupNetworkStatus();
    
    // Initialize service worker
    window.App.initServiceWorker();
});

// Export App class
window.App = App;
