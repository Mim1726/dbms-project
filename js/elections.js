// Elections Module
class Elections {
    constructor() {
        this.currentElections = [];
        this.init();
    }

    // Initialize elections module
    init() {
        this.loadElections();
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Refresh elections when elections section is shown
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.section === 'elections') {
                this.loadElections();
            }
        });
    }

    // Load and display elections
    async loadElections() {
        Utils.showLoading();
        
        try {
            // Fetch elections and schedules
            const { data: elections, error } = await supabase
                .from('election')
                .select(`*, candidates:contest(candidate:candidate_id(*))`)
                .order('election_date', { ascending: false });

            if (error) throw error;

            const { data: schedules, error: scheduleError } = await supabase
                .from('schedule')
                .select('*');

            if (scheduleError) throw scheduleError;

            // Attach schedule info to elections
            const electionsWithSchedule = elections.map(election => {
                const schedule = schedules.find(s => s.election_id === election.election_id);
                return { ...election, schedule };
            });

            this.currentElections = electionsWithSchedule;
            this.displayElections(electionsWithSchedule);
        } catch (error) {
            console.error('Error loading elections:', error);
            Utils.showToast('Error loading elections', 'error');
            this.displayElections([]);
        } finally {
            Utils.hideLoading();
        }
    }
    
    // Utility to get election status
    getElectionStatus(election) {
        const now = new Date();
        if (!election.schedule) return 'Unknown';
        const votingStart = new Date(election.schedule.voting_start);
        const votingEnd = new Date(election.schedule.voting_end);
        if (now >= votingStart && now <= votingEnd) {
            return 'Running';
        } else if (now < votingStart) {
            return 'Upcoming';
        } else {
            return 'Ended';
        }
    }
    
    // Filter and sort elections by time, running elections at the top
    sortElectionsByTime(elections) {
        return elections
            .map(election => ({
                ...election,
                status: this.getElectionStatus(election)
            }))
            .sort((a, b) => {
                if (a.status === 'Running' && b.status !== 'Running') return -1;
                if (a.status !== 'Running' && b.status === 'Running') return 1;
                if (a.status === 'Upcoming' && b.status === 'Ended') return -1;
                if (a.status === 'Ended' && b.status === 'Upcoming') return 1;
                // Sort by voting_start if available, else election_date
                const aDate = a.schedule ? new Date(a.schedule.voting_start) : new Date(a.election_date);
                const bDate = b.schedule ? new Date(b.schedule.voting_start) : new Date(b.election_date);
                return aDate - bDate;
            });
    }

    // Display elections in the UI
    displayElections(elections) {
        const container = document.getElementById('electionsContainer');
        
        if (!elections || elections.length === 0) {
            container.innerHTML = `
                <div class="no-elections">
                    <i class="fas fa-vote-yea" style="font-size: 64px; color: #a0aec0; margin-bottom: 20px;"></i>
                    <h3>No Elections Available</h3>
                    <p>There are currently no active elections. Check back later!</p>
                </div>
            `;
            return;
        }

    const sortedElections = this.sortElectionsByTime(elections);
    container.innerHTML = sortedElections.map(election => {
            const status = this.getElectionStatus(election);
            const candidateCount = election.candidates ? election.candidates.length : 0;
            
            return `
                <div class="election-card">
                    <div class="election-header">
                        <h3>${Utils.sanitizeHtml(election.name)}</h3>
                        <span class="election-status status-${status.toLowerCase()}">${status}</span>
                    </div>
                    
                    <p class="election-description">${Utils.sanitizeHtml(election.description || 'No description available')}</p>
                    
                    <div class="election-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>Date: ${Utils.formatDate(election.election_date)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-tag"></i>
                            <span>Type: ${Utils.sanitizeHtml(election.election_type)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${candidateCount} Candidates</span>
                        </div>
                    </div>
                    
                    <div class="election-actions">
                        ${this.getElectionActions(election, status)}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Get election status
    getElectionStatus(election) {
        const now = new Date();
        const electionDate = new Date(election.election_date);

        // Simple status based on is_active flag and date
        if (election.is_active === 'Y' && electionDate >= now) {
            return 'Active';
        } else if (electionDate > now) {
            return 'Upcoming';
        } else {
            return 'Ended';
        }
    }

    // Get appropriate actions for election based on status
    getElectionActions(election, status) {
        const actions = [];

        if (status === 'Running') {
            // Check if user is authenticated
            if (window.Auth && window.Auth.isAuthenticated()) {
                if (window.Auth.hasRole('voter')) {
                    actions.push(`
                        <button class="btn btn-primary" onclick="window.Voting.startVoting('${election.election_id}')">
                            <i class="fas fa-vote-yea"></i> Vote Now
                        </button>
                    `);
                }
            } else {
                actions.push(`
                    <button class="btn btn-outline" onclick="window.Auth.showAuthModal('login')">
                        <i class="fas fa-sign-in-alt"></i> Login to Vote
                    </button>
                `);
            }
        }

        // View results button (always available)
        actions.push(`
            <button class="btn btn-outline" onclick="window.Elections.viewElectionResults('${election.election_id}')">
                <i class="fas fa-chart-bar"></i> View Results
            </button>
        `);

        // View candidates button
        actions.push(`
            <button class="btn btn-outline" onclick="window.Elections.viewCandidates('${election.election_id}')">
                <i class="fas fa-users"></i> View Candidates
            </button>
        `);

        return actions.join('');
    }

    // Check if user is eligible to vote
    async checkVotingEligibility(electionId) {
        console.log('Checking voting eligibility for election:', electionId);
        
        // Check authentication first
        if (!window.Auth || !window.Auth.isAuthenticated()) {
            Utils.showToast('Please log in to vote', 'warning');
            window.Auth?.showAuthModal('login');
            return;
        }

        if (!window.Auth.hasRole('voter')) {
            Utils.showToast('Only verified voters can vote', 'warning');
            return;
        }

        Utils.showLoading();
        
        try {
            const currentUser = window.Auth.getCurrentUser();
            console.log('Current user:', currentUser);
            
            // Get voter record
            const { data: voterData, error: voterError } = await supabase
                .from(CONFIG.TABLES.VOTERS)
                .select('*')
                .eq('user_id', currentUser.id)
                .single();

            if (voterError) {
                console.error('Voter lookup error:', voterError);
                throw voterError;
            }

            console.log('Voter data:', voterData);

            // Check if voter is verified
            if (!voterData.is_verified) {
                Utils.showToast('Your voter registration is not yet verified. Please contact admin.', 'warning');
                return;
            }

            // Check if already voted in this election
            const { data: existingVote, error: voteError } = await supabase
                .from(CONFIG.TABLES.VOTES)
                .select('id')
                .eq('election_id', electionId)
                .eq('voter_id', voterData.id)
                .single();

            if (voteError && voteError.code !== 'PGRST116') { // PGRST116 means no rows found
                console.error('Vote check error:', voteError);
                throw voteError;
            }

            if (existingVote) {
                Utils.showToast('You have already voted in this election', 'warning');
                return;
            }

            console.log('User is eligible to vote, starting voting process...');

            // User is eligible to vote
            if (window.Voting) {
                window.Voting.startVoting(electionId);
            } else {
                console.error('Voting module not loaded');
                Utils.showToast('Voting system not available', 'error');
            }
            
        } catch (error) {
            console.error('Error checking voting eligibility:', error);
            Utils.showToast(`Error checking voting eligibility: ${error.message}`, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // View election results
    async viewElectionResults(electionId) {
        Utils.showLoading();
        
        try {
            // Get election details
            const { data: election, error: electionError } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .select('*')
                .eq('id', electionId)
                .single();

            if (electionError) throw electionError;

            // Get candidates with vote counts
            const { data: results, error: resultsError } = await supabase
                .from(CONFIG.TABLES.CANDIDATES)
                .select(`
                    *,
                    votes:votes(count)
                `)
                .eq('election_id', electionId)
                .order('name');

            if (resultsError) throw resultsError;

            // Calculate total votes
            const totalVotes = results.reduce((sum, candidate) => {
                return sum + (candidate.votes?.[0]?.count || 0);
            }, 0);

            // Sort candidates by vote count
            const sortedResults = results.sort((a, b) => {
                const aVotes = a.votes?.[0]?.count || 0;
                const bVotes = b.votes?.[0]?.count || 0;
                return bVotes - aVotes;
            });

            this.showResultsModal(election, sortedResults, totalVotes);
            
        } catch (error) {
            console.error('Error loading election results:', error);
            Utils.showToast('Error loading election results', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Show results in modal
    showResultsModal(election, results, totalVotes) {
        const modal = document.getElementById('votingModal');
        const content = document.getElementById('votingContent');

        content.innerHTML = `
            <div class="results-modal">
                <h2>${Utils.sanitizeHtml(election.title)} - Results</h2>
                <p class="election-description">${Utils.sanitizeHtml(election.description)}</p>
                
                <div class="results-summary">
                    <div class="summary-item">
                        <span class="summary-label">Total Votes:</span>
                        <span class="summary-value">${totalVotes}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Candidates:</span>
                        <span class="summary-value">${results.length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Status:</span>
                        <span class="summary-value">${this.getElectionStatus(election)}</span>
                    </div>
                </div>

                <div class="results-list">
                    ${results.map((candidate, index) => {
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
                    }).join('')}
                </div>

                <div class="results-actions">
                    <button class="btn btn-outline" onclick="window.Elections.exportResults('${election.id}')">
                        <i class="fas fa-download"></i> Export Results
                    </button>
                    <button class="btn btn-primary" onclick="document.getElementById('votingModal').style.display = 'none'">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    // View candidates for an election
    async viewCandidates(electionId) {
        Utils.showLoading();
        
        try {
            // Get election details
            const intElectionId = parseInt(electionId, 10);
            const { data: election, error: electionError } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .select('*')
                .eq('election_id', intElectionId)
                .single();

            if (electionError) throw electionError;

            // Get candidates
            const { data: candidates, error: candidatesError } = await supabase
                .from(CONFIG.TABLES.CANDIDATES)
                .select('*')
                .eq('election_id', intElectionId)
                .eq('status', 'approved')
                .order('name');

            if (candidatesError) throw candidatesError;

            this.showCandidatesModal(election, candidates);
            
        } catch (error) {
            console.error('Error loading candidates:', error);
            Utils.showToast('Error loading candidates', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Show candidates in modal
    showCandidatesModal(election, candidates) {
        const modal = document.getElementById('votingModal');
        const content = document.getElementById('votingContent');

        content.innerHTML = `
            <div class="candidates-modal">
                <h2>${Utils.sanitizeHtml(election.title)} - Candidates</h2>
                <p class="election-description">${Utils.sanitizeHtml(election.description)}</p>
                
                <div class="candidates-grid">
                    ${candidates.map(candidate => `
                        <div class="candidate-card">
                            <div class="candidate-photo-container">
                                ${candidate.photo_url ? 
                                    `<img src="${candidate.photo_url}" alt="${candidate.name}" class="candidate-photo-large">` :
                                    `<div class="candidate-placeholder-large"><i class="fas fa-user"></i></div>`
                                }
                            </div>
                            
                            <div class="candidate-info">
                                <h3>${Utils.sanitizeHtml(candidate.name)}</h3>
                                <p class="candidate-party">${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                
                                ${candidate.biography ? `
                                    <div class="candidate-bio">
                                        <h4>Biography</h4>
                                        <p>${Utils.sanitizeHtml(candidate.biography)}</p>
                                    </div>
                                ` : ''}
                                
                                ${candidate.manifesto ? `
                                    <div class="candidate-manifesto">
                                        <h4>Manifesto</h4>
                                        <p>${Utils.sanitizeHtml(candidate.manifesto)}</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="candidates-actions">
                    <button class="btn btn-primary" onclick="document.getElementById('votingModal').style.display = 'none'">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    // Export election results
    async exportResults(electionId) {
        Utils.showLoading();
        
        try {
            // Get election details
            const { data: election, error: electionError } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .select('*')
                .eq('id', electionId)
                .single();

            if (electionError) throw electionError;

            // Get detailed results
            const { data: results, error: resultsError } = await supabase
                .from(CONFIG.TABLES.CANDIDATES)
                .select(`
                    *,
                    votes:votes(count)
                `)
                .eq('election_id', electionId)
                .order('name');

            if (resultsError) throw resultsError;

            // Prepare data for export
            const exportData = results.map(candidate => ({
                name: candidate.name,
                party: candidate.party || 'Independent',
                votes: candidate.votes?.[0]?.count || 0,
                percentage: Utils.calculatePercentage(
                    candidate.votes?.[0]?.count || 0,
                    results.reduce((sum, c) => sum + (c.votes?.[0]?.count || 0), 0)
                )
            }));

            // Sort by votes descending
            exportData.sort((a, b) => b.votes - a.votes);

            // Export as CSV
            const filename = `${election.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_results.csv`;
            Utils.downloadCsv(exportData, filename);
            
            Utils.showToast('Results exported successfully!', 'success');
            
        } catch (error) {
            console.error('Error exporting results:', error);
            Utils.showToast('Error exporting results', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Get elections by status
    getElectionsByStatus(status) {
        return this.currentElections.filter(election => 
            this.getElectionStatus(election).toLowerCase() === status.toLowerCase()
        );
    }

    // Get election by ID
    getElectionById(id) {
        return this.currentElections.find(election => election.id === id);
    }
}

// Initialize elections when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.Elections = new Elections();
});

// Export Elections class
window.Elections = Elections;
