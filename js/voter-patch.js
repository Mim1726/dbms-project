// Voter functions patch - simplified version
// This file contains simplified voter functions that work with the current database schema

// Add these methods to the Auth class
Auth.prototype.showMyVotesSimple = async function() {
    console.log('showMyVotesSimple called for user:', this.currentUser);
    try {
        const voterContent = document.getElementById('voterContent');
        if (!voterContent) {
            console.error('voterContent element not found');
            return;
        }

        // Show loading state
        voterContent.innerHTML = `
            <div class="dashboard-header">
                <h2><i class="fas fa-history"></i> My Voting History</h2>
            </div>
            <div class="loading-message">
                <i class="fas fa-spinner fa-spin"></i> Loading your voting history...
            </div>
        `;

        console.log('Fetching votes for voter_id:', this.currentUser.voter_id);

        // Get voter's votes - simple query first
        const { data: votes, error: votesError } = await supabase
            .from('vote')
            .select('vote_id, vote_timestamp, contest_id')
            .eq('voter_id', this.currentUser.voter_id)
            .order('vote_timestamp', { ascending: false });

        console.log('Votes query result:', { votes, votesError });

        if (votesError) {
            console.error('Error loading votes:', votesError);
            voterContent.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-history"></i> My Voting History</h2>
                </div>
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading voting history: ${votesError.message}
                </div>
            `;
            return;
        }

        // Display votes
        if (!votes || votes.length === 0) {
            voterContent.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-history"></i> My Voting History</h2>
                </div>
                <div class="empty-state">
                    <i class="fas fa-ballot"></i>
                    <h3>No Votes Yet</h3>
                    <p>You haven't participated in any elections yet. Check the Elections section to see available elections.</p>
                    <button onclick="showDashboardSection('elections')" class="btn btn-primary">
                        <i class="fas fa-vote-yea"></i> View Elections
                    </button>
                </div>
            `;
            return;
        }

        // Get detailed information for each vote
        let votesHtml = '';
        for (const vote of votes) {
            try {
                // Get contest details
                const { data: contest } = await supabase
                    .from('contest')
                    .select('contest_id, position, election_id, candidate_id')
                    .eq('contest_id', vote.contest_id)
                    .single();

                if (!contest) continue;

                // Get candidate details
                const { data: candidate } = await supabase
                    .from('candidate')
                    .select('candidate_id, full_name, party, symbol')
                    .eq('candidate_id', contest.candidate_id)
                    .single();

                // Get election details
                const { data: election } = await supabase
                    .from('election')
                    .select('election_id, name, election_date, election_type')
                    .eq('election_id', contest.election_id)
                    .single();

                votesHtml += `
                    <div class="vote-card">
                        <div class="vote-header">
                            <h4>${election?.name || 'Unknown Election'}</h4>
                            <span class="vote-date">
                                <i class="fas fa-calendar"></i>
                                ${new Date(vote.vote_timestamp).toLocaleDateString()}
                            </span>
                        </div>
                        <div class="vote-details">
                            <div class="vote-info">
                                <label>Position:</label>
                                <span>${contest?.position || 'Candidate'}</span>
                            </div>
                            <div class="vote-info">
                                <label>Candidate:</label>
                                <span>${candidate?.symbol || ''} ${candidate?.full_name || 'Unknown Candidate'}</span>
                            </div>
                            <div class="vote-info">
                                <label>Party:</label>
                                <span>${candidate?.party || 'Independent'}</span>
                            </div>
                            <div class="vote-info">
                                <label>Vote Time:</label>
                                <span>${new Date(vote.vote_timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error processing vote:', vote, error);
                votesHtml += `
                    <div class="vote-card">
                        <div class="vote-header">
                            <h4>Vote Cast</h4>
                            <span class="vote-date">
                                <i class="fas fa-calendar"></i>
                                ${new Date(vote.vote_timestamp).toLocaleDateString()}
                            </span>
                        </div>
                        <div class="vote-details">
                            <div class="vote-info">
                                <span>Vote details could not be loaded (Contest ID: ${vote.contest_id})</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        voterContent.innerHTML = `
            <div class="dashboard-header">
                <h2><i class="fas fa-history"></i> My Voting History</h2>
                <div class="stats-summary">
                    <span class="stat-item">
                        <i class="fas fa-vote-yea"></i>
                        <strong>${votes.length}</strong> Vote${votes.length !== 1 ? 's' : ''} Cast
                    </span>
                </div>
            </div>
            <div class="votes-container">
                ${votesHtml || '<div class="empty-state"><p>No vote details available.</p></div>'}
            </div>
        `;

    } catch (error) {
        console.error('Error showing votes:', error);
        const voterContent = document.getElementById('voterContent');
        if (voterContent) {
            voterContent.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-history"></i> My Voting History</h2>
                </div>
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Unexpected error: ${error.message}
                </div>
            `;
        }
    }
};

// Simplified results loader
Auth.prototype.loadVoterResultsSimple = async function(container) {
    try {
        console.log('loadVoterResultsSimple called, container:', container);
        
        // Show loading
        container.innerHTML = `
            <div class="section-header">
                <h2><i class="fas fa-chart-pie"></i> Election Results</h2>
                <p>View results of completed elections</p>
            </div>
            <div class="loading-message">
                <i class="fas fa-spinner fa-spin"></i> Loading results...
            </div>
        `;

        // Get elections that are active
        const { data: elections, error: electionsError } = await supabase
            .from('elections')
            .select('election_id, name, election_type, election_date, is_active, description, status')
            .order('election_date', { ascending: false });

        console.log('Elections query result:', { elections: elections?.length || 0, electionsError });

        if (electionsError) {
            console.error('Elections error:', electionsError);
            container.innerHTML = `
                <div class="section-header">
                    <h2><i class="fas fa-chart-pie"></i> Election Results</h2>
                    <p>View results of completed elections</p>
                </div>
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading elections: ${electionsError.message}
                </div>
            `;
            return;
        }

        if (!elections || elections.length === 0) {
            container.innerHTML = `
                <div class="section-header">
                    <h2><i class="fas fa-chart-pie"></i> Election Results</h2>
                    <p>View results of completed elections</p>
                </div>
                <div class="empty-state">
                    <i class="fas fa-chart-bar"></i>
                    <h3>No Elections Available</h3>
                    <p>There are no elections with published results at this time.</p>
                </div>
            `;
            return;
        }

        // Get results for each election
        let resultsHTML = '';
        for (const election of elections) {
            try {
                // Get candidates for this election - remove status filter for now to debug
                const { data: candidates, error: candidatesError } = await supabase
                    .from('candidates')
                    .select('candidate_id, full_name, party, symbol, status')
                    .eq('election_id', election.election_id);

                if (candidatesError) {
                    console.error('Error loading candidates:', candidatesError);
                    resultsHTML += `
                        <div class="election-result-card">
                            <div class="election-header">
                                <h3>${election.name}</h3>
                            </div>
                            <div class="error-message">
                                Error loading candidates: ${candidatesError.message}
                            </div>
                        </div>
                    `;
                    continue;
                }

                console.log(`Candidates for election ${election.election_id}:`, candidates);

                // Filter for approved candidates or candidates in contests
                let approvedCandidates = [];
                if (candidates && candidates.length > 0) {
                    // First check which candidates are in contests (which means they're effectively approved)
                    const { data: contests } = await supabase
                        .from('contests')
                        .select('candidate_id')
                        .eq('election_id', election.election_id);
                    
                    const contestCandidateIds = new Set(contests?.map(c => c.candidate_id) || []);
                    
                    // Include candidates that are either explicitly approved or are in contests
                    approvedCandidates = candidates.filter(candidate => 
                        candidate.status === 'approved' || contestCandidateIds.has(candidate.candidate_id)
                    );
                }

                console.log(`Approved/Contest candidates for election ${election.election_id}:`, approvedCandidates);

                // Get vote counts for each approved candidate
                let candidateResults = [];
                if (approvedCandidates && approvedCandidates.length > 0) {
                    for (const candidate of approvedCandidates) {
                        // Get contest for this candidate
                        const { data: contests } = await supabase
                            .from('contests')
                            .select('contest_id')
                            .eq('election_id', election.election_id)
                            .eq('candidate_id', candidate.candidate_id);

                        let voteCount = 0;
                        if (contests && contests.length > 0) {
                            // Get vote count for this contest
                            const { count } = await supabase
                                .from('votes')
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

                resultsHTML += `
                    <div class="election-result-card">
                        <div class="election-header">
                            <h3>${election.name}</h3>
                            <div class="election-meta">
                                <span class="election-type">${election.election_type}</span>
                                <span class="election-date">${new Date(election.election_date).toLocaleDateString()}</span>
                                <span class="total-votes">Total Votes: ${totalVotes}</span>
                            </div>
                        </div>
                        
                        ${candidateResults.length > 0 ? `
                            <div class="candidates-results">
                                ${candidateResults.map((candidate, index) => {
                                    const percentage = totalVotes > 0 ? ((candidate.vote_count / totalVotes) * 100).toFixed(1) : 0;
                                    return `
                                        <div class="candidate-result ${index === 0 && candidate.vote_count > 0 ? 'winner' : ''}">
                                            <div class="candidate-info">
                                                <div class="rank">#${index + 1}</div>
                                                <div class="candidate-details">
                                                    <h4>${candidate.symbol || ''} ${candidate.full_name}</h4>
                                                    <p>${candidate.party || 'Independent'}</p>
                                                </div>
                                                <div class="vote-stats">
                                                    <span class="vote-count">${candidate.vote_count} votes</span>
                                                    <span class="vote-percentage">${percentage}%</span>
                                                </div>
                                            </div>
                                            <div class="vote-bar">
                                                <div class="vote-fill" style="width: ${percentage}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="no-results">
                                <p>No votes cast for this election yet.</p>
                            </div>
                        `}
                    </div>
                `;
            } catch (error) {
                console.error('Error processing election:', election, error);
                resultsHTML += `
                    <div class="election-result-card">
                        <div class="election-header">
                            <h3>${election.name}</h3>
                        </div>
                        <div class="error-message">
                            Error loading results for this election.
                        </div>
                    </div>
                `;
            }
        }

        container.innerHTML = `
            <div class="section-header">
                <h2><i class="fas fa-chart-pie"></i> Election Results</h2>
                <p>View results of completed elections</p>
            </div>
            <div class="results-container">
                ${resultsHTML}
            </div>
        `;

    } catch (error) {
        console.error('Error loading voter results:', error);
        container.innerHTML = `
            <div class="section-header">
                <h2><i class="fas fa-chart-pie"></i> Election Results</h2>
                <p>View results of completed elections</p>
            </div>
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                Unexpected error: ${error.message}
            </div>
        `;
    }
};

// Candidate Application functionality
Auth.prototype.showCandidateApplication = async function() {
    console.log('showCandidateApplication called for user:', this.currentUser);
    try {
        const voterContent = document.getElementById('voterContent');
        if (!voterContent) {
            console.error('voterContent element not found');
            return;
        }

        // Show loading state
        voterContent.innerHTML = `
            <div class="dashboard-header">
                <h2><i class="fas fa-user-tie"></i> Apply as Candidate</h2>
                <p>Apply to become a candidate in available elections</p>
            </div>
            <div class="loading-message">
                <i class="fas fa-spinner fa-spin"></i> Loading available elections...
            </div>
        `;

        // Get available elections where voting hasn't started yet
        const { data: elections, error: electionsError } = await supabase
            .from('election')
            .select('election_id, name, election_type, election_date, description')
            .eq('is_active', 'Y')
            .order('election_date', { ascending: true });

        if (electionsError) {
            console.error('Error loading elections:', electionsError);
            voterContent.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-user-tie"></i> Apply as Candidate</h2>
                </div>
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading elections: ${electionsError.message}
                </div>
            `;
            return;
        }

        // Get user's existing applications
        const { data: existingApplications, error: appError } = await supabase
            .from('candidate')
            .select('election_id, status, created_at, admin_notes')
            .eq('voter_id', this.currentUser.voter_id);

        if (appError) {
            console.error('Error loading applications:', appError);
        }

        const applications = existingApplications || [];

        let content = `
            <div class="dashboard-header">
                <h2><i class="fas fa-user-tie"></i> Apply as Candidate</h2>
                <p>Apply to become a candidate in available elections</p>
            </div>
        `;

        // Show existing applications
        if (applications.length > 0) {
            content += `
                <div class="section-card">
                    <h3><i class="fas fa-clipboard-list"></i> My Applications</h3>
                    <div class="applications-list">
            `;

            for (const app of applications) {
                const election = elections?.find(e => e.election_id === app.election_id);
                const statusClass = app.status === 'approved' ? 'success' : 
                                  app.status === 'rejected' ? 'error' : 'warning';
                
                content += `
                    <div class="application-item ${statusClass}">
                        <div class="application-header">
                            <h4>${election?.name || 'Unknown Election'}</h4>
                            <span class="status-badge status-${app.status}">${app.status}</span>
                        </div>
                        <div class="application-details">
                            <span class="application-date">Applied: ${new Date(app.created_at).toLocaleDateString()}</span>
                            ${app.admin_notes ? `<div class="admin-notes"><strong>Admin Notes:</strong> ${app.admin_notes}</div>` : ''}
                        </div>
                    </div>
                `;
            }

            content += `
                    </div>
                </div>
            `;
        }

        // Show available elections for new applications
        if (!elections || elections.length === 0) {
            content += `
                <div class="empty-state">
                    <i class="fas fa-vote-yea"></i>
                    <h3>No Elections Available</h3>
                    <p>There are currently no elections accepting candidate applications.</p>
                </div>
            `;
        } else {
            content += `
                <div class="section-card">
                    <h3><i class="fas fa-plus-circle"></i> Apply for New Election</h3>
                    <div class="elections-grid">
            `;

            for (const election of elections) {
                const hasApplied = applications.some(app => app.election_id === election.election_id);
                
                content += `
                    <div class="election-card ${hasApplied ? 'applied' : ''}">
                        <div class="election-header">
                            <h4>${election.name}</h4>
                            <span class="election-type">${election.election_type}</span>
                        </div>
                        <div class="election-details">
                            <p><i class="fas fa-calendar"></i> ${new Date(election.election_date).toLocaleDateString()}</p>
                            <p class="election-description">${election.description || 'No description available'}</p>
                        </div>
                        <div class="election-actions">
                            ${hasApplied ? 
                                '<button class="btn btn-secondary" disabled><i class="fas fa-check"></i> Already Applied</button>' :
                                `<button class="btn btn-primary" onclick="showApplicationForm(${election.election_id}, '${election.name}')">
                                    <i class="fas fa-paper-plane"></i> Apply Now
                                </button>`
                            }
                        </div>
                    </div>
                `;
            }

            content += `
                    </div>
                </div>
            `;
        }

        voterContent.innerHTML = content;

    } catch (error) {
        console.error('Error showing candidate application:', error);
        const voterContent = document.getElementById('voterContent');
        if (voterContent) {
            voterContent.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-user-tie"></i> Apply as Candidate</h2>
                </div>
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Unexpected error: ${error.message}
                </div>
            `;
        }
    }
};

// Show application form
window.showApplicationForm = function(electionId, electionName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal candidate-application-modal">
            <div class="modal-header">
                <h2><i class="fas fa-user-tie"></i> Apply as Candidate</h2>
                <p>Election: ${electionName}</p>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="candidateApplicationForm">
                    <div class="form-group">
                        <label for="candidateFullName">Full Name *</label>
                        <input type="text" id="candidateFullName" value="${window.Auth.currentUser.full_name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="candidateSymbol">Election Symbol *</label>
                        <input type="text" id="candidateSymbol" placeholder="e.g., 🌱, ⭐, 🏛️" maxlength="5" required>
                        <small>Choose a unique symbol to represent you (emoji or text)</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="candidateParty">Party Affiliation</label>
                        <input type="text" id="candidateParty" placeholder="e.g., Independent, Green Party">
                    </div>
                    
                    <div class="form-group">
                        <label for="candidateBio">Biography *</label>
                        <textarea id="candidateBio" rows="4" placeholder="Tell voters about your background and experience..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="candidateManifesto">Election Manifesto *</label>
                        <textarea id="candidateManifesto" rows="5" placeholder="Describe your vision, goals, and what you plan to achieve if elected..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="candidatePhoto">Photo URL (Optional)</label>
                        <input type="url" id="candidatePhoto" placeholder="https://example.com/your-photo.jpg">
                        <small>Provide a URL to your candidate photo</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="submitCandidateApplication(${electionId})">
                    <i class="fas fa-paper-plane"></i> Submit Application
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

// Submit candidate application
window.submitCandidateApplication = async function(electionId) {
    try {
        const form = document.getElementById('candidateApplicationForm');
        const formData = new FormData(form);
        
        const fullName = document.getElementById('candidateFullName').value.trim();
        const symbol = document.getElementById('candidateSymbol').value.trim();
        const party = document.getElementById('candidateParty').value.trim();
        const bio = document.getElementById('candidateBio').value.trim();
        const manifesto = document.getElementById('candidateManifesto').value.trim();
        const photoUrl = document.getElementById('candidatePhoto').value.trim();
        
        // Validation
        if (!fullName || !symbol || !bio || !manifesto) {
            alert('Please fill in all required fields.');
            return;
        }
        
        if (symbol.length > 5) {
            alert('Symbol must be 5 characters or less.');
            return;
        }
        
        // Show loading
        const submitBtn = event.target;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
        
        // Check if symbol is already taken in this election
        const { data: existingSymbols, error: symbolError } = await supabase
            .from('candidate')
            .select('symbol')
            .eq('election_id', electionId)
            .eq('symbol', symbol);
            
        if (symbolError) {
            throw symbolError;
        }
        
        if (existingSymbols && existingSymbols.length > 0) {
            alert('This symbol is already taken by another candidate in this election. Please choose a different symbol.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // Submit application
        const { data, error } = await supabase
            .from('candidate')
            .insert({
                election_id: electionId,
                voter_id: window.Auth.currentUser.voter_id,
                full_name: fullName,
                symbol: symbol,
                party: party || null,
                bio: bio,
                manifesto: manifesto,
                photo_url: photoUrl || null,
                status: 'pending',
                application_date: new Date().toISOString()
            });
            
        if (error) {
            throw error;
        }
        
        // Success
        alert('Your candidate application has been submitted successfully! You will be notified when an admin reviews your application.');
        
        // Close modal and refresh
        document.querySelector('.modal-overlay').remove();
        if (window.Auth && window.Auth.showCandidateApplication) {
            window.Auth.showCandidateApplication();
        }
        
    } catch (error) {
        console.error('Error submitting application:', error);
        alert('Error submitting application: ' + error.message);
        
        // Reset button
        const submitBtn = event.target;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
        submitBtn.disabled = false;
    }
};

console.log('Voter functions patch loaded');
