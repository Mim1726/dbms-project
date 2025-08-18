// Admin Module - Complete Implementation
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
        console.log('Admin showTab called with:', tabName);
        this.currentTab = tabName;
        
        const container = document.querySelector('#adminTabContent');
        if (!container) {
            console.error('Admin tab container not found');
            return;
        }

        // Update active tab styling
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.toLowerCase().includes(tabName)) {
                tab.classList.add('active');
            }
        });

        // Load the appropriate tab content
        try {
            switch (tabName) {
                case 'elections':
                    await this.loadElectionsTab(container);
                    break;
                case 'candidates':
                    await this.loadCandidatesTab(container);
                    break;
                case 'voters':
                    await this.loadVotersTab(container);
                    break;
                case 'results':
                    await this.loadResultsTab(container);
                    break;
                default:
                    container.innerHTML = '<div class="admin-section"><h3>Tab not found</h3></div>';
            }
        } catch (error) {
            console.error(`Error loading ${tabName} tab:`, error);
            container.innerHTML = `
                <div class="admin-section">
                    <h3>Error Loading ${tabName}</h3>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load ${tabName}: ${error.message}</p>
                        <button class="btn btn-primary" onclick="window.Admin.showTab('${tabName}')">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Load admin statistics
    async loadAdminStats() {
        try {
            const [electionsRes, candidatesRes, votersRes] = await Promise.all([
                supabase.from('election').select('*', { count: 'exact' }),
                supabase.from('candidate').select('*', { count: 'exact' }),
                supabase.from('voter').select('*', { count: 'exact' })
            ]);

            console.log('Admin stats loaded:', {
                elections: electionsRes.count,
                candidates: candidatesRes.count,
                voters: votersRes.count
            });
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    // Load elections tab
    async loadElectionsTab(container) {
        try {
            Utils.showLoading();
            
            // Get all elections
            const { data: elections, error } = await supabase
                .from('election')
                .select('*')
                .order('election_date', { ascending: false });

            if (error) throw error;

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Elections Management</h3>
                        <button class="btn btn-primary" onclick="window.Admin.showCreateElectionForm()">
                            <i class="fas fa-plus"></i> Create New Election
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
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${elections.map(election => `
                                        <tr>
                                            <td>${Utils.sanitizeHtml(election.name)}</td>
                                            <td>${Utils.sanitizeHtml(election.election_type)}</td>
                                            <td>${Utils.formatDate(election.election_date)}</td>
                                            <td>
                                                <span class="status-badge status-${election.is_active === 'Y' ? 'active' : 'inactive'}">
                                                    ${election.is_active === 'Y' ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td class="action-buttons">
                                                <button class="btn btn-small btn-outline" onclick="window.Admin.editElection('${election.election_id}')" title="Edit">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-small btn-danger" onclick="window.Admin.deleteElection('${election.election_id}')" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="no-elections">
                                <i class="fas fa-ballot-check" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Elections Found</h4>
                                <p>Create your first election to get started.</p>
                                <button class="btn btn-primary" onclick="window.Admin.showCreateElectionForm()">
                                    <i class="fas fa-plus"></i> Create Election
                                </button>
                            </div>
                        `}
                    </div>

                    <!-- Create Election Form (Hidden by default) -->
                    <div id="createElectionForm" style="display: none;">
                        <div class="form-container">
                            <h4>Create New Election</h4>
                            <form id="electionForm">
                                <div class="form-group">
                                    <label for="electionName">Election Name *</label>
                                    <input type="text" id="electionName" name="name" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="electionType">Election Type *</label>
                                    <select id="electionType" name="election_type" required>
                                        <option value="">Select Type</option>
                                        <option value="General">General Election</option>
                                        <option value="Local">Local Election</option>
                                        <option value="Special">Special Election</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="electionDate">Election Date *</label>
                                    <input type="date" id="electionDate" name="election_date" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="electionDescription">Description</label>
                                    <textarea id="electionDescription" name="description" rows="3"></textarea>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Create Election</button>
                                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('createElectionForm').style.display='none'">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading elections:', error);
            container.innerHTML = `
                <div class="admin-section">
                    <h3>Elections Management</h3>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading elections: ${error.message}</p>
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
        const form = document.getElementById('createElectionForm');
        if (form) {
            form.style.display = 'block';
            document.getElementById('electionForm').onsubmit = (e) => this.handleCreateElection(e);
            
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('electionDate').min = today;
        }
    }

    // Handle create election form submission
    async handleCreateElection(event) {
        event.preventDefault();
        
        try {
            Utils.showLoading();
            
            const formData = new FormData(event.target);
            const electionData = {
                name: formData.get('name'),
                election_type: formData.get('election_type'),
                election_date: formData.get('election_date'),
                description: formData.get('description') || null,
                is_active: 'Y',
                admin_id: window.currentUser?.id || 1
            };

            const { data, error } = await supabase
                .from('election')
                .insert([electionData])
                .select();

            if (error) throw error;

            Utils.showToast('Election created successfully!', 'success');
            
            // Hide form and reload elections
            document.getElementById('createElectionForm').style.display = 'none';
            const container = document.querySelector('#adminTabContent');
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

    // Delete election (placeholder)
    async deleteElection(electionId) {
        if (confirm('Are you sure you want to delete this election? This action cannot be undone.')) {
            try {
                Utils.showLoading();
                
                const { error } = await supabase
                    .from('election')
                    .delete()
                    .eq('election_id', electionId);

                if (error) throw error;

                Utils.showToast('Election deleted successfully!', 'success');
                
                const container = document.querySelector('#adminTabContent');
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
    }

    // Load candidates tab
    async loadCandidatesTab(container) {
        try {
            Utils.showLoading();
            
            // Get all candidates with election info
            const { data: candidates, error } = await supabase
                .from('candidate')
                .select(`
                    *,
                    election (
                        name,
                        election_type
                    )
                `)
                .order('candidate_id', { ascending: false });

            if (error) throw error;

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Candidates Management</h3>
                        <p>Review and manage candidate applications</p>
                    </div>
                    
                    <div class="candidates-grid">
                        ${candidates && candidates.length > 0 ? 
                            candidates.map(candidate => `
                                <div class="candidate-card">
                                    <div class="candidate-header">
                                        <h4>${Utils.sanitizeHtml(candidate.full_name)}</h4>
                                        <span class="status-badge status-${candidate.approval_status === 'approved' ? 'success' : 
                                            candidate.approval_status === 'rejected' ? 'danger' : 'warning'}">
                                            ${candidate.approval_status || 'pending'}
                                        </span>
                                    </div>
                                    
                                    <div class="candidate-details">
                                        <p><strong>Election:</strong> ${candidate.election?.name || 'N/A'}</p>
                                        <p><strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                        <p><strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}</p>
                                        ${candidate.manifesto ? `<p><strong>Manifesto:</strong> ${Utils.sanitizeHtml(candidate.manifesto.substring(0, 100))}...</p>` : ''}
                                    </div>
                                    
                                    <div class="candidate-actions">
                                        ${candidate.approval_status !== 'approved' ? `
                                            <button class="btn btn-small btn-success" onclick="window.Admin.approveCandidate('${candidate.candidate_id}')">
                                                <i class="fas fa-check"></i> Approve
                                            </button>
                                        ` : ''}
                                        ${candidate.approval_status !== 'rejected' ? `
                                            <button class="btn btn-small btn-danger" onclick="window.Admin.rejectCandidate('${candidate.candidate_id}')">
                                                <i class="fas fa-times"></i> Reject
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-small btn-outline" onclick="window.Admin.viewCandidate('${candidate.candidate_id}')">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                    </div>
                                </div>
                            `).join('') 
                        : `
                            <div class="no-candidates">
                                <i class="fas fa-user-tie" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Candidates Found</h4>
                                <p>No candidate applications have been submitted yet.</p>
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

    // Approve candidate
    async approveCandidate(candidateId) {
        try {
            Utils.showLoading();
            
            const { error } = await supabase
                .from('candidate')
                .update({ approval_status: 'approved' })
                .eq('candidate_id', candidateId);

            if (error) throw error;

            Utils.showToast('Candidate approved successfully!', 'success');
            
            const container = document.querySelector('#adminTabContent');
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

    // Reject candidate
    async rejectCandidate(candidateId) {
        if (confirm('Are you sure you want to reject this candidate?')) {
            try {
                Utils.showLoading();
                
                const { error } = await supabase
                    .from('candidate')
                    .update({ approval_status: 'rejected' })
                    .eq('candidate_id', candidateId);

                if (error) throw error;

                Utils.showToast('Candidate rejected!', 'success');
                
                const container = document.querySelector('#adminTabContent');
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
    }

    // View candidate details (placeholder)
    async viewCandidate(candidateId) {
        Utils.showToast('View candidate details functionality coming soon!', 'info');
    }

    // Load voters tab
    async loadVotersTab(container) {
        try {
            Utils.showLoading();
            
            // Get all voters
            const { data: voters, error } = await supabase
                .from('voter')
                .select('*')
                .order('voter_id', { ascending: false });

            if (error) throw error;

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Voters Management</h3>
                        <p>Manage and verify voter registrations</p>
                    </div>
                    
                    <div class="admin-table-container">
                        ${voters && voters.length > 0 ? `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Verified</th>
                                        <th>Registration Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${voters.map(voter => `
                                        <tr>
                                            <td>${voter.voter_id}</td>
                                            <td>${Utils.sanitizeHtml(voter.full_name)}</td>
                                            <td>${Utils.sanitizeHtml(voter.email)}</td>
                                            <td>${Utils.sanitizeHtml(voter.phone || 'N/A')}</td>
                                            <td>
                                                <span class="status-badge status-${voter.is_verified === 'Y' ? 'active' : 'inactive'}">
                                                    ${voter.is_verified === 'Y' ? 'Verified' : 'Pending'}
                                                </span>
                                            </td>
                                            <td>${Utils.formatDate(voter.registration_date)}</td>
                                            <td class="action-buttons">
                                                ${voter.is_verified !== 'Y' ? `
                                                    <button class="btn btn-small btn-success" onclick="window.Admin.verifyVoter('${voter.voter_id}')" title="Verify Voter">
                                                        <i class="fas fa-check"></i>
                                                    </button>
                                                ` : ''}
                                                <button class="btn btn-small btn-outline" onclick="window.Admin.viewVoter('${voter.voter_id}')" title="View Details">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="no-voters">
                                <i class="fas fa-users" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Voters Found</h4>
                                <p>No voters have registered yet.</p>
                            </div>
                        `}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading voters:', error);
            container.innerHTML = `
                <div class="admin-section">
                    <h3>Voters Management</h3>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading voters: ${error.message}</p>
                        <button class="btn btn-primary" onclick="window.Admin.loadVotersTab(this.closest('.admin-section').parentElement)">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            Utils.hideLoading();
        }
    }

    // Verify voter
    async verifyVoter(voterId) {
        try {
            Utils.showLoading();
            
            const { error } = await supabase
                .from('voter')
                .update({ is_verified: 'Y' })
                .eq('voter_id', voterId);

            if (error) throw error;

            Utils.showToast('Voter verified successfully!', 'success');
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadVotersTab(container);
            }
            
        } catch (error) {
            console.error('Error verifying voter:', error);
            Utils.showToast('Failed to verify voter: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // View voter details (placeholder)
    async viewVoter(voterId) {
        Utils.showToast('View voter details functionality coming soon!', 'info');
    }

    // Load results tab
    async loadResultsTab(container) {
        try {
            Utils.showLoading();
            
            // Get elections with their candidates and votes
            const { data: elections, error: electionsError } = await supabase
                .from('election')
                .select('*')
                .order('election_date', { ascending: false });

            if (electionsError) throw electionsError;

            let resultsHTML = '';

            if (elections && elections.length > 0) {
                for (const election of elections) {
                    // Get candidates for this election with vote counts
                    const { data: candidates, error: candidatesError } = await supabase
                        .from('candidate')
                        .select(`
                            *,
                            vote(candidate_id)
                        `)
                        .eq('election_id', election.election_id);

                    if (candidatesError) {
                        console.error('Error loading candidates:', candidatesError);
                        continue;
                    }

                    // Count votes for each candidate
                    const candidateVotes = candidates ? candidates.map(candidate => {
                        const voteCount = candidate.vote ? candidate.vote.length : 0;
                        return { ...candidate, vote_count: voteCount };
                    }).sort((a, b) => b.vote_count - a.vote_count) : [];

                    const totalVotes = candidateVotes.reduce((sum, candidate) => sum + candidate.vote_count, 0);

                    resultsHTML += `
                        <div class="election-results">
                            <div class="result-header">
                                <h4>${Utils.sanitizeHtml(election.name)}</h4>
                                <div class="result-meta">
                                    <span class="election-type">${Utils.sanitizeHtml(election.election_type)}</span>
                                    <span class="election-date">${Utils.formatDate(election.election_date)}</span>
                                    <span class="total-votes">Total Votes: ${totalVotes}</span>
                                </div>
                            </div>
                            
                            ${candidateVotes.length > 0 ? `
                                <div class="candidates-results">
                                    ${candidateVotes.map((candidate, index) => `
                                        <div class="candidate-result ${index === 0 && candidate.vote_count > 0 ? 'winner' : ''}">
                                            <div class="candidate-info">
                                                <div class="position">#${index + 1}</div>
                                                <div class="details">
                                                    <h5>${Utils.sanitizeHtml(candidate.full_name)}</h5>
                                                    <p>${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                                </div>
                                            </div>
                                            <div class="vote-info">
                                                <div class="vote-count">${candidate.vote_count}</div>
                                                <div class="vote-percentage">
                                                    ${totalVotes > 0 ? Math.round((candidate.vote_count / totalVotes) * 100) : 0}%
                                                </div>
                                                <div class="vote-bar">
                                                    <div class="vote-fill" style="width: ${totalVotes > 0 ? (candidate.vote_count / totalVotes) * 100 : 0}%"></div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="no-results">
                                    <p>No votes cast yet for this election.</p>
                                </div>
                            `}
                        </div>
                    `;
                }
            }

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Election Results</h3>
                        <p>View voting results and statistics</p>
                    </div>
                    
                    <div class="results-container">
                        ${resultsHTML || `
                            <div class="no-elections">
                                <i class="fas fa-chart-bar" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Elections Found</h4>
                                <p>No elections have been created yet.</p>
                            </div>
                        `}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading results:', error);
            container.innerHTML = `
                <div class="admin-section">
                    <h3>Election Results</h3>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading results: ${error.message}</p>
                        <button class="btn btn-primary" onclick="window.Admin.loadResultsTab(this.closest('.admin-section').parentElement)">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            Utils.hideLoading();
        }
    }
}

// Initialize Admin globally
window.Admin = new Admin();

// Global function for tab switching (called from HTML)
function showAdminTab(tabName) {
    if (window.Admin) {
        window.Admin.showTab(tabName);
    } else {
        console.error('Admin instance not found');
    }
}
