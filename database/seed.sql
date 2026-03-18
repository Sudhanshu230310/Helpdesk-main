-- ============================================================
-- Helpdesk/Ticketing System — Seed Data
-- Database: helpdesk_db
-- ============================================================
-- Passwords: all sample passwords are 'password123' hashed with bcrypt
-- $2b$10$YourHashHere is a placeholder — the backend will hash on registration.
-- For seeding, we use a pre-computed bcrypt hash of 'password123'.

-- ============================================================
-- 1. USERS
-- ============================================================
INSERT INTO users (id, name, email, password_hash, phone, role, department, is_active, is_verified)
VALUES
    -- Admin
    ('a0000000-0000-0000-0000-000000000001', 'Admin User', 'admin@helpdesk.com',
     '$2b$10$8KzQKHn4QdDZxFYB0Tg8eOiYkJX6VYm9QxQR5vZ3nP1mC0y1hG9Ky',
     '9876543210', 'admin', 'IT Administration', TRUE, TRUE),

    -- Technicians
    ('b0000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'rahul.sharma@helpdesk.com',
     '$2b$10$8KzQKHn4QdDZxFYB0Tg8eOiYkJX6VYm9QxQR5vZ3nP1mC0y1hG9Ky',
     '9876543211', 'technician', 'Network Team', TRUE, TRUE),

    ('b0000000-0000-0000-0000-000000000002', 'Priya Patel', 'priya.patel@helpdesk.com',
     '$2b$10$8KzQKHn4QdDZxFYB0Tg8eOiYkJX6VYm9QxQR5vZ3nP1mC0y1hG9Ky',
     '9876543212', 'technician', 'Software Team', TRUE, TRUE),

    ('b0000000-0000-0000-0000-000000000003', 'Amit Kumar', 'amit.kumar@helpdesk.com',
     '$2b$10$8KzQKHn4QdDZxFYB0Tg8eOiYkJX6VYm9QxQR5vZ3nP1mC0y1hG9Ky',
     '9876543213', 'technician', 'Hardware Team', TRUE, TRUE),

    -- Users
    ('c0000000-0000-0000-0000-000000000001', 'Sneha Gupta', 'sneha.gupta@example.com',
     '$2b$10$8KzQKHn4QdDZxFYB0Tg8eOiYkJX6VYm9QxQR5vZ3nP1mC0y1hG9Ky',
     '9876543214', 'user', 'Finance', TRUE, TRUE),

    ('c0000000-0000-0000-0000-000000000002', 'Vikram Singh', 'vikram.singh@example.com',
     '$2b$10$8KzQKHn4QdDZxFYB0Tg8eOiYkJX6VYm9QxQR5vZ3nP1mC0y1hG9Ky',
     '9876543215', 'user', 'HR', TRUE, TRUE),

    ('c0000000-0000-0000-0000-000000000003', 'Neha Agarwal', 'neha.agarwal@example.com',
     '$2b$10$8KzQKHn4QdDZxFYB0Tg8eOiYkJX6VYm9QxQR5vZ3nP1mC0y1hG9Ky',
     '9876543216', 'user', 'Marketing', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. TEAMS
-- ============================================================
INSERT INTO teams (id, name, description, team_lead_id)
VALUES
    (1, 'Network Support', 'Handles network-related issues like LAN, WiFi, VPN', 'b0000000-0000-0000-0000-000000000001'),
    (2, 'Software Support', 'Handles software installation, licensing, and bugs', 'b0000000-0000-0000-0000-000000000002'),
    (3, 'Hardware Support', 'Handles hardware replacement, repair, and provisioning', 'b0000000-0000-0000-0000-000000000003')
ON CONFLICT (name) DO NOTHING;

-- Reset sequence
SELECT setval(pg_get_serial_sequence('teams', 'id'), (SELECT COALESCE(MAX(id), 0) FROM teams) + 1);

-- ============================================================
-- 3. TEAM MEMBERS
-- ============================================================
INSERT INTO team_members (team_id, user_id) VALUES
    (1, 'b0000000-0000-0000-0000-000000000001'),
    (2, 'b0000000-0000-0000-0000-000000000002'),
    (3, 'b0000000-0000-0000-0000-000000000003')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ============================================================
-- 4. CATEGORIES
-- ============================================================
INSERT INTO categories (id, name, description) VALUES
    (1, 'Network', 'Network connectivity and infrastructure issues'),
    (2, 'Software', 'Software installation, updates, and licensing'),
    (3, 'Hardware', 'Hardware provisioning, repair, and replacement'),
    (4, 'Access & Permissions', 'Account access, permissions, and security')
ON CONFLICT (name) DO NOTHING;

SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT COALESCE(MAX(id), 0) FROM categories) + 1);

