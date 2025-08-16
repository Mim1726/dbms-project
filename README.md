# Online Voting Management System - Supabase + JavaScript

A modern, secure online voting management system built with **Supabase** (PostgreSQL) and **vanilla JavaScript**.

## 🚀 Features

### Core Functionality
- **Secure Authentication** - Email-based registration and login
- **Role-based Access** - Admin and Voter roles with different permissions
- **Real-time Elections** - Create and manage elections with start/end dates
- **Candidate Management** - Add candidates with photos and biographies
- **Secure Voting** - One vote per voter per election with audit trail
- **Live Results** - Real-time vote counting and result display
- **Responsive Design** - Works on desktop, tablet, and mobile devices

### Security Features
- **Row Level Security (RLS)** - Database-level access control
- **Vote Integrity** - Prevents double voting and tampering
- **Audit Trail** - Complete voting history with timestamps
- **Anonymous Voting** - Voter privacy protection
- **Input Validation** - Prevents XSS and injection attacks

### Admin Features
- **Election Management** - Create, edit, and delete elections
- **Candidate Management** - Add and manage candidates
- **Voter Management** - Verify and manage voter registrations
- **Results Dashboard** - Comprehensive election results
- **Data Export** - Export results as CSV/JSON

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Hosting**: Any static hosting service (Netlify, Vercel, etc.)

## 📁 Project Structure

```
voting-system/
├── index.html              # Main application page
├── css/
│   └── style.css           # Application styles
├── js/
│   ├── config.js           # Supabase configuration
│   ├── auth.js             # Authentication module
│   ├── elections.js        # Elections management
│   ├── voting.js           # Voting functionality
│   ├── admin.js            # Admin dashboard
│   ├── utils.js            # Utility functions
│   └── main.js             # Main application logic
├── database-setup.md       # Database setup instructions
└── README.md              # This file
```

## 🚀 Quick Start

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key
3. Follow the instructions in `database-setup.md` to set up your database

### 2. Configure the Application

Update `js/config.js` with your Supabase credentials:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 3. Deploy

You can deploy this application to any static hosting service:

- **Netlify**: Drag and drop the project folder
- **Vercel**: Connect your GitHub repository
- **GitHub Pages**: Enable GitHub Pages in repository settings
- **Local Development**: Open `index.html` in your browser (must be served via HTTP/HTTPS for Supabase to work)

### 4. Create Admin User

1. Register a new user through the application
2. In your Supabase database, update the user's role:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

## 📋 Usage Guide

### For Voters

1. **Register**: Create an account with email and personal details
2. **Wait for Verification**: Admin needs to verify your registration
3. **Vote**: Browse active elections and cast your vote
4. **View Results**: See real-time election results

### For Administrators

1. **Login**: Use admin credentials to access admin dashboard
2. **Manage Elections**: Create new elections with start/end dates
3. **Add Candidates**: Add candidates with photos and biographies
4. **Verify Voters**: Approve voter registrations
5. **Monitor Results**: View detailed election results and analytics

## 🔧 Configuration Options

### Election Types
- General Election
- Local Election
- Referendum
- Primary Election

### User Roles
- **Admin**: Full system access
- **Voter**: Can vote in elections

### Security Settings
- Password requirements (8+ chars, mixed case, numbers)
- Vote verification system
- IP address logging for audit trail
- Rate limiting on authentication

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts and profiles
- **voters**: Voter-specific information
- **elections**: Election details and scheduling
- **candidates**: Candidate information and photos
- **votes**: Anonymous vote records

### Key Features
- Foreign key constraints for data integrity
- Unique constraints to prevent duplicate votes
- Indexes for optimal query performance
- Row Level Security for access control
- Triggers for automatic timestamp updates

## 🔒 Security Considerations

### Data Protection
- All sensitive data encrypted at rest
- HTTPS required for all communications
- No personally identifiable information in vote records
- Secure file upload with type validation

### Access Control
- Role-based permissions
- Database-level security policies
- Protected admin functions
- Audit logging for all actions

### Vote Integrity
- One vote per voter per election
- Timestamp validation
- IP address logging
- Vote tampering prevention

## 🎨 Customization

### Styling
- Modern CSS Grid and Flexbox layout
- CSS custom properties for easy theming
- Responsive design with mobile-first approach
- Font Awesome icons included

### Branding
- Update `CONFIG.APP_NAME` in `js/config.js`
- Modify colors in CSS custom properties
- Replace logo and favicon
- Update meta tags in `index.html`

## 🚨 Troubleshooting

### Common Issues

1. **Supabase Connection Error**
   - Verify your URL and API key in `config.js`
   - Check if your domain is added to Supabase allowed origins

2. **Database Errors**
   - Ensure all tables are created properly
   - Check RLS policies are set up correctly
   - Verify foreign key relationships

3. **Authentication Issues**
   - Enable email authentication in Supabase
   - Check email templates are configured
   - Verify domain settings

4. **File Upload Problems**
   - Create storage buckets in Supabase
   - Set up proper storage policies
   - Check file size and type restrictions

### Debug Mode

Add this to your console to enable debug logging:

```javascript
window.DEBUG = true;
```

## 📈 Performance Optimization

### Database
- Proper indexing on frequently queried columns
- Optimized queries with appropriate JOINs
- Database connection pooling via Supabase

### Frontend
- Lazy loading of images
- Debounced search inputs
- Efficient DOM manipulation
- Minified CSS and JavaScript for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

1. Check the troubleshooting section above
2. Review the Supabase documentation
3. Create an issue in the repository
4. Contact the development team

## 🔮 Future Enhancements

- **Multi-language Support**: Internationalization
- **Email Notifications**: Automated voter notifications
- **Advanced Analytics**: Detailed voting statistics
- **API Integration**: RESTful API for external integrations
- **Mobile App**: React Native companion app
- **Blockchain Integration**: Enhanced vote verification
- **Live Chat**: Real-time voter support

---

Built with ❤️ using Supabase and modern web technologies.
