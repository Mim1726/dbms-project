// Admin Module - Complete Implementation
class Admin {
    constructor() {
        this.currentTab = 'elections';
        this.init();
    }

    // Initialize admin module
    init() {
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Admin tab switching is handled by the global showAdminTab function
    }

    // Load admin dashboard
    async loadDashboard() {
        this.showTab('elections');
        await this.loadAdminStats();
    }

    // Show specific admin tab
    async showTab(tabName) {
        console.log('Admin showTab called with:', tabName);
        this.currentTab = tabName;
        
        const container = document.querySelector('#adminTabContent');
        if (!container) {
            console.error('Admin tab container not found');
            return;
        }

        // Update active tab styling
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.toLowerCase().includes(tabName)) {
                tab.classList.add('active');
            }
        });

        // Load the appropriate tab content
        try {
            switch (tabName) {
                case 'elections':
                    await this.loadElectionsTab(container);
                    break;
                case 'candidates':
                    await this.loadCandidatesTab(container);
                    break;
                case 'voters':
                    await this.loadVotersTab(container);
                    break;
                case 'results':
                    await this.loadResultsTab(container);
                    break;
                default:
                    container.innerHTML = '<div class="admin-section"><h3>Tab not found</h3></div>';
            }
        } catch (error) {
            console.error(`Error loading ${tabName} tab:`, error);
            container.innerHTML = `
                <div class="admin-section">
                    <h3>Error Loading ${tabName}</h3>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load ${tabName}: ${error.message}</p>
                        <button class="btn btn-primary" onclick="window.Admin.showTab('${tabName}')">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Load admin statistics
    async loadAdminStats() {
        try {
            const [electionsRes, candidatesRes, votersRes] = await Promise.all([
                supabase.from('election').select('*', { count: 'exact' }),
                supabase.from('candidate').select('*', { count: 'exact' }),
                supabase.from('voter').select('*', { count: 'exact' })
            ]);

            console.log('Admin stats loaded:', {
                elections: electionsRes.count,
                candidates: candidatesRes.count,
                voters: votersRes.count
            });
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    // Load elections tab
    async loadElectionsTab(container) {
        try {
            Utils.showLoading();
            
            // Get all elections
            const { data: elections, error } = await supabase
                .from('election')
                .select('*')
                .order('election_date', { ascending: false });

            if (error) throw error;

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Elections Management</h3>
                        <button class="btn btn-primary" onclick="window.Admin.showCreateElectionForm()">
                            <i class="fas fa-plus"></i> Create New Election
                        </button>
                    </div>
                    
                    <div class="admin-table-container">
                        ${elections && elections.length > 0 ? `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${elections.map(election => {
                                        const electionDate = new Date(election.election_date);
                                        const currentDate = new Date();
                                        const hasEnded = electionDate < currentDate;
                                        const isToday = electionDate.toDateString() === currentDate.toDateString();
                                        
                                        // Determine election status
                                        let statusText = 'Upcoming';
                                        let statusClass = 'status-warning';
                                        
                                        if (hasEnded) {
                                            statusText = 'Ended';
                                            statusClass = 'status-inactive';
                                        } else if (isToday) {
                                            statusText = 'Ongoing';
                                            statusClass = 'status-active';
                                        }
                                        
                                        return `
                                            <tr>
                                                <td>${Utils.sanitizeHtml(election.name)}</td>
                                                <td>${Utils.sanitizeHtml(election.election_type)}</td>
                                                <td>${Utils.formatDate(election.election_date)}</td>
                                                <td>
                                                    <span class="status-badge ${statusClass}">
                                                        ${statusText}
                                                    </span>
                                                </td>
                                                <td class="action-buttons">
                                                    <button class="btn btn-small btn-outline" onclick="window.Admin.editElection('${election.election_id}')" title="Edit">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn btn-small btn-danger" onclick="window.Admin.deleteElection('${election.election_id}')" title="Delete">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="no-elections">
                                <i class="fas fa-ballot-check" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Elections Found</h4>
                                <p>Create your first election to get started.</p>
                                <button class="btn btn-primary" onclick="window.Admin.showCreateElectionForm()">
                                    <i class="fas fa-plus"></i> Create Election
                                </button>
                            </div>
                        `}
                    </div>

                    <!-- Create Election Form (Hidden by default) -->
                    <div id="createElectionForm" style="display: none;">
                        <div class="form-container">
                            <h4>Create New Election</h4>
                            <form id="electionForm">
                                <div class="form-group">
                                    <label for="electionName">Election Name *</label>
                                    <input type="text" id="electionName" name="name" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="electionType">Election Type *</label>
                                    <select id="electionType" name="election_type" required>
                                        <option value="">Select Type</option>
                                        <option value="General">General Election</option>
                                        <option value="Local">Local Election</option>
                                        <option value="Special">Special Election</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="electionDate">Election Date *</label>
                                    <input type="date" id="electionDate" name="election_date" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="electionDescription">Description</label>
                                    <textarea id="electionDescription" name="description" rows="3"></textarea>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Create Election</button>
                                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('createElectionForm').style.display='none'">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading elections:', error);
            container.innerHTML = `
                <div class="admin-section">
                    <h3>Elections Management</h3>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading elections: ${error.message}</p>
                        <button class="btn btn-primary" onclick="window.Admin.loadElectionsTab(this.closest('.admin-section').parentElement)">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            Utils.hideLoading();
        }
    }

    // Show create election form
    showCreateElectionForm() {
        this.showCreateElectionModal();
    }

    // Show modal popup for creating election
    showCreateElectionModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="createElectionModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-plus-circle"></i> Create New Election</h2>
                        <span class="close" onclick="window.Admin.closeCreateElectionModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="createElectionModalForm">
                            <div class="form-group">
                                <label for="modalElectionName">Election Name *</label>
                                <input type="text" id="modalElectionName" name="name" required 
                                       placeholder="e.g., Student Council Election 2025">
                            </div>

                            <div class="form-group">
                                <label for="modalElectionType">Election Type *</label>
                                <select id="modalElectionType" name="election_type" required>
                                    <option value="">Select Election Type</option>
                                    <option value="General">General Election</option>
                                    <option value="Local">Local Election</option>
                                    <option value="University">University Election</option>
                                    <option value="Special">Special Election</option>
                                    <option value="Primary">Primary Election</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="modalDescription">Description</label>
                                <textarea id="modalDescription" name="description" 
                                         placeholder="Provide details about this election..."></textarea>
                            </div>

                            <div class="datetime-container">
                                <div class="datetime-group">
                                    <div class="datetime-item">
                                        <h4><i class="fas fa-calendar-plus"></i> Voting Start</h4>
                                        <div class="form-group">
                                            <label for="modalStartDate">Start Date *</label>
                                            <input type="date" id="modalStartDate" name="start_date" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="modalStartTime">Start Time *</label>
                                            <input type="time" id="modalStartTime" name="start_time" required>
                                        </div>
                                    </div>

                                    <div class="datetime-item">
                                        <h4><i class="fas fa-calendar-times"></i> Voting End</h4>
                                        <div class="form-group">
                                            <label for="modalEndDate">End Date *</label>
                                            <input type="date" id="modalEndDate" name="end_date" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="modalEndTime">End Time *</label>
                                            <input type="time" id="modalEndTime" name="end_time" required>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Create Election
                                </button>
                                <button type="button" class="btn btn-secondary" onclick="window.Admin.closeCreateElectionModal()">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('createElectionModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Set up form validation and defaults
        this.setupModalFormDefaults();

        // Handle form submission
        document.getElementById('createElectionModalForm').onsubmit = (e) => this.handleCreateElectionModal(e);
    }

    // Set up modal form defaults and validation
    setupModalFormDefaults() {
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('modalStartDate').min = today;
        document.getElementById('modalEndDate').min = today;
        
        // Set default start time to current time
        const now = new Date();
        const timeString = now.toTimeString().slice(0, 5);
        document.getElementById('modalStartTime').value = timeString;
        
        // Set default end time to 2 hours later
        now.setHours(now.getHours() + 2);
        const endTimeString = now.toTimeString().slice(0, 5);
        document.getElementById('modalEndTime').value = endTimeString;

        // Update end date minimum when start date changes
        document.getElementById('modalStartDate').addEventListener('change', function() {
            document.getElementById('modalEndDate').min = this.value;
            
            // If end date is before start date, update it
            if (document.getElementById('modalEndDate').value < this.value) {
                document.getElementById('modalEndDate').value = this.value;
            }
        });
    }

    // Close modal
    closeCreateElectionModal() {
        const modal = document.getElementById('createElectionModal');
        if (modal) {
            modal.remove();
        }
    }

    // Handle modal form submission
    async handleCreateElectionModal(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const electionData = Object.fromEntries(formData);
            
            // Validate required fields
            if (!electionData.name || !electionData.election_type || !electionData.start_date || !electionData.start_time || !electionData.end_date || !electionData.end_time) {
                this.showModalAlert('Please fill in all required fields.', 'error');
                return;
            }
            
            // Validate dates
            const startDateTime = new Date(`${electionData.start_date}T${electionData.start_time}`);
            const endDateTime = new Date(`${electionData.end_date}T${electionData.end_time}`);
            
            if (endDateTime <= startDateTime) {
                this.showModalAlert('End date and time must be after start date and time.', 'error');
                return;
            }
            
            if (startDateTime < new Date()) {
                this.showModalAlert('Start date and time cannot be in the past.', 'error');
                return;
            }

            // Show loading state
            this.showModalAlert('Creating election...', 'loading');
            
            // Check if election name already exists
            const { data: existingElection, error: checkError } = await supabase
                .from('election')
                .select('election_id, name')
                .eq('name', electionData.name)
                .single();
            
            if (existingElection) {
                this.showModalAlert(`Election with name "${electionData.name}" already exists. Please choose a different name.`, 'error');
                return;
            }
            
            // Create election
            const { data, error } = await supabase
                .from('election')
                .insert([{
                    name: electionData.name,
                    election_type: electionData.election_type,
                    election_date: electionData.end_date, // Using end date as main election date
                    description: electionData.description || null,
                    is_active: 'Y',
                    admin_id: window.Auth?.currentUser?.admin_id || 1
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // PostgreSQL unique constraint violation
                    this.showModalAlert(`Election with name "${electionData.name}" already exists. Please choose a different name.`, 'error');
                } else {
                    this.showModalAlert(`Error creating election: ${error.message}`, 'error');
                }
                return;
            }

            // Create schedule entry with proper timezone handling
            // Store the datetime strings directly to preserve the local timezone
            const { error: scheduleError } = await supabase
                .from('schedule')
                .insert([{
                    election_id: data.election_id,
                    voting_start: `${electionData.start_date}T${electionData.start_time}:00`,
                    voting_end: `${electionData.end_date}T${electionData.end_time}:00`
                }]);

            if (scheduleError) {
                console.warn('Schedule creation warning:', scheduleError);
            }

            // Show success message
            this.showModalAlert(`🎉 Election "${electionData.name}" created successfully! Election ID: ${data.election_id}`, 'success');
            
            // Close modal after 2 seconds and refresh elections
            setTimeout(() => {
                this.closeCreateElectionModal();
                this.loadElections();
            }, 2000);

        } catch (error) {
            console.error('Error creating election:', error);
            this.showModalAlert(`❌ Unexpected error: ${error.message}`, 'error');
        }
    }

    // Show alert message in modal
    showModalAlert(message, type) {
        // Remove existing alert
        const existingAlert = document.getElementById('modalAlert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create alert element
        const alertClass = type === 'error' ? 'alert-error' : 
                          type === 'success' ? 'alert-success' : 
                          type === 'loading' ? 'alert-loading' : 'alert-info';
        
        const icon = type === 'error' ? '❌' : 
                    type === 'success' ? '✅' : 
                    type === 'loading' ? '⏳' : 'ℹ️';

        const alertHTML = `
            <div id="modalAlert" class="modal-alert ${alertClass}" style="
                padding: 15px;
                margin: 15px 0;
                border-radius: 8px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
                ${type === 'error' ? 'background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;' : ''}
                ${type === 'success' ? 'background: #d4edda; border: 1px solid #c3e6cb; color: #155724;' : ''}
                ${type === 'loading' ? 'background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460;' : ''}
            ">
                <span style="font-size: 1.2rem;">${icon}</span>
                <span>${message}</span>
            </div>
        `;

        // Insert alert at the top of modal body
        const modalBody = document.querySelector('#createElectionModal .modal-body');
        if (modalBody) {
            modalBody.insertAdjacentHTML('afterbegin', alertHTML);
            
            // Scroll to top to show the alert
            modalBody.scrollTop = 0;
        }

        // Auto-remove loading alerts after 10 seconds
        if (type === 'loading') {
            setTimeout(() => {
                const alert = document.getElementById('modalAlert');
                if (alert && alert.classList.contains('alert-loading')) {
                    alert.remove();
                }
            }, 10000);
        }
    }

    // Handle create election form submission
    async handleCreateElection(event) {
        event.preventDefault();
        
        try {
            Utils.showLoading();
            
            const formData = new FormData(event.target);
            const electionData = {
                name: formData.get('name'),
                election_type: formData.get('election_type'),
                election_date: formData.get('election_date'),
                description: formData.get('description') || null,
                is_active: 'Y',
                admin_id: window.currentUser?.id || 1
            };

            const { data, error } = await supabase
                .from('election')
                .insert([electionData])
                .select();

            if (error) throw error;

            Utils.showToast('Election created successfully!', 'success');
            
            // Hide form and reload elections
            document.getElementById('createElectionForm').style.display = 'none';
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadElectionsTab(container);
            }
            
        } catch (error) {
            console.error('Error creating election:', error);
            Utils.showToast('Failed to create election: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Edit election (placeholder)
    async editElection(electionId) {
        try {
            Utils.showLoading();

            // Get election details
            const { data: election, error: electionError } = await supabase
                .from('election')
                .select(`
                    *,
                    schedule (
                        voting_start,
                        voting_end,
                        nomination_start,
                        nomination_end
                    )
                `)
                .eq('election_id', electionId)
                .single();

            if (electionError) throw electionError;

            const schedule = election.schedule?.[0];

            // Create edit modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay edit-election-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(1px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                padding: 20px;
                box-sizing: border-box;
                animation: fadeIn 0.2s ease-out;
            `;

            modal.innerHTML = `
                <div class="edit-election-content" style="
                    background: white;
                    border-radius: 16px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    position: relative;
                    margin: auto;
                    animation: modalSlideIn 0.3s ease-out;
                ">
                    <div class="modal-header" style="
                        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                        color: white;
                        padding: 24px;
                        border-radius: 16px 16px 0 0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">
                                <i class="fas fa-edit"></i> Edit Election
                            </h2>
                            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">
                                Update election schedule and settings
                            </p>
                        </div>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 24px;
                            cursor: pointer;
                            padding: 8px;
                            border-radius: 4px;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body" style="padding: 24px;">
                        <form id="editElectionForm">
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                    Election Name
                                </label>
                                <input type="text" name="name" value="${election.name}" style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                " required>
                            </div>

                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                    Election Type
                                </label>
                                <select name="election_type" style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                " required>
                                    <option value="General" ${election.election_type === 'General' ? 'selected' : ''}>General</option>
                                    <option value="Local" ${election.election_type === 'Local' ? 'selected' : ''}>Local</option>
                                    <option value="Special" ${election.election_type === 'Special' ? 'selected' : ''}>Special</option>
                                    <option value="Primary" ${election.election_type === 'Primary' ? 'selected' : ''}>Primary</option>
                                </select>
                            </div>

                            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                                <div class="form-group">
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                        Voting Start Date
                                    </label>
                                    <input type="datetime-local" name="voting_start" 
                                        value="${schedule?.voting_start ? new Date(schedule.voting_start).toISOString().slice(0, 16) : ''}" 
                                        style="
                                            width: 100%;
                                            padding: 12px;
                                            border: 1px solid #d1d5db;
                                            border-radius: 8px;
                                            font-size: 16px;
                                            box-sizing: border-box;
                                        " required>
                                </div>
                                <div class="form-group">
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                        Voting End Date
                                    </label>
                                    <input type="datetime-local" name="voting_end" 
                                        value="${schedule?.voting_end ? new Date(schedule.voting_end).toISOString().slice(0, 16) : ''}" 
                                        style="
                                            width: 100%;
                                            padding: 12px;
                                            border: 1px solid #d1d5db;
                                            border-radius: 8px;
                                            font-size: 16px;
                                            box-sizing: border-box;
                                        " required>
                                </div>
                            </div>

                            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                                <div class="form-group">
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                        Nomination Start Date
                                    </label>
                                    <input type="datetime-local" name="nomination_start" 
                                        value="${schedule?.nomination_start ? new Date(schedule.nomination_start).toISOString().slice(0, 16) : ''}" 
                                        style="
                                            width: 100%;
                                            padding: 12px;
                                            border: 1px solid #d1d5db;
                                            border-radius: 8px;
                                            font-size: 16px;
                                            box-sizing: border-box;
                                        ">
                                </div>
                                <div class="form-group">
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                        Nomination End Date
                                    </label>
                                    <input type="datetime-local" name="nomination_end" 
                                        value="${schedule?.nomination_end ? new Date(schedule.nomination_end).toISOString().slice(0, 16) : ''}" 
                                        style="
                                            width: 100%;
                                            padding: 12px;
                                            border: 1px solid #d1d5db;
                                            border-radius: 8px;
                                            font-size: 16px;
                                            box-sizing: border-box;
                                        ">
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                    Description
                                </label>
                                <textarea name="description" rows="3" style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                    resize: vertical;
                                ">${election.description || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    
                    <div class="modal-footer" style="
                        padding: 20px 24px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        background: #f8fafc;
                        border-radius: 0 0 16px 16px;
                    ">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                        ">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="btn btn-primary" onclick="window.Admin.saveElectionChanges('${electionId}')" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                        ">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add backdrop click to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

        } catch (error) {
            console.error('Error loading election for editing:', error);
            Utils.showToast('Error loading election for editing: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Save election changes
    async saveElectionChanges(electionId) {
        try {
            Utils.showLoading();

            const form = document.getElementById('editElectionForm');
            const formData = new FormData(form);
            
            // Validate form data
            const name = formData.get('name').trim();
            const electionType = formData.get('election_type');
            const votingStart = formData.get('voting_start');
            const votingEnd = formData.get('voting_end');

            if (!name || !electionType || !votingStart || !votingEnd) {
                Utils.showToast('Please fill in all required fields', 'error');
                return;
            }

            // Validate dates
            const startDate = new Date(votingStart);
            const endDate = new Date(votingEnd);
            const now = new Date();

            if (startDate >= endDate) {
                Utils.showToast('End date must be after start date', 'error');
                return;
            }

            if (startDate <= now) {
                Utils.showToast('Start date must be in the future', 'error');
                return;
            }

            // Update election basic info
            const { error: electionError } = await supabase
                .from('election')
                .update({
                    name: name,
                    election_type: electionType,
                    description: formData.get('description') || null,
                    election_date: votingStart
                })
                .eq('election_id', electionId);

            if (electionError) throw electionError;

            // Update or create schedule
            const scheduleData = {
                election_id: electionId,
                voting_start: votingStart,
                voting_end: votingEnd,
                nomination_start: formData.get('nomination_start') || null,
                nomination_end: formData.get('nomination_end') || null
            };

            // First try to update existing schedule
            const { data: existingSchedule } = await supabase
                .from('schedule')
                .select('schedule_id')
                .eq('election_id', electionId)
                .single();

            if (existingSchedule) {
                // Update existing schedule
                const { error: scheduleError } = await supabase
                    .from('schedule')
                    .update(scheduleData)
                    .eq('election_id', electionId);

                if (scheduleError) throw scheduleError;
            } else {
                // Create new schedule
                const { error: scheduleError } = await supabase
                    .from('schedule')
                    .insert(scheduleData);

                if (scheduleError) throw scheduleError;
            }

            Utils.showToast('Election updated successfully!', 'success');
            
            // Close modal and refresh results
            document.querySelector('.edit-election-modal').remove();
            await this.loadResultsTab(document.getElementById('resultsContent'));

        } catch (error) {
            console.error('Error saving election changes:', error);
            Utils.showToast('Error saving election changes: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Publish Results - Calculate and publish election results
    async publishResults(electionId) {
        try {
            // First get election details
            const { data: election, error: electionError } = await supabase
                .from('election')
                .select('*')
                .eq('election_id', electionId)
                .single();

            if (electionError) throw electionError;

            // Check if election has ended
            const electionDate = new Date(election.election_date);
            const currentDate = new Date();
            const hasEnded = electionDate < currentDate;

            if (!hasEnded) {
                Utils.showToast('Results can only be published after the election has ended.', 'warning');
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to publish results for "${election.name}"?\n\nThis will:\n- Calculate vote counts for all candidates\n- Update the results table\n- Make results visible to voters\n\nThis action cannot be undone.`);
            
            if (!confirmed) return;

            Utils.showLoading();

            // Get all contests for this election
            const { data: contests, error: contestError } = await supabase
                .from('contest')
                .select(`
                    *,
                    candidate(full_name, party, symbol)
                `)
                .eq('election_id', electionId);

            if (contestError) throw contestError;

            if (!contests || contests.length === 0) {
                Utils.showToast('No candidates found for this election.', 'warning');
                return;
            }

            // Calculate results for each candidate
            const results = [];
            let totalVotes = 0;

            for (const contest of contests) {
                // Count votes for this candidate
                const { data: votes, error: voteError } = await supabase
                    .from('vote')
                    .select('vote_id')
                    .eq('contest_id', contest.contest_id);

                if (voteError) {
                    console.error('Error counting votes for contest:', contest.contest_id, voteError);
                    continue;
                }

                const voteCount = votes ? votes.length : 0;
                totalVotes += voteCount;

                results.push({
                    election_id: electionId,
                    candidate_id: contest.candidate_id,
                    total_votes: voteCount,
                    candidate_name: contest.candidate.full_name,
                    party: contest.candidate.party
                });
            }

            // Calculate percentages
            results.forEach(result => {
                result.percentage = totalVotes > 0 ? (result.total_votes / totalVotes) * 100 : 0;
            });

            // Clear existing results for this election
            await supabase
                .from('result')
                .delete()
                .eq('election_id', electionId);

            // Insert new results
            const { error: insertError } = await supabase
                .from('result')
                .insert(results);

            if (insertError) throw insertError;

            // Show results summary
            const winner = results.reduce((prev, current) => 
                (prev.total_votes > current.total_votes) ? prev : current
            );

            const resultSummary = `
                <div class="result-summary-modal">
                    <div class="modal-content">
                        <h3>📊 Results Published Successfully!</h3>
                        <div class="election-info">
                            <h4>${election.name}</h4>
                            <p>Total Votes Cast: <strong>${totalVotes}</strong></p>
                        </div>
                        
                        <div class="winner-announcement">
                            ${totalVotes > 0 ? `
                                <h4>🏆 Winner: ${winner.candidate_name}</h4>
                                <p>${winner.party || 'Independent'} - ${winner.total_votes} votes (${winner.percentage.toFixed(1)}%)</p>
                            ` : `
                                <h4>No votes were cast in this election</h4>
                            `}
                        </div>
                        
                        <div class="all-results">
                            <h5>Complete Results:</h5>
                            <table class="results-table">
                                <thead>
                                    <tr>
                                        <th>Candidate</th>
                                        <th>Party</th>
                                        <th>Votes</th>
                                        <th>Percentage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${results.sort((a, b) => b.total_votes - a.total_votes).map(result => `
                                        <tr>
                                            <td>${result.candidate_name}</td>
                                            <td>${result.party || 'Independent'}</td>
                                            <td>${result.total_votes}</td>
                                            <td>${result.percentage.toFixed(1)}%</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="this.closest('.result-summary-modal').remove(); window.Admin.loadElectionsTab(document.querySelector('#adminTabContent'));">
                                Close
                            </button>
                            <button class="btn btn-outline" onclick="window.Admin.showTab('results')">
                                View Results Tab
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', resultSummary);

            Utils.showToast('Election results published successfully!', 'success');

        } catch (error) {
            console.error('Error publishing results:', error);
            Utils.showToast('Failed to publish results: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Declare Winner - Officially declare the winner of an election
    async declareWinner(electionId) {
        try {
            // Get election details
            const { data: election, error: electionError } = await supabase
                .from('election')
                .select('*')
                .eq('election_id', electionId)
                .single();

            if (electionError) throw electionError;

            // Check if winner already declared (try both methods)
            let winnerAlreadyDeclared = false;
            try {
                const { data: winnerCheck } = await supabase
                    .from('election')
                    .select('winner_declared')
                    .eq('election_id', electionId)
                    .single();
                
                if (winnerCheck?.winner_declared === 'Y') {
                    winnerAlreadyDeclared = true;
                }
            } catch (error) {
                // Column doesn't exist, proceed with declaration
                console.log('Winner declaration column not available, proceeding...');
            }

            if (winnerAlreadyDeclared) {
                Utils.showToast('Winner has already been declared for this election.', 'warning');
                return;
            }

            // Get current results to find the winner
            const { data: results, error: resultsError } = await supabase
                .from('result')
                .select(`
                    *,
                    candidate(
                        full_name,
                        party,
                        symbol
                    )
                `)
                .eq('election_id', electionId)
                .order('total_votes', { ascending: false });

            if (resultsError) throw resultsError;

            if (!results || results.length === 0) {
                Utils.showToast('No results available for this election. Please update results first.', 'warning');
                return;
            }

            const winner = results[0];
            const totalVotes = results.reduce((sum, result) => sum + (result.total_votes || 0), 0);

            // Check for tie
            const topCandidates = results.filter(r => r.total_votes === winner.total_votes);
            if (topCandidates.length > 1) {
                const tieMessage = `There is a tie between ${topCandidates.length} candidates with ${winner.total_votes} votes each:\n\n${topCandidates.map(c => `• ${c.candidate.full_name} (${c.candidate.party || 'Independent'})`).join('\n')}\n\nPlease resolve the tie before declaring a winner.`;
                alert(tieMessage);
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`🏆 DECLARE WINNER\n\nElection: ${election.name}\nWinner: ${winner.candidate.full_name}\nParty: ${winner.candidate.party || 'Independent'}\nVotes: ${winner.total_votes} (${winner.percentage ? winner.percentage.toFixed(1) : '0.0'}%)\nTotal Votes Cast: ${totalVotes}\n\nAre you sure you want to officially declare this candidate as the winner?\n\nThis will make the results visible to all voters.`);
            
            if (!confirmed) return;

            Utils.showLoading();

            // Try to update election table with winner information (if columns exist)
            try {
                const { error: updateError } = await supabase
                    .from('election')
                    .update({
                        winner_declared: 'Y',
                        winner_candidate_id: winner.candidate_id,
                        winner_declared_at: new Date().toISOString()
                    })
                    .eq('election_id', electionId);

                if (updateError) {
                    console.log('Winner declaration columns not available, using alternative method');
                    // If columns don't exist, just mark election as completed
                    await supabase
                        .from('election')
                        .update({ is_active: 'N' })
                        .eq('election_id', electionId);
                }
            } catch (error) {
                console.log('Using alternative winner declaration method');
                // Fallback: just mark election as inactive
                await supabase
                    .from('election')
                    .update({ is_active: 'N' })
                    .eq('election_id', electionId);
            }

            // Create audit log entry
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                await supabase
                    .from('audit_log')
                    .insert([{
                        admin_id: currentUser.admin_id || null,
                        action: 'DECLARE_WINNER',
                        description: `Declared winner for election "${election.name}": ${winner.candidate.full_name} with ${winner.total_votes} votes`,
                        action_time: new Date().toISOString()
                    }]);
            } catch (error) {
                console.log('Audit log not available:', error);
            }

            // Show winner announcement
            const winnerAnnouncement = `
                <div class="winner-announcement-modal" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 20px;
                    box-sizing: border-box;
                ">
                    <div class="modal-content" style="
                        background: white;
                        border-radius: 16px;
                        max-width: 600px;
                        width: 100%;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 25px 75px rgba(0, 0, 0, 0.3);
                        text-align: center;
                        padding: 40px;
                    ">
                        <div class="winner-header">
                            <i class="fas fa-trophy" style="font-size: 48px; color: #ffd700; margin-bottom: 20px;"></i>
                            <h2 style="color: #2d3748; margin: 0 0 30px 0;">🎉 WINNER DECLARED!</h2>
                        </div>
                        
                        <div class="election-info" style="margin-bottom: 30px;">
                            <h3 style="color: #4a5568; margin: 0 0 10px 0;">${election.name}</h3>
                            <p style="color: #718096; margin: 5px 0;">${election.election_type}</p>
                            <p style="color: #718096; margin: 5px 0;">${Utils.formatDate(election.election_date)}</p>
                        </div>
                        
                        <div class="winner-details" style="margin-bottom: 30px;">
                            <div class="winner-card" style="
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                padding: 30px;
                                border-radius: 12px;
                                margin-bottom: 20px;
                            ">
                                <h3 style="margin: 0 0 10px 0; font-size: 24px;">🏆 ${winner.candidate.full_name}</h3>
                                <p style="margin: 0 0 10px 0; opacity: 0.9;">${winner.candidate.party || 'Independent'}</p>
                                ${winner.candidate.symbol ? `<p style="margin: 0 0 20px 0; opacity: 0.8;">Symbol: ${winner.candidate.symbol}</p>` : ''}
                                <div class="vote-stats" style="display: flex; justify-content: space-around; gap: 20px;">
                                    <div class="stat">
                                        <div style="font-size: 24px; font-weight: bold;">${winner.total_votes}</div>
                                        <div style="font-size: 12px; opacity: 0.8;">Votes Received</div>
                                    </div>
                                    <div class="stat">
                                        <div style="font-size: 24px; font-weight: bold;">${winner.percentage ? winner.percentage.toFixed(1) : '0.0'}%</div>
                                        <div style="font-size: 12px; opacity: 0.8;">Vote Share</div>
                                    </div>
                                    <div class="stat">
                                        <div style="font-size: 24px; font-weight: bold;">${totalVotes}</div>
                                        <div style="font-size: 12px; opacity: 0.8;">Total Votes Cast</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="other-results">
                            <h4 style="color: #4a5568; margin-bottom: 15px;">Final Results</h4>
                            <div class="results-list" style="text-align: left;">
                                ${results.map((result, index) => `
                                    <div style="
                                        display: flex;
                                        align-items: center;
                                        padding: 10px;
                                        margin: 5px 0;
                                        background: ${index === 0 ? '#f0fff4' : '#f7fafc'};
                                        border-radius: 6px;
                                        border-left: 4px solid ${index === 0 ? '#38a169' : '#e2e8f0'};
                                    ">
                                        <span style="font-weight: bold; margin-right: 10px; color: #4a5568;">${index + 1}.</span>
                                        <span style="flex: 1; font-weight: ${index === 0 ? 'bold' : 'normal'}; color: #2d3748;">${result.candidate.full_name}</span>
                                        <span style="margin: 0 10px; color: #718096;">(${result.candidate.party || 'Independent'})</span>
                                        <span style="margin: 0 10px; font-weight: bold; color: #4a5568;">${result.total_votes} votes</span>
                                        <span style="color: #718096;">${result.percentage ? result.percentage.toFixed(1) : '0.0'}%</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="modal-actions" style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                            <button class="btn btn-primary" onclick="this.closest('.winner-announcement-modal').remove(); window.Admin.showTab('results');" style="
                                background: #4299e1;
                                color: white;
                                border: none;
                                padding: 12px 24px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                <i class="fas fa-chart-bar"></i> View Results
                            </button>
                            <button class="btn btn-outline" onclick="this.closest('.winner-announcement-modal').remove();" style="
                                background: #edf2f7;
                                color: #4a5568;
                                border: 1px solid #e2e8f0;
                                padding: 12px 24px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', winnerAnnouncement);

            Utils.showToast(`Winner declared: ${winner.candidate.full_name}!`, 'success');

            // Refresh the results tab
            const currentContainer = document.querySelector('#adminTabContent');
            if (currentContainer) {
                this.loadResultsTab(currentContainer);
            }

        } catch (error) {
            console.error('Error declaring winner:', error);
            Utils.showToast('Failed to declare winner: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Publish All Results - Bulk publish results for all elections
    async publishAllResults() {
        try {
            const confirmed = confirm('Are you sure you want to publish results for ALL elections?\n\nThis will calculate and update results for every election in the system.\n\nThis action cannot be undone.');
            
            if (!confirmed) return;

            Utils.showLoading();

            // Get all elections
            const { data: elections, error: electionsError } = await supabase
                .from('election')
                .select('election_id, name');

            if (electionsError) throw electionsError;

            if (!elections || elections.length === 0) {
                Utils.showToast('No elections found to publish results for.', 'warning');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            // Publish results for each election
            for (const election of elections) {
                try {
                    await this.publishElectionResults(election.election_id);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to publish results for election ${election.election_id}:`, error);
                    failCount++;
                }
            }

            if (successCount > 0) {
                Utils.showToast(`Successfully published results for ${successCount} election(s)${failCount > 0 ? ` (${failCount} failed)` : ''}!`, 'success');
                
                // Refresh the results tab
                const container = document.querySelector('#adminTabContent');
                if (container) {
                    this.loadResultsTab(container);
                }
            } else {
                Utils.showToast('Failed to publish results for any elections.', 'error');
            }

        } catch (error) {
            console.error('Error in bulk publish results:', error);
            Utils.showToast('Failed to publish results: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Helper function to publish results for a single election (without UI)
    async publishElectionResults(electionId) {
        // Get all contests for this election
        const { data: contests, error: contestError } = await supabase
            .from('contest')
            .select(`
                *,
                candidate(full_name, party, symbol)
            `)
            .eq('election_id', electionId);

        if (contestError) throw contestError;

        if (!contests || contests.length === 0) {
            return; // Skip elections with no candidates
        }

        // Calculate results for each candidate
        const results = [];
        let totalVotes = 0;

        for (const contest of contests) {
            // Count votes for this candidate
            const { data: votes, error: voteError } = await supabase
                .from('vote')
                .select('vote_id')
                .eq('contest_id', contest.contest_id);

            if (voteError) {
                console.error('Error counting votes for contest:', contest.contest_id, voteError);
                continue;
            }

            const voteCount = votes ? votes.length : 0;
            totalVotes += voteCount;

            results.push({
                election_id: electionId,
                candidate_id: contest.candidate_id,
                total_votes: voteCount
            });
        }

        // Calculate percentages
        results.forEach(result => {
            result.percentage = totalVotes > 0 ? (result.total_votes / totalVotes) * 100 : 0;
        });

        // Clear existing results for this election
        await supabase
            .from('result')
            .delete()
            .eq('election_id', electionId);

        // Insert new results
        if (results.length > 0) {
            const { error: insertError } = await supabase
                .from('result')
                .insert(results);

            if (insertError) throw insertError;
        }
    }

    // Refresh Results - Just refresh the results display without republishing
    async refreshResults(electionId) {
        try {
            Utils.showLoading();
            
            // Simply refresh the results tab to show updated vote counts
            const currentContainer = document.querySelector('#adminTabContent');
            if (currentContainer) {
                await this.loadResultsTab(currentContainer);
            }
            
            Utils.showToast('Results refreshed successfully!', 'success');
            
        } catch (error) {
            console.error('Error refreshing results:', error);
            Utils.showToast('Failed to refresh results: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Calculate Results for Election - Helper function to calculate results if they don't exist
    async calculateResultsForElection(electionId) {
        try {
            // Check if results already exist
            const { data: existingResults, error: checkError } = await supabase
                .from('result')
                .select('result_id')
                .eq('election_id', electionId)
                .limit(1);

            if (checkError) {
                console.error('Error checking existing results:', checkError);
                return;
            }

            // If results already exist, don't recalculate unless forced
            if (existingResults && existingResults.length > 0) {
                return;
            }

            // Get all contests for this election
            const { data: contests, error: contestError } = await supabase
                .from('contest')
                .select(`
                    *,
                    candidate(full_name, party, symbol)
                `)
                .eq('election_id', electionId);

            if (contestError) {
                console.error('Error loading contests:', contestError);
                return;
            }

            if (!contests || contests.length === 0) {
                // No candidates, no results to calculate
                return;
            }

            // Calculate results for each candidate
            const results = [];
            let totalVotes = 0;

            for (const contest of contests) {
                // Count votes for this candidate
                const { data: votes, error: voteError } = await supabase
                    .from('vote')
                    .select('vote_id')
                    .eq('contest_id', contest.contest_id);

                if (voteError) {
                    console.error('Error counting votes for contest:', contest.contest_id, voteError);
                    continue;
                }

                const voteCount = votes ? votes.length : 0;
                totalVotes += voteCount;

                results.push({
                    election_id: electionId,
                    candidate_id: contest.candidate_id,
                    total_votes: voteCount
                });
            }

            // Calculate percentages
            results.forEach(result => {
                result.percentage = totalVotes > 0 ? (result.total_votes / totalVotes) * 100 : 0;
            });

            // Insert results if we have any candidates
            if (results.length > 0) {
                const { error: insertError } = await supabase
                    .from('result')
                    .insert(results);

                if (insertError) {
                    console.error('Error inserting results:', insertError);
                }
            }

        } catch (error) {
            console.error('Error calculating results for election:', electionId, error);
        }
    }

    // Delete election (placeholder)
    async deleteElection(electionId) {
        if (confirm('Are you sure you want to delete this election? This action cannot be undone.')) {
            try {
                Utils.showLoading();
                
                const { error } = await supabase
                    .from('election')
                    .delete()
                    .eq('election_id', electionId);

                if (error) throw error;

                Utils.showToast('Election deleted successfully!', 'success');
                
                const container = document.querySelector('#adminTabContent');
                if (container) {
                    this.loadElectionsTab(container);
                }
                
            } catch (error) {
                console.error('Error deleting election:', error);
                Utils.showToast('Failed to delete election: ' + error.message, 'error');
            } finally {
                Utils.hideLoading();
            }
        }
    }

    // Load candidates tab
    async loadCandidatesTab(container) {
        try {
            Utils.showLoading();
            
            // Get all candidates first (without voter relationship for now)
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidate')
                .select('*')
                .order('candidate_id', { ascending: false });

            if (candidatesError) throw candidatesError;

            // Get elections data
            const { data: elections, error: electionsError } = await supabase
                .from('election')
                .select('election_id, name, election_type');

            if (electionsError) throw electionsError;

            // Create election lookup map
            const electionMap = {};
            elections?.forEach(election => {
                electionMap[election.election_id] = election;
            });

            // Get voter information for candidates that have applied_by_voter_id
            let voterMap = {};
            const candidatesWithVoterId = candidates.filter(c => c.applied_by_voter_id);
            if (candidatesWithVoterId.length > 0) {
                const voterIds = [...new Set(candidatesWithVoterId.map(c => c.applied_by_voter_id))];
                const { data: voters } = await supabase
                    .from('voter')
                    .select('voter_id, full_name, email, phone')
                    .in('voter_id', voterIds);

                if (voters) {
                    voters.forEach(voter => {
                        voterMap[voter.voter_id] = voter;
                    });
                }
            }

            // Separate candidates by status, default to 'pending' if status is null
            const pendingCandidates = candidates.filter(candidate => (candidate.status || 'pending') === 'pending');
            const approvedCandidates = candidates.filter(candidate => candidate.status === 'approved');
            const rejectedCandidates = candidates.filter(candidate => candidate.status === 'rejected');

            // Group approved candidates by election for the approved section
            const candidatesByElection = {};
            approvedCandidates.forEach(candidate => {
                const electionId = candidate.election_id;
                const election = electionMap[electionId];
                
                if (!candidatesByElection[electionId]) {
                    candidatesByElection[electionId] = {
                        name: election?.name || 'Unknown Election',
                        candidates: []
                    };
                }
                
                candidatesByElection[electionId].candidates.push({
                    ...candidate,
                    contest: [] // Placeholder for contest data
                });
            });

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Candidate Applications Management</h3>
                        <div class="candidate-tabs">
                            <button class="candidate-tab-btn active" onclick="window.Admin.showCandidateTab('pending')">
                                Pending Applications (${pendingCandidates.length})
                            </button>
                            <button class="candidate-tab-btn" onclick="window.Admin.showCandidateTab('approved')">
                                Approved Candidates (${approvedCandidates.length})
                            </button>
                            <button class="candidate-tab-btn" onclick="window.Admin.showCandidateTab('rejected')">
                                Rejected Applications (${rejectedCandidates.length})
                            </button>
                        </div>
                    </div>
                    
                    <!-- Pending Applications Section -->
                    <div id="pendingCandidates" class="candidate-section">
                        <div class="section-subtitle">
                            <h4>Candidate Applications Awaiting Review</h4>
                            <p>Review and approve/reject new candidate applications from voters</p>
                        </div>
                        
                        <div class="candidates-grid">
                            ${pendingCandidates.length > 0 ? 
                                pendingCandidates.map(candidate => {
                                    const election = electionMap[candidate.election_id];
                                    const voter = voterMap[candidate.applied_by_voter_id];
                                    return `
                                        <div class="candidate-card pending">
                                            <div class="candidate-header">
                                                <div class="candidate-title">
                                                    <h4>${Utils.sanitizeHtml(candidate.full_name)}</h4>
                                                    <span class="election-name">${election?.name || 'Unknown Election'}</span>
                                                </div>
                                                <span class="status-badge status-warning">
                                                    ${candidate.applied_by_voter_id ? 'Pending Review' : 'Pending Approval'}
                                                </span>
                                            </div>
                                            
                                            <div class="candidate-details">
                                                ${voter ? `
                                                    <div class="detail-row">
                                                        <strong>Applicant:</strong> ${voter.full_name} (${voter.email})
                                                    </div>
                                                ` : candidate.applied_by_voter_id ? `
                                                    <div class="detail-row">
                                                        <strong>Applied by:</strong> Voter ID ${candidate.applied_by_voter_id}
                                                    </div>
                                                ` : ''}
                                                <div class="detail-row">
                                                    <strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}
                                                    <strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}
                                                </div>
                                                <div class="detail-row">
                                                    <strong>Applied:</strong> ${new Date().toLocaleDateString()}
                                                </div>
                                            </div>
                                            
                                            <div class="candidate-actions">
                                                <button class="btn btn-small btn-success" onclick="window.Admin.reviewCandidate('${candidate.candidate_id}', 'approve')">
                                                    <i class="fas fa-check"></i> Approve
                                                </button>
                                                <button class="btn btn-small btn-outline" onclick="window.Admin.viewCandidateDetails('${candidate.candidate_id}')">
                                                    <i class="fas fa-eye"></i> Full Details
                                                </button>
                                                <button class="btn btn-small btn-danger" onclick="window.Admin.reviewCandidate('${candidate.candidate_id}', 'reject')">
                                                    <i class="fas fa-times"></i> Reject
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('') 
                            : `
                                <div class="no-candidates">
                                    <i class="fas fa-user-check" style="font-size: 48px; color: #10b981; margin-bottom: 20px;"></i>
                                    <h4>All Caught Up!</h4>
                                    <p>No candidate applications are waiting for review.</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Approved Candidates Section -->
                    <div id="approvedCandidates" class="candidate-section" style="display: none;">
                        <div class="section-subtitle">
                            <h4>Approved Candidates by Election</h4>
                            <p>Manage candidates who have been approved for elections</p>
                        </div>
                        
                        ${Object.keys(candidatesByElection).length > 0 ? `
                            <div class="elections-list">
                                ${Object.entries(candidatesByElection).map(([electionId, election]) => `
                                    <div class="election-group">
                                        <div class="election-header">
                                            <h5>
                                                <i class="fas fa-vote-yea"></i>
                                                ${Utils.sanitizeHtml(election.name)}
                                            </h5>
                                            <span class="candidate-count">${election.candidates.length} candidate${election.candidates.length !== 1 ? 's' : ''}</span>
                                        </div>
                                        
                                        <div class="election-candidates">
                                            ${election.candidates.map(candidate => `
                                                <div class="candidate-card approved">
                                                    <div class="candidate-header">
                                                        <h4>${Utils.sanitizeHtml(candidate.full_name)}</h4>
                                                        <span class="status-badge status-active">
                                                            Approved
                                                        </span>
                                                    </div>
                                                    
                                                    <div class="candidate-details">
                                                        <p><strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                                                        <p><strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}</p>
                                                        <p><strong>Position:</strong> ${Utils.sanitizeHtml(candidate.contest[0]?.position || 'Candidate')}</p>
                                                    </div>
                                                    
                                                    <div class="candidate-actions">
                                                        <button class="btn btn-small btn-outline" onclick="window.Admin.viewCandidate('${candidate.candidate_id}')">
                                                            <i class="fas fa-eye"></i> View Details
                                                        </button>
                                                        <button class="btn btn-small btn-secondary" onclick="window.Admin.moveToPending('${candidate.candidate_id}')" title="Move back to pending">
                                                            <i class="fas fa-undo"></i> Move to Pending
                                                        </button>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="no-candidates">
                                <i class="fas fa-user-tie" style="font-size: 48px; color: #a0aec0; margin-bottom: 20px;"></i>
                                <h4>No Approved Candidates</h4>
                                <p>No candidates have been approved for any elections yet.</p>
                            </div>
                        `}
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

    // Show candidate tab (pending, approved, or rejected)
    showCandidateTab(tabType) {
        const pendingSection = document.getElementById('pendingCandidates');
        const approvedSection = document.getElementById('approvedCandidates');
        const rejectedSection = document.getElementById('rejectedCandidates');
        const tabs = document.querySelectorAll('.candidate-tab-btn');
        
        // Update tab styling
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if ((tabType === 'pending' && tab.textContent.includes('Pending')) ||
                (tabType === 'approved' && tab.textContent.includes('Approved')) ||
                (tabType === 'rejected' && tab.textContent.includes('Rejected'))) {
                tab.classList.add('active');
            }
        });
        
        // Show/hide sections
        if (pendingSection) pendingSection.style.display = tabType === 'pending' ? 'block' : 'none';
        if (approvedSection) approvedSection.style.display = tabType === 'approved' ? 'block' : 'none';
        if (rejectedSection) rejectedSection.style.display = tabType === 'rejected' ? 'block' : 'none';
    }

    // Review candidate application (approve or reject)
    async reviewCandidate(candidateId, action) {
        try {
            if (!candidateId || !action) {
                throw new Error('Invalid parameters');
            }

            const isApprove = action === 'approve';
            const actionText = isApprove ? 'approve' : 'reject';
            
            // Get admin notes if rejecting
            let adminNotes = '';
            if (!isApprove) {
                adminNotes = prompt(`Please provide a reason for rejecting this application:`);
                if (adminNotes === null) {
                    return; // User cancelled
                }
            }

            const confirmed = confirm(`Are you sure you want to ${actionText} this candidate application?`);
            if (!confirmed) return;

            Utils.showLoading();

            // Update candidate status
            const updateData = {
                status: isApprove ? 'approved' : 'rejected'
            };

            if (adminNotes) {
                updateData.admin_notes = adminNotes;
            }

            const { error } = await supabase
                .from('candidate')
                .update(updateData)
                .eq('candidate_id', candidateId);

            if (error) throw error;

            // If approving, create contest entry
            if (isApprove) {
                // Get candidate info
                const { data: candidate, error: candidateError } = await supabase
                    .from('candidate')
                    .select('election_id, candidate_id, full_name')
                    .eq('candidate_id', candidateId)
                    .single();

                if (candidateError) throw candidateError;

                // Create contest entry
                const { error: contestError } = await supabase
                    .from('contest')
                    .insert({
                        election_id: candidate.election_id,
                        candidate_id: candidate.candidate_id,
                        position: 'Candidate'
                    });

                if (contestError) {
                    console.error('Contest creation error:', contestError);
                    // Don't throw error as candidate approval succeeded
                }
            }

            Utils.showToast(`Candidate application ${isApprove ? 'approved' : 'rejected'} successfully!`, 'success');
            
            // Reload candidates tab
            const container = document.getElementById('adminTabContent');
            if (container) {
                await this.loadCandidatesTab(container);
            }

        } catch (error) {
            console.error(`Error ${action}ing candidate:`, error);
            Utils.showToast(`Error ${action}ing candidate: ${error.message}`, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // View candidate details in modal
    async viewCandidateDetails(candidateId) {
        try {
            Utils.showLoading();

            // Get candidate information (without voter relationship since voter_id doesn't exist)
            const { data: candidate, error } = await supabase
                .from('candidate')
                .select('*')
                .eq('candidate_id', candidateId)
                .single();

            if (error) throw error;

            // Get election info
            const { data: election } = await supabase
                .from('election')
                .select('election_id, name, election_type, election_date')
                .eq('election_id', candidate.election_id)
                .single();

            // Try to find voter by matching the candidate's full_name with voter's full_name
            let voter = null;
            if (candidate.full_name) {
                const { data: voterData } = await supabase
                    .from('voter')
                    .select('voter_id, full_name, email, phone, address, dob')
                    .eq('full_name', candidate.full_name)
                    .single();
                
                voter = voterData;
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: transparent;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
                box-sizing: border-box;
            `;
            modal.innerHTML = `
                <div class="candidate-details-modal" style="
                    background: white;
                    border-radius: 12px;
                    max-width: 800px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                    position: relative;
                    margin: 0 auto;
                ">
                    <div class="modal-header" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        border-radius: 12px 12px 0 0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 600;">
                            <i class="fas fa-user-tie"></i> Candidate Application Details
                        </h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 20px;
                            cursor: pointer;
                            padding: 5px;
                            border-radius: 4px;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div class="candidate-details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
                                <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Election Information</h3>
                                <div style="margin: 8px 0;"><strong>Election:</strong> ${election?.name || 'Unknown Election'}</div>
                                <div style="margin: 8px 0;"><strong>Type:</strong> ${election?.election_type || 'N/A'}</div>
                                <div style="margin: 8px 0;"><strong>Date:</strong> ${election?.election_date ? new Date(election.election_date).toLocaleDateString() : 'N/A'}</div>
                            </div>

                            <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
                                <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Candidate Information</h3>
                                <div style="margin: 8px 0;"><strong>Name:</strong> ${candidate.full_name}</div>
                                <div style="margin: 8px 0;"><strong>Symbol:</strong> ${candidate.symbol || 'N/A'}</div>
                                <div style="margin: 8px 0;"><strong>Party:</strong> ${candidate.party || 'Independent'}</div>
                                <div style="margin: 8px 0;"><strong>Status:</strong> ${candidate.status}</div>
                            </div>

                            <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; grid-column: 1 / -1;">
                                <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Voter Information</h3>
                                ${voter ? `
                                    <div style="margin: 8px 0;"><strong>Name:</strong> ${voter.full_name}</div>
                                    <div style="margin: 8px 0;"><strong>Email:</strong> ${voter.email || 'N/A'}</div>
                                    <div style="margin: 8px 0;"><strong>Phone:</strong> ${voter.phone || 'N/A'}</div>
                                ` : `
                                    <div style="margin: 8px 0;"><strong>Applicant:</strong> ${candidate.full_name}</div>
                                    <div style="margin: 8px 0;"><em>Detailed voter information not available</em></div>
                                `}
                            </div>

                            ${candidate.bio ? `
                                <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; grid-column: 1 / -1;">
                                    <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Biography</h3>
                                    <p style="color: #64748b; line-height: 1.6; margin: 0;">${candidate.bio}</p>
                                </div>
                            ` : ''}

                            ${candidate.manifesto ? `
                                <div class="detail-section" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; grid-column: 1 / -1;">
                                    <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 16px; font-weight: 600;">Election Manifesto</h3>
                                    <p style="color: #64748b; line-height: 1.6; margin: 0;">${candidate.manifesto}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer" style="
                        padding: 20px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                    ">
                        ${candidate.status === 'pending' ? `
                            <button class="btn btn-success" onclick="window.Admin.reviewCandidate('${candidate.candidate_id}', 'approve'); this.closest('.modal-overlay').remove();" style="
                                padding: 10px 20px;
                                border-radius: 6px;
                                font-weight: 500;
                                cursor: pointer;
                                background: #10b981;
                                color: white;
                                border: none;
                            ">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-danger" onclick="window.Admin.reviewCandidate('${candidate.candidate_id}', 'reject'); this.closest('.modal-overlay').remove();" style="
                                padding: 10px 20px;
                                border-radius: 6px;
                                font-weight: 500;
                                cursor: pointer;
                                background: #ef4444;
                                color: white;
                                border: none;
                            ">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="
                            padding: 10px 20px;
                            border-radius: 6px;
                            font-weight: 500;
                            cursor: pointer;
                            background: #6b7280;
                            color: white;
                            border: none;
                        ">Close</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add backdrop click to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

        } catch (error) {
            console.error('Error viewing candidate details:', error);
            Utils.showToast('Error loading candidate details: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Move candidate to different election
    async moveCandidate(candidateId) {
        try {
            // Get all active elections
            const { data: elections, error: electionError } = await supabase
                .from('election')
                .select('election_id, name')
                .eq('is_active', 'Y');

            if (electionError) throw electionError;

            if (!elections || elections.length === 0) {
                Utils.showToast('No active elections available to move candidate to.', 'warning');
                return;
            }

            // Show election selection modal
            const options = elections.map(election => 
                `<option value="${election.election_id}">${election.name}</option>`
            ).join('');

            const modalHtml = `
                <div class="form-overlay" id="moveModal">
                    <div class="form-container">
                        <div class="form-header">
                            <h3>Move Candidate</h3>
                            <button class="btn-close" onclick="document.getElementById('moveModal').remove()">×</button>
                        </div>
                        <form onsubmit="window.Admin.handleMoveCandidate(event, '${candidateId}')">
                            <div class="form-group">
                                <label>Select Election:</label>
                                <select name="election_id" required>
                                    <option value="">Choose an election...</option>
                                    ${options}
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn btn-outline" onclick="document.getElementById('moveModal').remove()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Move Candidate</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

        } catch (error) {
            console.error('Error preparing candidate move:', error);
            Utils.showToast('Failed to load elections: ' + error.message, 'error');
        }
    }

    // Handle move candidate form submission
    async handleMoveCandidate(event, candidateId) {
        event.preventDefault();
        
        try {
            Utils.showLoading();
            
            const formData = new FormData(event.target);
            const newElectionId = formData.get('election_id');

            // Remove from current contest
            await supabase
                .from('contest')
                .delete()
                .eq('candidate_id', candidateId);

            // Add to new election
            const { error } = await supabase
                .from('contest')
                .insert({
                    election_id: newElectionId,
                    candidate_id: candidateId,
                    position: 'Candidate'
                });

            if (error) throw error;

            Utils.showToast('Candidate moved successfully!', 'success');
            document.getElementById('moveModal').remove();
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error moving candidate:', error);
            Utils.showToast('Failed to move candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Delete candidate completely
    async deleteCandidate(candidateId) {
        if (!confirm('Are you sure you want to permanently delete this candidate? This action cannot be undone.')) {
            return;
        }
        
        try {
            Utils.showLoading();
            
            // First remove from any contests
            await supabase
                .from('contest')
                .delete()
                .eq('candidate_id', candidateId);

            // Then delete the candidate
            const { error } = await supabase
                .from('candidate')
                .delete()
                .eq('candidate_id', candidateId);

            if (error) throw error;

            Utils.showToast('Candidate deleted permanently!', 'success');
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error deleting candidate:', error);
            Utils.showToast('Failed to delete candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Approve candidate (add to contest for active election)
    async approveCandidate(candidateId) {
        try {
            Utils.showLoading();
            
            // First check if there are any active elections
            const { data: elections, error: electionError } = await supabase
                .from('election')
                .select('election_id, name')
                .eq('is_active', 'Y');

            if (electionError) throw electionError;

            if (!elections || elections.length === 0) {
                Utils.showToast('No active elections found. Please create an active election first.', 'warning');
                return;
            }

            // Add candidate to the first active election
            const { error } = await supabase
                .from('contest')
                .insert({
                    election_id: elections[0].election_id,
                    candidate_id: candidateId,
                    position: 'Candidate'
                });

            if (error) {
                // If already in contest, that's fine
                if (error.code === '23505') { // Unique constraint violation
                    Utils.showToast('Candidate is already approved for this election!', 'info');
                } else {
                    throw error;
                }
            } else {
                // Update candidate status to approved
                await supabase
                    .from('candidate')
                    .update({ status: 'approved' })
                    .eq('candidate_id', candidateId);
                    
                Utils.showToast(`Candidate approved and added to "${elections[0].name}"!`, 'success');
            }
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error approving candidate:', error);
            Utils.showToast('Failed to approve candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Reject candidate (remove from all contests)
    async rejectCandidate(candidateId) {
        if (!confirm('Are you sure you want to remove this candidate from all elections?')) {
            return;
        }
        
        try {
            Utils.showLoading();
            
            // Remove from all contests
            const { error } = await supabase
                .from('contest')
                .delete()
                .eq('candidate_id', candidateId);

            if (error) throw error;

            Utils.showToast('Candidate removed from all elections!', 'success');
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error removing candidate:', error);
            Utils.showToast('Failed to remove candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Move approved candidate back to pending status
    async moveToPending(candidateId) {
        if (!confirm('Are you sure you want to move this candidate back to pending status? They will need to be re-approved.')) {
            return;
        }
        
        try {
            Utils.showLoading();
            
            // Update candidate status to pending
            const { error } = await supabase
                .from('candidate')
                .update({ status: 'pending' })
                .eq('candidate_id', candidateId);

            if (error) throw error;

            Utils.showToast('Candidate moved back to pending status!', 'success');
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadCandidatesTab(container);
            }
            
        } catch (error) {
            console.error('Error moving candidate to pending:', error);
            Utils.showToast('Failed to move candidate: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // View candidate details (placeholder)
    async viewCandidate(candidateId) {
        try {
            Utils.showLoading();
            const { data: candidate, error } = await supabase
                .from('candidate')
                .select('*')
                .eq('candidate_id', candidateId)
                .single();

            if (error || !candidate) {
                Utils.showToast('Candidate details not found.', 'error');
                return;
            }

            // Create modal HTML
            let modal = document.getElementById('candidateDetailsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'candidateDetailsModal';
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                    box-sizing: border-box;
                `;
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="document.getElementById('candidateDetailsModal').style.display='none'">&times;</span>
                    <h2>Candidate Details</h2>
                    <div class="candidate-profile">
                        ${candidate.photo_url ? `<img src="${candidate.photo_url}" class="candidate-photo" alt="${candidate.full_name}">` : ''}
                        <h3>${Utils.sanitizeHtml(candidate.full_name)}</h3>
                        <p><strong>Party:</strong> ${Utils.sanitizeHtml(candidate.party || 'Independent')}</p>
                        <p><strong>Symbol:</strong> ${Utils.sanitizeHtml(candidate.symbol || 'N/A')}</p>
                        <p><strong>Biography:</strong> ${Utils.sanitizeHtml(candidate.biography || 'No biography provided.')}</p>
                        <p><strong>Status:</strong> ${Utils.sanitizeHtml(candidate.status)}</p>
                    </div>
                </div>
            `;
            modal.style.display = 'flex';
        } catch (error) {
            Utils.showToast('Error loading candidate details: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Load voters tab
    async loadVotersTab(container) {
        try {
            Utils.showLoading();
            // Get all voters
            const { data: voters, error } = await supabase
                .from('voter')
                .select('*')
                .order('voter_id', { ascending: false });

            if (error) throw error;

            console.log('All voters fetched:', voters);
            console.log('Voters with is_verified field:', voters.map(v => ({ id: v.voter_id, name: v.full_name, is_verified: v.is_verified, is_verified_type: typeof v.is_verified })));

            // Split voters into verified and pending (handle both boolean and string values)
            const verifiedVoters = voters.filter(v => {
                // Handle both boolean true and string 'Y'
                const verified = v.is_verified === true || v.is_verified === 'Y' || String(v.is_verified).trim().toUpperCase() === 'TRUE';
                console.log(`Voter ${v.voter_id} (${v.full_name}): is_verified=${v.is_verified} (${typeof v.is_verified}) -> verified=${verified}`);
                return verified;
            });
            const pendingVoters = voters.filter(v => {
                // Handle both boolean false and string 'N'
                const verified = v.is_verified === true || v.is_verified === 'Y' || String(v.is_verified).trim().toUpperCase() === 'TRUE';
                return !verified;
            });

            console.log('Verified voters:', verifiedVoters.length, verifiedVoters);
            console.log('Pending voters:', pendingVoters.length, pendingVoters);

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <h3>Voters Management</h3>
                        <p>Manage and verify voter registrations</p>
                    </div>
                    <div class="admin-table-container">
                        <h4 style="margin-top:1.5rem;">Pending Voters (${pendingVoters.length})</h4>
                        ${pendingVoters.length > 0 ? `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Date of Birth</th>
                                        <th>NID Number</th>
                                        <th>Age</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendingVoters.map(voter => {
                                        // Calculate age
                                        let age = '';
                                        if (voter.dob) {
                                            const dob = new Date(voter.dob);
                                            const today = new Date();
                                            age = today.getFullYear() - dob.getFullYear();
                                            const m = today.getMonth() - dob.getMonth();
                                            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                                                age--;
                                            }
                                        }
                                        return `
                                            <tr>
                                                <td>${voter.voter_id}</td>
                                                <td>${Utils.sanitizeHtml(voter.full_name)}</td>
                                                <td>${Utils.sanitizeHtml(voter.email)}</td>
                                                <td>${Utils.sanitizeHtml(voter.phone || 'N/A')}</td>
                                                <td>${voter.dob ? new Date(voter.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td>
                                                <td>${voter.nid_number || 'N/A'}</td>
                                                <td>${age || 'N/A'}</td>
                                                <td class="action-buttons">
                                                    <button class="btn btn-small btn-success" onclick="window.Admin.verifyVoter('${voter.voter_id}')" title="Verify Voter">
                                                        <i class="fas fa-check"></i> Approve
                                                    </button>
                                                    <button class="btn btn-small btn-outline" onclick="window.Admin.viewVoter('${voter.voter_id}')" title="View Details">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        ` : `<div class="no-voters"><i class="fas fa-user-clock" style="font-size: 32px; color: #f59e42; margin-bottom: 10px;"></i><p>No pending voters.</p></div>`}

                        <h4 style="margin-top:2.5rem;">Verified Voters (${verifiedVoters.length})</h4>
                        ${verifiedVoters.length > 0 ? `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Date of Birth</th>
                                        <th>NID Number</th>
                                        <th>Age</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${verifiedVoters.map(voter => {
                                        let age = '';
                                        if (voter.dob) {
                                            const dob = new Date(voter.dob);
                                            const today = new Date();
                                            age = today.getFullYear() - dob.getFullYear();
                                            const m = today.getMonth() - dob.getMonth();
                                            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                                                age--;
                                            }
                                        }
                                        return `
                                            <tr>
                                                <td>${voter.voter_id}</td>
                                                <td>${Utils.sanitizeHtml(voter.full_name)}</td>
                                                <td>${Utils.sanitizeHtml(voter.email)}</td>
                                                <td>${Utils.sanitizeHtml(voter.phone || 'N/A')}</td>
                                                <td>${voter.dob ? new Date(voter.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td>
                                                <td>${voter.nid_number || 'N/A'}</td>
                                                <td>${age || 'N/A'}</td>
                                                <td class="action-buttons">
                                                    <button class="btn btn-small btn-outline" onclick="window.Admin.viewVoter('${voter.voter_id}')" title="View Details">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        ` : `<div class="no-voters"><i class="fas fa-user-check" style="font-size: 32px; color: #10b981; margin-bottom: 10px;"></i><p>No verified voters.</p></div>`}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading voters:', error);
            container.innerHTML = `
                <div class="admin-section">
                    <h3>Voters Management</h3>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading voters: ${error.message}</p>
                        <button class="btn btn-primary" onclick="window.Admin.loadVotersTab(this.closest('.admin-section').parentElement)">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            Utils.hideLoading();
        }
    }

    // Verify voter
    async verifyVoter(voterId) {
        try {
            Utils.showLoading();
            
            console.log('Attempting to verify voter:', voterId);
            
            // First, let's check the current status
            const { data: beforeUpdate, error: beforeError } = await supabase
                .from('voter')
                .select('voter_id, full_name, is_verified')
                .eq('voter_id', voterId)
                .single();
                
            if (beforeError) throw beforeError;
            console.log('Before update:', beforeUpdate);
            
            const { error } = await supabase
                .from('voter')
                .update({ is_verified: true })
                .eq('voter_id', voterId);

            if (error) throw error;

            // Check the status after update
            const { data: afterUpdate, error: afterError } = await supabase
                .from('voter')
                .select('voter_id, full_name, is_verified')
                .eq('voter_id', voterId)
                .single();
                
            if (afterError) throw afterError;
            console.log('After update:', afterUpdate);

            console.log('Voter verification successful for ID:', voterId);
            
            // Wait a moment before reloading to ensure database update is complete
            await new Promise(resolve => setTimeout(resolve, 500));

            Utils.showToast('Voter verified successfully!', 'success');
            
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadVotersTab(container);
            }
            
        } catch (error) {
            console.error('Error verifying voter:', error);
            Utils.showToast('Failed to verify voter: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Debug function - can be called from browser console: window.Admin.debugVoters()
    async debugVoters() {
        try {
            const { data: voters, error } = await supabase
                .from('voter')
                .select('*')
                .order('voter_id', { ascending: false });

            if (error) throw error;

            console.log('=== VOTER DEBUG ===');
            console.log('Total voters:', voters.length);
            
            voters.forEach(voter => {
                console.log(`Voter ${voter.voter_id}: ${voter.full_name}`);
                console.log(`  is_verified: ${voter.is_verified} (type: ${typeof voter.is_verified})`);
                console.log(`  equals true: ${voter.is_verified === true}`);
                console.log(`  equals 'Y': ${voter.is_verified === 'Y'}`);
                console.log('---');
            });
            
            const verified = voters.filter(v => v.is_verified === true || v.is_verified === 'Y');
            const pending = voters.filter(v => !(v.is_verified === true || v.is_verified === 'Y'));
            
            console.log(`Verified count: ${verified.length}`);
            console.log(`Pending count: ${pending.length}`);
            console.log('Verified voters:', verified.map(v => v.full_name));
            console.log('=== END DEBUG ===');
            
            return { total: voters.length, verified: verified.length, pending: pending.length };
        } catch (error) {
            console.error('Debug error:', error);
            return null;
        }
    }

    // View voter details (placeholder)
    async viewVoter(voterId) {
        try {
            Utils.showLoading();
            const { data: voter, error } = await supabase
                .from('voter')
                .select('*')
                .eq('voter_id', voterId)
                .single();

            if (error || !voter) {
                Utils.showToast('Voter details not found.', 'error');
                return;
            }

            // Create modal HTML
            let modal = document.getElementById('voterDetailsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'voterDetailsModal';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="document.getElementById('voterDetailsModal').style.display='none'">&times;</span>
                    <h2>Voter Details</h2>
                    <div class="voter-profile">
                        <h3>${Utils.sanitizeHtml(voter.full_name)}</h3>
                        <p><strong>Email:</strong> ${Utils.sanitizeHtml(voter.email)}</p>
                        <p><strong>Phone:</strong> ${Utils.sanitizeHtml(voter.phone || 'N/A')}</p>
                        <p><strong>Date of Birth:</strong> ${voter.dob ? new Date(voter.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                        <p><strong>NID Number:</strong> ${voter.nid_number || 'N/A'}</p>
                        <p><strong>Registration Date:</strong> ${voter.registration_date ? Utils.formatDate(voter.registration_date) : 'N/A'}</p>
                        <p><strong>Verified:</strong> ${(voter.is_verified === true || voter.is_verified === 'Y') ? 'Yes' : 'No'}</p>
                    </div>
                </div>
            `;
            modal.style.display = 'block';
        } catch (error) {
            Utils.showToast('Error loading voter details: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Load results tab
    async loadResultsTab(container) {
        try {
            Utils.showLoading();
            
            // Get elections with their schedules
            const { data: elections, error: electionsError } = await supabase
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

            if (electionsError) throw electionsError;

            const currentDate = new Date();
            const upcomingElections = [];
            const ongoingElections = [];
            const completedElections = [];

            // Categorize elections based on proper status checking
            for (const election of elections) {
                const schedule = election.schedule?.[0];
                let status = 'upcoming'; // Default to upcoming
                
                if (schedule) {
                    // Use schedule dates if available
                    const votingStart = schedule.voting_start ? new Date(schedule.voting_start) : null;
                    const votingEnd = schedule.voting_end ? new Date(schedule.voting_end) : null;
                    
                    if (votingStart && votingEnd) {
                        if (currentDate < votingStart) {
                            status = 'upcoming';
                        } else if (currentDate >= votingStart && currentDate <= votingEnd) {
                            status = 'ongoing';
                        } else {
                            status = 'completed';
                        }
                    } else if (votingEnd) {
                        // Only end date available
                        if (currentDate > votingEnd) {
                            status = 'completed';
                        } else {
                            status = 'upcoming';
                        }
                    } else {
                        // No proper schedule dates, fallback to election_date
                        const electionDate = new Date(election.election_date);
                        
                        if (currentDate < electionDate) {
                            status = 'upcoming';
                        } else if (currentDate.toDateString() === electionDate.toDateString()) {
                            status = 'ongoing';
                        } else {
                            status = 'completed';
                        }
                    }
                } else {
                    // No schedule, use election_date
                    const electionDate = new Date(election.election_date);
                    
                    if (currentDate < electionDate) {
                        status = 'upcoming';
                    } else if (currentDate.toDateString() === electionDate.toDateString()) {
                        status = 'ongoing';
                    } else {
                        status = 'completed';
                    }
                }
                
                // Categorize elections by status
                if (status === 'upcoming') {
                    upcomingElections.push(election);
                } else if (status === 'ongoing') {
                    ongoingElections.push(election);
                } else {
                    completedElections.push(election);
                }
            }

            const generateElectionResultsHTML = async (election, status = 'upcoming') => {
                // Calculate results if they don't exist
                await this.calculateResultsForElection(election.election_id);
                
                // Get detailed results with candidate information
                const { data: results, error: resultsError } = await supabase
                    .from('result')
                    .select(`
                        *,
                        candidate(
                            full_name,
                            party,
                            symbol,
                            candidate_id
                        )
                    `)
                    .eq('election_id', election.election_id)
                    .order('total_votes', { ascending: false });

                if (resultsError) {
                    console.error('Error loading results:', resultsError);
                    return '';
                }

                // Get detailed voting data for this election
                const { data: votingDetails, error: votingError } = await supabase
                    .from('vote')
                    .select(`
                        vote_id,
                        vote_timestamp,
                        ip_address,
                        voter_id,
                        contest_id,
                        contest (
                            candidate_id,
                            candidate (
                                full_name,
                                party
                            )
                        )
                    `)
                    .in('contest_id', 
                        results?.map(r => r.candidate?.candidate_id).filter(Boolean) || []
                    )
                    .order('vote_timestamp', { ascending: false });

                // Get all voters who participated
                const voterIds = [...new Set(votingDetails?.map(v => v.voter_id) || [])];
                const { data: voters } = await supabase
                    .from('voter')
                    .select('voter_id, full_name, email')
                    .in('voter_id', voterIds);

                const voterMap = {};
                voters?.forEach(voter => {
                    voterMap[voter.voter_id] = voter;
                });

                // Check if winner has been declared
                let winnerDeclared = false;
                let winnerCandidateId = null;
                
                try {
                    const { data: winnerData } = await supabase
                        .from('election')
                        .select('winner_declared, winner_candidate_id')
                        .eq('election_id', election.election_id)
                        .single();
                    
                    winnerDeclared = winnerData?.winner_declared === 'Y';
                    winnerCandidateId = winnerData?.winner_candidate_id;
                } catch (error) {
                    console.log('Winner declaration columns not available:', error);
                }

                const totalVotes = results ? results.reduce((sum, result) => sum + (result.total_votes || 0), 0) : 0;
                const schedule = election.schedule?.[0];
                
                // Determine status display properties
                let statusText = 'Upcoming';
                let statusClass = 'upcoming';
                
                if (status === 'upcoming') {
                    statusText = 'Upcoming';
                    statusClass = 'upcoming';
                } else if (status === 'ongoing') {
                    statusText = 'Ongoing';
                    statusClass = 'ongoing';
                } else {
                    statusText = 'Completed';
                    statusClass = 'completed';
                }
                
                // Format comprehensive date and time information
                let dateTimeInfo = '';
                if (schedule) {
                    const votingStart = schedule.voting_start ? new Date(schedule.voting_start) : null;
                    const votingEnd = schedule.voting_end ? new Date(schedule.voting_end) : null;
                    
                    if (votingStart && votingEnd) {
                        const formatDateTime = (date) => {
                            return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        };
                        
                        const duration = votingEnd - votingStart;
                        const durationHours = Math.round(duration / (1000 * 60 * 60));
                        
                        dateTimeInfo = `
                            <div class="schedule-info">
                                <div class="schedule-item">
                                    <i class="fas fa-play-circle"></i>
                                    <span>${status === 'upcoming' ? 'Starts' : 'Started'}: ${formatDateTime(votingStart)}</span>
                                </div>
                                <div class="schedule-item">
                                    <i class="fas fa-stop-circle"></i>
                                    <span>${status === 'completed' ? 'Ended' : 'Ends'}: ${formatDateTime(votingEnd)}</span>
                                </div>
                                <div class="schedule-item">
                                    <i class="fas fa-clock"></i>
                                    <span>Duration: ${durationHours} hours</span>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    const electionDate = new Date(election.election_date);
                    dateTimeInfo = `
                        <div class="schedule-info">
                            <div class="schedule-item">
                                <i class="fas fa-calendar"></i>
                                <span>Election Date: ${Utils.formatDate(election.election_date)}</span>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="election-results-card">
                        <div class="result-header">
                            <div class="result-title">
                                <h4>${Utils.sanitizeHtml(election.name)}</h4>
                                <div class="result-meta">
                                    <span class="election-type">
                                        <i class="fas fa-tag"></i>
                                        ${Utils.sanitizeHtml(election.election_type)}
                                    </span>
                                    <span class="total-votes">
                                        <i class="fas fa-users"></i>
                                        Total Votes: ${totalVotes}
                                    </span>
                                    <span class="participant-count">
                                        <i class="fas fa-user-check"></i>
                                        Participants: ${voterIds.length}
                                    </span>
                                    <span class="status-badge ${statusClass}">${statusText}</span>
                                    ${winnerDeclared ? '<span class="status-badge declared">Winner Declared</span>' : ''}
                                </div>
                                ${dateTimeInfo}
                            </div>
                            <div class="result-actions">
                                <button class="btn btn-small btn-primary" onclick="window.Admin.viewDetailedResults('${election.election_id}')" title="View Detailed Voting Analysis">
                                    <i class="fas fa-chart-line"></i> Detailed Analysis
                                </button>
                                ${status === 'completed' ? `
                                    ${!winnerDeclared && results && results.length > 0 ? `
                                        <button class="btn btn-small btn-success" onclick="window.Admin.declareWinner('${election.election_id}')" title="Declare Winner">
                                            <i class="fas fa-trophy"></i> Declare Winner
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-small btn-outline" onclick="window.Admin.refreshResults('${election.election_id}')" title="Recalculate Results">
                                        <i class="fas fa-sync"></i> Refresh
                                    </button>
                                    <button class="btn btn-small btn-info" onclick="window.Admin.exportResults('${election.election_id}')" title="Export Results to CSV">
                                        <i class="fas fa-download"></i> Export
                                    </button>
                                ` : status === 'ongoing' ? `
                                    <button class="btn btn-small btn-primary" onclick="window.Admin.refreshResults('${election.election_id}')" title="Refresh Live Results">
                                        <i class="fas fa-sync"></i> Refresh Live
                                    </button>
                                    <button class="btn btn-small btn-warning" onclick="window.Admin.endElection('${election.election_id}')" title="End Election Early">
                                        <i class="fas fa-stop"></i> End Early
                                    </button>
                                ` : `
                                    <button class="btn btn-small btn-primary" onclick="window.Admin.editElection('${election.election_id}')" title="Edit Election Schedule">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                `}
                            </div>
                        </div>
                        
                        ${results && results.length > 0 && status !== 'upcoming' ? `
                            <div class="candidates-results">
                                ${results.map((result, index) => {
                                    const isWinner = winnerDeclared && result.candidate_id === winnerCandidateId;
                                    const isLeading = index === 0 && result.total_votes > 0;
                                    
                                    // Get votes for this candidate
                                    const candidateVotes = votingDetails?.filter(v => 
                                        v.contest?.candidate_id === result.candidate_id
                                    ) || [];
                                    
                                    return `
                                        <div class="candidate-result ${isWinner ? 'declared-winner' : isLeading ? 'leading' : ''}">
                                            <div class="candidate-info">
                                                <div class="position">
                                                    ${isWinner ? '<i class="fas fa-crown"></i>' : `#${index + 1}`}
                                                </div>
                                                <div class="details">
                                                    <h5>${Utils.sanitizeHtml(result.candidate?.full_name || 'Unknown')}</h5>
                                                    <p>${Utils.sanitizeHtml(result.candidate?.party || 'Independent')}</p>
                                                    ${result.candidate?.symbol ? `<span class="symbol">${Utils.sanitizeHtml(result.candidate.symbol)}</span>` : ''}
                                                    ${isWinner ? '<span class="winner-badge">🏆 WINNER</span>' : ''}
                                                </div>
                                            </div>
                                            <div class="vote-info">
                                                <div class="vote-count">${result.total_votes || 0}</div>
                                                <div class="vote-percentage">
                                                    ${result.percentage ? result.percentage.toFixed(1) : '0.0'}%
                                                </div>
                                                <div class="vote-details">
                                                    <small>${candidateVotes.length} individual votes</small>
                                                </div>
                                                <div class="vote-bar">
                                                    <div class="vote-fill ${isWinner ? 'winner-fill' : isLeading ? 'leading-fill' : ''}" style="width: ${result.percentage || 0}%"></div>
                                                </div>
                                            </div>
                                            <div class="candidate-actions">
                                                <button class="btn btn-tiny btn-outline" onclick="window.Admin.viewCandidateVotes('${result.candidate_id}', '${election.election_id}')" title="View who voted for this candidate">
                                                    <i class="fas fa-users"></i> View Voters
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : status === 'upcoming' ? `
                            <div class="upcoming-election-info">
                                <div class="upcoming-message">
                                    <i class="fas fa-calendar-check" style="font-size: 24px; color: #3b82f6; margin-bottom: 8px;"></i>
                                    <h4 style="color: #1e293b; margin: 8px 0;">Election Scheduled</h4>
                                    <p style="color: #64748b; margin: 4px 0;">This election is scheduled for the future.</p>
                                    <p style="color: #64748b; margin: 4px 0; font-size: 14px;">Use 'Detailed Analysis' to view candidates and voter information.</p>
                                </div>
                            </div>
                        ` : `
                            <div class="no-results">
                                <i class="fas fa-chart-bar" style="font-size: 32px; color: #a0aec0; margin-bottom: 12px;"></i>
                                <p>No results available for this election yet.</p>
                                ${status === 'completed' ? '<p>No votes were cast or no candidates are available.</p>' : status === 'ongoing' ? '<p>Voting is ongoing - results will appear as votes are cast.</p>' : '<p>This election is scheduled for the future.</p>'}
                                <button class="btn btn-small btn-primary" onclick="window.Admin.refreshResults('${election.election_id}')" style="margin-top: 12px;">
                                    <i class="fas fa-sync"></i> Check for Updates
                                </button>
                            </div>
                        `}
                    </div>
                `;
            };

            // Generate HTML for upcoming elections
            let upcomingHTML = '';
            for (const election of upcomingElections) {
                upcomingHTML += await generateElectionResultsHTML(election, 'upcoming');
            }

            // Generate HTML for ongoing elections
            let ongoingHTML = '';
            for (const election of ongoingElections) {
                ongoingHTML += await generateElectionResultsHTML(election, 'ongoing');
            }

            // Generate HTML for completed elections
            let completedHTML = '';
            for (const election of completedElections) {
                completedHTML += await generateElectionResultsHTML(election, 'completed');
            }

            container.innerHTML = `
                <div class="admin-section">
                    <div class="section-header">
                        <div>
                            <h3>
                                <i class="fas fa-chart-bar"></i>
                                Election Results & Analytics
                            </h3>
                            <p>Comprehensive voting results, live counts, detailed analysis, and winner declarations</p>
                        </div>
                        <div class="section-actions">
                            <button class="btn btn-primary" onclick="window.Admin.publishAllResults()">
                                <i class="fas fa-sync-alt"></i> Refresh All Results
                            </button>
                            <button class="btn btn-success" onclick="window.Admin.generateResultsReport()">
                                <i class="fas fa-file-excel"></i> Generate Report
                            </button>
                        </div>
                    </div>
                    
                    <div class="results-dashboard">
                        ${upcomingElections.length > 0 ? `
                            <div class="results-section upcoming">
                                <div class="section-title-bar">
                                    <h4 class="section-title">
                                        <i class="fas fa-calendar-plus"></i> 
                                        Upcoming Elections
                                        <span class="count">(${upcomingElections.length})</span>
                                    </h4>
                                    <span class="upcoming-indicator">
                                        <i class="fas fa-clock"></i>
                                        Scheduled
                                    </span>
                                </div>
                                <div class="results-grid">
                                    ${upcomingHTML}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${ongoingElections.length > 0 ? `
                            <div class="results-section ongoing">
                                <div class="section-title-bar">
                                    <h4 class="section-title">
                                        <i class="fas fa-clock"></i> 
                                        Ongoing Elections
                                        <span class="count">(${ongoingElections.length})</span>
                                    </h4>
                                    <span class="live-indicator">
                                        <span class="pulse-dot"></span>
                                        Live Results
                                    </span>
                                </div>
                                <div class="results-grid">
                                    ${ongoingHTML}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${completedElections.length > 0 ? `
                            <div class="results-section completed">
                                <div class="section-title-bar">
                                    <h4 class="section-title">
                                        <i class="fas fa-check-circle"></i> 
                                        Completed Elections
                                        <span class="count">(${completedElections.length})</span>
                                    </h4>
                                </div>
                                <div class="results-grid">
                                    ${completedHTML}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${upcomingElections.length === 0 && ongoingElections.length === 0 && completedElections.length === 0 ? `
                            <div class="no-elections-dashboard">
                                <i class="fas fa-chart-bar" style="font-size: 64px; color: #a0aec0; margin-bottom: 24px;"></i>
                                <h4>No Elections with Results</h4>
                                <p>No elections found. Results will appear here once elections are created and become active.</p>
                                <div class="dashboard-actions">
                                    <button class="btn btn-primary" onclick="window.Admin.showTab('elections')">
                                        <i class="fas fa-plus"></i> Create Election
                                    </button>
                                    <button class="btn btn-outline" onclick="window.Admin.loadResultsTab(document.querySelector('#adminTabContent'))">
                                        <i class="fas fa-sync"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading results:', error);
            container.innerHTML = `
                <div class="admin-section">
                    <h3>Election Results</h3>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading results: ${error.message}</p>
                        <button class="btn btn-primary" onclick="window.Admin.loadResultsTab(this.closest('.admin-section').parentElement)">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        } finally {
            Utils.hideLoading();
        }
    }

    // View detailed results with comprehensive analysis
    async viewDetailedResults(electionId) {
        try {
            Utils.showLoading();

            // Get election details
            const { data: election, error: electionError } = await supabase
                .from('election')
                .select(`
                    *,
                    schedule (
                        voting_start,
                        voting_end,
                        nomination_start,
                        nomination_end
                    )
                `)
                .eq('election_id', electionId)
                .single();

            if (electionError) throw electionError;

            // Check if election is upcoming
            const schedule = election.schedule?.[0];
            const now = new Date();
            const votingStart = schedule ? new Date(schedule.voting_start) : null;
            const isUpcoming = votingStart && now < votingStart;

            // If upcoming election, show candidates and voters info instead of voting analysis
            if (isUpcoming) {
                await this.viewUpcomingElectionDetails(election);
                return;
            }

            // Get detailed voting data
            const { data: votes, error: votesError } = await supabase
                .from('vote')
                .select(`
                    *,
                    contest (
                        candidate_id,
                        candidate (
                            full_name,
                            party,
                            symbol
                        )
                    ),
                    voter (
                        voter_id,
                        full_name,
                        email
                    )
                `)
                .in('contest_id', 
                    // First get all contest IDs for this election
                    (await supabase
                        .from('contest')
                        .select('contest_id')
                        .eq('election_id', electionId)
                    ).data?.map(c => c.contest_id) || []
                )
                .order('vote_timestamp', { ascending: false });

            if (votesError) throw votesError;

            // Get all candidates for this election
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidate')
                .select('*')
                .eq('election_id', electionId);

            if (candidatesError) throw candidatesError;

            // Get results
            const { data: results, error: resultsError } = await supabase
                .from('result')
                .select('*')
                .eq('election_id', electionId)
                .order('total_votes', { ascending: false });

            if (resultsError) throw resultsError;

            // Calculate statistics
            const totalVotes = votes?.length || 0;
            const uniqueVoters = [...new Set(votes?.map(v => v.voter_id) || [])].length;
            const candidateCount = candidates?.length || 0;
            
            // Time-based analysis
            const votingPattern = {};
            votes?.forEach(vote => {
                const hour = new Date(vote.vote_timestamp).getHours();
                votingPattern[hour] = (votingPattern[hour] || 0) + 1;
            });

            // Voter participation analysis
            const voterStats = {};
            votes?.forEach(vote => {
                const candidateId = vote.contest?.candidate_id;
                const candidateName = vote.contest?.candidate?.full_name;
                if (!voterStats[candidateId]) {
                    voterStats[candidateId] = {
                        candidateName,
                        voters: []
                    };
                }
                voterStats[candidateId].voters.push({
                    voterName: vote.voter?.full_name,
                    voterEmail: vote.voter?.email,
                    timestamp: vote.vote_timestamp,
                    ipAddress: vote.ip_address
                });
            });

            // Create detailed modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay detailed-results-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                padding: 20px;
                box-sizing: border-box;
            `;

            const scheduleData = election.schedule?.[0];
            const votingStartTime = scheduleData?.voting_start ? new Date(scheduleData.voting_start) : null;
            const votingEndTime = scheduleData?.voting_end ? new Date(scheduleData.voting_end) : null;

            modal.innerHTML = `
                <div class="detailed-results-content" style="
                    background: white;
                    border-radius: 16px;
                    max-width: 1200px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 75px rgba(0, 0, 0, 0.3);
                    position: relative;
                ">
                    <div class="modal-header" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 24px;
                        border-radius: 16px 16px 0 0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">
                                <i class="fas fa-chart-line"></i> Detailed Election Analysis
                            </h2>
                            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">
                                ${election.name} - Complete Voting Analytics
                            </p>
                        </div>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 24px;
                            cursor: pointer;
                            padding: 8px;
                            border-radius: 4px;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body" style="padding: 24px;">
                        <!-- Election Overview -->
                        <div class="analysis-section" style="margin-bottom: 32px;">
                            <h3 style="color: #334155; font-size: 20px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                                <i class="fas fa-info-circle"></i> Election Overview
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                                <div class="stat-card" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                                    <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${totalVotes}</div>
                                    <div style="color: #64748b; font-size: 14px;">Total Votes Cast</div>
                                </div>
                                <div class="stat-card" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
                                    <div style="font-size: 24px; font-weight: bold; color: #059669;">${uniqueVoters}</div>
                                    <div style="color: #64748b; font-size: 14px;">Unique Voters</div>
                                </div>
                                <div class="stat-card" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                    <div style="font-size: 24px; font-weight: bold; color: #d97706;">${candidateCount}</div>
                                    <div style="color: #64748b; font-size: 14px;">Total Candidates</div>
                                </div>
                                <div class="stat-card" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                                    <div style="font-size: 24px; font-weight: bold; color: #7c3aed;">${uniqueVoters > 0 ? (totalVotes / uniqueVoters).toFixed(1) : '0'}</div>
                                    <div style="color: #64748b; font-size: 14px;">Avg Votes/Voter</div>
                                </div>
                            </div>
                            ${votingStartTime && votingEndTime ? `
                                <div style="margin-top: 16px; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                    <strong>Voting Period:</strong> ${votingStartTime.toLocaleString()} to ${votingEndTime.toLocaleString()}
                                    <br>
                                    <strong>Duration:</strong> ${Math.round((votingEndTime - votingStartTime) / (1000 * 60 * 60))} hours
                                </div>
                            ` : ''}
                        </div>

                        <!-- Candidate-wise Detailed Results -->
                        <div class="analysis-section" style="margin-bottom: 32px;">
                            <h3 style="color: #334155; font-size: 20px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                                <i class="fas fa-users"></i> Candidate-wise Voting Details
                            </h3>
                            ${Object.entries(voterStats).map(([candidateId, stats]) => `
                                <div class="candidate-detail-card" style="
                                    background: white;
                                    border: 1px solid #e2e8f0;
                                    border-radius: 12px;
                                    padding: 20px;
                                    margin-bottom: 16px;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                ">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                        <h4 style="margin: 0; color: #1e293b; font-size: 18px;">
                                            ${stats.candidateName || 'Unknown Candidate'}
                                        </h4>
                                        <span style="
                                            background: #3b82f6;
                                            color: white;
                                            padding: 4px 12px;
                                            border-radius: 20px;
                                            font-weight: 500;
                                            font-size: 14px;
                                        ">
                                            ${stats.voters.length} votes
                                        </span>
                                    </div>
                                    
                                    <div class="voters-list" style="
                                        max-height: 200px;
                                        overflow-y: auto;
                                        border: 1px solid #f1f5f9;
                                        border-radius: 8px;
                                        padding: 12px;
                                        background: #fafafa;
                                    ">
                                        ${stats.voters.length > 0 ? `
                                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                                <thead>
                                                    <tr style="background: #f8fafc;">
                                                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Voter</th>
                                                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Email</th>
                                                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Vote Time</th>
                                                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">IP Address</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${stats.voters.map(voter => `
                                                        <tr>
                                                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${voter.voterName || 'Anonymous'}</td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;">${voter.voterEmail || 'N/A'}</td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b;">
                                                                ${new Date(voter.timestamp).toLocaleString()}
                                                            </td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-family: monospace;">
                                                                ${voter.ipAddress || 'N/A'}
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        ` : `
                                            <p style="color: #64748b; text-align: center; margin: 0;">No votes recorded for this candidate</p>
                                        `}
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Voting Timeline -->
                        ${totalVotes > 0 ? `
                            <div class="analysis-section" style="margin-bottom: 32px;">
                                <h3 style="color: #334155; font-size: 20px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                                    <i class="fas fa-clock"></i> Voting Timeline (Hourly Distribution)
                                </h3>
                                <div class="timeline-chart" style="
                                    background: #f8fafc;
                                    padding: 20px;
                                    border-radius: 12px;
                                    border: 1px solid #e2e8f0;
                                ">
                                    ${Object.entries(votingPattern).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([hour, count]) => `
                                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                            <span style="width: 80px; font-weight: 500; color: #64748b;">
                                                ${hour.padStart(2, '0')}:00
                                            </span>
                                            <div style="
                                                background: #3b82f6;
                                                height: 20px;
                                                width: ${(count / Math.max(...Object.values(votingPattern))) * 300}px;
                                                border-radius: 4px;
                                                margin-right: 8px;
                                            "></div>
                                            <span style="color: #374151; font-weight: 500;">${count} votes</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-footer" style="
                        padding: 20px 24px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        gap: 12px;
                        justify-content: center;
                        background: #f8fafc;
                        border-radius: 0 0 16px 16px;
                    ">
                        <button class="btn btn-primary" onclick="window.Admin.exportDetailedResults('${electionId}')" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                        ">
                            <i class="fas fa-download"></i> Export Full Report
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                        ">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add backdrop click to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

        } catch (error) {
            console.error('Error loading detailed results:', error);
            Utils.showToast('Error loading detailed results: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // View upcoming election details - shows candidates and voters instead of vote results
    async viewUpcomingElectionDetails(election) {
        try {
            // Get all candidates for this election
            const { data: candidates, error: candidatesError } = await supabase
                .from('candidate')
                .select('*')
                .eq('election_id', election.election_id)
                .order('full_name');

            if (candidatesError) throw candidatesError;

            // Get all registered voters
            const { data: voters, error: votersError } = await supabase
                .from('voter')
                .select('voter_id, full_name, email, registration_date')
                .order('full_name');

            if (votersError) throw votersError;

            const schedule = election.schedule?.[0];
            const votingStart = schedule?.voting_start ? new Date(schedule.voting_start) : null;
            const votingEnd = schedule?.voting_end ? new Date(schedule.voting_end) : null;

            // Create detailed modal for upcoming election
            const modal = document.createElement('div');
            modal.className = 'modal-overlay upcoming-election-details-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(1px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                padding: 20px;
                box-sizing: border-box;
                animation: fadeIn 0.2s ease-out;
            `;

            modal.innerHTML = `
                <div class="upcoming-election-content" style="
                    background: white;
                    border-radius: 16px;
                    max-width: 1200px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    position: relative;
                    margin: auto;
                    animation: modalSlideIn 0.3s ease-out;
                ">
                    <div class="modal-header" style="
                        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                        color: white;
                        padding: 24px;
                        border-radius: 16px 16px 0 0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">
                                <i class="fas fa-calendar-alt"></i> Upcoming Election Details
                            </h2>
                            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">
                                ${election.name} - Candidates & Voters Information
                            </p>
                        </div>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 24px;
                            cursor: pointer;
                            padding: 8px;
                            border-radius: 4px;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body" style="padding: 24px;">
                        <!-- Election Schedule Information -->
                        <div class="election-schedule" style="margin-bottom: 32px;">
                            <h3 style="color: #334155; font-size: 20px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                                <i class="fas fa-clock"></i> Election Schedule
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                                <div class="schedule-card" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                                    <div style="font-size: 18px; font-weight: bold; color: #1e40af; margin-bottom: 4px;">
                                        ${votingStart ? votingStart.toLocaleDateString() : 'Not scheduled'}
                                    </div>
                                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Start Date</div>
                                    <div style="color: #475569; font-size: 14px;">
                                        ${votingStart ? votingStart.toLocaleTimeString() : ''}
                                    </div>
                                </div>
                                <div class="schedule-card" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
                                    <div style="font-size: 18px; font-weight: bold; color: #059669; margin-bottom: 4px;">
                                        ${votingEnd ? votingEnd.toLocaleDateString() : 'Not scheduled'}
                                    </div>
                                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">End Date</div>
                                    <div style="color: #475569; font-size: 14px;">
                                        ${votingEnd ? votingEnd.toLocaleTimeString() : ''}
                                    </div>
                                </div>
                                <div class="schedule-card" style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                    <div style="font-size: 18px; font-weight: bold; color: #d97706; margin-bottom: 4px;">
                                        ${votingStart && votingEnd ? Math.round((votingEnd - votingStart) / (1000 * 60 * 60)) + ' hours' : 'TBD'}
                                    </div>
                                    <div style="color: #64748b; font-size: 14px;">Duration</div>
                                </div>
                            </div>
                        </div>

                        <!-- Candidates Section -->
                        <div class="candidates-section" style="margin-bottom: 32px;">
                            <h3 style="color: #334155; font-size: 20px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                                <i class="fas fa-users"></i> Candidates (${candidates?.length || 0})
                            </h3>
                            ${candidates && candidates.length > 0 ? `
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                                    ${candidates.map(candidate => `
                                        <div class="candidate-card" style="
                                            background: white;
                                            border: 1px solid #e2e8f0;
                                            border-radius: 12px;
                                            padding: 20px;
                                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                            transition: all 0.3s ease;
                                        " onmouseover="this.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                                <h4 style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600;">
                                                    ${candidate.full_name}
                                                </h4>
                                                <button class="btn btn-small btn-outline" onclick="window.Admin.viewCandidateDetails('${candidate.candidate_id}')" 
                                                    style="padding: 4px 8px; font-size: 12px;" title="View candidate details">
                                                    <i class="fas fa-eye"></i> View Details
                                                </button>
                                            </div>
                                            <div style="margin-bottom: 8px;">
                                                <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                                                    ${candidate.party || 'Independent'}
                                                </span>
                                                ${candidate.symbol ? `<span style="margin-left: 8px; font-size: 14px;">Symbol: ${candidate.symbol}</span>` : ''}
                                            </div>
                                            ${candidate.bio ? `
                                                <p style="color: #64748b; font-size: 14px; margin: 8px 0 0 0; line-height: 1.4;">
                                                    ${candidate.bio.length > 100 ? candidate.bio.substring(0, 100) + '...' : candidate.bio}
                                                </p>
                                            ` : ''}
                                            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                                                <span style="color: #64748b; font-size: 12px;">
                                                    ID: ${candidate.candidate_id}
                                                </span>
                                                <button class="btn btn-tiny btn-warning" onclick="window.Admin.moveCandidateToPending('${candidate.candidate_id}', '${election.election_id}')"
                                                    style="padding: 2px 6px; font-size: 10px;" title="Move to pending applications">
                                                    <i class="fas fa-clock"></i> To Pending
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div style="text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 12px;">
                                    <i class="fas fa-user-plus" style="font-size: 48px; color: #a0aec0; margin-bottom: 16px;"></i>
                                    <h4 style="color: #374151; margin-bottom: 8px;">No Candidates Added</h4>
                                    <p style="color: #64748b; margin-bottom: 16px;">Add candidates to this election to enable voting.</p>
                                    <button class="btn btn-primary" onclick="window.Admin.addCandidateToElection('${election.election_id}')">
                                        <i class="fas fa-plus"></i> Add Candidates
                                    </button>
                                </div>
                            `}
                        </div>

                        <!-- Registered Voters Section -->
                        <div class="voters-section">
                            <h3 style="color: #334155; font-size: 20px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                                <i class="fas fa-vote-yea"></i> Registered Voters (${voters?.length || 0})
                            </h3>
                            ${voters && voters.length > 0 ? `
                                <div class="voters-table-container" style="
                                    background: white;
                                    border: 1px solid #e2e8f0;
                                    border-radius: 12px;
                                    overflow: hidden;
                                    max-height: 400px;
                                    overflow-y: auto;
                                ">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead style="background: #f8fafc; position: sticky; top: 0;">
                                            <tr>
                                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">#</th>
                                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Name</th>
                                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Email</th>
                                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Registered</th>
                                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${voters.map((voter, index) => `
                                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                                    <td style="padding: 12px; color: #64748b;">${index + 1}</td>
                                                    <td style="padding: 12px; font-weight: 500; color: #1e293b;">
                                                        ${voter.full_name}
                                                    </td>
                                                    <td style="padding: 12px; color: #64748b;">
                                                        ${voter.email}
                                                    </td>
                                                    <td style="padding: 12px; color: #64748b;">
                                                        ${voter.registration_date ? new Date(voter.registration_date).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td style="padding: 12px;">
                                                        <button class="btn btn-tiny btn-outline" onclick="window.Admin.viewVoterDetails('${voter.voter_id}')"
                                                            style="margin-right: 4px; padding: 2px 6px; font-size: 10px;" title="View voter details">
                                                            <i class="fas fa-eye"></i> Details
                                                        </button>
                                                        <button class="btn btn-tiny btn-danger" onclick="window.Admin.removeVoter('${voter.voter_id}')"
                                                            style="padding: 2px 6px; font-size: 10px;" title="Remove voter">
                                                            <i class="fas fa-trash"></i> Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : `
                                <div style="text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 12px;">
                                    <i class="fas fa-users" style="font-size: 48px; color: #a0aec0; margin-bottom: 16px;"></i>
                                    <h4 style="color: #374151; margin-bottom: 8px;">No Registered Voters</h4>
                                    <p style="color: #64748b;">Voters can register through the voter registration system.</p>
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <div class="modal-footer" style="
                        padding: 20px 24px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: center;
                        background: #f8fafc;
                        border-radius: 0 0 16px 16px;
                    ">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                        ">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add backdrop click to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

        } catch (error) {
            console.error('Error loading upcoming election details:', error);
            Utils.showToast('Error loading upcoming election details: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // View voters for a specific candidate
    async viewCandidateVotes(candidateId, electionId) {
        try {
            Utils.showLoading();

            // Get candidate info
            const { data: candidate, error: candidateError } = await supabase
                .from('candidate')
                .select('*')
                .eq('candidate_id', candidateId)
                .single();

            if (candidateError) throw candidateError;

            // Get votes for this candidate
            const { data: votes, error: votesError } = await supabase
                .from('vote')
                .select(`
                    *,
                    voter (
                        voter_id,
                        full_name,
                        email
                    )
                `)
                .in('contest_id', 
                    (await supabase
                        .from('contest')
                        .select('contest_id')
                        .eq('candidate_id', candidateId)
                        .eq('election_id', electionId)
                    ).data?.map(c => c.contest_id) || []
                )
                .order('vote_timestamp', { ascending: false });

            if (votesError) throw votesError;

            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1500;
                padding: 20px;
                box-sizing: border-box;
            `;

            modal.innerHTML = `
                <div class="candidate-votes-modal" style="
                    background: white;
                    border-radius: 12px;
                    max-width: 800px;
                    width: 100%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                ">
                    <div class="modal-header" style="
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        padding: 20px;
                        border-radius: 12px 12px 0 0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 600;">
                                <i class="fas fa-users"></i> Voters for ${candidate.full_name}
                            </h3>
                            <p style="margin: 8px 0 0 0; opacity: 0.9;">
                                ${votes?.length || 0} total votes received
                            </p>
                        </div>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 20px;
                            cursor: pointer;
                            padding: 5px;
                            border-radius: 4px;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body" style="padding: 20px;">
                        ${votes && votes.length > 0 ? `
                            <div class="votes-table-container">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background: #f8fafc;">
                                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">#</th>
                                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Voter Name</th>
                                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Email</th>
                                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">Vote Time</th>
                                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #374151;">IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${votes.map((vote, index) => `
                                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                                <td style="padding: 12px; color: #64748b;">${index + 1}</td>
                                                <td style="padding: 12px; font-weight: 500; color: #1e293b;">
                                                    ${vote.voter?.full_name || 'Anonymous Voter'}
                                                </td>
                                                <td style="padding: 12px; color: #64748b;">
                                                    ${vote.voter?.email || 'N/A'}
                                                </td>
                                                <td style="padding: 12px; color: #64748b;">
                                                    ${new Date(vote.vote_timestamp).toLocaleString()}
                                                </td>
                                                <td style="padding: 12px; color: #64748b; font-family: monospace; font-size: 12px;">
                                                    ${vote.ip_address || 'N/A'}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 40px 20px;">
                                <i class="fas fa-inbox" style="font-size: 48px; color: #a0aec0; margin-bottom: 16px;"></i>
                                <h4 style="color: #374151; margin-bottom: 8px;">No Votes Recorded</h4>
                                <p style="color: #64748b;">This candidate has not received any votes yet.</p>
                            </div>
                        `}
                    </div>
                    
                    <div class="modal-footer" style="
                        padding: 16px 20px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: center;
                        background: #f8fafc;
                        border-radius: 0 0 12px 12px;
                    ">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 500;
                        ">Close</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

        } catch (error) {
            console.error('Error loading candidate votes:', error);
            Utils.showToast('Error loading candidate votes: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Export results to CSV
    async exportResults(electionId) {
        try {
            Utils.showLoading();

            // Get election details
            const { data: election, error: electionError } = await supabase
                .from('election')
                .select('*')
                .eq('election_id', electionId)
                .single();

            if (electionError) throw electionError;

            // Get results
            const { data: results, error: resultsError } = await supabase
                .from('result')
                .select(`
                    *,
                    candidate (
                        full_name,
                        party,
                        symbol
                    )
                `)
                .eq('election_id', electionId)
                .order('total_votes', { ascending: false });

            if (resultsError) throw resultsError;

            // Create CSV content
            let csvContent = `Election Results Report\n`;
            csvContent += `Election: ${election.name}\n`;
            csvContent += `Type: ${election.election_type}\n`;
            csvContent += `Date: ${Utils.formatDate(election.election_date)}\n`;
            csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
            csvContent += `Rank,Candidate Name,Party,Symbol,Total Votes,Percentage\n`;

            results?.forEach((result, index) => {
                csvContent += `${index + 1},`;
                csvContent += `"${result.candidate?.full_name || 'Unknown'}",`;
                csvContent += `"${result.candidate?.party || 'Independent'}",`;
                csvContent += `"${result.candidate?.symbol || 'N/A'}",`;
                csvContent += `${result.total_votes || 0},`;
                csvContent += `${result.percentage ? result.percentage.toFixed(2) : '0.00'}%\n`;
            });

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${election.name.replace(/\s+/g, '_')}_Results_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            Utils.showToast('Results exported successfully!', 'success');

        } catch (error) {
            console.error('Error exporting results:', error);
            Utils.showToast('Error exporting results: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // End election early
    async endElection(electionId) {
        try {
            const confirmed = confirm('Are you sure you want to end this election early?\n\nThis will:\n- Stop accepting new votes\n- Mark the election as completed\n- Allow result declaration\n\nThis action cannot be undone.');
            
            if (!confirmed) return;

            Utils.showLoading();

            // Update election to inactive and set end time
            const { error: electionError } = await supabase
                .from('election')
                .update({ 
                    is_active: 'N'
                })
                .eq('election_id', electionId);

            if (electionError) throw electionError;

            // Update schedule end time to now
            const { error: scheduleError } = await supabase
                .from('schedule')
                .update({ 
                    voting_end: new Date().toISOString()
                })
                .eq('election_id', electionId);

            if (scheduleError) {
                console.warn('Could not update schedule:', scheduleError);
            }

            Utils.showToast('Election ended successfully!', 'success');
            
            // Refresh results tab
            const container = document.querySelector('#adminTabContent');
            if (container) {
                this.loadResultsTab(container);
            }

        } catch (error) {
            console.error('Error ending election:', error);
            Utils.showToast('Error ending election: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Generate comprehensive results report
    async generateResultsReport() {
        try {
            Utils.showLoading();

            // Get all elections with results
            const { data: elections, error: electionsError } = await supabase
                .from('election')
                .select(`
                    *,
                    schedule (
                        voting_start,
                        voting_end
                    )
                `)
                .order('election_date', { ascending: false });

            if (electionsError) throw electionsError;

            let reportContent = `ELECTION MANAGEMENT SYSTEM - COMPREHENSIVE REPORT\n`;
            reportContent += `Generated: ${new Date().toLocaleString()}\n`;
            reportContent += `Total Elections: ${elections?.length || 0}\n\n`;

            for (const election of elections || []) {
                reportContent += `\n${'='.repeat(60)}\n`;
                reportContent += `ELECTION: ${election.name}\n`;
                reportContent += `${'='.repeat(60)}\n`;
                reportContent += `Type: ${election.election_type}\n`;
                reportContent += `Date: ${Utils.formatDate(election.election_date)}\n`;
                
                const schedule = election.schedule?.[0];
                if (schedule) {
                    reportContent += `Voting Period: ${new Date(schedule.voting_start).toLocaleString()} to ${new Date(schedule.voting_end).toLocaleString()}\n`;
                }
                
                reportContent += `Status: ${election.is_active === 'Y' ? 'Active' : 'Completed'}\n\n`;

                // Get results for this election
                const { data: results } = await supabase
                    .from('result')
                    .select(`
                        *,
                        candidate (
                            full_name,
                            party,
                            symbol
                        )
                    `)
                    .eq('election_id', election.election_id)
                    .order('total_votes', { ascending: false });

                if (results && results.length > 0) {
                    reportContent += `RESULTS:\n`;
                    reportContent += `${'─'.repeat(50)}\n`;
                    results.forEach((result, index) => {
                        reportContent += `${index + 1}. ${result.candidate?.full_name || 'Unknown'}\n`;
                        reportContent += `   Party: ${result.candidate?.party || 'Independent'}\n`;
                        reportContent += `   Votes: ${result.total_votes || 0} (${result.percentage ? result.percentage.toFixed(1) : '0.0'}%)\n\n`;
                    });
                } else {
                    reportContent += `RESULTS: No results available\n\n`;
                }
            }

            // Download report
            const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Election_System_Report_${new Date().toISOString().split('T')[0]}.txt`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            Utils.showToast('Comprehensive report generated successfully!', 'success');

        } catch (error) {
            console.error('Error generating report:', error);
            Utils.showToast('Error generating report: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Export detailed results (placeholder for the modal button)
    async exportDetailedResults(electionId) {
        await this.exportResults(electionId);
    }

    // Helper functions for upcoming election management

    // View candidate details
    async viewCandidateDetails(candidateId) {
        try {
            Utils.showLoading();

            const { data: candidate, error } = await supabase
                .from('candidate')
                .select('*')
                .eq('candidate_id', candidateId)
                .single();

            if (error) throw error;

            // Create modal to show candidate details
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            modal.innerHTML = `
                <div class="candidate-details-modal">
                    <div class="modal-header">
                        <h2>Candidate Details</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="candidate-details-grid">
                            <div class="detail-section">
                                <div class="detail-row">
                                    <strong>Name:</strong>
                                    <span class="detail-text">${candidate.full_name}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Email:</strong>
                                    <span class="detail-text">${candidate.email || 'Not provided'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Phone:</strong>
                                    <span class="detail-text">${candidate.phone || 'Not provided'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Date of Birth:</strong>
                                    <span class="detail-text">${candidate.dob ? new Date(candidate.dob).toLocaleDateString() : 'Not provided'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Party:</strong>
                                    <span class="detail-text">${candidate.party || 'Independent'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Symbol:</strong>
                                    <span class="detail-text">${candidate.symbol || 'N/A'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Bio:</strong>
                                    <span class="detail-text">${candidate.bio || 'No bio provided'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

        } catch (error) {
            console.error('Error viewing candidate details:', error);
            Utils.showToast('Error loading candidate details: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Move candidate to pending applications
    async moveCandidateToPending(candidateId, electionId) {
        if (!confirm('Are you sure you want to move this candidate to pending applications? They will need to be re-approved.')) {
            return;
        }

        try {
            Utils.showLoading();

            // Update candidate status to pending
            const { error: updateError } = await supabase
                .from('candidate')
                .update({ status: 'pending' })
                .eq('candidate_id', candidateId);

            if (updateError) throw updateError;

            // Remove candidate from contest (if they are in one)
            const { error: contestError } = await supabase
                .from('contest')
                .delete()
                .eq('candidate_id', candidateId)
                .eq('election_id', electionId);

            // Don't throw error for contest deletion as it might not exist
            if (contestError) {
                console.warn('Contest deletion warning:', contestError);
            }

            Utils.showToast('Candidate moved to pending applications successfully', 'success');
            
            // Refresh the detailed view
            document.querySelector('.upcoming-election-details-modal')?.remove();
            this.viewDetailedResults(electionId);

        } catch (error) {
            console.error('Error moving candidate to pending:', error);
            Utils.showToast('Error moving candidate to pending: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Remove candidate from election (legacy function - kept for backward compatibility)
    async removeCandidateFromElection(candidateId, electionId) {
        // Redirect to the new function
        return this.moveCandidateToPending(candidateId, electionId);
    }

    // View voter details
    async viewVoterDetails(voterId) {
        try {
            Utils.showLoading();

            const { data: voter, error } = await supabase
                .from('voter')
                .select('*')
                .eq('voter_id', voterId)
                .single();

            if (error) throw error;

            // Create modal to show voter details
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            modal.innerHTML = `
                <div class="candidate-details-modal">
                    <div class="modal-header">
                        <h2>Voter Details</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="candidate-details-grid">
                            <div class="detail-section">
                                <div class="detail-row">
                                    <strong>Name:</strong>
                                    <span class="detail-text">${voter.full_name}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Email:</strong>
                                    <span class="detail-text">${voter.email}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Phone:</strong>
                                    <span class="detail-text">${voter.phone || 'Not provided'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Date of Birth:</strong>
                                    <span class="detail-text">${voter.dob ? new Date(voter.dob).toLocaleDateString() : 'Not provided'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Registration Date:</strong>
                                    <span class="detail-text">${voter.registration_date ? new Date(voter.registration_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Voter ID:</strong>
                                    <span class="detail-text">${voter.voter_id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

        } catch (error) {
            console.error('Error viewing voter details:', error);
            Utils.showToast('Error loading voter details: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Remove voter
    async removeVoter(voterId) {
        if (!confirm('Are you sure you want to remove this voter? This action cannot be undone.')) {
            return;
        }

        try {
            Utils.showLoading();

            // Delete voter
            const { error } = await supabase
                .from('voter')
                .delete()
                .eq('voter_id', voterId);

            if (error) throw error;

            Utils.showToast('Voter removed successfully', 'success');
            
            // Refresh any open modals
            const detailsModal = document.querySelector('.upcoming-election-details-modal');
            if (detailsModal) {
                detailsModal.remove();
                // Re-open if we can determine the election ID
                const electionId = detailsModal.querySelector('[onclick*="viewDetailedResults"]')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (electionId) {
                    this.viewDetailedResults(electionId);
                }
            }

        } catch (error) {
            console.error('Error removing voter:', error);
            Utils.showToast('Error removing voter: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // Add candidate to election (placeholder)
    async addCandidateToElection(electionId) {
        Utils.showToast('Add candidate functionality coming soon!', 'info');
        // This would open a form to add new candidates
    }
}

// Initialize Admin globally
window.Admin = new Admin();

// Global function for tab switching (called from HTML)
function showAdminTab(tabName) {
    if (window.Admin) {
        window.Admin.showTab(tabName);
    } else {
        console.error('Admin instance not found');
    }
}
