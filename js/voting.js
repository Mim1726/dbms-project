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
                .from('election')
                .select('*')
                .eq('election_id', electionId)
                .single();

            if (electionError) {
                console.error('Election fetch error:', electionError);
                throw electionError;
            }

            if (!election) {
                throw new Error('Election not found');
            }

            console.log('Election found:', election);

            // Simple and clear logic for voting eligibility
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const electionDateOnly = new Date(election.election_date);
            electionDateOnly.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((electionDateOnly - today) / (1000 * 60 * 60 * 24));
            
            console.log('Voting eligibility check:', {
                electionDate: election.election_date,
                daysDiff: daysDiff,
                isActive: election.is_active
            });
            
            // Only allow voting for today's elections or yesterday's if explicitly active
            if (daysDiff < -1) {
                Utils.showToast('This election has ended. Voting is no longer available.', 'warning');
                return;
            } else if (daysDiff === 0) {
                console.log('Today\'s election - allowing voting');
                // Today's election - always allow voting
            } else if (daysDiff === -1 && election.is_active === 'Y') {
                console.log('Yesterday\'s election marked as active - allowing voting');
                // Yesterday's election but explicitly active
            } else if (daysDiff > 0) {
                Utils.showToast('This election has not started yet. Voting will be available on the election date.', 'info');
                this.showCandidatesOnly(election);
                return;
            } else {
                Utils.showToast('This election is not currently accepting votes. Please contact the administrator.', 'warning');
                return;
            }

            console.log('Fetching candidates...');

            // Get candidates that are in contests for this election
            const intElectionId = parseInt(electionId, 10);
            const { data: contests, error: contestsError } = await supabase
                .from('contest')
                .select(`
                    candidate_id,
                    candidate:candidate_id (
                        candidate_id,
                        full_name,
                        symbol,
                        party,
                        bio,
                        manifesto,
                        photo_url,
                        status
                    )
                `)
                .eq('election_id', intElectionId);

            if (contestsError) {
                console.error('Contests fetch error:', contestsError);
                throw contestsError;
            }

            // Extract candidates from contests
            const candidates = contests
                .filter(contest => contest.candidate && contest.candidate.status === 'approved')
                .map(contest => contest.candidate);

            console.log('Candidates found:', candidates);

            if (!candidates || candidates.length === 0) {
                Utils.showToast('No candidates found for this election', 'warning');
                this.currentElection = election;
                this.currentCandidates = [];
                this.selectedCandidate = null;
                this.showVotingInterface();
                return;
            }            this.currentElection = election;
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const electionDateOnly = new Date(election.election_date);
        electionDateOnly.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((electionDateOnly - today) / (1000 * 60 * 60 * 24));
        
        // Elections more than 1 day in the past are ended
        if (daysDiff < -1) {
            return 'Ended';
        }
        
        // Today's elections are always active
        if (daysDiff === 0) {
            return 'Active';
        }
        
        // Yesterday's elections can be active only if explicitly marked
        if (daysDiff === -1) {
            return election.is_active === 'Y' ? 'Active' : 'Ended';
        }
        
        // Future elections are upcoming
        if (daysDiff > 0) {
            return 'Upcoming';
        }
        
        return 'Ended';
    }

    // Show voting interface
    showVotingInterface(preSelectedCandidateId = null) {
        const modal = document.getElementById('votingModal');
        const content = document.getElementById('votingContent');

        content.innerHTML = `
            <div class="voting-interface">
                <div class="voting-header">
                    <h2>${Utils.sanitizeHtml(this.currentElection.name)}</h2>
                    <p class="voting-instructions">Select one candidate to vote for:</p>
                </div>

                <div class="voting-candidates">
                    ${this.currentCandidates.map(candidate => `
                        <div class="voting-candidate" data-candidate-id="${candidate.candidate_id}">
                            <div class="candidate-selection">
                                <input type="radio" 
                                       name="selectedCandidate" 
                                       value="${candidate.candidate_id}" 
                                       id="candidate_${candidate.candidate_id}"
                                       ${preSelectedCandidateId === candidate.candidate_id ? 'checked' : ''}>
                                <label for="candidate_${candidate.candidate_id}" 
                                       class="candidate-card-voting"
                                       onclick="window.Voting.selectCandidate('${candidate.candidate_id}')">
                                    <div class="candidate-photo-container">
                                        ${candidate.photo_url ? 
                                            `<img src="${candidate.photo_url}" alt="${candidate.full_name}" class="candidate-photo">` :
                                            `<div class="candidate-placeholder"><i class="fas fa-user"></i></div>`
                                        }
                                    </div>
                                    
                                    <div class="candidate-info">
                                        <h3>${Utils.sanitizeHtml(candidate.full_name)}</h3>
                                        <p class="candidate-party">${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                        
                                        ${candidate.bio ? `
                                            <div class="candidate-bio-preview">
                                                ${Utils.sanitizeHtml(candidate.bio.substring(0, 100))}${candidate.bio.length > 100 ? '...' : ''}
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
                    <button id="confirmVoteBtn" class="btn btn-primary" ${preSelectedCandidateId ? '' : 'disabled'}>
                        <i class="fas fa-paper-plane"></i> Submit Your Vote
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
        
        // Add event listener for the submit button
        const submitButton = document.getElementById('confirmVoteBtn');
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                console.log('🔘 Submit button clicked!');
                this.confirmVote();
            });
            console.log('✅ Submit button event listener added');
        } else {
            console.error('❌ Submit button not found');
        }
    }

    // Show candidates only (for upcoming elections)
    showCandidatesOnly(election) {
        const modal = document.getElementById('votingModal');
        const content = document.getElementById('votingContent');

        content.innerHTML = `
            <div class="candidates-preview">
                <div class="preview-header">
                    <h2><i class="fas fa-users"></i> ${Utils.sanitizeHtml(election.name)} - Candidates</h2>
                    <p class="preview-instructions">Meet the candidates for this upcoming election</p>
                </div>

                <div class="upcoming-notice-banner">
                    <i class="fas fa-clock"></i>
                    <span>Voting is not yet available for this election. Check back when voting opens!</span>
                </div>

                <div class="candidates-preview-grid">
                    ${this.currentCandidates.map(candidate => `
                        <div class="candidate-preview-card">
                            <div class="candidate-photo-container">
                                ${candidate.photo_url ? 
                                    `<img src="${candidate.photo_url}" alt="${candidate.full_name}" class="candidate-photo">` :
                                    `<div class="candidate-placeholder"><i class="fas fa-user"></i></div>`
                                }
                            </div>
                            
                            <div class="candidate-preview-info">
                                <h3>${Utils.sanitizeHtml(candidate.full_name)}</h3>
                                <p class="candidate-party">${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                
                                ${candidate.bio ? `
                                    <div class="candidate-bio">
                                        ${Utils.sanitizeHtml(candidate.bio)}
                                    </div>
                                ` : ''}
                                
                                ${candidate.manifesto ? `
                                    <div class="candidate-platform">
                                        <strong>Platform:</strong> ${Utils.sanitizeHtml(candidate.manifesto)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="window.Voting.cancelVoting()">
                        <i class="fas fa-arrow-left"></i> Back to Elections
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    // Select candidate
    selectCandidate(candidateId) {
        console.log('🎯 selectCandidate called with:', candidateId);
        this.selectedCandidate = candidateId;
        
        // Update the radio button
        const radioButton = document.getElementById(`candidate_${candidateId}`);
        if (radioButton) {
            radioButton.checked = true;
            console.log('✅ Radio button checked:', radioButton);
        } else {
            console.error('❌ Radio button not found for candidateId:', candidateId);
        }
        
        // Enable confirm button
        const confirmBtn = document.getElementById('confirmVoteBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('disabled');
            console.log('✅ Submit button enabled');
        } else {
            console.error('❌ Submit button not found!');
        }
        
        // Update UI to show selection
        document.querySelectorAll('.voting-candidate').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-candidate-id="${candidateId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            console.log('✅ Card selected:', selectedCard);
        } else {
            console.error('❌ Selected card not found for candidateId:', candidateId);
        }
    }

    // Confirm vote
    async confirmVote() {
        console.log('🗳️ confirmVote called, selectedCandidate:', this.selectedCandidate);
        
        if (!this.selectedCandidate) {
            Utils.showToast('Please select a candidate', 'warning');
            return;
        }

        console.log('🔄 Showing confirmation dialog...');
        // Show confirmation dialog
        const confirmed = await this.showConfirmationDialog();
        if (!confirmed) {
            console.log('❌ User cancelled confirmation');
            return;
        }

        console.log('✅ Vote confirmed, proceeding with submission...');
        Utils.showLoading();

        try {
            const currentUser = window.Auth.getCurrentUser();
            console.log('👤 Current user:', currentUser);
            
            if (!currentUser) {
                throw new Error('No authenticated user found');
            }
            
            // Get voter record
            const { data: voterData, error: voterError } = await supabase
                .from('voter')
                .select('*')
                .eq('email', currentUser.email)
                .single();

            console.log('🔍 Voter lookup result:', { voterData, voterError });

            if (voterError) {
                console.error('❌ Voter lookup error:', voterError);
                throw voterError;
            }

            if (!voterData) {
                throw new Error('Voter record not found');
            }

            console.log('🔍 Checking if user already voted...');
            // Double-check if already voted in this election
            const { data: existingVotes, error: checkError } = await supabase
                .from('vote')
                .select(`
                    vote_id,
                    contest!inner(
                        election_id
                    )
                `)
                .eq('voter_id', voterData.voter_id)
                .eq('contest.election_id', this.currentElection.election_id);

            console.log('🔍 Existing votes check:', { existingVotes, checkError });

            if (checkError) {
                console.error('⚠️ Vote check error:', checkError);
                // Continue anyway, the database constraint will prevent duplicate votes
            }

            if (existingVotes && existingVotes.length > 0) {
                console.log('❌ User already voted');
                Utils.showToast('You have already voted for this election, you can\'t vote again', 'error');
                this.cancelVoting();
                return;
            }

            // Get the contest_id for this election and candidate
            console.log('Looking up contest for election:', this.currentElection.election_id, 'candidate:', this.selectedCandidate);
            
            // First, let's check what contests exist for this election
            const { data: allContests, error: allContestsError } = await supabase
                .from('contest')
                .select('*')
                .eq('election_id', this.currentElection.election_id);
            
            console.log('All contests for this election:', allContests);
            
            const { data: contestData, error: contestError } = await supabase
                .from('contest')
                .select('contest_id')
                .eq('election_id', this.currentElection.election_id)
                .eq('candidate_id', parseInt(this.selectedCandidate, 10))
                .single();

            console.log('Contest lookup result:', { contestData, contestError });

            if (contestError) {
                console.error('Contest lookup error:', contestError);
                
                // Try to create the contest entry if it doesn't exist
                console.log('Attempting to create contest entry...');
                const { data: newContest, error: createError } = await supabase
                    .from('contest')
                    .insert([{
                        election_id: this.currentElection.election_id,
                        candidate_id: parseInt(this.selectedCandidate, 10),
                        position: 'Candidate'
                    }])
                    .select()
                    .single();
                
                if (createError) {
                    console.error('Failed to create contest entry:', createError);
                    throw new Error(`Unable to find or create contest entry for this candidate. Please contact administrator.`);
                }
                
                console.log('Created new contest entry:', newContest);
                contestData = newContest;
            }

            if (!contestData) {
                throw new Error('Contest entry not found for this candidate and election');
            }

            // Cast the vote
            console.log('Inserting vote with contest_id:', contestData.contest_id, 'voter_id:', voterData.voter_id);
            const { data: voteResult, error: voteError } = await supabase
                .from('vote')
                .insert([{
                    contest_id: contestData.contest_id,
                    voter_id: voterData.voter_id,
                    vote_timestamp: new Date().toISOString(),
                    ip_address: await this.getClientIP()
                }])
                .select();

            console.log('Vote insertion result:', { voteResult, voteError });

            if (voteError) {
                console.error('Vote insertion error details:', voteError);
                throw voteError;
            }

            // Update voter's last vote date (if this field exists)
            await supabase
                .from('voter')
                .update({ updated_at: new Date().toISOString() })
                .eq('voter_id', voterData.voter_id);

            this.showVoteSuccessMessage();
            
        } catch (error) {
            console.error('Error casting vote:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            Utils.showToast('Error casting vote: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Show confirmation dialog
    showConfirmationDialog() {
        return new Promise((resolve) => {
            const selectedCandidate = this.currentCandidates.find(c => c.candidate_id === this.selectedCandidate);
            
            const confirmationHTML = `
                <div class="vote-confirmation">
                    <h3><i class="fas fa-vote-yea"></i> Confirm Your Vote</h3>
                    <div class="confirmation-candidate">
                        <div class="candidate-info">
                            ${selectedCandidate.photo_url ? 
                                `<img src="${selectedCandidate.photo_url}" alt="${selectedCandidate.full_name}" class="candidate-photo">` :
                                `<div class="candidate-placeholder"><i class="fas fa-user"></i></div>`
                            }
                            <div>
                                <h4>${Utils.sanitizeHtml(selectedCandidate.full_name)}</h4>
                                <p>${Utils.sanitizeHtml(selectedCandidate.party || 'Independent')}</p>
                            </div>
                        </div>
                    </div>
                    <p class="confirmation-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Are you sure you want to vote for this candidate? Once submitted, your vote cannot be changed.
                    </p>
                    <div class="confirmation-actions">
                        <button class="btn btn-outline" onclick="window.Voting.cancelConfirmation()">
                            <i class="fas fa-arrow-left"></i> Go Back
                        </button>
                        <button class="btn btn-primary" onclick="window.Voting.proceedWithVote()">
                            <i class="fas fa-check"></i> Yes, Submit My Vote
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
        const selectedCandidate = this.currentCandidates.find(c => c.candidate_id === this.selectedCandidate);
        
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
                            `<img src="${selectedCandidate.photo_url}" alt="${selectedCandidate.full_name}" class="candidate-photo">` :
                            `<div class="candidate-placeholder"><i class="fas fa-user"></i></div>`
                        }
                        <div class="candidate-details">
                            <h4>${Utils.sanitizeHtml(selectedCandidate.full_name)}</h4>
                            <p>${Utils.sanitizeHtml(selectedCandidate.party || 'Independent')}</p>
                        </div>
                    </div>
                    <p class="vote-timestamp">
                        Vote cast on: ${Utils.formatDate(new Date().toISOString())}
                    </p>
                </div>

                <div class="success-actions">
                    <button class="btn btn-outline" onclick="window.Elections.viewElectionResults('${this.currentElection.election_id}')">
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
    try {
        console.log('🚀 Initializing Voting system...');
        
        // Check if required dependencies are available
        if (typeof Utils === 'undefined') {
            console.error('❌ Utils class not found - check script loading order');
            return;
        }
        
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase client not found - check script loading');
            return;
        }
        
        window.Voting = new Voting();
        console.log('✅ Voting instance created and assigned to window.Voting');
        console.log('✅ Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.Voting)));
        
    } catch (error) {
        console.error('❌ Error initializing Voting system:', error);
    }
});
