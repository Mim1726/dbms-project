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
            // Fetch elections and schedules
            const { data: elections, error } = await supabase
                .from('election')
                .select('*')
                .order('election_date', { ascending: false });

            if (error) throw error;

            // Fetch candidates for each election
            for (let election of elections) {
                const { data: candidates, error: candidatesError } = await supabase
                    .from('candidate')
                    .select('*')
                    .eq('election_id', election.id);

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
            if (status === 'Active' || status === 'PreVoting') {
                ongoingElections.push(election);
            } else if (status === 'Upcoming') {
                upcomingElections.push(election);
            } else {
                endedElections.push(election);
            }
        });

        let html = '';

        // Ongoing Elections Section
        if (ongoingElections.length > 0) {
            html += '<div class="election-section">';
            html += '<div class="section-header">';
            html += '<h2><i class="fas fa-play-circle"></i> Ongoing Elections</h2>';
            html += '<p class="section-description">Elections currently accepting votes</p>';
            html += '</div>';
            html += '<div class="elections-grid">';
            html += ongoingElections.map(election => this.renderElectionCard(election, 'ongoing')).join('');
            html += '</div></div>';
        }

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
            <div class="election-card ${category}">
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
        // If election is explicitly marked as active, return 'Active' status
        if (election.is_active === 'Y') {
            return 'Active';
        }
        
        const now = new Date();
        const electionDate = new Date(election.election_date);
        
        // Simple logic for now
        if (electionDate > now) {
            // Check if it's within 30 days (PreVoting period)
            const daysDiff = (electionDate - now) / (1000 * 60 * 60 * 24);
            if (daysDiff <= 30) {
                return 'PreVoting';
            } else {
                return 'Upcoming';
            }
        } else {
            return 'Ended';
        }
    }

    // Get appropriate actions for election based on status and category
    getElectionActions(election, status, category) {
        let actions = '';

        if (category === 'ongoing') {
            // Ongoing elections: Users can vote AND view candidates
            if (window.Auth && window.Auth.isAuthenticated()) {
                if (window.Auth.hasRole('voter')) {
                    actions += `<button class="btn btn-primary" onclick="window.Voting.startVoting('${election.id}')">`;
                    actions += '<i class="fas fa-vote-yea"></i> Vote Now</button>';
                }
            } else {
                actions += `<button class="btn btn-outline" onclick="window.Auth.showAuthModal('login')">`;
                actions += '<i class="fas fa-sign-in-alt"></i> Login to Vote</button>';
            }
            
            actions += `<button class="btn btn-outline" onclick="window.Elections.viewCandidates('${election.id}')">`;
            actions += '<i class="fas fa-users"></i> View Candidates</button>';
            
        } else if (category === 'upcoming') {
            // Upcoming elections: Users can ONLY view candidates, no voting
            actions += `<button class="btn btn-primary" onclick="window.Elections.viewCandidates('${election.id}')">`;
            actions += '<i class="fas fa-users"></i> View Candidates</button>';
            
            actions += '<div class="upcoming-notice">';
            actions += '<i class="fas fa-info-circle"></i>';
            actions += '<span>Voting will be available when the election starts</span>';
            actions += '</div>';
            
        } else if (category === 'ended') {
            // Ended elections: Only view results
            actions += `<button class="btn btn-outline" onclick="window.Elections.viewElectionResults('${election.id}')">`;
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
                .eq('id', electionId)
                .single();

            if (electionError) throw electionError;

            // Get candidates
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidate')
                .select('*')
                .eq('election_id', electionId)
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

        let candidatesHtml = '';
        if (candidates && candidates.length > 0) {
            candidatesHtml = candidates.map(candidate => `
                <div class="candidate-preview-card">
                    <div class="candidate-photo-container">
                        ${candidate.photo_url ? 
                            `<img src="${candidate.photo_url}" alt="${candidate.name}" class="candidate-photo">` :
                            '<div class="candidate-placeholder"><i class="fas fa-user"></i></div>'
                        }
                    </div>
                    
                    <div class="candidate-preview-info">
                        <h3>${Utils.sanitizeHtml(candidate.name)}</h3>
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

    // View election results (existing function - keeping it simple)
    async viewElectionResults(electionId) {
        Utils.showToast('Results functionality will be implemented soon!', 'info');
    }
}

// Initialize Elections module
window.Elections = new Elections();
