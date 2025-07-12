# Online Voting Management System
## Schema Diagram
![DBMS Project](docs/dbms_project.svg)
## E-R Diagram
![Online Voting ER Model](docs/Online_voting_ER_model.svg)
## Tables
```
CREATE TABLE ADMIN (
  admin_id INT PRIMARY KEY,
  full_name VARCHAR2(255),
  email VARCHAR2(255) UNIQUE,
  password VARCHAR2(255)
);

describe admin;

CREATE TABLE VOTER (
  voter_id INT PRIMARY KEY,
  full_name VARCHAR2(255),
  dob DATE,
  address CLOB,
  email VARCHAR2(255) UNIQUE,
  password VARCHAR2(255),
  phone VARCHAR2(20),
  is_verified CHAR(1),  -- Use 'Y'/'N' or 0/1 convention
  registration_date TIMESTAMP,
  role VARCHAR2(100)
);

describe voter;

CREATE TABLE CANDIDATE (
  candidate_id INT PRIMARY KEY,
  full_name VARCHAR2(255),
  symbol VARCHAR2(100),
  party VARCHAR2(255),
  manifesto CLOB,
  photo_url VARCHAR2(1000)
);

describe candidate
    
CREATE TABLE ELECTION (
  election_id INT PRIMARY KEY,
  name VARCHAR2(255),
  election_type VARCHAR2(100),
  election_date DATE,
  is_active CHAR(1),  -- Use 'Y'/'N' or 0/1 convention
  admin_id INT,
  description CLOB,
  CONSTRAINT fk_election_admin FOREIGN KEY (admin_id) REFERENCES ADMIN(admin_id)
);

describe election
    
CREATE TABLE SCHEDULE (
  schedule_id INT PRIMARY KEY,
  election_id INT,
  nomination_start TIMESTAMP,
  nomination_end TIMESTAMP,
  voting_start TIMESTAMP,
  voting_end TIMESTAMP,
  result_declared TIMESTAMP,
  CONSTRAINT fk_schedule_election FOREIGN KEY (election_id) REFERENCES ELECTION(election_id)
);

describe schedule
    
CREATE TABLE CONTEST (
  contest_id INT PRIMARY KEY,
  election_id INT,
  candidate_id INT,
  position VARCHAR2(100),
  CONSTRAINT fk_contest_election FOREIGN KEY (election_id) REFERENCES ELECTION(election_id),
  CONSTRAINT fk_contest_candidate FOREIGN KEY (candidate_id) REFERENCES CANDIDATE(candidate_id)
);

describe contest

CREATE TABLE VOTE (
  vote_id INT PRIMARY KEY,
  contest_id INT,
  voter_id INT,
  vote_timestamp TIMESTAMP,
  ip_address VARCHAR2(50),
  CONSTRAINT fk_vote_contest FOREIGN KEY (contest_id) REFERENCES CONTEST(contest_id),
  CONSTRAINT fk_vote_voter FOREIGN KEY (voter_id) REFERENCES VOTER(voter_id)
);

describe vote

CREATE TABLE RESULT (
  result_id INT PRIMARY KEY,
  election_id INT,
  candidate_id INT,
  total_votes INT,
  percentage FLOAT,
  CONSTRAINT fk_result_election FOREIGN KEY (election_id) REFERENCES ELECTION(election_id),
  CONSTRAINT fk_result_candidate FOREIGN KEY (candidate_id) REFERENCES CANDIDATE(candidate_id)
);

describe result

CREATE TABLE AUDIT_LOG (
  log_id INT PRIMARY KEY,
  admin_id INT,
  action VARCHAR2(255),
  description CLOB,
  timestamp TIMESTAMP,
  ip_address VARCHAR2(50),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES ADMIN(admin_id)
);

describe audit_log

CREATE TABLE NOTIFICATION (
  notification_id INT PRIMARY KEY,
  admin_id INT,
  voter_id INT,
  candidate_id INT,
  message CLOB,
  created_at TIMESTAMP,
  is_read CHAR(1),
  CONSTRAINT fk_notification_admin FOREIGN KEY (admin_id) REFERENCES ADMIN(admin_id),
  CONSTRAINT fk_notification_voter FOREIGN KEY (voter_id) REFERENCES VOTER(voter_id),
  CONSTRAINT fk_notification_candidate FOREIGN KEY (candidate_id) REFERENCES CANDIDATE(candidate_id)
);

describe notification
```
## Directory Layout
```
online-voting-system/
│
├── 📁 public/                      # Frontend static files (HTML, CSS, JS)
│   ├── index.html                 # Login page
│   ├── vote.html                  # Voter dashboard (cast vote)
│   ├── admin.html                 # Admin dashboard
│   ├── styles.css                 # Shared styles
│   └── script.js                  # Shared JavaScript
│
├── 📁 routes/                      # Express route files
│   ├── authRoutes.js              # Login, logout for voter/admin
│   ├── voterRoutes.js             # Voter-specific routes (cast vote, view candidates)
│   ├── adminRoutes.js             # Admin routes (add candidate, view results)
│
├── 📁 controllers/                # Business logic separated from routes
│   ├── authController.js
│   ├── voterController.js
│   └── adminController.js
│
├── 📁 models/                     # Database query logic (optional: use SQL or ORM)
│   ├── voterModel.js
│   ├── candidateModel.js
│   └── voteModel.js
│
├── 📁 config/
│   └── db.js                      # PostgreSQL connection pool setup
│
├── 📁 middlewares/               # Middleware like auth, logging, etc.
│   └── authMiddleware.js
│
├── 📁 utils/                      # Helper functions (e.g., password hash)
│   └── hashPassword.js
│
├── 📁 sql/                        # Optional: SQL schema and seed data
│   ├── schema.sql
│   └── seed.sql
│
├── 📁 docs/                       # ER diagram, report, screenshots
│   ├── er-diagram.svg
│   ├── project-report.pdf
│   └── usage-guide.md
│
├── .gitignore
├── package.json
├── README.md
└── server.js                     # Main Express server entry point
```