-- ============================================================
-- 5. SUBCATEGORIES
-- ============================================================
INSERT INTO subcategories (id, category_id, name, description, assigned_team_id) VALUES
    -- Network
    (1, 1, 'LAN Issue', 'Local area network connectivity problems', 1),
    (2, 1, 'WiFi Issue', 'Wireless network connectivity problems', 1),
    (3, 1, 'VPN Issue', 'VPN connection and access problems', 1),
    (4, 1, 'IP Phone', 'IP phone setup and issues', 1),
    -- Software
    (5, 2, 'Installation Request', 'New software installation', 2),
    (6, 2, 'License Issue', 'Software license activation or renewal', 2),
    (7, 2, 'Bug Report', 'Software bug/error report', 2),
    (8, 2, 'Update Request', 'Software update or patch request', 2),
    -- Hardware
    (9, 3, 'New Hardware', 'Request for new hardware equipment', 3),
    (10, 3, 'Hardware Repair', 'Hardware malfunction and repair', 3),
    (11, 3, 'Replacement', 'Hardware replacement request', 3),
    -- Access
    (12, 4, 'Account Creation', 'New account creation request', 2),
    (13, 4, 'Password Reset', 'Password reset assistance', 2),
    (14, 4, 'Permission Change', 'Change in access permissions', 2)
ON CONFLICT (category_id, name) DO NOTHING;

SELECT setval(pg_get_serial_sequence('subcategories', 'id'), (SELECT COALESCE(MAX(id), 0) FROM subcategories) + 1);

-- ============================================================
-- 6. FORM FIELDS (Dynamic forms with nested logic)
-- ============================================================
-- Network > LAN Issue
INSERT INTO form_fields (id, subcategory_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (1, 1, 'location', 'Building / Location', 'text', NULL, TRUE, 1),
    (2, 1, 'floor', 'Floor Number', 'select', '[{"value":"ground","label":"Ground Floor"},{"value":"1","label":"1st Floor"},{"value":"2","label":"2nd Floor"},{"value":"3","label":"3rd Floor"}]', TRUE, 2),
    (3, 1, 'port_number', 'LAN Port Number', 'text', NULL, FALSE, 3),
    (4, 1, 'issue_type', 'Type of Issue', 'select', '[{"value":"no_connectivity","label":"No Connectivity"},{"value":"slow","label":"Slow Speed"},{"value":"intermittent","label":"Intermittent Connection"}]', TRUE, 4);

-- Nested: if issue_type = 'no_connectivity'
INSERT INTO form_fields (id, subcategory_id, field_name, field_label, field_type, field_options, is_required, display_order, parent_field_id, parent_field_value) VALUES
    (5, 1, 'cable_status', 'Is the cable connected?', 'radio', '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]', TRUE, 5, 4, 'no_connectivity');

-- Nested: if cable_status = 'no'
INSERT INTO form_fields (id, subcategory_id, field_name, field_label, field_type, field_options, is_required, display_order, parent_field_id, parent_field_value) VALUES
    (6, 1, 'cable_request', 'Do you need a new cable?', 'radio', '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]', FALSE, 6, 5, 'no');

-- Software > Installation Request
INSERT INTO form_fields (id, subcategory_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (7, 5, 'software_name', 'Software Name', 'text', NULL, TRUE, 1),
    (8, 5, 'software_version', 'Version (if specific)', 'text', NULL, FALSE, 2),
    (9, 5, 'os_type', 'Operating System', 'select', '[{"value":"windows","label":"Windows"},{"value":"mac","label":"macOS"},{"value":"linux","label":"Linux"}]', TRUE, 3),
    (10, 5, 'justification', 'Business Justification', 'textarea', NULL, TRUE, 4);

-- Hardware > Replacement
INSERT INTO form_fields (id, subcategory_id, field_name, field_label, field_type, field_options, is_required, display_order) VALUES
    (11, 11, 'device_type', 'Device Type', 'select', '[{"value":"laptop","label":"Laptop"},{"value":"desktop","label":"Desktop"},{"value":"monitor","label":"Monitor"},{"value":"keyboard","label":"Keyboard/Mouse"},{"value":"other","label":"Other"}]', TRUE, 1),
    (12, 11, 'asset_number', 'Current Asset Number', 'text', NULL, TRUE, 2),
    (13, 11, 'issue_desc', 'Describe the issue', 'textarea', NULL, TRUE, 3);

-- Nested: if device_type = 'laptop'
INSERT INTO form_fields (id, subcategory_id, field_name, field_label, field_type, field_options, is_required, display_order, parent_field_id, parent_field_value) VALUES
    (14, 11, 'laptop_model', 'Current Laptop Model', 'text', NULL, TRUE, 4, 11, 'laptop'),
    (15, 11, 'data_backup', 'Is data backed up?', 'radio', '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]', TRUE, 5, 11, 'laptop');

SELECT setval(pg_get_serial_sequence('form_fields', 'id'), (SELECT COALESCE(MAX(id), 0) FROM form_fields) + 1);

-- ============================================================
-- 7. HOLIDAYS (2026)
-- ============================================================
INSERT INTO holidays (name, holiday_date, is_recurring) VALUES
    ('Republic Day', '2026-01-26', TRUE),
    ('Holi', '2026-03-17', FALSE),
    ('Good Friday', '2026-04-03', FALSE),
    ('May Day', '2026-05-01', TRUE),
    ('Independence Day', '2026-08-15', TRUE),
    ('Gandhi Jayanti', '2026-10-02', TRUE),
    ('Diwali', '2026-11-08', FALSE),
    ('Christmas', '2026-12-25', TRUE)
ON CONFLICT (holiday_date) DO NOTHING;

-- ============================================================
-- 8. SAMPLE TICKETS
-- ============================================================
INSERT INTO tickets (id, ticket_number, title, description, category_id, subcategory_id, priority, status, created_by, assigned_to, assigned_team_id, form_data, created_at, updated_at)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'HD-0001000', 'LAN not working in Finance Block',
     'Cannot access the network from my desk. Port seems dead.', 1, 1, 'high', 'in_progress',
     'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1,
     '{"location":"Finance Block","floor":"2","port_number":"FN-204","issue_type":"no_connectivity","cable_status":"yes"}',
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),

    ('d0000000-0000-0000-0000-000000000002', 'HD-0001001', 'Install Adobe Acrobat Pro',
     'Need Adobe Acrobat Pro for PDF editing in Marketing.', 2, 5, 'medium', 'open',
     'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 2,
     '{"software_name":"Adobe Acrobat Pro","software_version":"2024","os_type":"windows","justification":"Need to edit PDF documents for marketing collateral"}',
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

    ('d0000000-0000-0000-0000-000000000003', 'HD-0001002', 'Laptop keyboard not working',
     'Several keys on my laptop keyboard have stopped responding.', 3, 11, 'high', 'in_progress',
     'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 3,
     '{"device_type":"laptop","asset_number":"LAP-HR-0042","issue_desc":"Keys F5-F8 and Z, X, C not responding","laptop_model":"Dell Latitude 5520","data_backup":"yes"}',
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),

    ('d0000000-0000-0000-0000-000000000004', 'HD-0001003', 'WiFi connectivity drops frequently',
     'WiFi keeps disconnecting every 10-15 minutes in the HR block.', 1, 2, 'medium', 'with_user',
     'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 1,
     NULL,
     NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days'),

    ('d0000000-0000-0000-0000-000000000005', 'HD-0001004', 'New monitor request',
     'Requesting a second monitor for design work.', 3, 9, 'low', 'closed',
     'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 3,
     NULL,
     NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days')
ON CONFLICT (ticket_number) DO NOTHING;

-- Set with_user_since for ticket 4
UPDATE tickets SET with_user_since = NOW() - INTERVAL '3 days'
WHERE id = 'd0000000-0000-0000-0000-000000000004';

-- Set closed_at for ticket 5
UPDATE tickets SET closed_at = NOW() - INTERVAL '10 days'
WHERE id = 'd0000000-0000-0000-0000-000000000005';

-- ============================================================
-- 9. SAMPLE INTERACTIONS
-- ============================================================
INSERT INTO ticket_interactions (ticket_id, user_id, message, is_internal, created_at) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'Hi, my LAN port seems to be dead. I cannot connect at all.', FALSE, NOW() - INTERVAL '3 days'),
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
     'We will check the port. In the meantime, can you try connecting from an adjacent port?', FALSE, NOW() - INTERVAL '2 days 20 hours'),
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
     'Internal note: Port FN-204 needs to be re-patched at the switch.', TRUE, NOW() - INTERVAL '2 days 19 hours'),
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'Tried adjacent port FN-205, same issue.', FALSE, NOW() - INTERVAL '2 days'),
    ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002',
     'WiFi keeps dropping every 10-15 minutes.', FALSE, NOW() - INTERVAL '7 days'),
    ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
     'We have reset the access point. Can you check if the issue persists?', FALSE, NOW() - INTERVAL '5 days');

