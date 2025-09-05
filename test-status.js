// Simple test file to verify the status logic
console.log("=== ELECTION STATUS TEST ===");
console.log("Current browser time:", new Date().toISOString());

// Test with simulated data to match database
const testElections = [
    {
        name: "Women Leadership Poll",
        election_date: "2025-11-10",
        is_active: "Y",
        schedule: [{
            voting_start: "2025-11-05T08:00:00",
            voting_end: "2025-11-10T18:00:00"
        }]
    },
    {
        name: "City Council Election", 
        election_date: "2025-10-15",
        is_active: "Y",
        schedule: [{
            voting_start: "2025-10-10T08:00:00",
            voting_end: "2025-10-15T18:00:00"
        }]
    },
    {
        name: "Mayor Election",
        election_date: "2025-09-05", 
        is_active: "N",
        schedule: [{
            voting_start: "2025-09-01T08:00:00",
            voting_end: "2025-09-05T18:00:00"
        }]
    }
];

function getElectionStatus(election) {
    const now = new Date();
    
    console.log(`\n--- ${election.name} ---`);
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Election date: ${election.election_date}`);
    console.log(`Has schedule: ${election.schedule && election.schedule.length > 0}`);
    
    // Check if election has a schedule first (most reliable)
    if (election.schedule && election.schedule.length > 0) {
        const schedule = election.schedule[0];
        const votingStart = schedule.voting_start ? new Date(schedule.voting_start) : null;
        const votingEnd = schedule.voting_end ? new Date(schedule.voting_end) : null;
        
        console.log(`Voting start: ${votingStart ? votingStart.toISOString() : 'null'}`);
        console.log(`Voting end: ${votingEnd ? votingEnd.toISOString() : 'null'}`);
        
        if (votingStart && votingEnd) {
            console.log(`now > votingEnd? ${now > votingEnd}`);
            console.log(`now >= votingStart? ${now >= votingStart}`);
            console.log(`now <= votingEnd? ${now <= votingEnd}`);
            console.log(`now < votingStart? ${now < votingStart}`);
            
            // Use schedule for status determination
            if (now > votingEnd) {
                console.log(`STATUS: Ended (schedule-based)`);
                return 'Ended';
            } else if (now >= votingStart && now <= votingEnd) {
                console.log(`STATUS: Active (schedule-based)`);
                return 'Active';
            } else if (now < votingStart) {
                console.log(`STATUS: Upcoming (schedule-based)`);
                return 'Upcoming';
            }
        } else {
            console.log(`Incomplete schedule data, falling back...`);
        }
    } else {
        console.log(`No schedule data, using fallback...`);
    }
    
    // Fallback to election_date comparison only if no schedule
    const electionDate = new Date(election.election_date);
    console.log(`Election date parsed: ${electionDate.toISOString()}`);
    console.log(`electionDate >= now? ${electionDate >= now}`);
    
    // Always prefer future dates as upcoming when no schedule is available
    if (electionDate >= now) {
        console.log(`STATUS: Upcoming (fallback - future date)`);
        return 'Upcoming';
    } else {
        // Past election - check how far in the past
        const daysDiff = (now - electionDate) / (1000 * 60 * 60 * 24);
        console.log(`Days past election: ${daysDiff}`);
        
        if (daysDiff > 1) {
            console.log(`STATUS: Ended (fallback - >1 day past)`);
            return 'Ended';
        } else {
            // Election was today or yesterday - check if still active
            const status = election.is_active === 'Y' ? 'Active' : 'Ended';
            console.log(`STATUS: ${status} (fallback - recent, is_active: ${election.is_active})`);
            return status;
        }
    }
}

// Test all elections
testElections.forEach(election => {
    const status = getElectionStatus(election);
    console.log(`\n🗳️ FINAL: ${election.name} → ${status}\n`);
});

console.log("=== END TEST ===");
