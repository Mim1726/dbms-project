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
                                    ${elections.map(election => {
                                        const electionDate = new Date(election.election_date);
                                        const currentDate = new Date();
                                        const hasEnded = electionDate < currentDate;
                                        const isToday = electionDate.toDateString() === currentDate.toDateString();
                                        
                                        // Determine election status
                                        let statusText = 'Upcoming';
                                        let statusClass = 'status-warning';
                                        
                                        if (hasEnded) {
                                            statusText = 'Ended';
                                            statusClass = 'status-inactive';
                                        } else if (isToday) {
                                            statusText = 'Ongoing';
                                            statusClass = 'status-active';
                                        }
                                        
                                        return `
                                            <tr>
                                                <td>${Utils.sanitizeHtml(election.name)}</td>
                                                <td>${Utils.sanitizeHtml(election.election_type)}</td>
                                                <td>${Utils.formatDate(election.election_date)}</td>
                                                <td>
                                                    <span class="status-badge ${statusClass}">
                                                        ${statusText}
                                                    </span>
                                                </td>
                                                <td class="action-buttons">
                                                    <button class="btn btn-small btn-outline" onclick="window.Admin.editElection('${election.election_id}')" title="Edit">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    ${hasEnded ? `
                                                        <button class="btn btn-small btn-primary" onclick="window.Admin.publishResults('${election.election_id}')" title="Publish Results">
                                                            <i class="fas fa-chart-line"></i> Results
                                                        </button>
                                                    ` : `
                                                        <button class="btn btn-small btn-disabled" disabled title="Results available after election ends">
                                                            <i class="fas fa-clock"></i> Pending
                                                        </button>
                                                    `}
                                                    <button class="btn btn-small btn-danger" onclick="window.Admin.deleteElection('${election.election_id}')" title="Delete">
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

    // Publish Results - Calculate and publish election results
    async publishResults(electionId) {
        try {
            // First get election details
            const { data: election, error: electionError } = await supabase
                .from('election')
                .select('*')
                .eq('election_id', electionId)
                .single();

            if (electionError) throw electionError;

            // Check if election has ended
            const electionDate = new Date(election.election_date);
            const currentDate = new Date();
            const hasEnded = electionDate < currentDate;

            if (!hasEnded) {
                Utils.showToast('Results can only be published after the election has ended.', 'warning');
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to publish results for "${election.name}"?\n\nThis will:\n- Calculate vote counts for all candidates\n- Update the results table\n- Make results visible to voters\n\nThis action cannot be undone.`);
            
            if (!confirmed) return;

            Utils.showLoading();

            // Get all contests for this election
            const { data: contests, error: contestError } = await supabase
                .from('contest')
                .select(`
                    *,
                    candidate(full_name, party, symbol)
                `)
                .eq('election_id', electionId);

            if (contestError) throw contestError;

            if (!contests || contests.length === 0) {
                Utils.showToast('No candidates found for this election.', 'warning');
                return;
            }

            // Calculate results for each candidate
            const results = [];
            let totalVotes = 0;

            for (const contest of contests) {
                // Count votes for this candidate
                const { data: votes, error: voteError } = await supabase
                    .from('vote')
                    .select('vote_id')
                    .eq('contest_id', contest.contest_id);

                if (voteError) {
                    console.error('Error counting votes for contest:', contest.contest_id, voteError);
                    continue;
                }

                const voteCount = votes ? votes.length : 0;
                totalVotes += voteCount;

                results.push({
                    election_id: electionId,
                    candidate_id: contest.candidate_id,
                    total_votes: voteCount,
                    candidate_name: contest.candidate.full_name,
                    party: contest.candidate.party
                });
            }

            // Calculate percentages
            results.forEach(result => {
                result.percentage = totalVotes > 0 ? (result.total_votes / totalVotes) * 100 : 0;
            });

            // Clear existing results for this election
            await supabase
                .from('result')
                .delete()
                .eq('election_id', electionId);

            // Insert new results
            const { error: insertError } = await supabase
                .from('result')
                .insert(results);

            if (insertError) throw insertError;

            // Show results summary
            const winner = results.reduce((prev, current) => 
                (prev.total_votes > current.total_votes) ? prev : current
            );

            const resultSummary = `
                <div class="result-summary-modal">
                    <div class="modal-content">
                        <h3>📊 Results Published Successfully!</h3>
                        <div class="election-info">
                            <h4>${election.name}</h4>
                            <p>Total Votes Cast: <strong>${totalVotes}</strong></p>
                        </div>
                        
                        <div class="winner-announcement">
                            ${totalVotes > 0 ? `
                                <h4>🏆 Winner: ${winner.candidate_name}</h4>
                                <p>${winner.party || 'Independent'} - ${winner.total_votes} votes (${winner.percentage.toFixed(1)}%)</p>
                            ` : `
                                <h4>No votes were cast in this election</h4>
                            `}
                        </div>
                        
                        <div class="all-results">
                            <h5>Complete Results:</h5>
                            <table class="results-table">
                                <thead>
                                    <tr>
                                        <th>Candidate</th>
                                        <th>Party</th>
                                        <th>Votes</th>
                                        <th>Percentage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${results.sort((a, b) => b.total_votes - a.total_votes).map(result => `
                                        <tr>
                                            <td>${result.candidate_name}</td>
                                            <td>${result.party || 'Independent'}</td>
                                            <td>${result.total_votes}</td>
                                            <td>${result.percentage.toFixed(1)}%</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="this.closest('.result-summary-modal').remove(); window.Admin.loadElectionsTab(document.querySelector('#adminTabContent'));">
                                Close
                            </button>
                            <button class="btn btn-outline" onclick="window.Admin.showTab('results')">
                                View Results Tab
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', resultSummary);

            Utils.showToast('Election results published successfully!', 'success');

        } catch (error) {
            console.error('Error publishing results:', error);
            Utils.showToast('Failed to publish results: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Publish All Results - Bulk publish results for all elections
    async publishAllResults() {
        try {
            const confirmed = confirm('Are you sure you want to publish results for ALL elections?\n\nThis will calculate and update results for every election in the system.\n\nThis action cannot be undone.');
            
            if (!confirmed) return;

            Utils.showLoading();

            // Get all elections
            const { data: elections, error: electionsError } = await supabase
                .from('election')
                .select('election_id, name');

            if (electionsError) throw electionsError;

            if (!elections || elections.length === 0) {
                Utils.showToast('No elections found to publish results for.', 'warning');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            // Publish results for each election
            for (const election of elections) {
                try {
                    await this.publishElectionResults(election.election_id);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to publish results for election ${election.election_id}:`, error);
                    failCount++;
                }
            }

            if (successCount > 0) {
                Utils.showToast(`Successfully published results for ${successCount} election(s)${failCount > 0 ? ` (${failCount} failed)` : ''}!`, 'success');
                
                // Refresh the results tab
                const container = document.querySelector('#adminTabContent');
                if (container) {
                    this.loadResultsTab(container);
                }
            } else {
                Utils.showToast('Failed to publish results for any elections.', 'error');
            }

        } catch (error) {
            console.error('Error in bulk publish results:', error);
            Utils.showToast('Failed to publish results: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Helper function to publish results for a single election (without UI)
    async publishElectionResults(electionId) {
        // Get all contests for this election
        const { data: contests, error: contestError } = await supabase
            .from('contest')
            .select(`
                *,
                candidate(full_name, party, symbol)
            `)
            .eq('election_id', electionId);

        if (contestError) throw contestError;

        if (!contests || contests.length === 0) {
            return; // Skip elections with no candidates
        }

        // Calculate results for each candidate
        const results = [];
        let totalVotes = 0;

        for (const contest of contests) {
            // Count votes for this candidate
            const { data: votes, error: voteError } = await supabase
                .from('vote')
                .select('vote_id')
                .eq('contest_id', contest.contest_id);

            if (voteError) {
                console.error('Error counting votes for contest:', contest.contest_id, voteError);
                continue;
            }

            const voteCount = votes ? votes.length : 0;
            totalVotes += voteCount;

            results.push({
                election_id: electionId,
                candidate_id: contest.candidate_id,
                total_votes: voteCount
            });
        }

        // Calculate percentages
        results.forEach(result => {
            result.percentage = totalVotes > 0 ? (result.total_votes / totalVotes) * 100 : 0;
        });

        // Clear existing results for this election
        await supabase
            .from('result')
            .delete()
            .eq('election_id', electionId);

        // Insert new results
        if (results.length > 0) {
            const { error: insertError } = await supabase
                .from('result')
                .insert(results);

            if (insertError) throw insertError;
        }
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
            
            // Get all candidates first
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidate')
                .select('*')
                .order('candidate_id', { ascending: false });

            if (candidatesError) throw candidatesError;

            // Get all contests to determine approval status
            const { data: contests, error: contestsError } = await supabase
                .from('contest')
                .select(`
                    candidate_id,
                    election_id,
                    position,
                    election(name, election_type)
                `);

            if (contestsError) throw contestsError;

            // Create a map of candidate_id to contest info
            const contestMap = {};
            contests?.forEach(contest => {
                if (!contestMap[contest.candidate_id]) {
                    contestMap[contest.candidate_id] = [];
                }
                contestMap[contest.candidate_id].push(contest);
            });

            // Add contest info to candidates
            const candidatesWithStatus = candidates.map(candidate => ({
                ...candidate,
                contest: contestMap[candidate.candidate_id] || []
            }));

            // Separate candidates into pending and approved
            const pendingCandidates = candidatesWithStatus.filter(candidate => candidate.contest.length === 0);
            const approvedCandidates = candidatesWithStatus.filter(candidate => candidate.contest.length > 0);

            // Group approved candidates by election
            const candidatesByElection = {};
            approvedCandidates.forEach(candidate => {
                if (candidate.contest && candidate.contest.length > 0) {
                    const contest = candidate.contest[0]; // Take first contest if multiple
                    const electionId = contest.election_id;
                    const electionName = contest.election?.name || 'Unknown Election';
                    
                    if (!candidatesByElection[electionId]) {
                        candidatesByElection[electionId] = {
                            name: electionName,
                            candidates: []
                        };
                    }
                    candidatesByElection[electionId].candidates.push(candidate);
                }
            });

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Candidates Management</h3>
                        <div class="candidate-tabs">
                            <button class="candidate-tab-btn active" onclick="window.Admin.showCandidateTab('pending')">
                                Pending Approval (${pendingCandidates.length})
                            </button>
                            <button class="candidate-tab-btn" onclick="window.Admin.showCandidateTab('approved')">
                                Approved Candidates (${approvedCandidates.length})
                            </button>
                        </div>
                    </div>
                    
                    <!-- Pending Candidates Section -->
                    <div id="pendingCandidates" class="candidate-section">
                        <div class="section-subtitle">
                            <h4>Candidates Awaiting Approval</h4>
                            <p>Review and approve new candidate applications</p>
                        </div>
                        
                        <div class="candidates-grid">
                            ${pendingCandidates.length > 0 ? 
                                pendingCandidates.map(candidate => `
                                    <div class="candidate-card pending">
                                        <div class="candidate-header">
                                            <h4>${Utils.sanitizeHtml(candidate.full_name)}</h4>
                                            <span class="status-badge status-warning">
                                                Pending Approval
                                            </span>
                                        </div>
                                        
                                        <div class="candidate-details">
                                            <p><strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                            <p><strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}</p>
                                            ${candidate.manifesto ? `<p><strong>Manifesto:</strong> ${Utils.sanitizeHtml(candidate.manifesto.substring(0, 100))}${candidate.manifesto.length > 100 ? '...' : ''}</p>` : ''}
                                        </div>
                                        
                                        <div class="candidate-actions">
                                            <button class="btn btn-small btn-success" onclick="window.Admin.approveCandidate('${candidate.candidate_id}')">
                                                <i class="fas fa-check"></i> Approve
                                            </button>
                                            <button class="btn btn-small btn-outline" onclick="window.Admin.viewCandidate('${candidate.candidate_id}')">
                                                <i class="fas fa-eye"></i> View Details
                                            </button>
                                            <button class="btn btn-small btn-danger" onclick="window.Admin.deleteCandidate('${candidate.candidate_id}')">
                                                <i class="fas fa-trash"></i> Delete
                                            </button>
                                        </div>
                                    </div>
                                `).join('') 
                            : `
                                <div class="no-candidates">
                                    <i class="fas fa-user-check" style="font-size: 48px; color: #10b981; margin-bottom: 20px;"></i>
                                    <h4>All Caught Up!</h4>
                                    <p>No candidates are waiting for approval.</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Approved Candidates Section -->
                    <div id="approvedCandidates" class="candidate-section" style="display: none;">
                        <div class="section-subtitle">
                            <h4>Approved Candidates by Election</h4>
                            <p>Manage candidates who have been approved for elections</p>
                        </div>
                        
                        ${Object.keys(candidatesByElection).length > 0 ? `
                            <div class="elections-list">
                                ${Object.entries(candidatesByElection).map(([electionId, election]) => `
                                    <div class="election-group">
                                        <div class="election-header">
                                            <h5>
                                                <i class="fas fa-vote-yea"></i>
                                                ${Utils.sanitizeHtml(election.name)}
                                            </h5>
                                            <span class="candidate-count">${election.candidates.length} candidate${election.candidates.length !== 1 ? 's' : ''}</span>
                                        </div>
                                        
                                        <div class="election-candidates">
                                            ${election.candidates.map(candidate => `
                                                <div class="candidate-card approved">
                                                    <div class="candidate-header">
                                                        <h4>${Utils.sanitizeHtml(candidate.full_name)}</h4>
                                                        <span class="status-badge status-active">
                                                            Approved
                                                        </span>
                                                    </div>
                                                    
                                                    <div class="candidate-details">
                                                        <p><strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                                        <p><strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}</p>
                                                        <p><strong>Position:</strong> ${Utils.sanitizeHtml(candidate.contest[0]?.position || 'Candidate')}</p>
                                                    </div>
                                                    
                                                    <div class="candidate-actions">
                                                        <button class="btn btn-small btn-outline" onclick="window.Admin.viewCandidate('${candidate.candidate_id}')">
                                                            <i class="fas fa-eye"></i> View Details
                                                        </button>
                                                        <button class="btn btn-small btn-warning" onclick="window.Admin.moveCandidate('${candidate.candidate_id}')">
                                                            <i class="fas fa-exchange-alt"></i> Move
                                                        </button>
                                                        <button class="btn btn-small btn-danger" onclick="window.Admin.rejectCandidate('${candidate.candidate_id}')">
                                                            <i class="fas fa-times"></i> Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="no-candidates">
                                <i class="fas fa-user-tie" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Approved Candidates</h4>
                                <p>No candidates have been approved for any elections yet.</p>
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

    // Show candidate tab (pending or approved)
    showCandidateTab(tabType) {
        const pendingSection = document.getElementById('pendingCandidates');
        const approvedSection = document.getElementById('approvedCandidates');
        const tabs = document.querySelectorAll('.candidate-tab-btn');
        
        // Update tab styling
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if ((tabType === 'pending' && tab.textContent.includes('Pending')) ||
                (tabType === 'approved' && tab.textContent.includes('Approved'))) {
                tab.classList.add('active');
            }
        });
        
        // Show/hide sections
        if (tabType === 'pending') {
            pendingSection.style.display = 'block';
            approvedSection.style.display = 'none';
        } else {
            pendingSection.style.display = 'none';
            approvedSection.style.display = 'block';
        }
    }

    // Move candidate to different election
    async moveCandidate(candidateId) {
        try {
            // Get all active elections
            const { data: elections, error: electionError } = await supabase
                .from('election')
                .select('election_id, name')
                .eq('is_active', 'Y');

            if (electionError) throw electionError;

            if (!elections || elections.length === 0) {
                Utils.showToast('No active elections available to move candidate to.', 'warning');
                return;
            }

            // Show election selection modal
            const options = elections.map(election => 
                `<option value="${election.election_id}">${election.name}</option>`
            ).join('');

            const modalHtml = `
                <div class="form-overlay" id="moveModal">
                    <div class="form-container">
                        <div class="form-header">
                            <h3>Move Candidate</h3>
                            <button class="btn-close" onclick="document.getElementById('moveModal').remove()">×</button>
                        </div>
                        <form onsubmit="window.Admin.handleMoveCandidate(event, '${candidateId}')">
                            <div class="form-group">
                                <label>Select Election:</label>
                                <select name="election_id" required>
                                    <option value="">Choose an election...</option>
                                    ${options}
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn btn-outline" onclick="document.getElementById('moveModal').remove()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Move Candidate</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

        } catch (error) {
            console.error('Error preparing candidate move:', error);
            Utils.showToast('Failed to load elections: ' + error.message, 'error');
        }
    }

    // Handle move candidate form submission
    async handleMoveCandidate(event, candidateId) {
        event.preventDefault();
        
        try {
            Utils.showLoading();
            
            const formData = new FormData(event.target);
            const newElectionId = formData.get('election_id');

            // Remove from current contest
            await supabase
                .from('contest')
                .delete()
                .eq('candidate_id', candidateId);

            // Add to new election
            const { error } = await supabase
                .from('contest')
                .insert({
                    election_id: newElectionId,
                    candidate_id: candidateId,
                    position: 'Candidate'
                });

            if (error) throw error;

            Utils.showToast('Candidate moved successfully!', 'success');
            document.getElementById('moveModal').remove();
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error moving candidate:', error);
            Utils.showToast('Failed to move candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Delete candidate completely
    async deleteCandidate(candidateId) {
        if (!confirm('Are you sure you want to permanently delete this candidate? This action cannot be undone.')) {
            return;
        }
        
        try {
            Utils.showLoading();
            
            // First remove from any contests
            await supabase
                .from('contest')
                .delete()
                .eq('candidate_id', candidateId);

            // Then delete the candidate
            const { error } = await supabase
                .from('candidate')
                .delete()
                .eq('candidate_id', candidateId);

            if (error) throw error;

            Utils.showToast('Candidate deleted permanently!', 'success');
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error deleting candidate:', error);
            Utils.showToast('Failed to delete candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Approve candidate (add to contest for active election)
    async approveCandidate(candidateId) {
        try {
            Utils.showLoading();
            
            // First check if there are any active elections
            const { data: elections, error: electionError } = await supabase
                .from('election')
                .select('election_id, name')
                .eq('is_active', 'Y');

            if (electionError) throw electionError;

            if (!elections || elections.length === 0) {
                Utils.showToast('No active elections found. Please create an active election first.', 'warning');
                return;
            }

            // Add candidate to the first active election
            const { error } = await supabase
                .from('contest')
                .insert({
                    election_id: elections[0].election_id,
                    candidate_id: candidateId,
                    position: 'Candidate'
                });

            if (error) {
                // If already in contest, that's fine
                if (error.code === '23505') { // Unique constraint violation
                    Utils.showToast('Candidate is already approved for this election!', 'info');
                } else {
                    throw error;
                }
            } else {
                Utils.showToast(`Candidate approved and added to "${elections[0].name}"!`, 'success');
            }
            
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

    // Reject candidate (remove from all contests)
    async rejectCandidate(candidateId) {
        if (!confirm('Are you sure you want to remove this candidate from all elections?')) {
            return;
        }
        
        try {
            Utils.showLoading();
            
            // Remove from all contests
            const { error } = await supabase
                .from('contest')
                .delete()
                .eq('candidate_id', candidateId);

            if (error) throw error;

            Utils.showToast('Candidate removed from all elections!', 'success');
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error removing candidate:', error);
            Utils.showToast('Failed to remove candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
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
            
            // Get elections with their results
            const { data: elections, error: electionsError } = await supabase
                .from('election')
                .select('*')
                .order('election_date', { ascending: false });

            if (electionsError) throw electionsError;

            let resultsHTML = '';

            if (elections && elections.length > 0) {
                for (const election of elections) {
                    // Get results for this election
                    const { data: results, error: resultsError } = await supabase
                        .from('result')
                        .select(`
                            *,
                            candidate(
                                full_name,
                                party,
                                symbol
                            )
                        `)
                        .eq('election_id', election.election_id)
                        .order('total_votes', { ascending: false });

                    if (resultsError) {
                        console.error('Error loading results:', resultsError);
                        continue;
                    }

                    const totalVotes = results ? results.reduce((sum, result) => sum + (result.total_votes || 0), 0) : 0;

                    resultsHTML += `
                        <div class="election-results">
                            <div class="result-header">
                                <div class="result-title">
                                    <h4>${Utils.sanitizeHtml(election.name)}</h4>
                                    <div class="result-meta">
                                        <span class="election-type">${Utils.sanitizeHtml(election.election_type)}</span>
                                        <span class="election-date">${Utils.formatDate(election.election_date)}</span>
                                        <span class="total-votes">Total Votes: ${totalVotes}</span>
                                    </div>
                                </div>
                                <div class="result-actions">
                                    <button class="btn btn-small btn-primary" onclick="window.Admin.publishResults('${election.election_id}')" title="Recalculate & Publish Results">
                                        <i class="fas fa-sync"></i> Update Results
                                    </button>
                                </div>
                            </div>
                            
                            ${results && results.length > 0 ? `
                                <div class="candidates-results">
                                    ${results.map((result, index) => `
                                        <div class="candidate-result ${index === 0 && result.total_votes > 0 ? 'winner' : ''}">
                                            <div class="candidate-info">
                                                <div class="position">#${index + 1}</div>
                                                <div class="details">
                                                    <h5>${Utils.sanitizeHtml(result.candidate?.full_name || 'Unknown')}</h5>
                                                    <p>${Utils.sanitizeHtml(result.candidate?.party || 'Independent')}</p>
                                                </div>
                                            </div>
                                            <div class="vote-info">
                                                <div class="vote-count">${result.total_votes || 0}</div>
                                                <div class="vote-percentage">
                                                    ${result.percentage ? result.percentage.toFixed(1) : '0.0'}%
                                                </div>
                                                <div class="vote-bar">
                                                    <div class="vote-fill" style="width: ${result.percentage || 0}%"></div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="no-results">
                                    <p>No results available for this election yet.</p>
                                </div>
                            `}
                        </div>
                    `;
                }
            }

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <div>
                            <h3>Election Results</h3>
                            <p>View voting results and statistics</p>
                        </div>
                        <div class="section-actions">
                            <button class="btn btn-primary" onclick="window.Admin.publishAllResults()">
                                <i class="fas fa-chart-bar"></i> Publish All Results
                            </button>
                        </div>
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
