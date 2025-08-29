// Authentication Module
class Auth {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.init();
    }

    // Initialize authentication
    async init() {
        // Check for existing session from sessionStorage first
        const storedUser = Utils.sessionStorage.get('currentUser');
        const storedRole = Utils.sessionStorage.get('userRole');
        
        if (storedUser && storedRole) {
            console.log('Restoring session from storage:', storedUser);
            this.currentUser = storedUser;
            this.userRole = storedRole;
            
            // Ensure navbar is visible before updating navigation
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                navbar.style.display = 'block';
            }
            
            this.updateUIForAuthenticatedUser();
            this.updateNavigationForDashboard(storedRole);
            this.showDashboardInterface(storedRole);
        }

        // Check for existing Supabase session
        const { data: { session } } = await window.supabase.auth.getSession();
        
        if (session) {
            await this.handleAuthStateChange(session);
        }

        // Listen for auth state changes
        window.supabase.auth.onAuthStateChange(async (event, session) => {
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

        // Clear all password fields to prevent auto-fill
        this.clearPasswordFields();

        if (type === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }

        modal.style.display = 'block';
    }

    // Clear password fields to prevent auto-fill
    clearPasswordFields() {
        const passwordFields = [
            'loginPassword',
            'registerPassword', 
            'registerConfirmPassword'
        ];
        
        passwordFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });
        
        // Also clear email fields to be safe
        const emailFields = ['loginEmail', 'registerEmail'];
        emailFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });
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
                    voter_id: voterData.voter_id,
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
            
            // Update UI to show logout button and hide login/register buttons
            this.updateUIForAuthenticatedUser();
            
            // Show dashboard-style interface instead of specialized dashboards
            this.showDashboardInterface(userType);

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
        const dob = document.getElementById('registerDob').value;
        const nid = document.getElementById('registerNid').value;

        // Validation
        if (!email || !password || !confirmPassword || !fullName || !phone || !dob || !nid) {
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
                    dob: dob,
                    nid_number: nid,
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
        
        // Restore normal navigation
        this.restoreNormalNavigation();
        
        // Hide dashboard sections and show normal sections
        const dashboardSection = document.getElementById('dashboard-home-section');
        if (dashboardSection) {
            dashboardSection.style.display = 'none';
        }
        
        this.updateUIForUnauthenticatedUser();
        this.showMainInterface();
        
        Utils.showToast('You have been logged out', 'info');
    }

    // Restore normal navigation
    restoreNormalNavigation() {
        const navMenu = document.getElementById('navMenu');
        if (!navMenu) return;

        // Remove dashboard navigation
        const dashboardNav = document.getElementById('dashboardNav');
        if (dashboardNav) {
            dashboardNav.remove();
        }
        
        // Restore original navigation links if they don't exist
        const existingLinks = navMenu.querySelectorAll('.nav-link');
        if (existingLinks.length === 0) {
            // Recreate original navigation
            const originalNav = document.createElement('div');
            originalNav.innerHTML = `
                <a href="#home" class="nav-link active">Home</a>
                <a href="#about" class="nav-link">About</a>
                <a href="#elections" class="nav-link">Elections</a>
                <a href="#results" class="nav-link">Results</a>
            `;
            
            // Insert before auth buttons
            const authButtons = navMenu.querySelector('.auth-buttons');
            const children = originalNav.children;
            while (children.length > 0) {
                navMenu.insertBefore(children[0], authButtons);
            }
        }
        
        // Reset active states
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        const homeLink = navMenu.querySelector('a[href="#home"]');
        if (homeLink) {
            homeLink.classList.add('active');
        }
    }

    // Sign out
    async signOut() {
        Utils.showLoading();
        
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // Call the sign out handler to clean up the UI and state
            this.handleSignOut();
            
        } catch (error) {
            console.error('Sign out error:', error);
            Utils.showToast('Error signing out', 'error');
            
            // Even if Supabase sign out fails, clean up local state
            this.handleSignOut();
        } finally {
            Utils.hideLoading();
        }
    }

    // Update UI for authenticated user
    updateUIForAuthenticatedUser() {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        
        // Update user name display
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        
        if (this.currentUser && userName) {
            userName.textContent = this.currentUser.full_name || this.currentUser.email;
            userName.title = 'Click to view profile'; // Add tooltip
        }
        
            if (userRole) {
                // Default role
                let displayRole = this.userRole;
                let roleClass = `user-role role-${this.userRole}`;

                // If voter, check if approved candidate in any active election
                if (this.userRole === 'voter') {
                    this.checkCandidateRole(userRole);
                } else {
                    userRole.textContent = displayRole;
                    userRole.className = roleClass;
                }
            }
    }

        // Check if voter is approved candidate in any active election
        async checkCandidateRole(userRoleElem) {
            try {
                const voterName = this.currentUser.full_name;
                // Get all active elections
                const { data: elections, error: electionsError } = await supabase
                    .from('election')
                    .select('election_id, name, election_date, is_active')
                    .eq('is_active', 'Y');

                if (electionsError || !elections || elections.length === 0) {
                    userRoleElem.textContent = 'voter';
                    userRoleElem.className = 'user-role role-voter';
                    return;
                }

                // For each active election, check if this voter is an approved candidate
                let isCandidate = false;
                for (const election of elections) {
                    // Find candidate record for this voter in this election
                    const { data: candidate, error: candidateError } = await supabase
                        .from('candidate')
                        .select('candidate_id')
                        .eq('full_name', voterName)
                        .eq('election_id', election.election_id)
                        .single();

                    if (candidateError || !candidate) continue;

                    // Check if candidate is approved (exists in contest table)
                    const { data: contest, error: contestError } = await supabase
                        .from('contest')
                        .select('contest_id')
                        .eq('candidate_id', candidate.candidate_id)
                        .eq('election_id', election.election_id)
                        .single();

                    if (contestError || !contest) continue;

                    // Check if election is still active (not ended)
                    // If election_date is in the future, still active
                    const now = new Date();
                    const electionDate = new Date(election.election_date);
                    if (electionDate >= now) {
                        isCandidate = true;
                        break;
                    }
                }

                if (isCandidate) {
                    userRoleElem.textContent = 'candidate';
                    userRoleElem.className = 'user-role role-candidate';
                } else {
                    userRoleElem.textContent = 'voter';
                    userRoleElem.className = 'user-role role-voter';
                }
            } catch (error) {
                userRoleElem.textContent = 'voter';
                userRoleElem.className = 'user-role role-voter';
            }
        }

    // Update UI for unauthenticated user
    updateUIForUnauthenticatedUser() {
        document.getElementById('loginBtn').style.display = 'inline-block';
        document.getElementById('registerBtn').style.display = 'inline-block';
        document.getElementById('userInfo').style.display = 'none';
    }

    // Show dashboard interface (modified main content with dashboard navigation)
    showDashboardInterface(userType) {
        // Keep main content visible but modify navigation
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('voterDashboard').style.display = 'none';
        
        // Update navigation to dashboard style
        this.updateNavigationForDashboard(userType);
        
        // Show home section with dashboard content
        this.showDashboardHome(userType);
    }

    // Update navigation for dashboard mode
    updateNavigationForDashboard(userType) {
        console.log('Updating navigation for dashboard mode, userType:', userType);
        const navMenu = document.getElementById('navMenu');
        if (!navMenu) {
            console.error('navMenu not found');
            return;
        }

        // Make sure navbar is visible
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.display = 'block';
            console.log('Navbar made visible');
        }

        // Remove any existing dashboard nav
        const existingDashboardNav = document.getElementById('dashboardNav');
        if (existingDashboardNav) {
            existingDashboardNav.remove();
        }

        // Find the nav links container and clear it
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.remove();
        });
        
        // Add dashboard navigation
        const dashboardNav = document.createElement('div');
        dashboardNav.id = 'dashboardNav';
        dashboardNav.className = 'dashboard-nav';
        dashboardNav.style.display = 'flex';
        dashboardNav.style.alignItems = 'center';
        dashboardNav.style.gap = '1rem';
        
        if (userType === 'admin') {
            dashboardNav.innerHTML = `
                <a href="#dashboard-home" class="nav-link active" onclick="showDashboardSection('home')">Dashboard</a>
            `;
        } else {
            dashboardNav.innerHTML = `
                <a href="#dashboard-home" class="nav-link active" onclick="showDashboardSection('home')">Dashboard</a>
                <a href="#available-elections" class="nav-link" onclick="showDashboardSection('elections')">Elections</a>
                <a href="#my-votes" class="nav-link" onclick="showDashboardSection('my-votes')">My Votes</a>
                <a href="#election-results" class="nav-link" onclick="showDashboardSection('results')">Results</a>
            `;
        }
        
        // Insert before auth buttons
        const authButtons = navMenu.querySelector('.auth-buttons');
        if (authButtons) {
            navMenu.insertBefore(dashboardNav, authButtons);
            console.log('Dashboard navigation inserted before auth buttons');
        } else {
            navMenu.appendChild(dashboardNav);
            console.log('Dashboard navigation appended to navMenu');
        }
        
        console.log('Dashboard navigation added:', dashboardNav);
    }

    // Show dashboard home content
    showDashboardHome(userType) {
        // Hide all existing sections
        document.querySelectorAll('#mainContent .section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show or create dashboard home section
        let dashboardHomeSection = document.getElementById('dashboard-home-section');
        if (!dashboardHomeSection) {
            dashboardHomeSection = document.createElement('section');
            dashboardHomeSection.id = 'dashboard-home-section';
            dashboardHomeSection.className = 'section active';
            document.getElementById('mainContent').appendChild(dashboardHomeSection);
        }
        
        dashboardHomeSection.style.display = 'block';
        
        if (userType === 'admin') {
            this.loadAdminDashboardHome(dashboardHomeSection);
        } else {
            this.loadVoterDashboardHome(dashboardHomeSection);
        }
    }

    // Load admin dashboard home content
    loadAdminDashboardHome(container) {
        container.innerHTML = `
            <div class="dashboard-home">
                <div class="dashboard-header">
                    <h1>Admin Dashboard</h1>
                    <p>Welcome back, ${this.currentUser.full_name}! Manage your elections and oversee the voting process.</p>
                </div>
                
                <div class="dashboard-stats" id="adminStats">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-vote-yea"></i></div>
                        <div class="stat-info">
                            <h3 id="totalElections">-</h3>
                            <p>Total Elections</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-users"></i></div>
                        <div class="stat-info">
                            <h3 id="totalCandidates">-</h3>
                            <p>Total Candidates</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-user-check"></i></div>
                        <div class="stat-info">
                            <h3 id="totalVoters">-</h3>
                            <p>Registered Voters</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-chart-bar"></i></div>
                        <div class="stat-info">
                            <h3 id="totalVotes">-</h3>
                            <p>Total Votes Cast</p>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-actions">
                    <div class="action-grid">
                        <div class="action-card" onclick="showDashboardSection('elections')">
                            <i class="fas fa-cogs"></i>
                            <h3>Manage Elections</h3>
                            <p>Set up new elections and manage existing ones</p>
                        </div>
                        <div class="action-card" onclick="showDashboardSection('candidates')">
                            <i class="fas fa-user-plus"></i>
                            <h3>Manage Candidates</h3>
                            <p>Review and approve candidate applications</p>
                        </div>
                        <div class="action-card" onclick="showDashboardSection('voters')">
                            <i class="fas fa-user-check"></i>
                            <h3>Verify Voters</h3>
                            <p>Review and verify voter registrations</p>
                        </div>
                        <div class="action-card" onclick="showDashboardSection('results')">
                            <i class="fas fa-chart-line"></i>
                            <h3>View Results</h3>
                            <p>Monitor election results and analytics</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load stats
        this.loadAdminStats();
    }

    // Load voter dashboard home content  
    loadVoterDashboardHome(container) {
        container.innerHTML = `
            <div class="dashboard-home">
                <div class="dashboard-header">
                    <h2>Voter Dashboard</h2>
                    <p>Welcome back, ${this.currentUser.full_name}! Stay informed and participate in elections.</p>
                </div>
                
                <div class="dashboard-stats" id="voterStats">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-vote-yea"></i></div>
                        <div class="stat-info">
                            <h3 id="availableElections">-</h3>
                            <p>Available Elections</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-info">
                            <h3 id="myVotes">-</h3>
                            <p>Votes Cast</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="stat-info">
                            <h3 id="upcomingElections">-</h3>
                            <p>Upcoming Elections</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-chart-bar"></i></div>
                        <div class="stat-info">
                            <h3 id="completedElections">-</h3>
                            <p>Past Elections</p>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-actions">
                    <div class="action-grid">
                        <div class="action-card" onclick="showDashboardSection('elections')">
                            <i class="fas fa-vote-yea"></i>
                            <h3>Vote Now</h3>
                            <p>Participate in available elections</p>
                        </div>
                        <div class="action-card" onclick="showDashboardSection('my-votes')">
                            <i class="fas fa-history"></i>
                            <h3>My Voting History</h3>
                            <p>View your past voting activity</p>
                        </div>
                        <div class="action-card" onclick="showDashboardSection('results')">
                            <i class="fas fa-chart-pie"></i>
                            <h3>Election Results</h3>
                            <p>View results of completed elections</p>
                        </div>
                    </div>
                </div>
                
                <div class="recent-activity" id="recentActivity">
                    <h2>Recent Activity</h2>
                    <div id="activityList">
                        <p>Loading recent activity...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Load stats
        this.loadVoterStats();
        // Fallback: retry stats update after short delay if numbers are not set
        setTimeout(() => {
            const available = document.getElementById('availableElections').textContent;
            const votes = document.getElementById('myVotes').textContent;
            const upcoming = document.getElementById('upcomingElections').textContent;
            const completed = document.getElementById('completedElections').textContent;
            if ([available, votes, upcoming, completed].some(val => val === '-' || val === '' || val === 'NaN')) {
                this.loadVoterStats();
            }
        }, 1000);
    }

    // Load admin statistics
    async loadAdminStats() {
        try {
            const [electionsRes, candidatesRes, votersRes, votesRes] = await Promise.all([
                supabase.from('election').select('*', { count: 'exact' }),
                supabase.from('candidate').select('*', { count: 'exact' }),
                supabase.from('voter').select('*', { count: 'exact' }),
                supabase.from('vote').select('*', { count: 'exact' })
            ]);

            document.getElementById('totalElections').textContent = electionsRes.count || 0;
            document.getElementById('totalCandidates').textContent = candidatesRes.count || 0;
            document.getElementById('totalVoters').textContent = votersRes.count || 0;
            document.getElementById('totalVotes').textContent = votesRes.count || 0;
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    // Load voter statistics
    async loadVoterStats() {
        try {
            const voterEmail = this.currentUser?.email;
            if (!voterEmail) {
                document.getElementById('availableElections').textContent = '-';
                document.getElementById('myVotes').textContent = '-';
                document.getElementById('upcomingElections').textContent = '-';
                document.getElementById('completedElections').textContent = '-';
                Utils.showToast('Voter not authenticated. Please log in again.', 'error');
                return;
            }
            // Fetch voter first
            const voterRes = await supabase.from('voter').select('*').eq('email', voterEmail).single();
            if (!voterRes.data || !voterRes.data.voter_id) {
                document.getElementById('availableElections').textContent = '-';
                document.getElementById('myVotes').textContent = '-';
                document.getElementById('upcomingElections').textContent = '-';
                document.getElementById('completedElections').textContent = '-';
                Utils.showToast('Voter record not found. Please contact admin.', 'error');
                return;
            }
            // Fetch elections and votes in parallel
            const [allElectionsRes, votesRes] = await Promise.all([
                supabase.from('election').select('*'),
                supabase.from('vote').select('*, contest!inner(election_id)').eq('voter_id', voterRes.data.voter_id)
            ]);

            console.log('Elections:', allElectionsRes);
            console.log('Voter:', voterRes);
            console.log('Votes:', votesRes);

            if (allElectionsRes.error || votesRes.error) {
                document.getElementById('availableElections').textContent = '-';
                document.getElementById('myVotes').textContent = '-';
                document.getElementById('upcomingElections').textContent = '-';
                document.getElementById('completedElections').textContent = '-';
                Utils.showToast('Error loading dashboard stats. Check Supabase connection and data.', 'error');
                return;
            }

            const now = new Date();
            const allElections = allElectionsRes.data || [];
            // Available elections should show ongoing elections (active and happening now/soon)
            const ongoingCount = allElections.filter(e => e.is_active === 'Y' && new Date(e.election_date) <= now).length;
            const upcomingCount = allElections.filter(e => new Date(e.election_date) > now).length;
            const completedCount = allElections.filter(e => new Date(e.election_date) <= now).length;

            document.getElementById('availableElections').textContent = ongoingCount;
            document.getElementById('myVotes').textContent = votesRes.data?.length || 0;
            document.getElementById('upcomingElections').textContent = upcomingCount;
            document.getElementById('completedElections').textContent = completedCount;

            // Load recent activity
            this.loadRecentActivity(votesRes.data || []);
        } catch (error) {
            document.getElementById('availableElections').textContent = '-';
            document.getElementById('myVotes').textContent = '-';
            document.getElementById('upcomingElections').textContent = '-';
            document.getElementById('completedElections').textContent = '-';
            Utils.showToast('Unexpected error loading dashboard stats. See console for details.', 'error');
            console.error('Error loading voter stats:', error);
        }
    }

    // Load recent activity for voter
    loadRecentActivity(votes) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        if (votes.length === 0) {
            activityList.innerHTML = '<p>No recent voting activity.</p>';
            return;
        }

        const recentVotes = votes.slice(-5).reverse(); // Last 5 votes
        activityList.innerHTML = recentVotes.map(vote => `
            <div class="activity-item">
                <i class="fas fa-vote-yea"></i>
                <div class="activity-content">
                    <p>Voted in election</p>
                    <span class="activity-date">${new Date(vote.vote_timestamp).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }
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

                <div class="dashboard-tabs">
                    <button class="tab-btn active" onclick="showVoterTab('elections')">Active Elections</button>
                    <button class="tab-btn" onclick="showVoterTab('candidacy')">Apply for Candidacy</button>
                    <button class="tab-btn" onclick="showVoterTab('applications')">My Applications</button>
                </div>

                <div id="voterTabContent">
                    <div id="elections-tab" class="voter-tab-content active">
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
                                    <button class="btn btn-outline" onclick="showCandidatesForElection('${election.election_id}')">
                                        View Candidates
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div id="candidacy-tab" class="voter-tab-content" style="display: none;">
                        <h3>Apply for Candidacy</h3>
                        <div class="candidacy-application">
                            <form id="candidacyApplicationForm">
                                <div class="form-group">
                                    <label for="electionSelect">Select Election</label>
                                    <select id="electionSelect" name="electionSelect" required>
                                        <option value="">Choose an election...</option>
                                        ${elections.map(election => `
                                            <option value="${election.election_id}">${Utils.sanitizeHtml(election.name)}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="candidateBio">Biography</label>
                                    <textarea id="candidateBio" name="candidateBio" rows="4" required placeholder="Tell voters about yourself, your qualifications, and your vision..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="candidateManifesto">Campaign Manifesto</label>
                                    <textarea id="candidateManifesto" name="candidateManifesto" rows="6" required placeholder="Describe your campaign promises and goals..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="candidatePhoto">Profile Photo (Optional)</label>
                                    <input type="file" id="candidatePhoto" name="candidatePhoto" accept="image/*">
                                    <small>Recommended: Square image, max 2MB</small>
                                </div>
                                <button type="submit" class="btn btn-primary">Submit Application</button>
                            </form>
                        </div>
                    </div>

                    <div id="applications-tab" class="voter-tab-content" style="display: none;">
                        <h3>My Candidacy Applications</h3>
                        <div id="applicationsContainer">
                            <!-- Applications will be loaded here -->
                        </div>
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

            // Setup candidate application form handler
            this.setupCandidacyApplication(voterData.id);
            
            // Load user's candidacy applications
            this.loadUserApplications(voterData.id);

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

    // Setup candidacy application form handler
    async setupCandidacyApplication(voterId) {
        const form = document.getElementById('candidacyApplicationForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            console.log('Candidacy form submitted');
            
            const formData = new FormData(form);
            const electionId = formData.get('electionSelect');
            const bio = formData.get('candidateBio');
            const manifesto = formData.get('candidateManifesto');
            const photo = formData.get('candidatePhoto');

            console.log('Form data:', { electionId, bio, manifesto, photo });

            // Validate required fields
            if (!electionId) {
                Utils.showToast('Please select an election', 'error');
                return;
            }
            if (!bio) {
                Utils.showToast('Please enter your biography', 'error');
                return;
            }
            if (!manifesto) {
                Utils.showToast('Please enter your campaign manifesto', 'error');
                return;
            }

            try {
                Utils.showLoading();
                // Get voter information to get full name
                const { data: voterInfo, error: voterError } = await supabase
                    .from('voter')
                    .select('full_name')
                    .eq('voter_id', voterId)
                    .single();

                if (voterError) {
                    console.error('Error fetching voter info:', voterError);
                    throw new Error('Could not fetch voter information');
                }

                // Check if user already applied (by checking if candidate with same name exists)
                const { data: existingApplication } = await supabase
                    .from('candidate')
                    .select('*')
                    .eq('full_name', voterInfo.full_name)
                    .single();

                if (existingApplication) {
                    Utils.showToast('You have already applied as a candidate', 'error');
                    return;
                }

                // Handle photo upload if provided
                let photoUrl = null;
                if (photo && photo.size > 0) {
                    const fileExt = photo.name.split('.').pop();
                    const fileName = `candidate_${voterId}_${Date.now()}.${fileExt}`;
                    
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('candidate-photos')
                        .upload(fileName, photo);

                    if (uploadError) {
                        console.error('Photo upload error:', uploadError);
                        Utils.showToast('Photo upload failed, but application will continue', 'warning');
                    } else {
                        const { data: urlData } = supabase.storage
                            .from('candidate-photos')
                            .getPublicUrl(fileName);
                        photoUrl = urlData.publicUrl;
                    }
                }

                if (voterError) {
                    console.error('Error fetching voter info:', voterError);
                    throw new Error('Could not fetch voter information');
                }

                // Submit candidacy application (adapted to current schema)
                const { data, error } = await supabase
                    .from('candidate')
                    .insert({
                        election_id: electionId,
                        full_name: voterInfo.full_name,
                        symbol: '📋', // Default symbol for applications
                        party: 'Independent', // Default party
                        bio: bio,
                        manifesto: manifesto,
                        photo_url: photoUrl
                    });

                if (error) throw error;

                Utils.showToast('Candidacy application submitted successfully! Awaiting admin approval.', 'success');
                form.reset();
                
                // Switch to applications tab to show the new application
                showVoterTab('applications');

            } catch (error) {
                console.error('Error submitting candidacy application:', error);
                Utils.showToast('Failed to submit application. Please try again.', 'error');
            } finally {
                Utils.hideLoading();
            }
        });
    }

    // Load user's candidacy applications
    async loadUserApplications(voterId) {
        try {
            // Get voter info first
            const { data: voterInfo, error: voterError } = await supabase
                .from('voter')
                .select('full_name')
                .eq('voter_id', voterId)
                .single();

            if (voterError) throw voterError;

            // Get applications by matching full name (since current schema doesn't have voter_id)
            const { data: applications, error } = await supabase
                .from('candidate')
                .select('*')
                .eq('full_name', voterInfo.full_name);

            if (error) throw error;

            const container = document.getElementById('applicationsContainer');
            if (!container) return;

            if (applications && applications.length > 0) {
                container.innerHTML = applications.map(app => `
                    <div class="application-card">
                        <div class="application-header">
                            <h4>${Utils.sanitizeHtml(app.full_name)}</h4>
                            <span class="status-badge status-pending">SUBMITTED</span>
                        </div>
                        <div class="application-details">
                            <p><strong>Party:</strong> ${Utils.sanitizeHtml(app.party || 'Independent')}</p>
                            <p><strong>Symbol:</strong> ${Utils.sanitizeHtml(app.symbol || 'N/A')}</p>
                            <p><strong>Manifesto:</strong> ${Utils.sanitizeHtml(app.manifesto || 'No manifesto provided')}</p>
                            ${app.photo_url ? `<img src="${app.photo_url}" alt="Candidate Photo" class="candidate-photo-small">` : ''}
                        </div>
                        <button class="btn btn-outline" onclick="withdrawApplication('${app.candidate_id}')">
                            Withdraw Application
                        </button>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p>No candidacy applications yet.</p>';
            }
        } catch (error) {
            console.error('Error loading applications:', error);
            const container = document.getElementById('applicationsContainer');
            if (container) {
                container.innerHTML = '<p>Error loading applications. Please try again.</p>';
            }
        }
    }

    // Show voter's voting history
    async showMyVotes() {
        console.log('showMyVotes called for user:', this.currentUser);
        try {
            const voterContent = document.getElementById('voterContent');
            if (!voterContent) {
                console.error('voterContent element not found');
                return;
            }

            // Check if we have a valid voter_id
            if (!this.currentUser || !this.currentUser.voter_id) {
                console.error('No valid voter_id found. User data:', this.currentUser);
                voterContent.innerHTML = `
                    <div class="dashboard-header">
                        <h2><i class="fas fa-history"></i> My Voting History</h2>
                    </div>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        Unable to load voting history. Please log in again.
                        <button onclick="window.Auth.logout()" class="btn btn-primary" style="margin-top: 1rem;">
                            <i class="fas fa-sign-out-alt"></i> Re-login
                        </button>
                    </div>
                `;
                return;
            }

            // Show loading state
            voterContent.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-history"></i> My Voting History</h2>
                </div>
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i> Loading your voting history...
                </div>
            `;

            console.log('Fetching votes for voter_id:', this.currentUser.voter_id);

            // Get voter's votes with detailed information
            const { data: votes, error: votesError } = await window.supabase
                .from('vote')
                .select(`
                    vote_id,
                    vote_timestamp,
                    contest:contest_id (
                        contest_id,
                        position,
                        candidate:candidate_id (
                            candidate_id,
                            full_name,
                            party,
                            symbol
                        ),
                        election:election_id (
                            election_id,
                            name,
                            election_date,
                            election_type
                        )
                    )
                `)
                .eq('voter_id', this.currentUser.voter_id)
                .order('vote_timestamp', { ascending: false });

            console.log('Votes query result:', { votes, votesError });

            if (votesError) {
                console.error('Error loading votes:', votesError);
                voterContent.innerHTML = `
                    <div class="dashboard-header">
                        <h2><i class="fas fa-history"></i> My Voting History</h2>
                    </div>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        Error loading voting history: ${votesError.message}. Please try again.
                    </div>
                `;
                return;
            }

            // Display votes
            if (!votes || votes.length === 0) {
                voterContent.innerHTML = `
                    <div class="dashboard-header">
                        <h2><i class="fas fa-history"></i> My Voting History</h2>
                    </div>
                    <div class="empty-state">
                        <i class="fas fa-ballot"></i>
                        <h3>No Votes Yet</h3>
                        <p>You haven't participated in any elections yet. Check the Elections section to see available elections.</p>
                        <button onclick="showDashboardSection('elections')" class="btn btn-primary">
                            <i class="fas fa-vote-yea"></i> View Elections
                        </button>
                    </div>
                `;
                return;
            }

            // Build votes display
            const votesHtml = votes.map(vote => {
                const contest = vote.contest;
                const candidate = contest?.candidate;
                const election = contest?.election;
                const electionId = election?.election_id;
                return `
                    <div class="vote-card">
                        <div class="vote-header">
                            <h4>${election?.name || 'Unknown Election'}</h4>
                            <span class="vote-date">
                                <i class="fas fa-calendar"></i>
                                ${new Date(vote.vote_timestamp).toLocaleDateString()}
                            </span>
                        </div>
                        <div class="vote-details">
                            <div class="vote-info">
                                <label>Position:</label>
                                <span>${contest?.position || 'Candidate'}</span>
                            </div>
                            <div class="vote-info">
                                <label>Candidate:</label>
                                <span>${candidate?.symbol} ${candidate?.full_name || 'Unknown Candidate'}</span>
                            </div>
                            <div class="vote-info">
                                <label>Party:</label>
                                <span>${candidate?.party || 'Independent'}</span>
                            </div>
                            <div class="vote-info">
                                <label>Vote Time:</label>
                                <span>${new Date(vote.vote_timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="vote-actions" style="margin-top: 12px; text-align: right;">
                            <button class="btn btn-info" onclick="window.showElectionFromVote('${electionId}')">
                                <i class='fas fa-eye'></i> View Election
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            voterContent.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-history"></i> My Voting History</h2>
                    <div class="stats-summary">
                        <span class="stat-item">
                            <i class="fas fa-vote-yea"></i>
                            <strong>${votes.length}</strong> Vote${votes.length !== 1 ? 's' : ''} Cast
                        </span>
                    </div>
                </div>
                <div class="votes-container">
                    ${votesHtml}
                </div>
            `;

        } catch (error) {
            console.error('Error showing votes:', error);
            const voterContent = document.getElementById('voterContent');
            if (voterContent) {
                voterContent.innerHTML = `
                    <div class="dashboard-header">
                        <h2><i class="fas fa-history"></i> My Voting History</h2>
                    </div>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        An unexpected error occurred. Please try again.
                    </div>
                `;
            }
        }
    }

    // Load voter results (fallback method)
    async loadVoterResults(container) {
        try {
            console.log('loadVoterResults called, container:', container);
            
            // Show loading
            container.innerHTML = `
                <div class="section-header">
                    <h2><i class="fas fa-chart-pie"></i> Election Results</h2>
                    <p>View results of completed elections</p>
                </div>
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i> Loading results...
                </div>
            `;

            // Get elections that have results
            const { data: elections, error: electionsError } = await window.supabase
                .from('election')
                .select(`
                    election_id,
                    name,
                    election_type,
                    election_date,
                    is_active,
                    description
                `)
                .eq('is_active', 'Y')
                .order('election_date', { ascending: false });

            console.log('Elections query result:', { elections, electionsError });

            if (electionsError) {
                console.error('Elections error:', electionsError);
                throw electionsError;
            }

            if (!elections || elections.length === 0) {
                container.innerHTML = `
                    <div class="section-header">
                        <h2><i class="fas fa-chart-pie"></i> Election Results</h2>
                        <p>View results of completed elections</p>
                    </div>
                    <div class="empty-state">
                        <i class="fas fa-chart-bar"></i>
                        <h3>No Elections Available</h3>
                        <p>There are no elections with published results at this time.</p>
                    </div>
                `;
                return;
            }

            // Get results for each election
            let resultsHTML = '';
            for (const election of elections) {
                const { data: candidates, error: candidatesError } = await window.supabase
                    .from('candidate')
                    .select(`
                        candidate_id,
                        full_name,
                        party,
                        symbol
                    `)
                    .eq('election_id', election.election_id)
                    .eq('status', 'approved');

                if (candidatesError) {
                    console.error('Error loading candidates:', candidatesError);
                    continue;
                }

                // Get vote counts for each candidate through contest table
                let candidateResults = [];
                if (candidates && candidates.length > 0) {
                    for (const candidate of candidates) {
                        // Get contest for this candidate in this election
                        const { data: contests, error: contestError } = await window.supabase
                            .from('contest')
                            .select('contest_id')
                            .eq('election_id', election.election_id)
                            .eq('candidate_id', candidate.candidate_id);

                        let voteCount = 0;
                        if (contests && contests.length > 0) {
                            // Get vote count for this contest
                            const { count, error: voteError } = await window.supabase
                                .from('vote')
                                .select('*', { count: 'exact' })
                                .eq('contest_id', contests[0].contest_id);
                            
                            voteCount = count || 0;
                        }

                        candidateResults.push({
                            ...candidate,
                            vote_count: voteCount
                        });
                    }

                    // Sort by vote count (highest first)
                    candidateResults.sort((a, b) => b.vote_count - a.vote_count);
                }

                const totalVotes = candidateResults.reduce((sum, candidate) => sum + candidate.vote_count, 0);

                resultsHTML += `
                    <div class="election-result-card">
                        <div class="election-header">
                            <h3>${election.name}</h3>
                            <div class="election-meta">
                                <span class="election-type">${election.election_type}</span>
                                <span class="election-date">${new Date(election.election_date).toLocaleDateString()}</span>
                                <span class="total-votes">Total Votes: ${totalVotes}</span>
                            </div>
                        </div>
                        
                        ${candidateResults.length > 0 ? `
                            <div class="candidates-results">
                                ${candidateResults.map((candidate, index) => {
                                    const percentage = totalVotes > 0 ? ((candidate.vote_count / totalVotes) * 100).toFixed(1) : 0;
                                    return `
                                        <div class="candidate-result ${index === 0 && candidate.vote_count > 0 ? 'winner' : ''}">
                                            <div class="candidate-info">
                                                <div class="rank">#${index + 1}</div>
                                                <div class="candidate-details">
                                                    <h4>${candidate.symbol} ${candidate.full_name}</h4>
                                                    <p>${candidate.party || 'Independent'}</p>
                                                </div>
                                                <div class="vote-stats">
                                                    <span class="vote-count">${candidate.vote_count} votes</span>
                                                    <span class="vote-percentage">${percentage}%</span>
                                                </div>
                                            </div>
                                            <div class="vote-bar">
                                                <div class="vote-fill" style="width: ${percentage}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="no-results">
                                <p>No votes cast for this election yet.</p>
                            </div>
                        `}
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="section-header">
                    <h2><i class="fas fa-chart-pie"></i> Election Results</h2>
                    <p>View results of completed elections</p>
                </div>
                <div class="results-container">
                    ${resultsHTML}
                </div>
            `;

        } catch (error) {
            console.error('Error loading voter results:', error);
            container.innerHTML = `
                <div class="section-header">
                    <h2><i class="fas fa-chart-pie"></i> Election Results</h2>
                    <p>View results of completed elections</p>
                </div>
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading results. Please try again.
                </div>
            `;
        }
    }
}

// Test database connectivity
async function testDatabaseConnection() {
    console.log('Testing database connection...');
    try {
        const { data, error } = await supabase
            .from('election')
            .select('*')
            .limit(5);
        
        console.log('Database test result:', { data, error });
        
        if (error) {
            Utils.showToast('Database connection error: ' + error.message, 'error');
        } else {
            Utils.showToast(`Database connected successfully. Found ${data.length} elections.`, 'success');
        }
    } catch (error) {
        console.error('Database connection test failed:', error);
        Utils.showToast('Database connection test failed', 'error');
    }
}

// Voter dashboard tab switching
function showVoterTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.voter-tab-content');
    tabs.forEach(tab => tab.style.display = 'none');
    
    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Add active class to clicked button
    const activeButton = document.querySelector(`[onclick="showVoterTab('${tabName}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Load applications when applications tab is selected
    if (tabName === 'applications') {
        loadMyApplications();
    }
}

// Load voter's candidacy applications
async function loadMyApplications() {
    const container = document.getElementById('applicationsContainer');
    if (!container) return;
    
    try {
        const currentUser = window.Auth?.currentUser;
        if (!currentUser) {
            container.innerHTML = '<p>Please log in to view your applications.</p>';
            return;
        }
        
        container.innerHTML = '<p>Loading applications...</p>';
        
        // Get all candidates where this voter's name matches (since there's no voter_id link)
        const { data: applications, error } = await supabase
            .from('candidate')
            .select(`
                *,
                election:election_id (
                    name,
                    election_date,
                    election_type
                )
            `)
            .eq('full_name', currentUser.full_name)
            .order('candidate_id', { ascending: false });
        
        if (error) throw error;
        
        if (!applications || applications.length === 0) {
            container.innerHTML = `
                <div class="no-applications">
                    <i class="fas fa-file-alt" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                    <h4>No Applications Yet</h4>
                    <p>You haven't applied for candidacy in any elections.</p>
                    <button class="btn btn-primary" onclick="showVoterTab('candidacy')">
                        <i class="fas fa-plus"></i> Apply Now
                    </button>
                </div>
            `;
            return;
        }
        
        // Check approval status by looking up contest table
        const candidateIds = applications.map(app => app.candidate_id);
        const { data: contests, error: contestError } = await supabase
            .from('contest')
            .select('candidate_id, position')
            .in('candidate_id', candidateIds);
        
        const approvedCandidateIds = new Set(contests?.map(c => c.candidate_id) || []);
        
        // Render applications
        container.innerHTML = `
            <div class="applications-list">
                ${applications.map(application => {
                    const isApproved = approvedCandidateIds.has(application.candidate_id);
                    const contest = contests?.find(c => c.candidate_id === application.candidate_id);
                    
                    return `
                        <div class="application-card ${isApproved ? 'approved' : 'pending'}">
                            <div class="application-header">
                                <h4>${Utils.sanitizeHtml(application.election?.name || 'Unknown Election')}</h4>
                                <span class="status-badge ${isApproved ? 'status-active' : 'status-warning'}">
                                    ${isApproved ? 'Approved' : 'Pending Review'}
                                </span>
                            </div>
                            
                            <div class="application-details">
                                <p><strong>Election Type:</strong> ${Utils.sanitizeHtml(application.election?.election_type || 'N/A')}</p>
                                <p><strong>Election Date:</strong> ${Utils.formatDate(application.election?.election_date)}</p>
                                <p><strong>Application ID:</strong> ${application.candidate_id}</p>
                                ${isApproved && contest ? `<p><strong>Position:</strong> ${Utils.sanitizeHtml(contest.position)}</p>` : ''}
                                <p><strong>Party:</strong> ${Utils.sanitizeHtml(application.party || 'Independent')}</p>
                                <p><strong>Symbol:</strong> ${Utils.sanitizeHtml(application.symbol || 'N/A')}</p>
                            </div>
                            
                            <div class="application-content">
                                ${application.bio ? `
                                    <div class="bio-section">
                                        <h5>Biography</h5>
                                        <p>${Utils.sanitizeHtml(application.bio)}</p>
                                    </div>
                                ` : ''}
                                
                                ${application.manifesto ? `
                                    <div class="manifesto-section">
                                        <h5>Manifesto</h5>
                                        <p>${Utils.sanitizeHtml(application.manifesto)}</p>
                                    </div>
                                ` : ''}
                            </div>
                            
                            ${isApproved ? `
                                <div class="approval-message">
                                    <i class="fas fa-check-circle"></i>
                                    <strong>Congratulations!</strong> Your candidacy has been approved. Voters can now see you as a candidate for this election.
                                </div>
                            ` : `
                                <div class="pending-message">
                                    <i class="fas fa-clock"></i>
                                    Your application is under review by the election administrators.
                                </div>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading applications:', error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading applications: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadMyApplications()">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// Show candidates for a specific election
async function showCandidatesForElection(electionId) {
    console.log('showCandidatesForElection called with electionId:', electionId);
    
    try {
        // Add loading indicator
        Utils.showLoading();
        
        // First, let's check if the election exists
        console.log('Checking if election exists...');
        const { data: electionCheck, error: electionCheckError } = await supabase
            .from('election')
            .select('*')
            .eq('election_id', electionId);
        
        console.log('Election check result:', { electionCheck, electionCheckError });
        
        if (electionCheckError) {
            console.error('Election check error:', electionCheckError);
            Utils.showToast('Error checking election: ' + electionCheckError.message, 'error');
            return;
        }
        
        if (!electionCheck || electionCheck.length === 0) {
            Utils.showToast('Election not found', 'error');
            return;
        }
        
        console.log('Fetching candidates...');
        // Get candidates who are approved (have entries in contest table)
        const { data: candidates, error } = await supabase
            .from('contest')
            .select(`
                *,
                candidate:candidate_id (
                    *,
                    voter:voter_id (full_name, email)
                ),
                election:election_id (name)
            `)
            .eq('election_id', electionId);

        console.log('Approved candidates query result:', { candidates, error });

        if (error) throw error;

        console.log('Fetching election details...');
        const election = electionCheck[0]; // Use the election we already fetched
        console.log('Using election:', election);

        // Create modal for candidates
        const modal = document.createElement('div');
        modal.className = 'modal candidates-modal';
        modal.innerHTML = `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h2>Candidates for ${Utils.sanitizeHtml(election.name)}</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    ${candidates && candidates.length > 0 ? `
                        <div class="candidates-grid">
                            ${candidates.map(contest => {
                                const candidate = contest.candidate;
                                return `
                                    <div class="candidate-card">
                                        ${candidate.photo_url ? `
                                            <img src="${candidate.photo_url}" alt="Candidate Photo" class="candidate-photo">
                                        ` : `
                                            <div class="candidate-photo-placeholder">
                                                <i class="fas fa-user"></i>
                                            </div>
                                        `}
                                        <div class="candidate-info">
                                            <h4>${Utils.sanitizeHtml(candidate.full_name || 'Unknown Candidate')}</h4>
                                            <p class="candidate-party"><strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                            <p class="candidate-symbol"><strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}</p>
                                            <p class="candidate-position"><strong>Position:</strong> ${Utils.sanitizeHtml(contest.position || 'Candidate')}</p>
                                            <div class="candidate-bio">
                                                <h5>Biography</h5>
                                                <p>${Utils.sanitizeHtml(candidate.bio || 'No biography provided')}</p>
                                            </div>
                                            <div class="candidate-manifesto">
                                                <h5>Campaign Manifesto</h5>
                                                <p>${Utils.sanitizeHtml(candidate.manifesto || 'No manifesto provided')}</p>
                                            </div>
                                            <button class="btn btn-primary" onclick="selectCandidateForVoting('${candidate.candidate_id}', '${electionId}')">
                                                Vote for this Candidate
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `
                        <p>No approved candidates yet for this election.</p>
                        ${allCandidates && allCandidates.length > 0 ? `
                            <p><em>Note: There are ${allCandidates.length} candidate application(s) pending approval.</em></p>
                        ` : ''}
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        console.log('Modal created and displayed');

    } catch (error) {
        console.error('Error loading candidates:', error);
        Utils.showToast('Failed to load candidates. Please try again.', 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Select candidate for voting (integrated with existing voting system)
function selectCandidateForVoting(candidateId, electionId) {
    // Close candidates modal
    const modal = document.querySelector('.candidates-modal');
    if (modal) modal.remove();
    
    // Start voting process with pre-selected candidate
    if (window.Voting) {
        window.Voting.startVoting(electionId, candidateId);
    }
}

// Withdraw candidacy application
async function withdrawApplication(candidateId) {
    if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('candidate')
            .delete()
            .eq('candidate_id', candidateId);

        if (error) throw error;

        Utils.showToast('Application withdrawn successfully', 'success');
        
        // Refresh applications
        const voter = window.Auth.getCurrentUser();
        if (voter) {
            const { data: voterData } = await supabase
                .from('voter')
                .select('*')
                .eq('user_id', voter.id)
                .single();
            
            if (voterData) {
                window.Auth.loadUserApplications(voterData.id);
            }
        }

    } catch (error) {
        console.error('Error withdrawing application:', error);
        Utils.showToast('Failed to withdraw application. Please try again.', 'error');
    }
}

// Switch between login and register forms
function switchToRegister() {
    window.Auth.clearPasswordFields();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function switchToLogin() {
    window.Auth.clearPasswordFields();
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

// Global function to handle dashboard section switching
function showDashboardSection(section) {
    if (!window.Auth || !window.Auth.isAuthenticated()) {
        return;
    }

    const userType = window.Auth.getUserRole();
    
    // Update navigation active states
    const dashboardNav = document.getElementById('dashboardNav');
    if (dashboardNav) {
        dashboardNav.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = dashboardNav.querySelector(`[onclick*="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Hide all sections first
    document.querySelectorAll('#mainContent .section').forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('active');
    });

    // Hide dashboard home
    const dashboardHome = document.getElementById('dashboard-home-section');
    if (dashboardHome) {
        dashboardHome.style.display = 'none';
    }

    // Show appropriate section based on dashboard type and user role
    switch (section) {
        case 'home':
            // Hide admin dashboard if it's showing
            const adminDashboard = document.getElementById('adminDashboard');
            if (adminDashboard) {
                adminDashboard.style.display = 'none';
            }
            
            // Hide voter dashboard if it's showing
            const voterDashboard = document.getElementById('voterDashboard');
            if (voterDashboard) {
                voterDashboard.style.display = 'none';
            }
            
            // Show main content
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.style.display = 'block';
            }
            
            // Show or create dashboard home section
            if (dashboardHome) {
                dashboardHome.style.display = 'block';
            } else {
                window.Auth.showDashboardInterface();
            }
            break;
        case 'elections':
            if (userType === 'admin') {
                // Show admin dashboard for managing elections
                document.getElementById('adminDashboard').style.display = 'block';
                document.getElementById('mainContent').style.display = 'none';
                if (window.Admin) {
                    window.Admin.showTab('elections');
                }
            } else {
                // Show elections section for voters
                const electionsSection = document.getElementById('elections');
                if (electionsSection) {
                    electionsSection.style.display = 'block';
                    electionsSection.classList.add('active');
                    if (window.Elections) {
                        window.Elections.loadElections();
                    }
                }
            }
            break;
        case 'candidates':
            document.getElementById('adminDashboard').style.display = 'block';
            document.getElementById('mainContent').style.display = 'none';
            if (window.Admin) {
                window.Admin.showTab('candidates');
            }
            break;
        case 'voters':
            document.getElementById('adminDashboard').style.display = 'block';
            document.getElementById('mainContent').style.display = 'none';
            if (window.Admin) {
                window.Admin.showTab('voters');
            }
            break;
        case 'results':
            if (userType === 'admin') {
                // Show admin dashboard for viewing results
                document.getElementById('adminDashboard').style.display = 'block';
                document.getElementById('mainContent').style.display = 'none';
                if (window.Admin) {
                    // Get the admin tab content container
                    const container = document.getElementById('adminTabContent');
                    if (container) {
                        // Update tab active states
                        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                        const resultsTab = document.querySelector('.tab-btn[onclick*="results"]');
                        if (resultsTab) resultsTab.classList.add('active');
                        
                        // Load results directly
                        window.Admin.loadResultsTab(container);
                    }
                }
            } else {
                // Show results section for voters
                document.getElementById('mainContent').style.display = 'block';
                document.getElementById('voterDashboard').style.display = 'none';
                
                const resultsSection = document.getElementById('results');
                if (resultsSection) {
                    // Hide other sections
                    document.querySelectorAll('#mainContent .section').forEach(section => {
                        section.style.display = 'none';
                        section.classList.remove('active');
                    });
                    
                    // Show results section
                    resultsSection.style.display = 'block';
                    resultsSection.classList.add('active');
                    
                    if (window.Elections) {
                        window.Elections.loadResults();
                    } else {
                        // Fallback: load results manually if Elections module not available
                        if (window.Auth.loadVoterResultsSimple) {
                            window.Auth.loadVoterResultsSimple(resultsSection);
                        } else {
                            window.Auth.loadVoterResults(resultsSection);
                        }
                    }
                }
            }
            break;
        case 'my-votes':
            // Show voter's voting history
            if (userType === 'voter') {
                // Show voter dashboard
                document.getElementById('voterDashboard').style.display = 'block';
                document.getElementById('mainContent').style.display = 'none';
                
                // Get the voter content container
                const voterContent = document.getElementById('voterContent');
                if (voterContent && window.Auth) {
                    // Use simplified version if available, fallback to original
                    if (window.Auth.showMyVotesSimple) {
                        window.Auth.showMyVotesSimple();
                    } else {
                        window.Auth.showMyVotes();
                    }
                }
            }
            break;
        case 'apply-candidate':
            // Redirect to elections section where candidate application is now available
            if (userType === 'voter') {
                // Redirect to elections section
                showDashboardSection('elections');
                // Show message about new location
                setTimeout(() => {
                    Utils.showToast('Candidate applications are now available when viewing upcoming elections', 'info');
                }, 500);
            }
            break;
    }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.Auth = new Auth();
    window.Auth.init();
});

// Export Auth class
window.Auth = Auth;
