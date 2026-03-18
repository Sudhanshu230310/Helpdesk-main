# Helpdesk — Support Ticketing System

A full-stack helpdesk/ticketing system with **React + Tailwind CSS** frontend, **Node.js (Express)** backend, and **PostgreSQL** database with stored procedures.

## Features

- **Authentication**: Email/password login, LDAP login for technicians, OTP-based email verification
- **Role-Based Access**: Admin, Technician, and User roles with tailored dashboards
- **Ticket Management**: Create, assign, track, and close tickets with dynamic forms
- **Dynamic Forms**: Nested conditional form fields per subcategory
- **File Uploads**: Attach documents and images to tickets
- **Auto-Assignment**: Tickets auto-assign to teams based on category/subcategory
- **Conversation Thread**: Users and assigned technicians interact on tickets
- **OTP Ticket Closure**: Tickets can only be closed after OTP verification from the user
- **Item Tracking**: Track hardware/software items provided or replaced
- **Email Notifications**: Alerts to all stakeholders on ticket creation, update, and closure
- **Reports & Metrics**: Reports by category, team, and technician with charts
- **Turnaround Time**: Calculated excluding holidays, weekends, and user-hold time
- **Feedback System**: Star rating and comments after ticket closure
- **Audit Logs**: Full audit trail of all actions

## Tech Stack

| Layer    | Technology             |
|----------|------------------------|
| Frontend | React 18, Tailwind CSS 3, Vite 5, Recharts |
| Backend  | Node.js, Express, JWT, Multer, Nodemailer |
| Database | PostgreSQL with Stored Procedures |

## Project Structure

```
helpdesk_project/
├── database/
│   ├── schema.sql              # Tables, enums, indexes
│   ├── stored_procedures.sql   # All stored procedures
│   └── seed.sql                # Sample data
├── backend/
│   ├── server.js               # Express entry point
│   ├── config/                 # DB and Email config
│   ├── middleware/             # Auth, upload, error handler
│   ├── routes/                 # API routes
│   ├── controllers/            # Route handlers
│   ├── services/               # Email, OTP, LDAP services
│   └── uploads/                # File uploads directory
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios instance
│   │   ├── context/            # Auth context
│   │   ├── components/         # Shared components
│   │   └── pages/              # Page components
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

## Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **npm** >= 8.x

## Setup Instructions

### 1. Database Setup

```bash
# Create the database (if not already created)
createdb helpdesk_db

# Run schema (creates tables, enums, indexes)
psql -d helpdesk_db -f database/schema.sql

# Run stored procedures
psql -d helpdesk_db -f database/stored_procedures.sql

# Insert sample data
psql -d helpdesk_db -f database/seed.sql
```

### 2. Backend Setup

```bash
cd backend

# Copy and edit environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials and SMTP settings

# Install dependencies
npm install

# Start the server
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
# Frontend runs on http://localhost:5173
```

### 4. Open in Browser

Navigate to **http://localhost:5173**

## Demo Credentials

| Role       | Email                        | Password     |
|------------|------------------------------|--------------|
| Admin      | admin@helpdesk.com           | password123  |
| Technician | rahul.sharma@helpdesk.com    | password123  |
| Technician | priya.patel@helpdesk.com     | password123  |
| Technician | amit.kumar@helpdesk.com      | password123  |
| User       | sneha.gupta@example.com      | password123  |
| User       | vikram.singh@example.com     | password123  |
| User       | neha.agarwal@example.com     | password123  |

> **Note**: The sample password hash in `seed.sql` may need to be regenerated. Register a new user via the UI to get working credentials, or run the backend and use the `/api/auth/register` endpoint.

## API Endpoints

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/verify-otp` — Verify email OTP
- `POST /api/auth/login` — Email/password login
- `POST /api/auth/ldap-login` — LDAP login

### Tickets
- `GET /api/tickets` — List tickets (filtered by role)
- `POST /api/tickets` — Create ticket
- `GET /api/tickets/:id` — Ticket detail
- `POST /api/tickets/:id/interact` — Add interaction
- `POST /api/tickets/:id/upload` — Upload files
- `POST /api/tickets/:id/request-close` — Request closure OTP
- `POST /api/tickets/:id/close` — Close with OTP
- `POST /api/tickets/:id/feedback` — Submit feedback
- `POST /api/tickets/:id/items` — Add item provided/replaced

### Technicians
- `GET /api/technicians/tickets` — Assigned tickets
- `PUT /api/technicians/tickets/:id/assign` — Reassign
- `PUT /api/technicians/tickets/:id/status` — Update status

### Admin
- `GET /api/admin/dashboard` — Stats
- `GET /api/admin/reports/by-category` — Category report
- `GET /api/admin/reports/by-team` — Team report
- `GET /api/admin/reports/by-technician` — Technician report
- `GET /api/admin/users` — All users
- `POST /api/admin/teams` — Create team
- `POST /api/admin/categories` — Create category
- `POST /api/admin/subcategories` — Create subcategory

## Environment Variables

Key variables in `backend/.env`:

| Variable      | Description                           |
|---------------|---------------------------------------|
| `DB_HOST`     | PostgreSQL host (default: localhost)   |
| `DB_PORT`     | PostgreSQL port (default: 5432)        |
| `DB_NAME`     | Database name (helpdesk_db)            |
| `DB_USER`     | Database user                          |
| `DB_PASSWORD` | Database password                      |
| `JWT_SECRET`  | JWT signing secret                     |
| `SMTP_HOST`   | SMTP server for emails                 |
| `SMTP_USER`   | SMTP username/email                    |
| `SMTP_PASS`   | SMTP password/app password             |
| `LDAP_URL`    | LDAP server URL (optional)             |

## Email Configuration

For email notifications (OTP, ticket alerts) to work, configure SMTP in `.env`. For Gmail:

1. Enable 2-Step Verification in your Google Account
2. Generate an App Password: Google Account → Security → App passwords
3. Set `SMTP_USER=your@gmail.com` and `SMTP_PASS=your_app_password`

Without SMTP configured, emails are logged to the console instead.

## License

MIT
