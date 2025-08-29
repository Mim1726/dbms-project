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
        this.showCreateElectionModal();
    }

    // Show modal popup for creating election
    showCreateElectionModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="createElectionModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-plus-circle"></i> Create New Election</h2>
                        <span class="close" onclick="window.Admin.closeCreateElectionModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="createElectionModalForm">
                            <div class="form-group">
                                <label for="modalElectionName">Election Name *</label>
                                <input type="text" id="modalElectionName" name="name" required 
                                       placeholder="e.g., Student Council Election 2025">
                            </div>

                            <div class="form-group">
                                <label for="modalElectionType">Election Type *</label>
                                <select id="modalElectionType" name="election_type" required>
                                    <option value="">Select Election Type</option>
                                    <option value="General">General Election</option>
                                    <option value="Local">Local Election</option>
                                    <option value="University">University Election</option>
                                    <option value="Special">Special Election</option>
                                    <option value="Primary">Primary Election</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="modalDescription">Description</label>
                                <textarea id="modalDescription" name="description" 
                                         placeholder="Provide details about this election..."></textarea>
                            </div>

                            <div class="datetime-container">
                                <div class="datetime-group">
                                    <div class="datetime-item">
                                        <h4><i class="fas fa-calendar-plus"></i> Voting Start</h4>
                                        <div class="form-group">
                                            <label for="modalStartDate">Start Date *</label>
                                            <input type="date" id="modalStartDate" name="start_date" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="modalStartTime">Start Time *</label>
                                            <input type="time" id="modalStartTime" name="start_time" required>
                                        </div>
                                    </div>

                                    <div class="datetime-item">
                                        <h4><i class="fas fa-calendar-times"></i> Voting End</h4>
                                        <div class="form-group">
                                            <label for="modalEndDate">End Date *</label>
                                            <input type="date" id="modalEndDate" name="end_date" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="modalEndTime">End Time *</label>
                                            <input type="time" id="modalEndTime" name="end_time" required>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Create Election
                                </button>
                                <button type="button" class="btn btn-secondary" onclick="window.Admin.closeCreateElectionModal()">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('createElectionModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Set up form validation and defaults
        this.setupModalFormDefaults();

        // Handle form submission
        document.getElementById('createElectionModalForm').onsubmit = (e) => this.handleCreateElectionModal(e);
    }

    // Set up modal form defaults and validation
    setupModalFormDefaults() {
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('modalStartDate').min = today;
        document.getElementById('modalEndDate').min = today;
        
        // Set default start time to current time
        const now = new Date();
        const timeString = now.toTimeString().slice(0, 5);
        document.getElementById('modalStartTime').value = timeString;
        
        // Set default end time to 2 hours later
        now.setHours(now.getHours() + 2);
        const endTimeString = now.toTimeString().slice(0, 5);
        document.getElementById('modalEndTime').value = endTimeString;

        // Update end date minimum when start date changes
        document.getElementById('modalStartDate').addEventListener('change', function() {
            document.getElementById('modalEndDate').min = this.value;
            
            // If end date is before start date, update it
            if (document.getElementById('modalEndDate').value < this.value) {
                document.getElementById('modalEndDate').value = this.value;
            }
        });
    }

    // Close modal
    closeCreateElectionModal() {
        const modal = document.getElementById('createElectionModal');
        if (modal) {
            modal.remove();
        }
    }

    // Handle modal form submission
    async handleCreateElectionModal(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const electionData = Object.fromEntries(formData);
            
            // Validate required fields
            if (!electionData.name || !electionData.election_type || !electionData.start_date || !electionData.start_time || !electionData.end_date || !electionData.end_time) {
                this.showModalAlert('Please fill in all required fields.', 'error');
                return;
            }
            
            // Validate dates
            const startDateTime = new Date(`${electionData.start_date}T${electionData.start_time}`);
            const endDateTime = new Date(`${electionData.end_date}T${electionData.end_time}`);
            
            if (endDateTime <= startDateTime) {
                this.showModalAlert('End date and time must be after start date and time.', 'error');
                return;
            }
            
            if (startDateTime < new Date()) {
                this.showModalAlert('Start date and time cannot be in the past.', 'error');
                return;
            }

            // Show loading state
            this.showModalAlert('Creating election...', 'loading');
            
            // Check if election name already exists
            const { data: existingElection, error: checkError } = await supabase
                .from('election')
                .select('election_id, name')
                .eq('name', electionData.name)
                .single();
            
            if (existingElection) {
                this.showModalAlert(`Election with name "${electionData.name}" already exists. Please choose a different name.`, 'error');
                return;
            }
            
            // Create election
            const { data, error } = await supabase
                .from('election')
                .insert([{
                    name: electionData.name,
                    election_type: electionData.election_type,
                    election_date: electionData.end_date, // Using end date as main election date
                    description: electionData.description || null,
                    is_active: 'Y',
                    admin_id: window.Auth?.currentUser?.admin_id || 1
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // PostgreSQL unique constraint violation
                    this.showModalAlert(`Election with name "${electionData.name}" already exists. Please choose a different name.`, 'error');
                } else {
                    this.showModalAlert(`Error creating election: ${error.message}`, 'error');
                }
                return;
            }

            // Create schedule entry
            const { error: scheduleError } = await supabase
                .from('schedule')
                .insert([{
                    election_id: data.election_id,
                    voting_start: startDateTime.toISOString(),
                    voting_end: endDateTime.toISOString()
                }]);

            if (scheduleError) {
                console.warn('Schedule creation warning:', scheduleError);
            }

            // Show success message
            this.showModalAlert(`🎉 Election "${electionData.name}" created successfully! Election ID: ${data.election_id}`, 'success');
            
            // Close modal after 2 seconds and refresh elections
            setTimeout(() => {
                this.closeCreateElectionModal();
                this.loadElections();
            }, 2000);

        } catch (error) {
            console.error('Error creating election:', error);
            this.showModalAlert(`❌ Unexpected error: ${error.message}`, 'error');
        }
    }

    // Show alert message in modal
    showModalAlert(message, type) {
        // Remove existing alert
        const existingAlert = document.getElementById('modalAlert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create alert element
        const alertClass = type === 'error' ? 'alert-error' : 
                          type === 'success' ? 'alert-success' : 
                          type === 'loading' ? 'alert-loading' : 'alert-info';
        
        const icon = type === 'error' ? '❌' : 
                    type === 'success' ? '✅' : 
                    type === 'loading' ? '⏳' : 'ℹ️';

        const alertHTML = `
            <div id="modalAlert" class="modal-alert ${alertClass}" style="
                padding: 15px;
                margin: 15px 0;
                border-radius: 8px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
                ${type === 'error' ? 'background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;' : ''}
                ${type === 'success' ? 'background: #d4edda; border: 1px solid #c3e6cb; color: #155724;' : ''}
                ${type === 'loading' ? 'background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460;' : ''}
            ">
                <span style="font-size: 1.2rem;">${icon}</span>
                <span>${message}</span>
            </div>
        `;

        // Insert alert at the top of modal body
        const modalBody = document.querySelector('#createElectionModal .modal-body');
        if (modalBody) {
            modalBody.insertAdjacentHTML('afterbegin', alertHTML);
            
            // Scroll to top to show the alert
            modalBody.scrollTop = 0;
        }

        // Auto-remove loading alerts after 10 seconds
        if (type === 'loading') {
            setTimeout(() => {
                const alert = document.getElementById('modalAlert');
                if (alert && alert.classList.contains('alert-loading')) {
                    alert.remove();
                }
            }, 10000);
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

    // Declare Winner - Officially declare the winner of an election
    async declareWinner(electionId) {
        try {
            // Get election details
            const { data: election, error: electionError } = await supabase
                .from('election')
                .select('*')
                .eq('election_id', electionId)
                .single();

            if (electionError) throw electionError;

            // Check if winner already declared (try both methods)
            let winnerAlreadyDeclared = false;
            try {
                const { data: winnerCheck } = await supabase
                    .from('election')
                    .select('winner_declared')
                    .eq('election_id', electionId)
                    .single();
                
                if (winnerCheck?.winner_declared === 'Y') {
                    winnerAlreadyDeclared = true;
                }
            } catch (error) {
                // Column doesn't exist, proceed with declaration
                console.log('Winner declaration column not available, proceeding...');
            }

            if (winnerAlreadyDeclared) {
                Utils.showToast('Winner has already been declared for this election.', 'warning');
                return;
            }

            // Get current results to find the winner
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
                .eq('election_id', electionId)
                .order('total_votes', { ascending: false });

            if (resultsError) throw resultsError;

            if (!results || results.length === 0) {
                Utils.showToast('No results available for this election. Please update results first.', 'warning');
                return;
            }

            const winner = results[0];
            const totalVotes = results.reduce((sum, result) => sum + (result.total_votes || 0), 0);

            // Check for tie
            const topCandidates = results.filter(r => r.total_votes === winner.total_votes);
            if (topCandidates.length > 1) {
                const tieMessage = `There is a tie between ${topCandidates.length} candidates with ${winner.total_votes} votes each:\n\n${topCandidates.map(c => `• ${c.candidate.full_name} (${c.candidate.party || 'Independent'})`).join('\n')}\n\nPlease resolve the tie before declaring a winner.`;
                alert(tieMessage);
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`🏆 DECLARE WINNER\n\nElection: ${election.name}\nWinner: ${winner.candidate.full_name}\nParty: ${winner.candidate.party || 'Independent'}\nVotes: ${winner.total_votes} (${winner.percentage ? winner.percentage.toFixed(1) : '0.0'}%)\nTotal Votes Cast: ${totalVotes}\n\nAre you sure you want to officially declare this candidate as the winner?\n\nThis will make the results visible to all voters.`);
            
            if (!confirmed) return;

            Utils.showLoading();

            // Try to update election table with winner information (if columns exist)
            try {
                const { error: updateError } = await supabase
                    .from('election')
                    .update({
                        winner_declared: 'Y',
                        winner_candidate_id: winner.candidate_id,
                        winner_declared_at: new Date().toISOString()
                    })
                    .eq('election_id', electionId);

                if (updateError) {
                    console.log('Winner declaration columns not available, using alternative method');
                    // If columns don't exist, just mark election as completed
                    await supabase
                        .from('election')
                        .update({ is_active: 'N' })
                        .eq('election_id', electionId);
                }
            } catch (error) {
                console.log('Using alternative winner declaration method');
                // Fallback: just mark election as inactive
                await supabase
                    .from('election')
                    .update({ is_active: 'N' })
                    .eq('election_id', electionId);
            }

            // Create audit log entry
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                await supabase
                    .from('audit_log')
                    .insert([{
                        admin_id: currentUser.admin_id || null,
                        action: 'DECLARE_WINNER',
                        description: `Declared winner for election "${election.name}": ${winner.candidate.full_name} with ${winner.total_votes} votes`,
                        action_time: new Date().toISOString()
                    }]);
            } catch (error) {
                console.log('Audit log not available:', error);
            }

            // Show winner announcement
            const winnerAnnouncement = `
                <div class="winner-announcement-modal" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 20px;
                    box-sizing: border-box;
                ">
                    <div class="modal-content" style="
                        background: white;
                        border-radius: 16px;
                        max-width: 600px;
                        width: 100%;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 25px 75px rgba(0, 0, 0, 0.3);
                        text-align: center;
                        padding: 40px;
                    ">
                        <div class="winner-header">
                            <i class="fas fa-trophy" style="font-size: 48px; color: #ffd700; margin-bottom: 20px;"></i>
                            <h2 style="color: #2d3748; margin: 0 0 30px 0;">🎉 WINNER DECLARED!</h2>
                        </div>
                        
                        <div class="election-info" style="margin-bottom: 30px;">
                            <h3 style="color: #4a5568; margin: 0 0 10px 0;">${election.name}</h3>
                            <p style="color: #718096; margin: 5px 0;">${election.election_type}</p>
                            <p style="color: #718096; margin: 5px 0;">${Utils.formatDate(election.election_date)}</p>
                        </div>
                        
                        <div class="winner-details" style="margin-bottom: 30px;">
                            <div class="winner-card" style="
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                padding: 30px;
                                border-radius: 12px;
                                margin-bottom: 20px;
                            ">
                                <h3 style="margin: 0 0 10px 0; font-size: 24px;">🏆 ${winner.candidate.full_name}</h3>
                                <p style="margin: 0 0 10px 0; opacity: 0.9;">${winner.candidate.party || 'Independent'}</p>
                                ${winner.candidate.symbol ? `<p style="margin: 0 0 20px 0; opacity: 0.8;">Symbol: ${winner.candidate.symbol}</p>` : ''}
                                <div class="vote-stats" style="display: flex; justify-content: space-around; gap: 20px;">
                                    <div class="stat">
                                        <div style="font-size: 24px; font-weight: bold;">${winner.total_votes}</div>
                                        <div style="font-size: 12px; opacity: 0.8;">Votes Received</div>
                                    </div>
                                    <div class="stat">
                                        <div style="font-size: 24px; font-weight: bold;">${winner.percentage ? winner.percentage.toFixed(1) : '0.0'}%</div>
                                        <div style="font-size: 12px; opacity: 0.8;">Vote Share</div>
                                    </div>
                                    <div class="stat">
                                        <div style="font-size: 24px; font-weight: bold;">${totalVotes}</div>
                                        <div style="font-size: 12px; opacity: 0.8;">Total Votes Cast</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="other-results">
                            <h4 style="color: #4a5568; margin-bottom: 15px;">Final Results</h4>
                            <div class="results-list" style="text-align: left;">
                                ${results.map((result, index) => `
                                    <div style="
                                        display: flex;
                                        align-items: center;
                                        padding: 10px;
                                        margin: 5px 0;
                                        background: ${index === 0 ? '#f0fff4' : '#f7fafc'};
                                        border-radius: 6px;
                                        border-left: 4px solid ${index === 0 ? '#38a169' : '#e2e8f0'};
                                    ">
                                        <span style="font-weight: bold; margin-right: 10px; color: #4a5568;">${index + 1}.</span>
                                        <span style="flex: 1; font-weight: ${index === 0 ? 'bold' : 'normal'}; color: #2d3748;">${result.candidate.full_name}</span>
                                        <span style="margin: 0 10px; color: #718096;">(${result.candidate.party || 'Independent'})</span>
                                        <span style="margin: 0 10px; font-weight: bold; color: #4a5568;">${result.total_votes} votes</span>
                                        <span style="color: #718096;">${result.percentage ? result.percentage.toFixed(1) : '0.0'}%</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="modal-actions" style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                            <button class="btn btn-primary" onclick="this.closest('.winner-announcement-modal').remove(); window.Admin.showTab('results');" style="
                                background: #4299e1;
                                color: white;
                                border: none;
                                padding: 12px 24px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                <i class="fas fa-chart-bar"></i> View Results
                            </button>
                            <button class="btn btn-outline" onclick="this.closest('.winner-announcement-modal').remove();" style="
                                background: #edf2f7;
                                color: #4a5568;
                                border: 1px solid #e2e8f0;
                                padding: 12px 24px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', winnerAnnouncement);

            Utils.showToast(`Winner declared: ${winner.candidate.full_name}!`, 'success');

            // Refresh the results tab
            const currentContainer = document.querySelector('#adminTabContent');
            if (currentContainer) {
                this.loadResultsTab(currentContainer);
            }

        } catch (error) {
            console.error('Error declaring winner:', error);
            Utils.showToast('Failed to declare winner: ' + error.message, 'error');
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

    // Refresh Results - Just refresh the results display without republishing
    async refreshResults(electionId) {
        try {
            Utils.showLoading();
            
            // Simply refresh the results tab to show updated vote counts
            const currentContainer = document.querySelector('#adminTabContent');
            if (currentContainer) {
                await this.loadResultsTab(currentContainer);
            }
            
            Utils.showToast('Results refreshed successfully!', 'success');
            
        } catch (error) {
            console.error('Error refreshing results:', error);
            Utils.showToast('Failed to refresh results: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Calculate Results for Election - Helper function to calculate results if they don't exist
    async calculateResultsForElection(electionId) {
        try {
            // Check if results already exist
            const { data: existingResults, error: checkError } = await supabase
                .from('result')
                .select('result_id')
                .eq('election_id', electionId)
                .limit(1);

            if (checkError) {
                console.error('Error checking existing results:', checkError);
                return;
            }

            // If results already exist, don't recalculate unless forced
            if (existingResults && existingResults.length > 0) {
                return;
            }

            // Get all contests for this election
            const { data: contests, error: contestError } = await supabase
                .from('contest')
                .select(`
                    *,
                    candidate(full_name, party, symbol)
                `)
                .eq('election_id', electionId);

            if (contestError) {
                console.error('Error loading contests:', contestError);
                return;
            }

            if (!contests || contests.length === 0) {
                // No candidates, no results to calculate
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
                    total_votes: voteCount
                });
            }

            // Calculate percentages
            results.forEach(result => {
                result.percentage = totalVotes > 0 ? (result.total_votes / totalVotes) * 100 : 0;
            });

            // Insert results if we have any candidates
            if (results.length > 0) {
                const { error: insertError } = await supabase
                    .from('result')
                    .insert(results);

                if (insertError) {
                    console.error('Error inserting results:', insertError);
                }
            }

        } catch (error) {
            console.error('Error calculating results for election:', electionId, error);
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
            
            // Get all candidates first (without voter relationship for now)
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidate')
                .select('*')
                .order('candidate_id', { ascending: false });

            if (candidatesError) throw candidatesError;

            // Get elections data
            const { data: elections, error: electionsError } = await supabase
                .from('election')
                .select('election_id, name, election_type');

            if (electionsError) throw electionsError;

            // Create election lookup map
            const electionMap = {};
            elections?.forEach(election => {
                electionMap[election.election_id] = election;
            });

            // Get voter information for candidates that have applied_by_voter_id
            let voterMap = {};
            const candidatesWithVoterId = candidates.filter(c => c.applied_by_voter_id);
            if (candidatesWithVoterId.length > 0) {
                const voterIds = [...new Set(candidatesWithVoterId.map(c => c.applied_by_voter_id))];
                const { data: voters } = await supabase
                    .from('voter')
                    .select('voter_id, full_name, email, phone')
                    .in('voter_id', voterIds);

                if (voters) {
                    voters.forEach(voter => {
                        voterMap[voter.voter_id] = voter;
                    });
                }
            }

            // Separate candidates by status, default to 'pending' if status is null
            const pendingCandidates = candidates.filter(candidate => (candidate.status || 'pending') === 'pending');
            const approvedCandidates = candidates.filter(candidate => candidate.status === 'approved');
            const rejectedCandidates = candidates.filter(candidate => candidate.status === 'rejected');

            // Group approved candidates by election for the approved section
            const candidatesByElection = {};
            approvedCandidates.forEach(candidate => {
                const electionId = candidate.election_id;
                const election = electionMap[electionId];
                
                if (!candidatesByElection[electionId]) {
                    candidatesByElection[electionId] = {
                        name: election?.name || 'Unknown Election',
                        candidates: []
                    };
                }
                
                candidatesByElection[electionId].candidates.push({
                    ...candidate,
                    contest: [] // Placeholder for contest data
                });
            });

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Candidate Applications Management</h3>
                        <div class="candidate-tabs">
                            <button class="candidate-tab-btn active" onclick="window.Admin.showCandidateTab('pending')">
                                Pending Applications (${pendingCandidates.length})
                            </button>
                            <button class="candidate-tab-btn" onclick="window.Admin.showCandidateTab('approved')">
                                Approved Candidates (${approvedCandidates.length})
                            </button>
                            <button class="candidate-tab-btn" onclick="window.Admin.showCandidateTab('rejected')">
                                Rejected Applications (${rejectedCandidates.length})
                            </button>
                        </div>
                    </div>
                    
                    <!-- Pending Applications Section -->
                    <div id="pendingCandidates" class="candidate-section">
                        <div class="section-subtitle">
                            <h4>Candidate Applications Awaiting Review</h4>
                            <p>Review and approve/reject new candidate applications from voters</p>
                        </div>
                        
                        <div class="candidates-grid">
                            ${pendingCandidates.length > 0 ? 
                                pendingCandidates.map(candidate => {
                                    const election = electionMap[candidate.election_id];
                                    const voter = voterMap[candidate.applied_by_voter_id];
                                    return `
                                        <div class="candidate-card pending">
                                            <div class="candidate-header">
                                                <div class="candidate-title">
                                                    <h4>${Utils.sanitizeHtml(candidate.full_name)}</h4>
                                                    <span class="election-name">${election?.name || 'Unknown Election'}</span>
                                                </div>
                                                <span class="status-badge status-warning">
                                                    ${candidate.applied_by_voter_id ? 'Pending Review' : 'Pending Approval'}
                                                </span>
                                            </div>
                                            
                                            <div class="candidate-details">
                                                ${voter ? `
                                                    <div class="detail-row">
                                                        <strong>Applicant:</strong> ${voter.full_name} (${voter.email})
                                                    </div>
                                                ` : candidate.applied_by_voter_id ? `
                                                    <div class="detail-row">
                                                        <strong>Applied by:</strong> Voter ID ${candidate.applied_by_voter_id}
                                                    </div>
                                                ` : ''}
                                                <div class="detail-row">
                                                    <strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}
                                                    <strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}
                                                </div>
                                                <div class="detail-row">
                                                    <strong>Applied:</strong> ${new Date().toLocaleDateString()}
                                                </div>
                                            </div>
                                            
                                            <div class="candidate-actions">
                                                <button class="btn btn-small btn-success" onclick="window.Admin.reviewCandidate('${candidate.candidate_id}', 'approve')">
                                                    <i class="fas fa-check"></i> Approve
                                                </button>
                                                <button class="btn btn-small btn-outline" onclick="window.Admin.viewCandidateDetails('${candidate.candidate_id}')">
                                                    <i class="fas fa-eye"></i> Full Details
                                                </button>
                                                <button class="btn btn-small btn-danger" onclick="window.Admin.reviewCandidate('${candidate.candidate_id}', 'reject')">
                                                    <i class="fas fa-times"></i> Reject
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('') 
                            : `
                                <div class="no-candidates">
                                    <i class="fas fa-user-check" style="font-size: 48px; color: #10b981; margin-bottom: 20px;"></i>
                                    <h4>All Caught Up!</h4>
                                    <p>No candidate applications are waiting for review.</p>
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

    // Show candidate tab (pending, approved, or rejected)
    showCandidateTab(tabType) {
        const pendingSection = document.getElementById('pendingCandidates');
        const approvedSection = document.getElementById('approvedCandidates');
        const rejectedSection = document.getElementById('rejectedCandidates');
        const tabs = document.querySelectorAll('.candidate-tab-btn');
        
        // Update tab styling
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if ((tabType === 'pending' && tab.textContent.includes('Pending')) ||
                (tabType === 'approved' && tab.textContent.includes('Approved')) ||
                (tabType === 'rejected' && tab.textContent.includes('Rejected'))) {
                tab.classList.add('active');
            }
        });
        
        // Show/hide sections
        if (pendingSection) pendingSection.style.display = tabType === 'pending' ? 'block' : 'none';
        if (approvedSection) approvedSection.style.display = tabType === 'approved' ? 'block' : 'none';
        if (rejectedSection) rejectedSection.style.display = tabType === 'rejected' ? 'block' : 'none';
    }

    // Review candidate application (approve or reject)
    async reviewCandidate(candidateId, action) {
        try {
            if (!candidateId || !action) {
                throw new Error('Invalid parameters');
            }

            const isApprove = action === 'approve';
            const actionText = isApprove ? 'approve' : 'reject';
            
            // Get admin notes if rejecting
            let adminNotes = '';
            if (!isApprove) {
                adminNotes = prompt(`Please provide a reason for rejecting this application:`);
                if (adminNotes === null) {
                    return; // User cancelled
                }
            }

            const confirmed = confirm(`Are you sure you want to ${actionText} this candidate application?`);
            if (!confirmed) return;

            Utils.showLoading();

            // Update candidate status
            const updateData = {
                status: isApprove ? 'approved' : 'rejected'
            };

            if (adminNotes) {
                updateData.admin_notes = adminNotes;
            }

            const { error } = await supabase
                .from('candidate')
                .update(updateData)
                .eq('candidate_id', candidateId);

            if (error) throw error;

            // If approving, create contest entry
            if (isApprove) {
                // Get candidate info
                const { data: candidate, error: candidateError } = await supabase
                    .from('candidate')
                    .select('election_id, candidate_id, full_name')
                    .eq('candidate_id', candidateId)
                    .single();

                if (candidateError) throw candidateError;

                // Create contest entry
                const { error: contestError } = await supabase
                    .from('contest')
                    .insert({
                        election_id: candidate.election_id,
                        candidate_id: candidate.candidate_id,
                        position: 'Candidate'
                    });

                if (contestError) {
                    console.error('Contest creation error:', contestError);
                    // Don't throw error as candidate approval succeeded
                }
            }

            Utils.showToast(`Candidate application ${isApprove ? 'approved' : 'rejected'} successfully!`, 'success');
            
            // Reload candidates tab
            const container = document.getElementById('adminTabContent');
            if (container) {
                await this.loadCandidatesTab(container);
            }

        } catch (error) {
            console.error(`Error ${action}ing candidate:`, error);
            Utils.showToast(`Error ${action}ing candidate: ${error.message}`, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // View candidate details in modal
    async viewCandidateDetails(candidateId) {
        try {
            Utils.showLoading();

            // Get candidate information (without voter relationship since voter_id doesn't exist)
            const { data: candidate, error } = await supabase
                .from('candidate')
                .select('*')
                .eq('candidate_id', candidateId)
                .single();

            if (error) throw error;

            // Get election info
            const { data: election } = await supabase
                .from('election')
                .select('election_id, name, election_type, election_date')
                .eq('election_id', candidate.election_id)
                .single();

            // Try to find voter by matching the candidate's full_name with voter's full_name
            let voter = null;
            if (candidate.full_name) {
                const { data: voterData } = await supabase
                    .from('voter')
                    .select('voter_id, full_name, email, phone, address, dob')
                    .eq('full_name', candidate.full_name)
                    .single();
                
                voter = voterData;
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
                box-sizing: border-box;
            `;
            modal.innerHTML = `
                <div class="candidate-details-modal" style="
                    background: white;
                    border-radius: 12px;
                    max-width: 800px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    position: relative;
                ">
                    <div class="modal-header" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        border-radius: 12px 12px 0 0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 600;">
                            <i class="fas fa-user-tie"></i> Candidate Application Details
                        </h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 20px;
                            cursor: pointer;
                            padding: 5px;
                            border-radius: 4px;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div class="candidate-details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
                                <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Election Information</h3>
                                <div style="margin: 8px 0;"><strong>Election:</strong> ${election?.name || 'Unknown Election'}</div>
                                <div style="margin: 8px 0;"><strong>Type:</strong> ${election?.election_type || 'N/A'}</div>
                                <div style="margin: 8px 0;"><strong>Date:</strong> ${election?.election_date ? new Date(election.election_date).toLocaleDateString() : 'N/A'}</div>
                            </div>

                            <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
                                <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Candidate Information</h3>
                                <div style="margin: 8px 0;"><strong>Name:</strong> ${candidate.full_name}</div>
                                <div style="margin: 8px 0;"><strong>Symbol:</strong> ${candidate.symbol || 'N/A'}</div>
                                <div style="margin: 8px 0;"><strong>Party:</strong> ${candidate.party || 'Independent'}</div>
                                <div style="margin: 8px 0;"><strong>Status:</strong> ${candidate.status}</div>
                            </div>

                            <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; grid-column: 1 / -1;">
                                <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Voter Information</h3>
                                ${voter ? `
                                    <div style="margin: 8px 0;"><strong>Name:</strong> ${voter.full_name}</div>
                                    <div style="margin: 8px 0;"><strong>Email:</strong> ${voter.email || 'N/A'}</div>
                                    <div style="margin: 8px 0;"><strong>Phone:</strong> ${voter.phone || 'N/A'}</div>
                                ` : `
                                    <div style="margin: 8px 0;"><strong>Applicant:</strong> ${candidate.full_name}</div>
                                    <div style="margin: 8px 0;"><em>Detailed voter information not available</em></div>
                                `}
                            </div>

                            ${candidate.bio ? `
                                <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; grid-column: 1 / -1;">
                                    <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Biography</h3>
                                    <p style="color: #64748b; line-height: 1.6; margin: 0;">${candidate.bio}</p>
                                </div>
                            ` : ''}

                            ${candidate.manifesto ? `
                                <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; grid-column: 1 / -1;">
                                    <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Election Manifesto</h3>
                                    <p style="color: #64748b; line-height: 1.6; margin: 0;">${candidate.manifesto}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer" style="
                        padding: 20px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                    ">
                        ${candidate.status === 'pending' ? `
                            <button class="btn btn-success" onclick="window.Admin.reviewCandidate('${candidate.candidate_id}', 'approve'); this.closest('.modal-overlay').remove();" style="
                                padding: 10px 20px;
                                border-radius: 6px;
                                font-weight: 500;
                                cursor: pointer;
                                background: #10b981;
                                color: white;
                                border: none;
                            ">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-danger" onclick="window.Admin.reviewCandidate('${candidate.candidate_id}', 'reject'); this.closest('.modal-overlay').remove();" style="
                                padding: 10px 20px;
                                border-radius: 6px;
                                font-weight: 500;
                                cursor: pointer;
                                background: #ef4444;
                                color: white;
                                border: none;
                            ">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="
                            padding: 10px 20px;
                            border-radius: 6px;
                            font-weight: 500;
                            cursor: pointer;
                            background: #6b7280;
                            color: white;
                            border: none;
                        ">Close</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add backdrop click to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

        } catch (error) {
            console.error('Error viewing candidate details:', error);
            Utils.showToast('Error loading candidate details: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
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
                // Update candidate status to approved
                await supabase
                    .from('candidate')
                    .update({ status: 'approved' })
                    .eq('candidate_id', candidateId);
                    
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
        try {
            Utils.showLoading();
            const { data: candidate, error } = await supabase
                .from('candidate')
                .select('*')
                .eq('candidate_id', candidateId)
                .single();

            if (error || !candidate) {
                Utils.showToast('Candidate details not found.', 'error');
                return;
            }

            // Create modal HTML
            let modal = document.getElementById('candidateDetailsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'candidateDetailsModal';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="document.getElementById('candidateDetailsModal').style.display='none'">&times;</span>
                    <h2>Candidate Details</h2>
                    <div class="candidate-profile">
                        ${candidate.photo_url ? `<img src="${candidate.photo_url}" class="candidate-photo" alt="${candidate.full_name}">` : ''}
                        <h3>${Utils.sanitizeHtml(candidate.full_name)}</h3>
                        <p><strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                        <p><strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}</p>
                        <p><strong>Biography:</strong> ${Utils.sanitizeHtml(candidate.biography || 'No biography provided.')}</p>
                        <p><strong>Status:</strong> ${Utils.sanitizeHtml(candidate.status)}</p>
                    </div>
                </div>
            `;
            modal.style.display = 'block';
        } catch (error) {
            Utils.showToast('Error loading candidate details: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
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

            // Split voters into verified and pending
            const verifiedVoters = voters.filter(v => v.is_verified === 'Y');
            const pendingVoters = voters.filter(v => v.is_verified !== 'Y');

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Voters Management</h3>
                        <p>Manage and verify voter registrations</p>
                    </div>
                    <div class="admin-table-container">
                        <h4 style="margin-top:1.5rem;">Pending Voters (${pendingVoters.length})</h4>
                        ${pendingVoters.length > 0 ? `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Date of Birth</th>
                                        <th>NID Number</th>
                                        <th>Age</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendingVoters.map(voter => {
                                        // Calculate age
                                        let age = '';
                                        if (voter.dob) {
                                            const dob = new Date(voter.dob);
                                            const today = new Date();
                                            age = today.getFullYear() - dob.getFullYear();
                                            const m = today.getMonth() - dob.getMonth();
                                            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                                                age--;
                                            }
                                        }
                                        return `
                                            <tr>
                                                <td>${voter.voter_id}</td>
                                                <td>${Utils.sanitizeHtml(voter.full_name)}</td>
                                                <td>${Utils.sanitizeHtml(voter.email)}</td>
                                                <td>${Utils.sanitizeHtml(voter.phone || 'N/A')}</td>
                                                <td>${voter.dob ? new Date(voter.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td>
                                                <td>${voter.nid_number || 'N/A'}</td>
                                                <td>${age || 'N/A'}</td>
                                                <td class="action-buttons">
                                                    <button class="btn btn-small btn-success" onclick="window.Admin.verifyVoter('${voter.voter_id}')" title="Verify Voter">
                                                        <i class="fas fa-check"></i> Approve
                                                    </button>
                                                    <button class="btn btn-small btn-outline" onclick="window.Admin.viewVoter('${voter.voter_id}')" title="View Details">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        ` : `<div class="no-voters"><i class="fas fa-user-clock" style="font-size: 32px; color: #f59e42; margin-bottom: 10px;"></i><p>No pending voters.</p></div>`}

                        <h4 style="margin-top:2.5rem;">Verified Voters (${verifiedVoters.length})</h4>
                        ${verifiedVoters.length > 0 ? `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Date of Birth</th>
                                        <th>NID Number</th>
                                        <th>Age</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${verifiedVoters.map(voter => {
                                        let age = '';
                                        if (voter.dob) {
                                            const dob = new Date(voter.dob);
                                            const today = new Date();
                                            age = today.getFullYear() - dob.getFullYear();
                                            const m = today.getMonth() - dob.getMonth();
                                            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                                                age--;
                                            }
                                        }
                                        return `
                                            <tr>
                                                <td>${voter.voter_id}</td>
                                                <td>${Utils.sanitizeHtml(voter.full_name)}</td>
                                                <td>${Utils.sanitizeHtml(voter.email)}</td>
                                                <td>${Utils.sanitizeHtml(voter.phone || 'N/A')}</td>
                                                <td>${voter.dob ? new Date(voter.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td>
                                                <td>${voter.nid_number || 'N/A'}</td>
                                                <td>${age || 'N/A'}</td>
                                                <td class="action-buttons">
                                                    <button class="btn btn-small btn-outline" onclick="window.Admin.viewVoter('${voter.voter_id}')" title="View Details">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        ` : `<div class="no-voters"><i class="fas fa-user-check" style="font-size: 32px; color: #10b981; margin-bottom: 10px;"></i><p>No verified voters.</p></div>`}
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
        try {
            Utils.showLoading();
            const { data: voter, error } = await supabase
                .from('voter')
                .select('*')
                .eq('voter_id', voterId)
                .single();

            if (error || !voter) {
                Utils.showToast('Voter details not found.', 'error');
                return;
            }

            // Create modal HTML
            let modal = document.getElementById('voterDetailsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'voterDetailsModal';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="document.getElementById('voterDetailsModal').style.display='none'">&times;</span>
                    <h2>Voter Details</h2>
                    <div class="voter-profile">
                        <h3>${Utils.sanitizeHtml(voter.full_name)}</h3>
                        <p><strong>Email:</strong> ${Utils.sanitizeHtml(voter.email)}</p>
                        <p><strong>Phone:</strong> ${Utils.sanitizeHtml(voter.phone || 'N/A')}</p>
                        <p><strong>Date of Birth:</strong> ${voter.dob ? new Date(voter.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                        <p><strong>NID Number:</strong> ${voter.nid_number || 'N/A'}</p>
                        <p><strong>Registration Date:</strong> ${voter.registration_date ? Utils.formatDate(voter.registration_date) : 'N/A'}</p>
                        <p><strong>Verified:</strong> ${voter.is_verified === 'Y' ? 'Yes' : 'No'}</p>
                    </div>
                </div>
            `;
            modal.style.display = 'block';
        } catch (error) {
            Utils.showToast('Error loading voter details: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Load results tab
    async loadResultsTab(container) {
        try {
            Utils.showLoading();
            
            // Get elections with their schedules
            const { data: elections, error: electionsError } = await supabase
                .from('election')
                .select(`
                    *,
                    schedule (
                        voting_start,
                        voting_end,
                        nomination_start,
                        nomination_end,
                        result_declared
                    )
                `)
                .order('election_date', { ascending: false });

            if (electionsError) throw electionsError;

            const currentDate = new Date();
            const ongoingElections = [];
            const completedElections = [];

            // Categorize elections based on voting schedule
            for (const election of elections) {
                const schedule = election.schedule?.[0]; // Get first schedule if exists
                
                let isOngoing = false;
                let isCompleted = false;
                
                if (schedule) {
                    // Use schedule dates if available
                    const votingStart = schedule.voting_start ? new Date(schedule.voting_start) : null;
                    const votingEnd = schedule.voting_end ? new Date(schedule.voting_end) : null;
                    
                    if (votingStart && votingEnd) {
                        // Has proper schedule
                        if (currentDate >= votingStart && currentDate <= votingEnd && election.is_active === 'Y') {
                            isOngoing = true;
                        } else if (currentDate > votingEnd || election.is_active === 'N') {
                            isCompleted = true;
                        }
                        // Skip if voting hasn't started yet (upcoming)
                    } else {
                        // Fallback to election_date if no schedule
                        const electionDate = new Date(election.election_date);
                        if (electionDate <= currentDate && election.is_active === 'Y') {
                            isOngoing = true;
                        } else if (electionDate <= currentDate || election.is_active === 'N') {
                            isCompleted = true;
                        }
                    }
                } else {
                    // No schedule, use election_date
                    const electionDate = new Date(election.election_date);
                    if (electionDate <= currentDate && election.is_active === 'Y') {
                        isOngoing = true;
                    } else if (electionDate <= currentDate || election.is_active === 'N') {
                        isCompleted = true;
                    }
                }
                
                if (isOngoing) {
                    ongoingElections.push(election);
                } else if (isCompleted) {
                    completedElections.push(election);
                }
                // Skip upcoming elections
            }

            const generateElectionResultsHTML = async (election, isCompleted = false) => {
                // First, try to calculate results if they don't exist
                await this.calculateResultsForElection(election.election_id);
                
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
                    return '';
                }

                // Check if results have been declared (winner published)
                let winnerDeclared = false;
                let winnerCandidateId = null;
                
                try {
                    const { data: winnerData } = await supabase
                        .from('election')
                        .select('winner_declared, winner_candidate_id')
                        .eq('election_id', election.election_id)
                        .single();
                    
                    winnerDeclared = winnerData?.winner_declared === 'Y';
                    winnerCandidateId = winnerData?.winner_candidate_id;
                } catch (error) {
                    // Columns don't exist yet, use defaults
                    console.log('Winner declaration columns not available:', error);
                }

                const totalVotes = results ? results.reduce((sum, result) => sum + (result.total_votes || 0), 0) : 0;
                const schedule = election.schedule?.[0];
                
                // Format date and time information
                let dateTimeInfo = '';
                if (schedule) {
                    const votingStart = schedule.voting_start ? new Date(schedule.voting_start) : null;
                    const votingEnd = schedule.voting_end ? new Date(schedule.voting_end) : null;
                    
                    if (votingStart && votingEnd) {
                        const formatDateTime = (date) => {
                            return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        };
                        
                        dateTimeInfo = `
                            <div class="schedule-info">
                                <div class="schedule-item">
                                    <i class="fas fa-play-circle"></i>
                                    <span>Started: ${formatDateTime(votingStart)}</span>
                                </div>
                                <div class="schedule-item">
                                    <i class="fas fa-stop-circle"></i>
                                    <span>${isCompleted ? 'Ended' : 'Ends'}: ${formatDateTime(votingEnd)}</span>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    // Fallback to election date
                    const electionDate = new Date(election.election_date);
                    dateTimeInfo = `
                        <div class="schedule-info">
                            <div class="schedule-item">
                                <i class="fas fa-calendar"></i>
                                <span>Election Date: ${Utils.formatDate(election.election_date)}</span>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="election-results">
                        <div class="result-header">
                            <div class="result-title">
                                <h4>${Utils.sanitizeHtml(election.name)}</h4>
                                <div class="result-meta">
                                    <span class="election-type">
                                        <i class="fas fa-tag"></i>
                                        ${Utils.sanitizeHtml(election.election_type)}
                                    </span>
                                    <span class="total-votes">
                                        <i class="fas fa-users"></i>
                                        Total Votes: ${totalVotes}
                                    </span>
                                    <span class="status-badge ${isCompleted ? 'completed' : 'ongoing'}">${isCompleted ? 'Completed' : 'Ongoing'}</span>
                                    ${winnerDeclared ? '<span class="status-badge declared">Winner Declared</span>' : ''}
                                </div>
                                ${dateTimeInfo}
                            </div>
                            <div class="result-actions">
                                ${isCompleted ? `
                                    ${!winnerDeclared && results && results.length > 0 ? `
                                        <button class="btn btn-small btn-success" onclick="window.Admin.declareWinner('${election.election_id}')" title="Declare Winner">
                                            <i class="fas fa-trophy"></i> Declare Winner
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-small btn-primary" onclick="window.Admin.refreshResults('${election.election_id}')" title="Recalculate Results">
                                        <i class="fas fa-sync"></i> Refresh Results
                                    </button>
                                ` : `
                                    <button class="btn btn-small btn-primary" onclick="window.Admin.refreshResults('${election.election_id}')" title="Refresh Live Results">
                                        <i class="fas fa-sync"></i> Refresh Results
                                    </button>
                                `}
                            </div>
                        </div>
                        
                        ${results && results.length > 0 ? `
                            <div class="candidates-results">
                                ${results.map((result, index) => {
                                    const isWinner = winnerDeclared && result.candidate_id === winnerCandidateId;
                                    const isLeading = index === 0 && result.total_votes > 0;
                                    return `
                                        <div class="candidate-result ${isWinner ? 'declared-winner' : isLeading ? 'leading' : ''}">
                                            <div class="candidate-info">
                                                <div class="position">
                                                    ${isWinner ? '<i class="fas fa-crown"></i>' : `#${index + 1}`}
                                                </div>
                                                <div class="details">
                                                    <h5>${Utils.sanitizeHtml(result.candidate?.full_name || 'Unknown')}</h5>
                                                    <p>${Utils.sanitizeHtml(result.candidate?.party || 'Independent')}</p>
                                                    ${result.candidate?.symbol ? `<span class="symbol">${Utils.sanitizeHtml(result.candidate.symbol)}</span>` : ''}
                                                    ${isWinner ? '<span class="winner-badge">🏆 WINNER</span>' : ''}
                                                </div>
                                            </div>
                                            <div class="vote-info">
                                                <div class="vote-count">${result.total_votes || 0}</div>
                                                <div class="vote-percentage">
                                                    ${result.percentage ? result.percentage.toFixed(1) : '0.0'}%
                                                </div>
                                                <div class="vote-bar">
                                                    <div class="vote-fill ${isWinner ? 'winner-fill' : isLeading ? 'leading-fill' : ''}" style="width: ${result.percentage || 0}%"></div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="no-results">
                                <p>No results available for this election yet.</p>
                                ${isCompleted ? '<p>No votes were cast or no candidates are available.</p>' : '<p>Voting is ongoing - results will appear as votes are cast.</p>'}
                                <button class="btn btn-small btn-primary" onclick="window.Admin.refreshResults('${election.election_id}')" style="margin-top: 12px;">
                                    <i class="fas fa-sync"></i> Check for Updates
                                </button>
                            </div>
                        `}
                    </div>
                `;
            };

            // Generate HTML for ongoing elections
            let ongoingHTML = '';
            for (const election of ongoingElections) {
                ongoingHTML += await generateElectionResultsHTML(election, false);
            }

            // Generate HTML for completed elections
            let completedHTML = '';
            for (const election of completedElections) {
                completedHTML += await generateElectionResultsHTML(election, true);
            }

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <div>
                            <h3>Election Results</h3>
                            <p>View voting results, live counts, and declare winners</p>
                        </div>
                        <div class="section-actions">
                            <button class="btn btn-primary" onclick="window.Admin.publishAllResults()">
                                <i class="fas fa-chart-bar"></i> Update All Results
                            </button>
                        </div>
                    </div>
                    
                    <div class="results-container">
                        ${ongoingElections.length > 0 ? `
                            <div class="results-section">
                                <h4 class="section-title">
                                    <i class="fas fa-clock"></i> Ongoing Elections
                                    <span class="count">(${ongoingElections.length})</span>
                                </h4>
                                ${ongoingHTML}
                            </div>
                        ` : ''}
                        
                        ${completedElections.length > 0 ? `
                            <div class="results-section">
                                <h4 class="section-title">
                                    <i class="fas fa-check-circle"></i> Completed Elections
                                    <span class="count">(${completedElections.length})</span>
                                </h4>
                                ${completedHTML}
                            </div>
                        ` : ''}
                        
                        ${ongoingElections.length === 0 && completedElections.length === 0 ? `
                            <div class="no-elections">
                                <i class="fas fa-chart-bar" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Elections with Results</h4>
                                <p>No ongoing or completed elections found. Results will appear here once elections are active or completed.</p>
                            </div>
                        ` : ''}
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
