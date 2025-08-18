// Admin Module - Clean Version
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
        this.showTab('elections');
        await this.loadAdminStats();
    }

    // Show specific admin tab
    async showTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[onclick*="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        // Show tab content
        const tabContent = document.querySelector('.admin-content');
        if (!tabContent) return;
        
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
                tabContent.innerHTML = '<p>Tab content not found</p>';
        }
    }

    // Load admin statistics
    async loadAdminStats() {
        try {
            // Get elections count
            const { count: electionsCount } = await supabase
                .from('election')
                .select('*', { count: 'exact', head: true });

            // Get candidates count  
            const { count: candidatesCount } = await supabase
                .from('candidate')
                .select('*', { count: 'exact', head: true });

            // Get voters count
            const { count: votersCount } = await supabase
                .from('voter')
                .select('*', { count: 'exact', head: true });

            // Update stats in UI if elements exist
            const electionsElement = document.getElementById('total-elections');
            const candidatesElement = document.getElementById('total-candidates');
            const votersElement = document.getElementById('total-voters');

            if (electionsElement) electionsElement.textContent = electionsCount || 0;
            if (candidatesElement) candidatesElement.textContent = candidatesCount || 0;
            if (votersElement) votersElement.textContent = votersCount || 0;

        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    // Load elections management tab
    async loadElectionsTab(container) {
        Utils.showLoading();

        try {
            const { data: elections, error } = await supabase
                .from('election')
                .select('*')
                .order('election_id', { ascending: false });

            if (error) throw error;

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Elections Management</h3>
                        <button class="btn btn-primary" onclick="window.Admin.showCreateElectionForm()">
                            <i class="fas fa-plus"></i> Create Election
                        </button>
                    </div>

                    <div class="admin-table-container">
                        ${elections && elections.length > 0 ? `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Description</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${elections.map(election => {
                                        const electionDate = new Date(election.election_date);
                                        const now = new Date();
                                        const actualStatus = electionDate > now ? 'Upcoming' : electionDate.toDateString() === now.toDateString() ? 'Today' : 'Ended';
                                        
                                        return `
                                            <tr>
                                                <td><strong>${Utils.sanitizeHtml(election.name)}</strong></td>
                                                <td>${Utils.sanitizeHtml(election.election_type)}</td>
                                                <td>${Utils.formatDate(election.election_date)}</td>
                                                <td>
                                                    <span class="status-badge status-${election.is_active === 'Y' ? 'active' : 'inactive'}">
                                                        ${election.is_active === 'Y' ? 'Active' : 'Inactive'}
                                                    </span>
                                                    <br>
                                                    <small class="text-muted">${actualStatus}</small>
                                                </td>
                                                <td>${Utils.sanitizeHtml(election.description || 'No description')}</td>
                                                <td class="action-buttons">
                                                    <button class="btn btn-small btn-outline" onclick="window.Admin.editElection('${election.election_id}')" title="Edit Election">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn btn-small btn-outline" onclick="window.Admin.manageElectionCandidates('${election.election_id}')" title="Manage Candidates">
                                                        <i class="fas fa-users"></i>
                                                    </button>
                                                    <button class="btn btn-small btn-outline" onclick="window.Admin.viewElectionResults('${election.election_id}')" title="View Results">
                                                        <i class="fas fa-chart-bar"></i>
                                                    </button>
                                                    <button class="btn btn-small btn-danger" onclick="window.Admin.deleteElection('${election.election_id}')" title="Delete Election">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="no-elections">
                                <i class="fas fa-vote-yea" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Elections Found</h4>
                                <p>No elections have been created yet. Create your first election to get started!</p>
                                <button class="btn btn-primary" onclick="window.Admin.showCreateElectionForm()">
                                    <i class="fas fa-plus"></i> Create First Election
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error loading elections tab:', error);
            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Elections Management</h3>
                        <button class="btn btn-primary" onclick="window.Admin.showCreateElectionForm()">
                            <i class="fas fa-plus"></i> Create Election
                        </button>
                    </div>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Error Loading Elections</h4>
                        <p>Failed to load elections: ${error.message}</p>
                        <button class="btn btn-primary" onclick="window.Admin.loadElectionsTab(this.closest('.admin-section').parentElement)">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            Utils.hideLoading();
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
                    <div class="form-group">
                        <label for="electionTitle">Election Name</label>
                        <input type="text" id="electionTitle" required placeholder="Enter election name">
                    </div>
                    
                    <div class="form-group">
                        <label for="electionDescription">Description (Optional)</label>
                        <textarea id="electionDescription" rows="3" placeholder="Describe the election purpose and details"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="electionDate">Election Date</label>
                        <input type="date" id="electionDate" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="electionType">Election Type</label>
                        <select id="electionType" required>
                            <option value="">Select Type</option>
                            <option value="General Election">General Election</option>
                            <option value="Local Election">Local Election</option>
                            <option value="Referendum">Referendum</option>
                            <option value="Primary Election">Primary Election</option>
                            <option value="Student Election">Student Election</option>
                            <option value="University Election">University Election</option>
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
        const title = document.getElementById('electionTitle').value;
        const description = document.getElementById('electionDescription').value;
        const electionDate = document.getElementById('electionDate').value;
        const type = document.getElementById('electionType').value;

        // Validation
        if (!title || !electionDate || !type) {
            Utils.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (new Date(electionDate) <= new Date()) {
            Utils.showToast('Election date must be in the future', 'error');
            return;
        }

        try {
            Utils.showLoading();

            // Get current admin ID (assuming admin_id 1 for now, should be dynamic)
            const adminId = 1; // This should be dynamic based on logged-in admin

            const { data, error } = await supabase
                .from('election')
                .insert({
                    name: title,
                    description: description,
                    election_date: electionDate,
                    election_type: type,
                    is_active: 'Y',
                    admin_id: adminId
                });

            if (error) throw error;

            Utils.showToast('Election created successfully!', 'success');
            
            // Close modal
            document.getElementById('votingModal').style.display = 'none';
            
            // Refresh elections tab
            const container = document.querySelector('.admin-content');
            if (container) {
                this.loadElectionsTab(container);
            }

        } catch (error) {
            console.error('Error creating election:', error);
            Utils.showToast('Failed to create election: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Edit election (placeholder)
    async editElection(electionId) {
        Utils.showToast('Edit election functionality coming soon!', 'info');
    }

    // Delete election
    async deleteElection(electionId) {
        if (!confirm('Are you sure you want to delete this election? This action cannot be undone.')) {
            return;
        }

        try {
            Utils.showLoading();
            
            const { error } = await supabase
                .from('election')
                .delete()
                .eq('election_id', electionId);

            if (error) throw error;

            Utils.showToast('Election deleted successfully!', 'success');
            
            // Refresh elections tab
            const container = document.querySelector('.admin-content');
            if (container) {
                this.loadElectionsTab(container);
            }
            
        } catch (error) {
            console.error('Error deleting election:', error);
            Utils.showToast('Failed to delete election: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Load candidates tab - ALREADY IMPLEMENTED IN PREVIOUS CHANGES
    async loadCandidatesTab(container) {
        try {
            Utils.showLoading();
            
            // Get all candidates/applications
            const { data: candidates, error } = await supabase
                .from('candidate')
                .select('*')
                .order('candidate_id', { ascending: false });

            if (error) throw error;

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Candidacy Applications</h3>
                        <p>Review and manage candidate applications</p>
                    </div>
                    
                    <div class="candidates-list">
                        ${candidates && candidates.length > 0 ? candidates.map(candidate => `
                            <div class="candidate-application-card">
                                <div class="candidate-header">
                                    <div class="candidate-info">
                                        ${candidate.photo_url ? `
                                            <img src="${candidate.photo_url}" alt="Candidate Photo" class="candidate-photo">
                                        ` : `
                                            <div class="candidate-photo-placeholder">
                                                <i class="fas fa-user"></i>
                                            </div>
                                        `}
                                        <div class="candidate-details">
                                            <h4>${Utils.sanitizeHtml(candidate.full_name)}</h4>
                                            <p class="candidate-party">${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                            <p class="candidate-symbol">Symbol: ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}</p>
                                        </div>
                                    </div>
                                    <div class="candidate-actions">
                                        <button class="btn btn-success btn-sm" onclick="window.Admin.approveCandidate('${candidate.candidate_id}')">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="window.Admin.rejectCandidate('${candidate.candidate_id}')">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                        <button class="btn btn-outline btn-sm" onclick="window.Admin.editCandidate('${candidate.candidate_id}')">
                                            <i class="fas fa-edit"></i> Edit
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="candidate-manifesto">
                                    <h5>Manifesto & Biography</h5>
                                    <div class="manifesto-content">
                                        ${Utils.sanitizeHtml(candidate.manifesto || 'No manifesto provided')}
                                    </div>
                                </div>
                                
                                <div class="candidate-meta">
                                    <small class="text-muted">
                                        Application ID: ${candidate.candidate_id}
                                    </small>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="no-candidates">
                                <i class="fas fa-users" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Candidate Applications</h4>
                                <p>There are no candidacy applications to review at this time.</p>
                            </div>
                        `}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading candidates:', error);
            container.innerHTML = `
                <div class="admin-section">
                    <h3>Candidates Management</h3>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading candidates: ${error.message}</p>
                        <button class="btn btn-primary" onclick="window.Admin.loadCandidatesTab(this.closest('.admin-section').parentElement)">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            Utils.hideLoading();
        }
    }

    // Approve candidate application
    async approveCandidate(candidateId) {
        if (!confirm('Are you sure you want to approve this candidate application?')) {
            return;
        }

        try {
            Utils.showLoading();
            
            const { data: candidate, error: fetchError } = await supabase
                .from('candidate')
                .select('*')
                .eq('candidate_id', candidateId)
                .single();

            if (fetchError) throw fetchError;

            const updatedParty = candidate.party?.includes('APPROVED') ? 
                candidate.party : 
                `${candidate.party || 'Independent'} - APPROVED`;

            const { error } = await supabase
                .from('candidate')
                .update({ 
                    party: updatedParty,
                    symbol: candidate.symbol === '📋' ? '✅' : candidate.symbol
                })
                .eq('candidate_id', candidateId);

            if (error) throw error;

            Utils.showToast('Candidate approved successfully!', 'success');
            
            const container = document.querySelector('.admin-content');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error approving candidate:', error);
            Utils.showToast('Failed to approve candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Reject candidate application
    async rejectCandidate(candidateId) {
        if (!confirm('Are you sure you want to reject this candidate application? This will delete the application.')) {
            return;
        }

        try {
            Utils.showLoading();
            
            const { error } = await supabase
                .from('candidate')
                .delete()
                .eq('candidate_id', candidateId);

            if (error) throw error;

            Utils.showToast('Candidate application rejected and removed.', 'success');
            
            const container = document.querySelector('.admin-content');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error rejecting candidate:', error);
            Utils.showToast('Failed to reject candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Edit candidate (placeholder)
    async editCandidate(candidateId) {
        Utils.showToast('Edit candidate functionality coming soon!', 'info');
    }

    // Load voters tab
    async loadVotersTab(container) {
        container.innerHTML = `
            <div class="admin-section">
                <h3>Voters Management</h3>
                <p>Voters management functionality will be implemented here.</p>
            </div>
        `;
    }

    // Load results tab
    async loadResultsTab(container) {
        container.innerHTML = `
            <div class="admin-section">
                <h3>Election Results</h3>
                <p>Results viewing functionality will be implemented here.</p>
            </div>
        `;
    }

    // Manage election candidates
    manageElectionCandidates(electionId) {
        Utils.showToast('Candidate management coming soon!', 'info');
    }

    // View election results (admin view)
    viewElectionResults(electionId) {
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
