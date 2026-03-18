-- ============================================================
-- Helpdesk/Ticketing System — Database Schema
-- Database: helpdesk_db
-- ============================================================

-- Enable UUID extension (requires superuser — run as postgres user if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'technician', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'with_user', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE otp_purpose AS ENUM ('registration', 'ticket_closure');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Users table (all roles: admin, technician, user)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for LDAP-only users
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'user',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    ldap_dn VARCHAR(500),       -- LDAP distinguished name (for technicians)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Teams
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Team members (many-to-many: users ↔ teams)
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 4. Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Subcategories
CREATE TABLE IF NOT EXISTS subcategories (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    assigned_team_id INT REFERENCES teams(id) ON DELETE SET NULL, -- auto-assign target
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- 6. Form field configurations (for dynamic/nested forms)
CREATE TABLE IF NOT EXISTS form_fields (
    id SERIAL PRIMARY KEY,
    subcategory_id INT NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL DEFAULT 'text',  -- text, textarea, select, radio, checkbox, file
    field_options JSONB,        -- for select/radio: [{value, label}]
    is_required BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    parent_field_id INT REFERENCES form_fields(id) ON DELETE CASCADE,  -- for nested if-else
    parent_field_value VARCHAR(255),  -- show this field only when parent has this value
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., HD-20260001
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    category_id INT REFERENCES categories(id),
    subcategory_id INT REFERENCES subcategories(id),
    priority ticket_priority DEFAULT 'medium',
    status ticket_status DEFAULT 'open',
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),       -- technician
    assigned_team_id INT REFERENCES teams(id),
    form_data JSONB,            -- dynamic form field values
    created_on_behalf BOOLEAN DEFAULT FALSE,     -- if tech raised it for user
    behalf_user_id UUID REFERENCES users(id),    -- the actual user when raised by tech
    with_user_since TIMESTAMP,     -- when ticket was sent back to user
    total_user_hold_time INTERVAL DEFAULT '0 seconds',  -- accumulated user hold
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Ticket interactions (conversation thread)
CREATE TABLE IF NOT EXISTS ticket_interactions (
    id SERIAL PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,  -- internal notes visible only to techs/admins
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Ticket file attachments
CREATE TABLE IF NOT EXISTS ticket_files (
    id SERIAL PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    original_name VARCHAR(500) NOT NULL,
    stored_name VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Items provided/replaced on a ticket
CREATE TABLE IF NOT EXISTS ticket_items (
    id SERIAL PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,    -- e.g., "Network Cable", "IP Phone"
    item_type VARCHAR(100),             -- e.g., "Hardware", "Software"
    quantity INT DEFAULT 1,
    serial_number VARCHAR(100),
    notes TEXT,
    provided_by UUID REFERENCES users(id),
    provided_at TIMESTAMP DEFAULT NOW()
);

-- 11. OTP verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose otp_purpose NOT NULL,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,  -- for ticket closure OTPs
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 12. Feedback
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 13. Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,     -- 'ticket', 'user', etc.
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,          -- 'created', 'updated', 'assigned', 'closed'
    performed_by UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 14. Holidays (for turnaround time calculation)
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    holiday_date DATE NOT NULL UNIQUE,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 15. Email notifications log
CREATE TABLE IF NOT EXISTS email_logs (
    id BIGSERIAL PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    status VARCHAR(20) DEFAULT 'sent',   -- sent, failed
    error_message TEXT,
    ticket_id UUID REFERENCES tickets(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_team ON tickets(assigned_team_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_interactions_ticket ON ticket_interactions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email, purpose);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- SEQUENCE for ticket numbers
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1000;
