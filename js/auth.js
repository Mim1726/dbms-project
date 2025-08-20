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

    // Show admin dashboard
    showAdminDashboard() {
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        document.getElementById('voterDashboard').style.display = 'none';
        
        // Ensure Admin is initialized and load dashboard
        if (!window.Admin) {
            window.Admin = new Admin();
        }
        
        // Load admin content with a small delay to ensure DOM is ready
        setTimeout(() => {
            if (window.Admin) {
                window.Admin.loadDashboard();
            }
        }, 100);
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

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.Auth = new Auth();
});

// Export Auth class
window.Auth = Auth;
