# Online Voting Management System

A comprehensive web-based voting management system built with Node.js, PostgreSQL, and modern web technologies. This system provides secure, transparent, and accessible digital voting capabilities.

## Features

### 🔐 Security Features
- **Secure Authentication**: JWT-based authentication for both admin and voter access
- **Password Protection**: Secure password handling (demo uses plain text for simplicity)
- **Session Management**: Secure session handling with automatic timeout
- **Audit Trail**: Complete logging of all administrative actions
- **IP Tracking**: Track voting locations for security monitoring

### 👥 User Management
- **Admin Dashboard**: Comprehensive administrative interface
- **Voter Registration**: Self-service voter registration with admin verification
- **Role-based Access**: Separate interfaces for admins and voters
- **Account Verification**: Manual voter verification process

### 🗳️ Election Management
- **Election Creation**: Create various types of elections (General, Local, University, etc.)
- **Candidate Management**: Add and manage election candidates
- **Voting Schedules**: Set nomination periods, voting windows, and result declaration
- **Contest Management**: Link candidates to specific elections and positions

### 📊 Voting & Results
- **Secure Voting**: One vote per voter per election with duplicate prevention
- **Real-time Monitoring**: Live tracking of voting progress
- **Automatic Results**: Calculate vote counts and percentages
- **Result Publication**: Display results with charts and statistics

### 📱 User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Bootstrap UI**: Modern, clean interface using Bootstrap 5
- **Real-time Updates**: Dynamic content updates without page refresh
- **Accessibility**: Designed for users with disabilities

## Technology Stack

- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL with connection pooling
- **Frontend**: EJS templating with Bootstrap 5
- **Authentication**: JWT tokens and session management
- **Security**: Helmet.js, CORS, rate limiting
- **Styling**: Custom CSS with Bootstrap components

## Database Schema

The system uses 10 main tables:

1. **admin** - System administrators
2. **voter** - Registered voters
3. **candidate** - Election candidates
4. **election** - Election information
5. **schedule** - Election timelines
6. **contest** - Candidate-election relationships
7. **vote** - Cast votes
8. **result** - Election results
9. **audit_log** - System activity logs
10. **notification** - User notifications

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dbms-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your database credentials:
   ```
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=voting_system
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret
   SESSION_SECRET=your_session_secret
   ```

4. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE voting_system;
   ```

5. **Initialize database**
   ```bash
   npm run init-db
   ```

6. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

7. **Access the application**
   Open your browser and go to `http://localhost:3000`

## Demo Credentials

### Admin Access
- **Email**: mimrobo1726@gmail.com
- **Password**: william shakespeare

### Voter Access
- **Email**: john@example.com
- **Password**: pass1

## API Endpoints

### Authentication
- `POST /auth/admin/login` - Admin login
- `POST /auth/voter/login` - Voter login
- `POST /auth/voter/register` - Voter registration
- `POST /auth/logout` - Logout

### Admin APIs
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/elections` - Manage elections
- `POST /admin/elections/create` - Create election
- `GET /admin/voters` - Manage voters
- `POST /admin/voters/:id/verify` - Verify voter
- `GET /admin/candidates` - Manage candidates
- `POST /admin/candidates/create` - Add candidate

### Voter APIs
- `GET /voter/dashboard` - Voter dashboard
- `GET /voter/elections` - Available elections
- `GET /voter/elections/:id/vote` - Voting page
- `POST /voter/elections/:id/vote` - Submit vote
- `GET /voter/history` - Voting history

### Public APIs
- `GET /api/elections` - Get all elections
- `GET /api/elections/:id` - Get election details
- `GET /api/elections/:id/results` - Get results

## Database Queries

The system implements various relational algebra operations:

### Basic Operations
- **Selection (σ)**: Filter voters by verification status
- **Projection (π)**: Select specific columns from results
- **Cross Product (×)**: Admin and election combinations
- **Natural Join (⋈)**: Vote, voter, and contest relationships

### Complex Queries
- **Left Outer Join**: Candidates with/without votes
- **Aggregation**: Vote counts and statistics
- **Subqueries**: Top candidates and election filtering
- **Set Operations**: Union of voter and admin emails

### Sample Queries Available at `/api/queries/`
- `/voter-vote-positions` - Voters with their contest positions
- `/admin-election-cross` - Admin-election cross join
- `/candidates-with-votes` - Candidates with vote counts
- `/election-schedule` - Elections with schedules
- `/voters-who-voted` - Voters who have cast votes
- `/vote-statistics` - Voting statistics

## Project Structure

```
dbms-project/
├── config/
│   └── database.js          # Database configuration
├── middlewares/
│   └── authMiddleware.js     # Authentication middleware
├── routes/
│   ├── index.js             # Main routes
│   ├── auth.js              # Authentication routes
│   ├── admin.js             # Admin routes
│   ├── voter.js             # Voter routes
│   └── api.js               # API routes
├── views/
│   ├── admin/               # Admin templates
│   ├── voter/               # Voter templates
│   ├── auth/                # Authentication templates
│   └── layout.ejs           # Main layout
├── public/
│   ├── css/
│   │   └── style.css        # Custom styles
│   └── js/
│       └── main.js          # Client-side JavaScript
├── scripts/
│   └── initDatabase.js      # Database initialization
├── server.js                # Main server file
├── package.json             # Dependencies
└── README.md               # This file
```

## Security Considerations

- **Input Validation**: All user inputs are validated
- **SQL Injection Prevention**: Parameterized queries used throughout
- **XSS Protection**: EJS templates with automatic escaping
- **CSRF Protection**: Session-based authentication
- **Rate Limiting**: API request limiting
- **Audit Logging**: All admin actions logged

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Email: support@votingsystem.com
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)

## Acknowledgments

- Built with [Node.js](https://nodejs.org/)
- UI components from [Bootstrap](https://getbootstrap.com/)
- Icons from [Bootstrap Icons](https://icons.getbootstrap.com/)
- Database: [PostgreSQL](https://www.postgresql.org/)

---

**Note**: This is a demonstration system. For production use, implement additional security measures including:
- Proper password hashing (bcrypt)
- Email verification
- Two-factor authentication
- Advanced encryption
- Professional security audit
