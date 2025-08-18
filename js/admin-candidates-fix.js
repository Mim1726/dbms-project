    // Load candidates tab - FIXED VERSION
    async loadCandidatesTab(container) {
        try {
            Utils.showLoading();
            
            // Get all candidates first
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidate')
                .select('*')
                .order('candidate_id', { ascending: false });

            if (candidatesError) {
                console.error('Error loading candidates:', candidatesError);
                throw candidatesError;
            }

            // Get all contests
            let contests = [];
            const { data: contestsData, error: contestsError } = await supabase
                .from('contest')
                .select(`
                    candidate_id,
                    election_id,
                    position,
                    election(name, election_type)
                `);

            if (contestsError) {
                console.error('Error loading contests:', contestsError);
                contests = []; // Continue with empty contests
            } else {
                contests = contestsData || [];
            }

            // Create simple approval status
            const approvedCandidateIds = new Set(contests.map(c => c.candidate_id));
            
            const pendingCandidates = candidates.filter(candidate => !approvedCandidateIds.has(candidate.candidate_id));
            const approvedCandidates = candidates.filter(candidate => approvedCandidateIds.has(candidate.candidate_id));

            console.log('Debug - Total candidates:', candidates.length);
            console.log('Debug - Pending candidates:', pendingCandidates.length);
            console.log('Debug - Approved candidates:', approvedCandidates.length);
            console.log('Debug - Contests:', contests);

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
                    
                    <!-- Debug Info -->
                    <div style="background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; font-size: 12px;">
                        <strong>Debug:</strong> Total: ${candidates.length}, Pending: ${pendingCandidates.length}, Approved: ${approvedCandidates.length}, Contests: ${contests.length}
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
                            <h4>Approved Candidates</h4>
                            <p>Candidates who have been approved for elections</p>
                        </div>
                        
                        <div class="candidates-grid">
                            ${approvedCandidates.length > 0 ? 
                                approvedCandidates.map(candidate => {
                                    const candidateContest = contests.find(c => c.candidate_id === candidate.candidate_id);
                                    const electionName = candidateContest?.election?.name || 'Unknown Election';
                                    
                                    return `
                                        <div class="candidate-card approved">
                                            <div class="candidate-header">
                                                <h4>${Utils.sanitizeHtml(candidate.full_name)}</h4>
                                                <span class="status-badge status-active">
                                                    Approved
                                                </span>
                                            </div>
                                            
                                            <div class="candidate-details">
                                                <p><strong>Election:</strong> ${Utils.sanitizeHtml(electionName)}</p>
                                                <p><strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                                <p><strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}</p>
                                                <p><strong>Position:</strong> ${Utils.sanitizeHtml(candidateContest?.position || 'Candidate')}</p>
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
                                    `;
                                }).join('') 
                            : `
                                <div class="no-candidates">
                                    <i class="fas fa-user-tie" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                    <h4>No Approved Candidates</h4>
                                    <p>No candidates have been approved for any elections yet.</p>
                                </div>
                            `}
                        </div>
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
