# Online Voting Management System
## Schema Diagram
![DBMS Project](docs/dbms_project.svg)
## E-R Diagram
![Online Voting ER Model](docs/Online_voting_ER_model.svg)
## Tables
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
