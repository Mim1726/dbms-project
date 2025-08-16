// Authentication Module
class Auth {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.init();
    }

    // Initialize authentication
    async init() {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            await this.handleAuthStateChange(session);
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                await this.handleAuthStateChange(session);
            } else if (event === 'SIGNED_OUT') {
                this.handleSignOut();
            }
        });

        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Login button
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.showAuthModal('login');
        });

        // Register button
        document.getElementById('registerBtn').addEventListener('click', () => {
            this.showAuthModal('register');
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.signOut();
        });

        // Modal close
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Modal background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Login form
        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e);
        });

        // Register form
        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(e);
        });

        // Dashboard back buttons
        document.getElementById('backToMain').addEventListener('click', () => {
            this.showMainInterface();
        });

        document.getElementById('backToMainVoter').addEventListener('click', () => {
            this.showMainInterface();
        });
    }

    // Show authentication modal
    showAuthModal(type) {
        const modal = document.getElementById('authModal');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (type === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }

        modal.style.display = 'block';
    }

    // Handle login
    async handleLogin(event) {
        const formData = new FormData(event.target);
        const email = formData.get('loginEmail') || document.getElementById('loginEmail').value;
        const password = formData.get('loginPassword') || document.getElementById('loginPassword').value;
        const userType = document.querySelector('input[name="userType"]:checked').value;

        if (!email || !password) {
            Utils.showToast('Please fill in all fields', 'error');
            return;
        }

        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Please enter a valid email address', 'error');
            return;
        }

        Utils.showLoading();

        try {
            let userData = null;
            
            if (userType === 'admin') {
                // Check admin table
                const { data: adminData, error: adminError } = await supabase
                    .from('admin')
                    .select('*')
                    .eq('email', email)
                    .single();

                if (adminError || !adminData) {
                    throw new Error('Invalid admin credentials');
                }

                // In a real app, you'd verify the password hash here
                // For now, we'll do a simple comparison (NOT secure for production)
                if (adminData.password !== password) {
                    throw new Error('Invalid password');
                }

                userData = {
                    id: adminData.admin_id,
                    email: adminData.email,
                    full_name: adminData.full_name,
                    role: 'admin'
                };
            } else {
                // Check voter table
                const { data: voterData, error: voterError } = await supabase
                    .from('voter')
                    .select('*')
                    .eq('email', email)
                    .single();

                if (voterError || !voterData) {
                    throw new Error('Invalid voter credentials');
                }

                // In a real app, you'd verify the password hash here
                if (voterData.password !== password) {
                    throw new Error('Invalid password');
                }

                userData = {
                    id: voterData.voter_id,
                    email: voterData.email,
                    full_name: voterData.full_name,
                    role: 'voter',
                    is_verified: voterData.is_verified === 'Y'
                };
            }

            // Store user info
            this.currentUser = userData;
            this.userRole = userType;

            // Store in session storage
            Utils.sessionStorage.set('currentUser', userData);
            Utils.sessionStorage.set('userRole', userType);

            // Close modal and show appropriate dashboard
            document.getElementById('authModal').style.display = 'none';
            
            if (userType === 'admin') {
                this.showAdminDashboard();
            } else {
                this.showVoterDashboard();
            }

            Utils.showToast(`Welcome back, ${userData.full_name}!`, 'success');

        } catch (error) {
            console.error('Login error:', error);
            Utils.showToast(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Handle registration
    async handleRegister(event) {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const fullName = document.getElementById('registerName').value;
        const phone = document.getElementById('registerPhone').value;

        // Validation
        if (!email || !password || !confirmPassword || !fullName || !phone) {
            Utils.showToast('Please fill in all fields', 'error');
            return;
        }

        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Please enter a valid email address', 'error');
            return;
        }

        if (password !== confirmPassword) {
            Utils.showToast('Passwords do not match', 'error');
            return;
        }

        const passwordValidation = Utils.validatePassword(password);
        if (!passwordValidation.isValid) {
            Utils.showToast(passwordValidation.errors.join('. '), 'error');
            return;
        }

        Utils.showLoading();

        try {
            // Create voter record in database
            const { error: insertError } = await supabase
                .from('voter')
                .insert([{
                    full_name: fullName,
                    email: email,
                    password: password, // Note: In production, hash this password!
                    phone: phone,
                    dob: '1990-01-01', // Default DOB - you might want to add this to the form
                    address: 'Not provided', // Default address - you might want to add this to the form
                    is_verified: 'N',
                    role: 'voter'
                }]);

            if (insertError) throw insertError;

            Utils.showToast('Registration successful! Please wait for admin verification.', 'success');
            
            // Close modal and switch to login
            document.getElementById('authModal').style.display = 'none';
            setTimeout(() => {
                this.showAuthModal('login');
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error);
            Utils.showToast(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Generate unique voter ID
    generateVoterId() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `V${timestamp}${random}`;
    }

    // Handle auth state change
    async handleAuthStateChange(session) {
        if (session && session.user) {
            try {
                // Get user data from database
                const { data: userData, error } = await supabase
                    .from(CONFIG.TABLES.USERS)
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) throw error;

                this.currentUser = userData;
                this.userRole = userData.role;

                // Store in session storage
                Utils.sessionStorage.set('currentUser', userData);
                Utils.sessionStorage.set('userRole', userData.role);

                this.updateUIForAuthenticatedUser();

            } catch (error) {
                console.error('Error fetching user data:', error);
                this.signOut();
            }
        }
    }

    // Handle sign out
    handleSignOut() {
        this.currentUser = null;
        this.userRole = null;
        
        // Clear session storage
        Utils.sessionStorage.clear();
        
        this.updateUIForUnauthenticatedUser();
        this.showMainInterface();
        
        Utils.showToast('You have been logged out', 'info');
    }

    // Sign out
    async signOut() {
        Utils.showLoading();
        
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
        } catch (error) {
            console.error('Sign out error:', error);
            Utils.showToast('Error signing out', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Update UI for authenticated user
    updateUIForAuthenticatedUser() {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
    }

    // Update UI for unauthenticated user
    updateUIForUnauthenticatedUser() {
        document.getElementById('loginBtn').style.display = 'inline-block';
        document.getElementById('registerBtn').style.display = 'inline-block';
        document.getElementById('logoutBtn').style.display = 'none';
    }

    // Show admin dashboard
    showAdminDashboard() {
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        document.getElementById('voterDashboard').style.display = 'none';
        
        // Load admin content
        if (window.Admin) {
            window.Admin.loadDashboard();
        }
    }

    // Show voter dashboard
    showVoterDashboard() {
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('voterDashboard').style.display = 'block';
        
        // Load voter content
        this.loadVoterDashboard();
    }

    // Show main interface
    showMainInterface() {
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('voterDashboard').style.display = 'none';
    }

    // Load voter dashboard content
    async loadVoterDashboard() {
        const voterContent = document.getElementById('voterContent');
        
        try {
            // Get voter info (current user is already the voter data)
            const voterData = this.currentUser;

            // Get active elections
            const { data: elections, error: electionsError } = await supabase
                .from('election')
                .select('*')
                .eq('is_active', 'Y')
                .order('election_date', { ascending: false });

            if (electionsError) throw electionsError;

            // Get voter's voting history through contest and vote tables
            const { data: votes, error: votesError } = await supabase
                .from('vote')
                .select(`
                    *,
                    contest:contest_id (
                        *,
                        election:election_id (*),
                        candidate:candidate_id (*)
                    )
                `)
                .eq('voter_id', voterData.id);

            if (votesError) throw votesError;

            voterContent.innerHTML = `
                <div class="voter-info">
                    <h3>Welcome, ${this.currentUser.full_name}</h3>
                    <p>Voter ID: ${voterData.id}</p>
                    <p>Registration Date: ${Utils.formatDate(voterData.registration_date)}</p>
                    <p>Status: ${voterData.is_verified ? 'Verified' : 'Pending Verification'}</p>
                </div>

                <div class="active-elections">
                    <h3>Active Elections</h3>
                    <div class="elections-grid">
                        ${elections.map(election => `
                            <div class="election-card">
                                <h4>${Utils.sanitizeHtml(election.name)}</h4>
                                <p>${Utils.sanitizeHtml(election.description || 'No description available')}</p>
                                <p>Date: ${Utils.formatDate(election.election_date)}</p>
                                <p>Type: ${Utils.sanitizeHtml(election.election_type)}</p>
                                <button class="btn btn-primary" onclick="window.Voting.startVoting('${election.election_id}')">
                                    Vote Now
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="voting-history">
                    <h3>Your Voting History</h3>
                    <div class="votes-list">
                        ${votes.length > 0 ? votes.map(vote => `
                            <div class="vote-item">
                                <strong>Election: ${Utils.sanitizeHtml(vote.contest?.election?.name || 'Unknown Election')}</strong>
                                <p>Candidate: ${Utils.sanitizeHtml(vote.contest?.candidate?.full_name || 'Unknown Candidate')}</p>
                                <p>Date: ${Utils.formatDate(vote.vote_timestamp)}</p>
                            </div>
                        `).join('') : '<p>No voting history yet.</p>'}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error loading voter dashboard:', error);
            voterContent.innerHTML = '<p>Error loading dashboard. Please try again.</p>';
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Check if user has specific role
    hasRole(role) {
        return this.userRole === role;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get user role
    getUserRole() {
        return this.userRole;
    }
}

// Switch between login and register forms
function switchToRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function switchToLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.Auth = new Auth();
});

// Export Auth class
window.Auth = Auth;
