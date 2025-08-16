// Admin Module
class Admin {
    constructor() {
        this.currentTab = 'elections';
        this.init();
    }

    // Initialize admin module
    init() {
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Admin tab switching is handled by the global showAdminTab function
    }

    // Load admin dashboard
    async loadDashboard() {
        this.showAdminTab('elections');
        await this.loadAdminStats();
    }

    // Load admin statistics
    async loadAdminStats() {
        try {
            // Get counts for dashboard
            const [electionsCount, candidatesCount, votersCount, votesCount] = await Promise.all([
                this.getCount(CONFIG.TABLES.ELECTIONS),
                this.getCount(CONFIG.TABLES.CANDIDATES),
                this.getCount(CONFIG.TABLES.VOTERS),
                this.getCount(CONFIG.TABLES.VOTES)
            ]);

            // Update stats in the header if exists
            const statsContainer = document.querySelector('.admin-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-number">${electionsCount}</div>
                        <div class="stat-label">Elections</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${candidatesCount}</div>
                        <div class="stat-label">Candidates</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${votersCount}</div>
                        <div class="stat-label">Voters</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${votesCount}</div>
                        <div class="stat-label">Votes Cast</div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    // Get count of records in a table
    async getCount(tableName) {
        try {
            const { count, error } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error(`Error counting ${tableName}:`, error);
            return 0;
        }
    }

    // Show admin tab content
    async showTab(tabName) {
        this.currentTab = tabName;
        const tabContent = document.getElementById('adminTabContent');

        switch (tabName) {
            case 'elections':
                await this.loadElectionsTab(tabContent);
                break;
            case 'candidates':
                await this.loadCandidatesTab(tabContent);
                break;
            case 'voters':
                await this.loadVotersTab(tabContent);
                break;
            case 'results':
                await this.loadResultsTab(tabContent);
                break;
            default:
                tabContent.innerHTML = '<p>Tab not found</p>';
        }
    }

    // Load elections management tab
    async loadElectionsTab(container) {
        Utils.showLoading();

        try {
            const { data: elections, error } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            container.innerHTML = `
                <div class="admin-stats">
                    <!-- Stats will be loaded here -->
                </div>

                <div class="admin-section">
                    <div class="section-header">
                        <h3>Elections Management</h3>
                        <button class="btn btn-primary" onclick="window.Admin.showCreateElectionForm()">
                            <i class="fas fa-plus"></i> Create Election
                        </button>
                    </div>

                    <div class="admin-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Status</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Candidates</th>
                                    <th>Votes</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${elections.map(election => {
                                    const status = this.getElectionStatus(election);
                                    return `
                                        <tr>
                                            <td>${Utils.sanitizeHtml(election.title)}</td>
                                            <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                                            <td>${Utils.formatDate(election.start_date)}</td>
                                            <td>${Utils.formatDate(election.end_date)}</td>
                                            <td id="candidates-count-${election.id}">-</td>
                                            <td id="votes-count-${election.id}">-</td>
                                            <td class="action-buttons">
                                                <button class="btn btn-small btn-outline" onclick="window.Admin.editElection('${election.id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-small btn-outline" onclick="window.Admin.manageElectionCandidates('${election.id}')">
                                                    <i class="fas fa-users"></i>
                                                </button>
                                                <button class="btn btn-small btn-outline" onclick="window.Admin.viewElectionResults('${election.id}')">
                                                    <i class="fas fa-chart-bar"></i>
                                                </button>
                                                <button class="btn btn-small btn-danger" onclick="window.Admin.deleteElection('${election.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Load stats and counts for each election
            await this.loadAdminStats();
            await this.loadElectionCounts(elections);

        } catch (error) {
            console.error('Error loading elections tab:', error);
            container.innerHTML = '<p>Error loading elections data</p>';
        } finally {
            Utils.hideLoading();
        }
    }

    // Load candidates count and votes count for elections
    async loadElectionCounts(elections) {
        for (const election of elections) {
            try {
                // Get candidates count
                const { count: candidatesCount } = await supabase
                    .from(CONFIG.TABLES.CANDIDATES)
                    .select('*', { count: 'exact', head: true })
                    .eq('election_id', election.id);

                // Get votes count
                const { count: votesCount } = await supabase
                    .from(CONFIG.TABLES.VOTES)
                    .select('*', { count: 'exact', head: true })
                    .eq('election_id', election.id);

                // Update UI
                const candidatesElement = document.getElementById(`candidates-count-${election.id}`);
                const votesElement = document.getElementById(`votes-count-${election.id}`);

                if (candidatesElement) candidatesElement.textContent = candidatesCount || 0;
                if (votesElement) votesElement.textContent = votesCount || 0;

            } catch (error) {
                console.error(`Error loading counts for election ${election.id}:`, error);
            }
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

    // Show create election form
    showCreateElectionForm() {
        const modal = document.getElementById('votingModal');
        const content = document.getElementById('votingContent');

        content.innerHTML = `
            <div class="create-election-form">
                <h2>Create New Election</h2>
                <form id="createElectionForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="electionTitle">Election Title</label>
                            <input type="text" id="electionTitle" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="electionDescription">Description</label>
                        <textarea id="electionDescription" rows="3" required></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="electionStartDate">Start Date & Time</label>
                            <input type="datetime-local" id="electionStartDate" required>
                        </div>
                        <div class="form-group">
                            <label for="electionEndDate">End Date & Time</label>
                            <input type="datetime-local" id="electionEndDate" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="electionType">Election Type</label>
                        <select id="electionType" required>
                            <option value="">Select Type</option>
                            <option value="general">General Election</option>
                            <option value="local">Local Election</option>
                            <option value="referendum">Referendum</option>
                            <option value="primary">Primary Election</option>
                        </select>
                    </div>
                    
                    <div class="action-buttons">
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('votingModal').style.display = 'none'">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Create Election
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Setup form submission
        document.getElementById('createElectionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateElection(e);
        });

        modal.style.display = 'block';
    }

    // Handle create election
    async handleCreateElection(event) {
        const formData = new FormData(event.target);
        const title = document.getElementById('electionTitle').value;
        const description = document.getElementById('electionDescription').value;
        const startDate = document.getElementById('electionStartDate').value;
        const endDate = document.getElementById('electionEndDate').value;
        const type = document.getElementById('electionType').value;

        // Validation
        if (!title || !description || !startDate || !endDate || !type) {
            Utils.showToast('Please fill in all fields', 'error');
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            Utils.showToast('End date must be after start date', 'error');
            return;
        }

        if (new Date(startDate) <= new Date()) {
            Utils.showToast('Start date must be in the future', 'error');
            return;
        }

        Utils.showLoading();

        try {
            const { error } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .insert([{
                    title: title,
                    description: description,
                    start_date: startDate,
                    end_date: endDate,
                    type: type,
                    status: 'upcoming',
                    created_by: window.Auth.getCurrentUser().id,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

            Utils.showToast('Election created successfully!', 'success');
            document.getElementById('votingModal').style.display = 'none';
            
            // Refresh the elections tab
            this.showTab('elections');

        } catch (error) {
            console.error('Error creating election:', error);
            Utils.showToast('Error creating election', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Edit election
    async editElection(electionId) {
        Utils.showLoading();

        try {
            const { data: election, error } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .select('*')
                .eq('id', electionId)
                .single();

            if (error) throw error;

            const modal = document.getElementById('votingModal');
            const content = document.getElementById('votingContent');

            content.innerHTML = `
                <div class="edit-election-form">
                    <h2>Edit Election</h2>
                    <form id="editElectionForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editElectionTitle">Election Title</label>
                                <input type="text" id="editElectionTitle" value="${Utils.sanitizeHtml(election.title)}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editElectionDescription">Description</label>
                            <textarea id="editElectionDescription" rows="3" required>${Utils.sanitizeHtml(election.description)}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editElectionStartDate">Start Date & Time</label>
                                <input type="datetime-local" id="editElectionStartDate" value="${Utils.formatDateForInput(election.start_date)}" required>
                            </div>
                            <div class="form-group">
                                <label for="editElectionEndDate">End Date & Time</label>
                                <input type="datetime-local" id="editElectionEndDate" value="${Utils.formatDateForInput(election.end_date)}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="editElectionType">Election Type</label>
                            <select id="editElectionType" required>
                                <option value="general" ${election.type === 'general' ? 'selected' : ''}>General Election</option>
                                <option value="local" ${election.type === 'local' ? 'selected' : ''}>Local Election</option>
                                <option value="referendum" ${election.type === 'referendum' ? 'selected' : ''}>Referendum</option>
                                <option value="primary" ${election.type === 'primary' ? 'selected' : ''}>Primary Election</option>
                            </select>
                        </div>
                        
                        <div class="action-buttons">
                            <button type="button" class="btn btn-outline" onclick="document.getElementById('votingModal').style.display = 'none'">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Update Election
                            </button>
                        </div>
                    </form>
                </div>
            `;

            // Setup form submission
            document.getElementById('editElectionForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateElection(electionId, e);
            });

            modal.style.display = 'block';

        } catch (error) {
            console.error('Error loading election for edit:', error);
            Utils.showToast('Error loading election data', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Handle update election
    async handleUpdateElection(electionId, event) {
        const title = document.getElementById('editElectionTitle').value;
        const description = document.getElementById('editElectionDescription').value;
        const startDate = document.getElementById('editElectionStartDate').value;
        const endDate = document.getElementById('editElectionEndDate').value;
        const type = document.getElementById('editElectionType').value;

        // Validation
        if (!title || !description || !startDate || !endDate || !type) {
            Utils.showToast('Please fill in all fields', 'error');
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            Utils.showToast('End date must be after start date', 'error');
            return;
        }

        Utils.showLoading();

        try {
            const { error } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .update({
                    title: title,
                    description: description,
                    start_date: startDate,
                    end_date: endDate,
                    type: type,
                    updated_at: new Date().toISOString()
                })
                .eq('id', electionId);

            if (error) throw error;

            Utils.showToast('Election updated successfully!', 'success');
            document.getElementById('votingModal').style.display = 'none';
            
            // Refresh the elections tab
            this.showTab('elections');

        } catch (error) {
            console.error('Error updating election:', error);
            Utils.showToast('Error updating election', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Delete election
    async deleteElection(electionId) {
        const confirmed = confirm('Are you sure you want to delete this election? This action cannot be undone and will also delete all associated candidates and votes.');
        
        if (!confirmed) return;

        Utils.showLoading();

        try {
            // Delete in correct order due to foreign key constraints
            
            // First delete votes
            await supabase
                .from(CONFIG.TABLES.VOTES)
                .delete()
                .eq('election_id', electionId);

            // Then delete candidates
            await supabase
                .from(CONFIG.TABLES.CANDIDATES)
                .delete()
                .eq('election_id', electionId);

            // Finally delete election
            const { error } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .delete()
                .eq('id', electionId);

            if (error) throw error;

            Utils.showToast('Election deleted successfully!', 'success');
            
            // Refresh the elections tab
            this.showTab('elections');

        } catch (error) {
            console.error('Error deleting election:', error);
            Utils.showToast('Error deleting election', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Load candidates tab
    async loadCandidatesTab(container) {
        // Implementation for candidates management
        container.innerHTML = `
            <div class="admin-section">
                <h3>Candidates Management</h3>
                <p>Candidates management functionality will be implemented here.</p>
            </div>
        `;
    }

    // Load voters tab
    async loadVotersTab(container) {
        // Implementation for voters management
        container.innerHTML = `
            <div class="admin-section">
                <h3>Voters Management</h3>
                <p>Voters management functionality will be implemented here.</p>
            </div>
        `;
    }

    // Load results tab
    async loadResultsTab(container) {
        // Implementation for results viewing
        container.innerHTML = `
            <div class="admin-section">
                <h3>Election Results</h3>
                <p>Results viewing functionality will be implemented here.</p>
            </div>
        `;
    }

    // Manage election candidates
    manageElectionCandidates(electionId) {
        // Implementation for managing candidates of a specific election
        Utils.showToast('Candidate management coming soon!', 'info');
    }

    // View election results (admin view)
    viewElectionResults(electionId) {
        // Use the same results view as public, but with admin privileges
        if (window.Elections) {
            window.Elections.viewElectionResults(electionId);
        }
    }
}

// Global function for tab switching
function showAdminTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Show tab content
    if (window.Admin) {
        window.Admin.showTab(tabName);
    }
}

// Initialize admin when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.Admin = new Admin();
});

// Export Admin class
window.Admin = Admin;
