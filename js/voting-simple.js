// SUPER SIMPLE VOTING SYSTEM - NO FANCY STUFF
console.log('🚀 Loading super simple voting system...');

// Simple global variables
let currentElectionId = null;
let selectedCandidateId = null;
let currentCandidates = [];

// Simple functions that work
function selectCandidate(candidateId) {
    console.log('🎯 Selected candidate:', candidateId);
    selectedCandidateId = candidateId;
    
    // Update radio button
    const radio = document.getElementById(`candidate_${candidateId}`);
    if (radio) radio.checked = true;
    
    // Enable submit button
    const submitBtn = document.getElementById('confirmVoteBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
    
    // Highlight selected card
    document.querySelectorAll('.voting-candidate').forEach(card => {
        card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`[data-candidate-id="${candidateId}"]`);
    if (selectedCard) selectedCard.classList.add('selected');
    
    console.log('✅ Candidate selected successfully');
}

function confirmVote() {
    console.log('🗳️ CONFIRM VOTE CALLED!');
    
    if (!selectedCandidateId) {
        alert('Please select a candidate first!');
        return;
    }
    
    // Simple confirmation
    const confirmed = confirm(`Are you sure you want to vote for the selected candidate?`);
    if (!confirmed) {
        console.log('❌ User cancelled vote');
        return;
    }
    
    console.log('✅ User confirmed vote, proceeding...');
    
    // Show loading
    const submitBtn = document.getElementById('confirmVoteBtn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
    }
    
    // Actually submit the vote
    submitVoteToDatabase();
}

async function submitVoteToDatabase() {
    try {
        console.log('💾 Submitting vote to database...');
        console.log('Election ID:', currentElectionId);
        console.log('Selected Candidate:', selectedCandidateId);
        
        // Get current user
        const currentUser = window.Auth?.getCurrentUser();
        if (!currentUser) {
            throw new Error('You must be logged in to vote');
        }
        
        console.log('👤 Current user:', currentUser.email);
        
        // Get voter record
        const { data: voterData, error: voterError } = await supabase
            .from('voter')
            .select('*')
            .eq('email', currentUser.email)
            .single();
            
        if (voterError || !voterData) {
            throw new Error('Voter record not found');
        }
        
        console.log('👥 Voter found:', voterData.voter_id);
        
        // Get contest for this election and candidate
        const { data: contestData, error: contestError } = await supabase
            .from('contest')
            .select('contest_id')
            .eq('election_id', currentElectionId)
            .eq('candidate_id', parseInt(selectedCandidateId))
            .single();
            
        if (contestError || !contestData) {
            throw new Error('Contest not found for this candidate');
        }
        
        console.log('🏆 Contest found:', contestData.contest_id);
        
        // Check if already voted
        const { data: existingVotes } = await supabase
            .from('vote')
            .select(`
                vote_id,
                contest!inner(election_id)
            `)
            .eq('voter_id', voterData.voter_id)
            .eq('contest.election_id', currentElectionId);
            
        if (existingVotes && existingVotes.length > 0) {
            throw new Error('You have already voted in this election');
        }
        
        console.log('✅ No existing votes found, proceeding...');
        
        // Cast the vote
        const { data: voteResult, error: voteError } = await supabase
            .from('vote')
            .insert([{
                contest_id: contestData.contest_id,
                voter_id: voterData.voter_id,
                vote_timestamp: new Date().toISOString()
            }])
            .select();
            
        if (voteError) {
            throw voteError;
        }
        
        console.log('🎉 Vote cast successfully!', voteResult);
        
        // Show success
        showVoteSuccess();
        
    } catch (error) {
        console.error('❌ Error casting vote:', error);
        alert('Error casting vote: ' + error.message);
        
        // Reset submit button
        const submitBtn = document.getElementById('confirmVoteBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Your Vote';
            submitBtn.disabled = false;
        }
    }
}

function showVoteSuccess() {
    const modal = document.getElementById('votingModal');
    const content = document.getElementById('votingContent');
    
    content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 60px; color: #28a745; margin-bottom: 20px;">
                ✅
            </div>
            <h2>Vote Cast Successfully!</h2>
            <p>Thank you for participating in the election.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                <p style="margin: 0; color: #666;">Your vote has been recorded securely and anonymously.</p>
            </div>
            <button onclick="closeVotingModal()" class="btn btn-primary" style="margin-top: 20px;">
                <i class="fas fa-check"></i> Done
            </button>
        </div>
    `;
}

function closeVotingModal() {
    const modal = document.getElementById('votingModal');
    if (modal) modal.style.display = 'none';
    
    // Reset everything
    currentElectionId = null;
    selectedCandidateId = null;
    currentCandidates = [];
    
    // Refresh page to show updated state
    location.reload();
}

// Simple voting interface creation
async function startSimpleVoting(electionId) {
    console.log('🚀 Starting simple voting for election:', electionId);
    currentElectionId = electionId;
    
    try {
        // Get election
        const { data: election, error: electionError } = await supabase
            .from('election')
            .select('*')
            .eq('election_id', electionId)
            .single();
            
        if (electionError) throw electionError;
        
        // Get candidates
        const { data: contests, error: contestsError } = await supabase
            .from('contest')
            .select(`
                candidate_id,
                candidate:candidate_id (
                    candidate_id,
                    full_name,
                    party,
                    photo_url
                )
            `)
            .eq('election_id', parseInt(electionId));
            
        if (contestsError) throw contestsError;
        
        currentCandidates = contests
            .filter(contest => contest.candidate)
            .map(contest => contest.candidate);
            
        // Show voting interface
        showSimpleVotingInterface(election);
        
    } catch (error) {
        console.error('Error starting voting:', error);
        alert('Error loading voting interface: ' + error.message);
    }
}

function showSimpleVotingInterface(election) {
    const modal = document.getElementById('votingModal');
    const content = document.getElementById('votingContent');
    
    content.innerHTML = `
        <div class="voting-interface">
            <h2>${election.name}</h2>
            <p>Select one candidate to vote for:</p>
            
            <div class="voting-candidates">
                ${currentCandidates.map(candidate => `
                    <div class="voting-candidate" data-candidate-id="${candidate.candidate_id}">
                        <input type="radio" 
                               name="selectedCandidate" 
                               value="${candidate.candidate_id}" 
                               id="candidate_${candidate.candidate_id}"
                               onchange="selectCandidate('${candidate.candidate_id}')">
                        <label for="candidate_${candidate.candidate_id}" class="candidate-card-voting">
                            <div class="candidate-info">
                                <h3>${candidate.full_name}</h3>
                                <p>${candidate.party || 'Independent'}</p>
                            </div>
                        </label>
                    </div>
                `).join('')}
            </div>
            
            <div class="voting-actions">
                <button onclick="closeVotingModal()" class="btn btn-outline">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button id="confirmVoteBtn" 
                        onclick="confirmVote()" 
                        class="btn btn-primary" 
                        disabled>
                    <i class="fas fa-paper-plane"></i> Submit Your Vote
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    console.log('✅ Simple voting interface displayed');
}

// Make functions globally available
window.selectCandidate = selectCandidate;
window.confirmVote = confirmVote;
window.closeVotingModal = closeVotingModal;
window.startSimpleVoting = startSimpleVoting;

console.log('✅ Simple voting system loaded successfully');