-- ============================================================
-- 10. SAMPLE ITEMS PROVIDED
-- ============================================================
INSERT INTO ticket_items (ticket_id, item_name, item_type, quantity, serial_number, notes, provided_by) VALUES
    ('d0000000-0000-0000-0000-000000000005', 'Dell P2422H Monitor', 'Hardware', 1, 'MON-2026-0042',
     'Provided 24-inch Dell monitor for design team.', 'b0000000-0000-0000-0000-000000000003');

-- ============================================================
-- 11. SAMPLE FEEDBACK
-- ============================================================
INSERT INTO feedback (ticket_id, user_id, rating, comment) VALUES
    ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003',
     5, 'Great service! Got the monitor within 2 days.')
ON CONFLICT (ticket_id) DO NOTHING;

-- ============================================================
-- 12. SAMPLE AUDIT LOGS
-- ============================================================
INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_values, created_at) VALUES
    ('ticket', 'd0000000-0000-0000-0000-000000000001', 'created', 'c0000000-0000-0000-0000-000000000001',
     '{"ticket_number":"HD-0001000","title":"LAN not working in Finance Block"}', NOW() - INTERVAL '3 days'),
    ('ticket', 'd0000000-0000-0000-0000-000000000005', 'closed', 'b0000000-0000-0000-0000-000000000003',
     '{"status":"closed"}', NOW() - INTERVAL '10 days');
