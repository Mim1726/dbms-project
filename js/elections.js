// Helper to show election from vote card
window.showElectionFromVote = function(electionId) {
    showDashboardSection('elections');
    setTimeout(() => {
        // Try to highlight the election card
        const card = document.querySelector(`.election-card[data-election-id='${electionId}']`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('highlighted');
            setTimeout(() => card.classList.remove('highlighted'), 2000);
        }
    }, 500);
};
// Elections Module - Fixed Version
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
            // Fetch elections with schedules
            const { data: elections, error } = await supabase
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

            if (error) throw error;

            // Fetch candidates for each election
            for (let election of elections) {
                const { data: candidates, error: candidatesError } = await supabase
                    .from('candidate')
                    .select('*')
                    .eq('election_id', election.election_id);

                if (candidatesError) {
                    console.error('Error loading candidates:', candidatesError);
                    election.candidates = [];
                } else {
                    election.candidates = candidates || [];
                }
            }

            this.currentElections = elections;
            this.displayElections(elections);
            
        } catch (error) {
            console.error('Error loading elections:', error);
            Utils.showToast('Error loading elections', 'error');
            this.displayElections([]);
        } finally {
            Utils.hideLoading();
        }
    }

    // Display elections in the UI with sections
    displayElections(elections) {
        const container = document.getElementById('electionsContainer');
        
        if (!elections || elections.length === 0) {
            container.innerHTML = '<div class="no-elections"><i class="fas fa-vote-yea" style="font-size: 64px; color: #a0aec0; margin-bottom: 20px;"></i><h3>No Elections Available</h3><p>There are currently no active elections. Check back later!</p></div>';
            return;
        }

        // Categorize elections
        const ongoingElections = [];
        const upcomingElections = [];
        const endedElections = [];

        elections.forEach(election => {
            const status = this.getElectionStatus(election);
            console.log(`Election: ${election.name}, Date: ${election.election_date}, is_active: ${election.is_active}, Status: ${status}`);
            
            // Categorize based on status
            if (status === 'Active') {
                // Only truly active elections (happening now or very soon)
                ongoingElections.push(election);
            } else if (status === 'PreVoting' || status === 'Upcoming') {
                // Elections where voting isn't available yet
                upcomingElections.push(election);
            } else {
                // Ended elections
                endedElections.push(election);
            }
        });

        console.log('Categorization Results:', {
            ongoing: ongoingElections.map(e => e.name),
            upcoming: upcomingElections.map(e => e.name),
            ended: endedElections.map(e => e.name)
        });

        let html = '';

        // Ongoing Elections Section
            html += '<div class="election-section">';
            html += '<div class="section-header">';
            html += '<h2><i class="fas fa-play-circle"></i> Ongoing Elections</h2>';
            html += '<p class="section-description">Elections currently accepting votes</p>';
            html += '</div>';
            if (ongoingElections.length > 0) {
                html += '<div class="elections-grid">';
                html += ongoingElections.map(election => this.renderElectionCard(election, 'ongoing')).join('');
                html += '</div>';
            } else {
                html += `<div class="no-elections-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 0; background: #f8fafc; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin: 24px 0;">
                    <i class="fas fa-info-circle" style="font-size: 48px; color: #38bdf8; margin-bottom: 16px;"></i>
                    <h3 style="color: #334155; margin-bottom: 8px;">No Ongoing Election</h3>
                    <p style="color: #64748b; font-size: 1.1em; text-align: center; max-width: 400px;">There are currently no elections accepting votes. Please check back later or explore upcoming and past elections below.</p>
                </div>`;
            }
            html += '</div>';

        // Upcoming Elections Section
        if (upcomingElections.length > 0) {
            html += '<div class="election-section">';
            html += '<div class="section-header">';
            html += '<h2><i class="fas fa-clock"></i> Upcoming Elections</h2>';
            html += '<p class="section-description">Elections scheduled for the future - candidates viewable, voting not yet available</p>';
            html += '</div>';
            html += '<div class="elections-grid">';
            html += upcomingElections.map(election => this.renderElectionCard(election, 'upcoming')).join('');
            html += '</div></div>';
        }

        // Ended Elections Section
        if (endedElections.length > 0) {
            html += '<div class="election-section">';
            html += '<div class="section-header collapsible" onclick="this.parentElement.classList.toggle(\'collapsed\')">';
            html += '<h2><i class="fas fa-history"></i> Past Elections</h2>';
            html += '<p class="section-description">View results from completed elections</p>';
            html += '<i class="fas fa-chevron-down toggle-icon"></i>';
            html += '</div>';
            html += '<div class="elections-grid">';
            html += endedElections.map(election => this.renderElectionCard(election, 'ended')).join('');
            html += '</div></div>';
        }

        container.innerHTML = html;
    }

    // Render individual election card
    renderElectionCard(election, category) {
        const status = this.getElectionStatus(election);
        const candidateCount = election.candidates ? election.candidates.length : 0;
        
        const card = `
            <div class="election-card ${category}" data-election-id="${election.election_id}">
                <div class="election-header">
                    <h3>${Utils.sanitizeHtml(election.name || election.title)}</h3>
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
                        <span>Type: ${Utils.sanitizeHtml(election.election_type || 'General')}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-users"></i>
                        <span>${candidateCount} Candidates</span>
                    </div>
                </div>
                
                <div class="election-actions">
                    ${this.getElectionActions(election, status, category)}
                </div>
            </div>
        `;
        
        return card;
    }

    // Get election status with improved logic
    getElectionStatus(election) {
        const now = new Date();
        const electionDate = new Date(election.election_date);
        
        console.log(`Checking election: ${election.name}`);
        console.log(`Current date: ${now.toISOString()}`);
        console.log(`Election date: ${electionDate.toISOString()}`);
        console.log(`is_active: ${election.is_active}`);
        
        // Check if election has a schedule
        if (election.schedule && election.schedule.length > 0) {
            const schedule = election.schedule[0];
            const votingStart = schedule.voting_start ? new Date(schedule.voting_start) : null;
            const votingEnd = schedule.voting_end ? new Date(schedule.voting_end) : null;
            
            console.log(`Voting start: ${votingStart?.toISOString()}`);
            console.log(`Voting end: ${votingEnd?.toISOString()}`);
            
            if (votingStart && votingEnd) {
                // Has proper schedule - use it for status determination
                if (now > votingEnd) {
                    console.log(`Election ${election.name} has ended (voting end date passed)`);
                    return 'Ended';
                } else if (now >= votingStart && now <= votingEnd) {
                    console.log(`Election ${election.name} is active (within voting period)`);
                    return 'Active';
                } else if (now < votingStart) {
                    console.log(`Election ${election.name} is upcoming (voting not started)`);
                    return 'Upcoming';
                }
            }
        }
        
        // Fallback to election_date if no schedule or invalid schedule
        console.log('Using election_date fallback for status determination');
        
        // Calculate days since election date
        const daysDiff = (now - electionDate) / (1000 * 60 * 60 * 24);
        console.log(`Days since election date: ${daysDiff}`);
        
        // If election date has passed by more than 1 day, it's ended
        if (daysDiff > 1) {
            console.log(`Election ${election.name} has ended (${Math.round(daysDiff)} days past election date)`);
            return 'Ended';
        }
        
        // If election date is today or within 1 day
        if (Math.abs(daysDiff) <= 1) {
            if (election.is_active === 'Y') {
                console.log(`Election ${election.name} is active (election day and marked active)`);
                return 'Active';
            } else {
                console.log(`Election ${election.name} has ended (election day but not active)`);
                return 'Ended';
            }
        }
        
        // Future election
        console.log(`Election ${election.name} is upcoming (future date)`);
        return 'Upcoming';
    }

    // Get appropriate actions for election based on status and category
    getElectionActions(election, status, category) {
        let actions = '';

        if (category === 'ongoing') {
            // Ongoing elections: Users can vote AND view candidates
            if (window.Auth && window.Auth.isAuthenticated()) {
                if (window.Auth.hasRole('voter')) {
                    actions += `<button class="btn btn-primary" onclick="window.Voting.startVoting('${election.election_id}')">`;
                    actions += '<i class="fas fa-vote-yea"></i> Vote Now</button>';
                }
            } else {
                actions += `<button class="btn btn-outline" onclick="window.Auth.showAuthModal('login')">`;
                actions += '<i class="fas fa-sign-in-alt"></i> Login to Vote</button>';
            }
            
            actions += `<button class="btn btn-outline" onclick="window.Elections.viewCandidates('${election.election_id}')">`;
            actions += '<i class="fas fa-users"></i> View Candidates</button>';
            
        } else if (category === 'upcoming') {
            // Upcoming elections: Users can view candidates and apply as candidate
            actions += `<button class="btn btn-primary" onclick="window.Elections.viewCandidates('${election.election_id}')">`;
            actions += '<i class="fas fa-users"></i> View Candidates</button>';
            
            // Add "Apply as Candidate" button for logged-in voters
            if (window.Auth && window.Auth.isAuthenticated() && window.Auth.hasRole('voter')) {
                actions += `<button class="btn btn-success" onclick="window.Elections.applyAsCandidate('${election.election_id}')">`;
                actions += '<i class="fas fa-user-plus"></i> Apply as Candidate</button>';
            }
            
            actions += '<div class="upcoming-notice">';
            actions += '<i class="fas fa-info-circle"></i>';
            actions += '<span>Voting will be available when the election starts</span>';
            actions += '</div>';
            
        } else if (category === 'ended') {
            // Ended elections: Only view results
            actions += `<button class="btn btn-outline" onclick="window.Elections.viewElectionResults('${election.election_id}')">`;
            actions += '<i class="fas fa-chart-bar"></i> View Results</button>';
        }

        return actions;
    }

    // View candidates for an election
    async viewCandidates(electionId) {
        Utils.showLoading();
        
        try {
            // Get election details
            const { data: election, error: electionError } = await supabase
                .from('election')
                .select('*')
                .eq('election_id', electionId)
                .single();

            if (electionError) throw electionError;

            // Get candidates
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidate')
                .select('*')
                .eq('election_id', electionId)
                .order('full_name');

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

        let candidatesHtml = '';
        if (candidates && candidates.length > 0) {
            candidatesHtml = candidates.map(candidate => `
                <div class="candidate-preview-card">
                    <div class="candidate-photo-container">
                        ${candidate.photo_url ? 
                            `<img src="${candidate.photo_url}" alt="${candidate.full_name}" class="candidate-photo">` :
                            '<div class="candidate-placeholder"><i class="fas fa-user"></i></div>'
                        }
                    </div>
                    
                    <div class="candidate-preview-info">
                        <h3>${Utils.sanitizeHtml(candidate.full_name)}</h3>
                        <p class="candidate-party">${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                        
                        ${candidate.biography ? `
                            <div class="candidate-bio">
                                ${Utils.sanitizeHtml(candidate.biography)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            candidatesHtml = '<p>No candidates registered yet.</p>';
        }

        content.innerHTML = `
            <div class="candidates-preview">
                <div class="preview-header">
                    <h2><i class="fas fa-users"></i> ${Utils.sanitizeHtml(election.name || election.title)} - Candidates</h2>
                    <p class="preview-instructions">Meet the candidates for this election</p>
                </div>

                <div class="candidates-preview-grid">
                    ${candidatesHtml}
                </div>

                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="document.getElementById('votingModal').style.display = 'none'">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    // View election results in a modal
    async viewElectionResults(electionId) {
        try {
            console.log('Loading results for election:', electionId);
            Utils.showLoading();
            
            // Get election details
            const { data: election, error: electionError } = await window.supabase
                .from('election')
                .select('*')
                .eq('election_id', electionId)
                .single();

            console.log('Election query result:', { election, electionError });
            if (electionError) throw electionError;

            // Get candidates for this election
            const { data: candidates, error: candidatesError } = await window.supabase
                .from('candidate')
                .select('candidate_id, full_name, party, symbol, status')
                .eq('election_id', electionId);

            console.log('Candidates query result:', { candidates, candidatesError });
            if (candidatesError) throw candidatesError;

            // Filter for approved candidates or candidates in contests
            let approvedCandidates = [];
            if (candidates && candidates.length > 0) {
                // Check which candidates are in contests
                const { data: contests } = await window.supabase
                    .from('contest')
                    .select('candidate_id')
                    .eq('election_id', electionId);
                
                const contestCandidateIds = new Set(contests?.map(c => c.candidate_id) || []);
                
                // Include candidates that are either explicitly approved or are in contests
                approvedCandidates = candidates.filter(candidate => 
                    candidate.status === 'approved' || contestCandidateIds.has(candidate.candidate_id)
                );
            }

            console.log('Approved candidates:', approvedCandidates);

            // Get vote counts for each approved candidate
            let candidateResults = [];
            if (approvedCandidates && approvedCandidates.length > 0) {
                for (const candidate of approvedCandidates) {
                    // Get contest for this candidate
                    const { data: contests } = await window.supabase
                        .from('contest')
                        .select('contest_id')
                        .eq('election_id', electionId)
                        .eq('candidate_id', candidate.candidate_id);

                    let voteCount = 0;
                    if (contests && contests.length > 0) {
                        // Get vote count for this contest
                        const { count } = await window.supabase
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

            // Create and show modal
            const modal = document.createElement('div');
            modal.className = 'modal results-modal';
            modal.innerHTML = `
                <div class="modal-content large-modal">
                    <div class="modal-header">
                        <h2><i class="fas fa-chart-bar"></i> ${Utils.sanitizeHtml(election.name)} - Results</h2>
                        <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="election-results-modal">
                            <div class="results-summary">
                                <div class="summary-card">
                                    <h3>Election Summary</h3>
                                    <div class="summary-stats">
                                        <div class="stat-item">
                                            <i class="fas fa-users"></i>
                                            <span class="stat-label">Total Votes:</span>
                                            <span class="stat-value">${totalVotes}</span>
                                        </div>
                                        <div class="stat-item">
                                            <i class="fas fa-user-check"></i>
                                            <span class="stat-label">Candidates:</span>
                                            <span class="stat-value">${candidateResults.length}</span>
                                        </div>
                                        <div class="stat-item">
                                            <i class="fas fa-calendar"></i>
                                            <span class="stat-label">Date:</span>
                                            <span class="stat-value">${new Date(election.election_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            ${candidateResults.length > 0 ? `
                                <div class="candidates-results-detailed">
                                    <h3>Candidate Results</h3>
                                    ${candidateResults.map((candidate, index) => {
                                        const percentage = totalVotes > 0 ? ((candidate.vote_count / totalVotes) * 100).toFixed(1) : 0;
                                        const isWinner = index === 0 && candidate.vote_count > 0;
                                        return `
                                            <div class="candidate-result-detailed ${isWinner ? 'winner' : ''}">
                                                <div class="position-badge">#${index + 1}</div>
                                                <div class="candidate-info-detailed">
                                                    <h4>${candidate.symbol ? candidate.symbol + ' ' : ''}${candidate.full_name}</h4>
                                                    <p class="party">${candidate.party || 'Independent'}</p>
                                                    ${isWinner ? '<span class="winner-badge"><i class="fas fa-crown"></i> Winner</span>' : ''}
                                                </div>
                                                <div class="vote-details">
                                                    <div class="vote-count-large">${candidate.vote_count}</div>
                                                    <div class="vote-percentage-large">${percentage}%</div>
                                                    <div class="vote-bar-container">
                                                        <div class="vote-bar-large">
                                                            <div class="vote-fill-large ${isWinner ? 'winner-fill' : ''}" style="width: ${percentage}%"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : `
                                <div class="no-results-detailed">
                                    <i class="fas fa-vote-yea"></i>
                                    <h3>No Votes Cast</h3>
                                    <p>This election has not received any votes yet or no candidates are available.</p>
                                </div>
                            `}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            modal.style.display = 'block';

            // Add click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

        } catch (error) {
            console.error('Error loading election results:', error);
            Utils.showToast('Error loading election results', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Apply as candidate for an election
    async applyAsCandidate(electionId) {
        try {
            // Check if user is authenticated and is a voter
            if (!window.Auth || !window.Auth.isAuthenticated()) {
                Utils.showToast('Please login to apply as a candidate', 'warning');
                return;
            }

            if (!window.Auth.hasRole('voter')) {
                Utils.showToast('Only voters can apply as candidates', 'error');
                return;
            }

            // Get election details
            const { data: election, error: electionError } = await supabase
                .from('election')
                .select('*')
                .eq('election_id', electionId)
                .single();

            if (electionError) throw electionError;

            // Check if user has already applied for this election
            const { data: existingApplication, error: checkError } = await supabase
                .from('candidate')
                .select('*')
                .eq('full_name', window.Auth.currentUser.full_name)
                .eq('election_id', electionId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
                throw checkError;
            }

            if (existingApplication) {
                Utils.showToast('You have already applied for this election', 'warning');
                return;
            }

            // Show candidate application form in modal
            this.showCandidateApplicationModal(election);

        } catch (error) {
            console.error('Error applying as candidate:', error);
            Utils.showToast('Error: ' + error.message, 'error');
        }
    }

    // Show candidate application modal
    showCandidateApplicationModal(election) {
        const modal = document.getElementById('votingModal');
        const content = document.getElementById('votingContent');

        content.innerHTML = `
            <div class="candidate-application-form">
                <div class="form-header">
                    <h2><i class="fas fa-user-plus"></i> Apply as Candidate</h2>
                    <p>Apply to become a candidate for: <strong>${Utils.sanitizeHtml(election.name)}</strong></p>
                </div>

                <form id="candidateApplicationForm">
                    <div class="form-group">
                        <label for="candidateParty">Political Party</label>
                        <input type="text" id="candidateParty" placeholder="Enter your political party or 'Independent'">
                    </div>

                    <div class="form-group">
                        <label for="candidateSymbol">Election Symbol</label>
                        <input type="text" id="candidateSymbol" placeholder="Enter your election symbol">
                    </div>

                    <div class="form-group">
                        <label for="candidateBio">Biography</label>
                        <textarea id="candidateBio" rows="4" placeholder="Tell voters about yourself, your background, and qualifications"></textarea>
                    </div>

                    <div class="form-group">
                        <label for="candidateManifesto">Campaign Manifesto</label>
                        <textarea id="candidateManifesto" rows="5" placeholder="Describe your vision, goals, and what you plan to achieve if elected"></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('votingModal').style.display = 'none'">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Submit Application
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Add form submission handler
        document.getElementById('candidateApplicationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitCandidateApplication(election.election_id);
        });

        modal.style.display = 'block';
    }

    // Submit candidate application
    async submitCandidateApplication(electionId) {
        try {
            Utils.showLoading();

            // Get form data
            const party = document.getElementById('candidateParty').value.trim();
            const symbol = document.getElementById('candidateSymbol').value.trim();
            const bio = document.getElementById('candidateBio').value.trim();
            const manifesto = document.getElementById('candidateManifesto').value.trim();

            // Validate required fields
            if (!party || !symbol || !bio || !manifesto) {
                Utils.showToast('Please fill in all required fields', 'warning');
                return;
            }

            // Insert candidate application (without photo for now)
            const { data, error } = await supabase
                .from('candidate')
                .insert({
                    election_id: electionId,
                    full_name: window.Auth.currentUser.full_name,
                    party: party,
                    symbol: symbol,
                    bio: bio,
                    manifesto: manifesto,
                    status: 'pending'
                });

            if (error) throw error;

            Utils.showToast('Your candidate application has been submitted successfully! It will be reviewed by the administrators.', 'success');
            
            // Close modal
            document.getElementById('votingModal').style.display = 'none';

        } catch (error) {
            console.error('Error submitting application:', error);
            Utils.showToast('Error submitting application: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Load and display election results for voters
    async loadResults() {
        try {
            console.log('Loading election results...');
            
            const resultsContainer = document.getElementById('resultsContainer');
            if (!resultsContainer) {
                console.error('Results container not found');
                return;
            }

            Utils.showLoading();

            // Get all elections with their schedules
            const { data: elections, error: electionsError } = await window.supabase
                .from('election')
                .select(`
                    *,
                    schedule!inner(*)
                `)
                .order('created_at', { ascending: false });

            if (electionsError) throw electionsError;

            if (!elections || elections.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-chart-bar"></i>
                        <h3>No Elections Found</h3>
                        <p>There are no elections available to show results for.</p>
                    </div>
                `;
                return;
            }

            // Group elections by voting status
            const now = new Date();
            const completedElections = [];
            const ongoingElections = [];
            const upcomingElections = [];

            elections.forEach(election => {
                const schedule = election.schedule[0];
                if (!schedule) return;

                const votingStart = new Date(schedule.voting_start);
                const votingEnd = new Date(schedule.voting_end);

                if (now < votingStart) {
                    upcomingElections.push(election);
                } else if (now >= votingStart && now <= votingEnd) {
                    ongoingElections.push(election);
                } else {
                    completedElections.push(election);
                }
            });

            let html = '<div class="results-sections">';

            // Show completed elections first (they have final results)
            if (completedElections.length > 0) {
                html += '<div class="results-category">';
                html += '<h3><i class="fas fa-check-circle"></i> Completed Elections - Final Results</h3>';
                for (const election of completedElections) {
                    html += await this.generateElectionResultCard(election);
                }
                html += '</div>';
            }

            // Show ongoing elections (live results)
            if (ongoingElections.length > 0) {
                html += '<div class="results-category">';
                html += '<h3><i class="fas fa-clock"></i> Ongoing Elections - Live Results</h3>';
                for (const election of ongoingElections) {
                    html += await this.generateElectionResultCard(election);
                }
                html += '</div>';
            }

            // Show upcoming elections (no results yet)
            if (upcomingElections.length > 0) {
                html += '<div class="results-category">';
                html += '<h3><i class="fas fa-calendar-alt"></i> Upcoming Elections</h3>';
                html += '<div class="upcoming-results-info">';
                html += '<p>Results will be available once voting begins.</p>';
                upcomingElections.forEach(election => {
                    const schedule = election.schedule[0];
                    const votingStart = new Date(schedule.voting_start);
                    html += `
                        <div class="upcoming-election-item">
                            <strong>${election.title}</strong>
                            <span>Voting starts: ${votingStart.toLocaleString()}</span>
                        </div>
                    `;
                });
                html += '</div>';
                html += '</div>';
            }

            html += '</div>';

            resultsContainer.innerHTML = html;

        } catch (error) {
            console.error('Error loading results:', error);
            const resultsContainer = document.getElementById('resultsContainer');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading Results</h3>
                        <p>Unable to load election results. Please try again later.</p>
                        <button class="btn btn-primary" onclick="window.Elections.loadResults()">
                            <i class="fas fa-sync"></i> Retry
                        </button>
                    </div>
                `;
            }
        } finally {
            Utils.hideLoading();
        }
    }

    // Generate result card for an election
    async generateElectionResultCard(election) {
        try {
            // Get candidates and results for this election
            const { data: results, error: resultsError } = await window.supabase
                .from('result')
                .select(`
                    *,
                    candidate!inner(
                        candidate_id,
                        name,
                        party,
                        user_id
                    )
                `)
                .eq('election_id', election.election_id)
                .order('vote_count', { ascending: false });

            if (resultsError) throw resultsError;

            const schedule = election.schedule[0];
            const votingStart = new Date(schedule.voting_start);
            const votingEnd = new Date(schedule.voting_end);
            const now = new Date();
            const isCompleted = now > votingEnd;
            const isOngoing = now >= votingStart && now <= votingEnd;

            let html = `
                <div class="election-result-card">
                    <div class="election-result-header">
                        <h4>${election.title}</h4>
                        <div class="election-result-meta">
                            <span class="election-type">${election.election_type}</span>
                            <span class="voting-period">
                                ${votingStart.toLocaleDateString()} - ${votingEnd.toLocaleDateString()}
                            </span>
                            ${isCompleted ? '<span class="status completed">Completed</span>' : 
                              isOngoing ? '<span class="status ongoing">Live</span>' : 
                              '<span class="status upcoming">Upcoming</span>'}
                        </div>
                    </div>
                    <div class="election-result-body">
            `;

            if (results && results.length > 0) {
                // Calculate total votes
                const totalVotes = results.reduce((sum, result) => sum + (result.vote_count || 0), 0);
                
                html += `<div class="results-summary">
                    <p><strong>Total Votes Cast:</strong> ${totalVotes}</p>
                </div>`;

                html += '<div class="candidates-results">';
                results.forEach((result, index) => {
                    const percentage = totalVotes > 0 ? ((result.vote_count || 0) / totalVotes * 100).toFixed(1) : 0;
                    const isWinner = index === 0 && isCompleted && result.vote_count > 0;
                    
                    html += `
                        <div class="candidate-result ${isWinner ? 'winner' : ''}">
                            <div class="candidate-info">
                                <span class="candidate-name">${result.candidate.name}</span>
                                ${result.candidate.party ? `<span class="candidate-party">${result.candidate.party}</span>` : ''}
                                ${isWinner ? '<i class="fas fa-crown winner-icon"></i>' : ''}
                            </div>
                            <div class="vote-stats">
                                <span class="vote-count">${result.vote_count || 0} votes</span>
                                <span class="vote-percentage">${percentage}%</span>
                            </div>
                            <div class="vote-bar">
                                <div class="vote-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
            } else {
                html += `
                    <div class="no-results">
                        <p>No results available for this election yet.</p>
                        ${isCompleted ? '<p>No votes were cast or no candidates are available.</p>' : 
                          isOngoing ? '<p>Voting is ongoing - results will appear as votes are cast.</p>' : ''}
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;

            return html;

        } catch (error) {
            console.error('Error generating result card:', error);
            return `
                <div class="election-result-card error">
                    <h4>${election.title}</h4>
                    <p>Error loading results for this election.</p>
                </div>
            `;
        }
    }
}

// Initialize Elections module
window.Elections = new Elections();
