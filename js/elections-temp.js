// This is a temporary file to test the elections display logic

// Test function for election categorization
function testElectionCategorization() {
    const elections = [
        {
            id: 1,
            name: "Student Council Election 2025",
            description: "Annual student council election",
            election_date: "2025-09-15",
            is_active: "Y",
            candidates: [{id: 1, name: "John Doe"}, {id: 2, name: "Jane Smith"}]
        },
        {
            id: 2,
            name: "Class Representative Election",
            description: "Class rep election for fall semester",
            election_date: "2025-10-01",
            is_active: "N",
            candidates: [{id: 3, name: "Bob Wilson"}]
        }
    ];

    // Categorize elections
    const ongoingElections = [];
    const upcomingElections = [];
    const endedElections = [];

    elections.forEach(election => {
        // Simple status check for testing
        if (election.is_active === 'Y') {
            ongoingElections.push(election);
        } else {
            const electionDate = new Date(election.election_date);
            const now = new Date();
            if (electionDate > now) {
                upcomingElections.push(election);
            } else {
                endedElections.push(election);
            }
        }
    });

    console.log('Ongoing Elections:', ongoingElections.length);
    console.log('Upcoming Elections:', upcomingElections.length);
    console.log('Ended Elections:', endedElections.length);
}

// Test the function
testElectionCategorization();
