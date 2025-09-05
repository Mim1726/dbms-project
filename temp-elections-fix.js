// Backup of original elections.js - lines 230-280 with hardcoded test date

    // Get election status with improved logic - TESTING VERSION
    getElectionStatus(election) {
        // HARDCODED DATE FOR TESTING - September 4, 2025
        const now = new Date('2025-09-04T12:00:00');
        
        console.log(`🗳️ Testing ${election.name} with date: ${now.toISOString()}`);
        
        // Check if election has a schedule first (most reliable)
        if (election.schedule && election.schedule.length > 0) {
            const schedule = election.schedule[0];
            const votingStart = schedule.voting_start ? new Date(schedule.voting_start) : null;
            const votingEnd = schedule.voting_end ? new Date(schedule.voting_end) : null;
            
            if (votingStart && votingEnd) {
                console.log(`   Voting: ${votingStart.toISOString()} to ${votingEnd.toISOString()}`);
                
                // Use schedule for status determination
                if (now > votingEnd) {
                    console.log(`   Result: Ended (past voting end)`);
                    return 'Ended';
                } else if (now >= votingStart && now <= votingEnd) {
                    console.log(`   Result: Active (within voting period)`);
                    return 'Active';
                } else if (now < votingStart) {
                    console.log(`   Result: Upcoming (before voting starts)`);
                    return 'Upcoming';
                }
            }
        }
        
        // Fallback to election_date comparison only if no schedule
        const electionDate = new Date(election.election_date);
        console.log(`   Fallback: election_date ${electionDate.toISOString()} >= now? ${electionDate >= now}`);
        
        // Always prefer future dates as upcoming when no schedule is available
        if (electionDate >= now) {
            console.log(`   Fallback Result: Upcoming`);
            return 'Upcoming';
        } else {
            // Past election - check how far in the past
            const daysDiff = (now - electionDate) / (1000 * 60 * 60 * 24);
            
            if (daysDiff > 1) {
                console.log(`   Fallback Result: Ended (${daysDiff.toFixed(1)} days past)`);
                return 'Ended';
            } else {
                // Election was today or yesterday - check if still active
                const status = election.is_active === 'Y' ? 'Active' : 'Ended';
                console.log(`   Fallback Result: ${status} (recent, is_active: ${election.is_active})`);
                return status;
            }
        }
    }
