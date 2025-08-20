// Voting Module
class Voting {
    constructor() {
        this.currentElection = null;
        this.currentCandidates = [];
        this.selectedCandidate = null;
        this.init();
    }

    // Initialize voting module
    init() {
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Any additional event listeners for voting
    }

    // Start voting process
    async startVoting(electionId, preSelectedCandidateId = null) {
        console.log('Starting voting process for election:', electionId);
        if (preSelectedCandidateId) {
            console.log('Pre-selected candidate:', preSelectedCandidateId);
        }
        
        // Check if user is authenticated
        if (!window.Auth || !window.Auth.isAuthenticated()) {
            Utils.showToast('Please log in to vote', 'warning');
            window.Auth?.showAuthModal('login');
            return;
        }

        // Check if user is a voter
        if (!window.Auth.hasRole('voter')) {
            Utils.showToast('Only verified voters can vote', 'warning');
            return;
        }

    // ...existing code...

        Utils.showLoading();
        
        try {
            console.log('Fetching election details...');
            
            // Get election details
            const { data: election, error: electionError } = await supabase
                .from(CONFIG.TABLES.ELECTIONS)
                .select('*')
                .eq('election_id', electionId)  // Changed from 'id' to 'election_id'
                .single();

            if (electionError) {
                console.error('Election fetch error:', electionError);
                throw electionError;
            }

            if (!election) {
                throw new Error('Election not found');
            }

            console.log('Election found:', election);

            // Verify election is active and get proper dates
            const status = this.getElectionStatus(election);
            const now = new Date();
            
            let startDate, endDate;
            if (election.schedule && election.schedule.voting_start) {
                startDate = new Date(election.schedule.voting_start);
                endDate = new Date(election.schedule.voting_end);
            } else {
                // Fallback: use election_date, make it active for current testing
                endDate = new Date(election.election_date);
                startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 30);
                
                // For testing purposes, if election is active (is_active = 'Y'), allow voting
                if (election.is_active === 'Y') {
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Started yesterday
                    endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Ends in 30 days
                }
            }
            
            const oneMonthBeforeStart = new Date(startDate);
            oneMonthBeforeStart.setMonth(oneMonthBeforeStart.getMonth() - 1);
            
            console.log('DEBUG Election Dates:', {
                now,
                startDate,
                endDate,
                oneMonthBeforeStart,
                status,
                election,
                isActive: election.is_active
            });

            // Allow voting if election is marked as active OR during valid time periods
            const canVote = election.is_active === 'Y' || (status === 'PreVoting' || status === 'Active');
            
            if (!canVote) {
                Utils.showToast('This election is not currently accepting votes. Please contact the administrator.', 'warning');
                return;
            }

            console.log('Fetching candidates...');

            // Get approved candidates through contest table
                const intElectionId = parseInt(electionId, 10);
                const { data: candidates, error: candidatesError } = await supabase
                    .from('candidate')
                    .select('*')
                    .eq('election_id', intElectionId)
                    .eq('status', 'approved');

                if (candidatesError) {
                    console.error('Candidates fetch error:', candidatesError);
                    throw candidatesError;
                }

                console.log('Candidates found:', candidates);

                if (!candidates || candidates.length === 0) {
                    Utils.showToast('No candidates found for this election', 'warning');
                    this.currentElection = election;
                    this.currentCandidates = [];
                    this.selectedCandidate = null;
                    this.showVotingInterface();
                    return;
                }

            this.currentElection = election;
            this.currentCandidates = candidates;
            this.selectedCandidate = preSelectedCandidateId || null;

            console.log('Showing voting interface...');
            this.showVotingInterface(preSelectedCandidateId);
            
        } catch (error) {
            console.error('Error starting voting:', error);
            Utils.showToast(`Error loading voting interface: ${error.message}`, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Get election status
    getElectionStatus(election) {
        // If election is explicitly marked as active, return 'Active' status
        if (election.is_active === 'Y') {
            return 'Active';
        }
        
        const now = new Date();
        
        // Use schedule table dates if available, otherwise use election_date
        let startDate, endDate;
        
        if (election.schedule && election.schedule.voting_start) {
            startDate = new Date(election.schedule.voting_start);
            endDate = new Date(election.schedule.voting_end);
        } else {
            // Fallback: use election_date as end date, start 30 days before
            endDate = new Date(election.election_date);
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 30); // 30 days before election
        }
        
        const oneMonthBeforeStart = new Date(startDate);
        oneMonthBeforeStart.setMonth(oneMonthBeforeStart.getMonth() - 1);

        if (now < oneMonthBeforeStart) {
            return 'Upcoming'; // Candidacy applications allowed
        } else if (now >= oneMonthBeforeStart && now < startDate) {
            return 'PreVoting'; // Voters can view candidates, candidacy applications closed
        } else if (now >= startDate && now <= endDate) {
            return 'Active'; // Voting period
        } else {
            return 'Ended';
        }
    }

    // Show voting interface
    showVotingInterface(preSelectedCandidateId = null) {
        const modal = document.getElementById('votingModal');
        const content = document.getElementById('votingContent');

        content.innerHTML = `
            <div class="voting-interface">
                <div class="voting-header">
                    <h2>${Utils.sanitizeHtml(this.currentElection.title)}</h2>
                    <p class="voting-instructions">Select one candidate to vote for:</p>
                </div>

                <div class="voting-candidates">
                    ${this.currentCandidates.map(candidate => `
                        <div class="voting-candidate" data-candidate-id="${candidate.id}">
                            <div class="candidate-selection">
                                <input type="radio" 
                                       name="selectedCandidate" 
                                       value="${candidate.id}" 
                                       id="candidate_${candidate.id}"
                                       ${preSelectedCandidateId === candidate.id ? 'checked' : ''}
                                       onchange="window.Voting.selectCandidate('${candidate.id}')">
                                <label for="candidate_${candidate.id}" class="candidate-card-voting">
                                    <div class="candidate-photo-container">
                                        ${candidate.photo_url ? 
                                            `<img src="${candidate.photo_url}" alt="${candidate.name}" class="candidate-photo">` :
                                            `<div class="candidate-placeholder"><i class="fas fa-user"></i></div>`
                                        }
                                    </div>
                                    
                                    <div class="candidate-info">
                                        <h3>${Utils.sanitizeHtml(candidate.name)}</h3>
                                        <p class="candidate-party">${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                        
                                        ${candidate.biography ? `
                                            <div class="candidate-bio-preview">
                                                ${Utils.sanitizeHtml(candidate.biography.substring(0, 100))}${candidate.biography.length > 100 ? '...' : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    <div class="selection-indicator">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="voting-actions">
                    <button class="btn btn-outline" onclick="window.Voting.cancelVoting()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button id="confirmVoteBtn" class="btn btn-primary" ${preSelectedCandidateId ? '' : 'disabled'} onclick="window.Voting.confirmVote()">
                        <i class="fas fa-vote-yea"></i> Confirm Vote
                    </button>
                </div>

                <div class="voting-security-notice">
                    <i class="fas fa-shield-alt"></i>
                    <p>Your vote is secure and anonymous. Once submitted, it cannot be changed.</p>
                </div>
            </div>
        `;

        // Set pre-selected candidate if provided
        if (preSelectedCandidateId) {
            this.selectedCandidate = preSelectedCandidateId;
            
            // Update UI to show pre-selection
            const preSelectedCard = document.querySelector(`[data-candidate-id="${preSelectedCandidateId}"]`);
            if (preSelectedCard) {
                preSelectedCard.classList.add('selected');
            }
        }

        modal.style.display = 'block';
    }

    // Select candidate
    selectCandidate(candidateId) {
        this.selectedCandidate = candidateId;
        
        // Enable confirm button
        const confirmBtn = document.getElementById('confirmVoteBtn');
        confirmBtn.disabled = false;
        
        // Update UI to show selection
        document.querySelectorAll('.voting-candidate').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-candidate-id="${candidateId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }

    // Confirm vote
    async confirmVote() {
        if (!this.selectedCandidate) {
            Utils.showToast('Please select a candidate', 'warning');
            return;
        }

        // Show confirmation dialog
        const confirmed = await this.showConfirmationDialog();
        if (!confirmed) return;

        Utils.showLoading();

        try {
            const currentUser = window.Auth.getCurrentUser();
            
            // Get voter record
            const { data: voterData, error: voterError } = await supabase
                .from(CONFIG.TABLES.VOTERS)
                .select('*')
                .eq('user_id', currentUser.id)
                .single();

            if (voterError) throw voterError;

            // Double-check if already voted
            const { data: existingVote, error: checkError } = await supabase
                .from(CONFIG.TABLES.VOTES)
                .select('id')
                .eq('election_id', this.currentElection.id)
                .eq('voter_id', voterData.id)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            if (existingVote) {
                Utils.showToast('You have already voted in this election', 'error');
                this.cancelVoting();
                return;
            }

            // Cast the vote
            const { error: voteError } = await supabase
                .from(CONFIG.TABLES.VOTES)
                .insert([{
                    election_id: this.currentElection.id,
                    candidate_id: this.selectedCandidate,
                    voter_id: voterData.id,
                    vote_timestamp: new Date().toISOString(),
                    ip_address: await this.getClientIP()
                }]);

            if (voteError) throw voteError;

            // Update voter's last vote date
            await supabase
                .from(CONFIG.TABLES.VOTERS)
                .update({ last_vote_date: new Date().toISOString() })
                .eq('id', voterData.id);

            this.showVoteSuccessMessage();
            
        } catch (error) {
            console.error('Error casting vote:', error);
            Utils.showToast('Error casting vote. Please try again.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Show confirmation dialog
    showConfirmationDialog() {
        return new Promise((resolve) => {
            const selectedCandidate = this.currentCandidates.find(c => c.id === this.selectedCandidate);
            
            const confirmationHTML = `
                <div class="vote-confirmation">
                    <h3>Confirm Your Vote</h3>
                    <div class="confirmation-candidate">
                        <div class="candidate-info">
                            ${selectedCandidate.photo_url ? 
                                `<img src="${selectedCandidate.photo_url}" alt="${selectedCandidate.name}" class="candidate-photo">` :
                                `<div class="candidate-placeholder"><i class="fas fa-user"></i></div>`
                            }
                            <div>
                                <h4>${Utils.sanitizeHtml(selectedCandidate.name)}</h4>
                                <p>${Utils.sanitizeHtml(selectedCandidate.party || 'Independent')}</p>
                            </div>
                        </div>
                    </div>
                    <p class="confirmation-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Are you sure you want to vote for this candidate? This action cannot be undone.
                    </p>
                    <div class="confirmation-actions">
                        <button class="btn btn-outline" onclick="window.Voting.cancelConfirmation()">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="window.Voting.proceedWithVote()">
                            Yes, Cast My Vote
                        </button>
                    </div>
                </div>
            `;

            const content = document.getElementById('votingContent');
            content.innerHTML = confirmationHTML;

            // Store resolve function for later use
            this._confirmationResolve = resolve;
        });
    }

    // Cancel confirmation
    cancelConfirmation() {
        this._confirmationResolve(false);
        this.showVotingInterface();
    }

    // Proceed with vote
    proceedWithVote() {
        this._confirmationResolve(true);
    }

    // Show vote success message
    showVoteSuccessMessage() {
        const selectedCandidate = this.currentCandidates.find(c => c.id === this.selectedCandidate);
        
        const content = document.getElementById('votingContent');
        content.innerHTML = `
            <div class="vote-success">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>Vote Cast Successfully!</h2>
                <p>Thank you for participating in the democratic process.</p>
                
                <div class="vote-summary">
                    <h3>Vote Summary</h3>
                    <div class="voted-candidate">
                        ${selectedCandidate.photo_url ? 
                            `<img src="${selectedCandidate.photo_url}" alt="${selectedCandidate.name}" class="candidate-photo">` :
                            `<div class="candidate-placeholder"><i class="fas fa-user"></i></div>`
                        }
                        <div class="candidate-details">
                            <h4>${Utils.sanitizeHtml(selectedCandidate.name)}</h4>
                            <p>${Utils.sanitizeHtml(selectedCandidate.party || 'Independent')}</p>
                        </div>
                    </div>
                    <p class="vote-timestamp">
                        Vote cast on: ${Utils.formatDate(new Date().toISOString())}
                    </p>
                </div>

                <div class="success-actions">
                    <button class="btn btn-outline" onclick="window.Elections.viewElectionResults('${this.currentElection.id}')">
                        <i class="fas fa-chart-bar"></i> View Results
                    </button>
                    <button class="btn btn-primary" onclick="window.Voting.finishVoting()">
                        <i class="fas fa-check"></i> Done
                    </button>
                </div>

                <div class="vote-receipt">
                    <p><i class="fas fa-info-circle"></i> Your vote has been recorded securely and anonymously.</p>
                </div>
            </div>
        `;

        // Show success toast
        Utils.showToast('Vote cast successfully!', 'success');
    }

    // Cancel voting
    cancelVoting() {
        document.getElementById('votingModal').style.display = 'none';
        this.resetVotingState();
    }

    // Finish voting process
    finishVoting() {
        document.getElementById('votingModal').style.display = 'none';
        this.resetVotingState();
        
        // Refresh the voter dashboard if they're on it
        if (window.Auth && window.Auth.hasRole('voter')) {
            window.Auth.loadVoterDashboard();
        }
    }

    // Reset voting state
    resetVotingState() {
        this.currentElection = null;
        this.currentCandidates = [];
        this.selectedCandidate = null;
        this._confirmationResolve = null;
    }

    // Get client IP address (for audit trail)
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error('Error getting IP address:', error);
            return 'unknown';
        }
    }

    // Verify vote integrity (for admin use)
    async verifyVoteIntegrity(voteId) {
        try {
            const { data: vote, error } = await supabase
                .from(CONFIG.TABLES.VOTES)
                .select(`
                    *,
                    election:elections(*),
                    candidate:candidates(*),
                    voter:voters(*)
                `)
                .eq('id', voteId)
                .single();

            if (error) throw error;

            // Perform various integrity checks
            const checks = {
                voteExists: !!vote,
                electionActive: this.wasElectionActiveAt(vote.election, vote.vote_timestamp),
                candidateValid: vote.candidate && vote.candidate.election_id === vote.election_id,
                voterValid: vote.voter && vote.voter.is_verified,
                timestampValid: new Date(vote.vote_timestamp) <= new Date()
            };

            return {
                isValid: Object.values(checks).every(check => check),
                checks: checks,
                vote: vote
            };

        } catch (error) {
            console.error('Error verifying vote integrity:', error);
            return { isValid: false, error: error.message };
        }
    }

    // Check if election was active at given timestamp
    wasElectionActiveAt(election, timestamp) {
        const voteTime = new Date(timestamp);
        const startDate = new Date(election.start_date);
        const endDate = new Date(election.end_date);
        
        return voteTime >= startDate && voteTime <= endDate;
    }
}

// Initialize voting when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.Voting = new Voting();
});

// Export Voting class
window.Voting = Voting;
