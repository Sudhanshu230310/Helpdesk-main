-- ============================================================
-- Helpdesk/Ticketing System — Stored Procedures
-- Database: helpdesk_db
-- ============================================================

-- ============================================================
-- 1. USER MANAGEMENT PROCEDURES
-- ============================================================

-- Register a new user
CREATE OR REPLACE FUNCTION sp_register_user(
    p_name VARCHAR,
    p_email VARCHAR,
    p_password_hash VARCHAR,
    p_phone VARCHAR DEFAULT NULL,
    p_department VARCHAR DEFAULT NULL,
    p_role user_role DEFAULT 'user'
) RETURNS TABLE(user_id UUID, user_email VARCHAR, user_name VARCHAR, user_role user_role) AS $$
BEGIN
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email already registered: %', p_email;
    END IF;

    RETURN QUERY
    INSERT INTO users (name, email, password_hash, phone, department, role)
    VALUES (p_name, p_email, p_password_hash, p_phone, p_department, p_role)
    RETURNING id AS user_id, email AS user_email, name AS user_name, role AS user_role;
END;
$$ LANGUAGE plpgsql;

-- Verify user (after OTP)
CREATE OR REPLACE FUNCTION sp_verify_user(p_email VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INT;
BEGIN
    UPDATE users SET is_verified = TRUE, updated_at = NOW()
    WHERE email = p_email AND is_verified = FALSE;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Get user by email (for login)
CREATE OR REPLACE FUNCTION sp_get_user_by_email(p_email VARCHAR)
RETURNS TABLE(
    id UUID, name VARCHAR, email VARCHAR, password_hash VARCHAR,
    phone VARCHAR, role user_role, department VARCHAR,
    is_active BOOLEAN, is_verified BOOLEAN, ldap_dn VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.email, u.password_hash,
           u.phone, u.role, u.department,
           u.is_active, u.is_verified, u.ldap_dn
    FROM users u WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Get user by ID
CREATE OR REPLACE FUNCTION sp_get_user_by_id(p_id UUID)
RETURNS TABLE(
    id UUID, name VARCHAR, email VARCHAR,
    phone VARCHAR, role user_role, department VARCHAR,
    is_active BOOLEAN, is_verified BOOLEAN, created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.email,
           u.phone, u.role, u.department,
           u.is_active, u.is_verified, u.created_at
    FROM users u WHERE u.id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Update user profile
CREATE OR REPLACE FUNCTION sp_update_user_profile(
    p_id UUID,
    p_name VARCHAR DEFAULT NULL,
    p_phone VARCHAR DEFAULT NULL,
    p_department VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users SET
        name = COALESCE(p_name, name),
        phone = COALESCE(p_phone, phone),
        department = COALESCE(p_department, department),
        updated_at = NOW()
    WHERE id = p_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Get all users (admin)
CREATE OR REPLACE FUNCTION sp_get_all_users(
    p_role user_role DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE(
    id UUID, name VARCHAR, email VARCHAR, phone VARCHAR,
    role user_role, department VARCHAR, is_active BOOLEAN,
    is_verified BOOLEAN, created_at TIMESTAMP, total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.email, u.phone,
           u.role, u.department, u.is_active,
           u.is_verified, u.created_at,
           COUNT(*) OVER() AS total_count
    FROM users u
    WHERE (p_role IS NULL OR u.role = p_role)
    ORDER BY u.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- LDAP user upsert (create or update user from LDAP)
CREATE OR REPLACE FUNCTION sp_upsert_ldap_user(
    p_name VARCHAR,
    p_email VARCHAR,
    p_ldap_dn VARCHAR,
    p_department VARCHAR DEFAULT NULL
) RETURNS TABLE(user_id UUID, user_email VARCHAR, user_name VARCHAR, user_role user_role) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO users (name, email, ldap_dn, department, role, is_verified, is_active)
    VALUES (p_name, p_email, p_ldap_dn, p_department, 'technician', TRUE, TRUE)
    ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        ldap_dn = EXCLUDED.ldap_dn,
        department = COALESCE(EXCLUDED.department, users.department),
        updated_at = NOW()
    RETURNING id AS user_id, users.email AS user_email, users.name AS user_name, users.role AS user_role;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. OTP PROCEDURES
-- ============================================================

-- Generate and store OTP
CREATE OR REPLACE FUNCTION sp_create_otp(
    p_email VARCHAR,
    p_otp_code VARCHAR,
    p_purpose otp_purpose,
    p_user_id UUID DEFAULT NULL,
    p_ticket_id UUID DEFAULT NULL,
    p_expires_minutes INT DEFAULT 10
) RETURNS INT AS $$
DECLARE
    v_id INT;
BEGIN
    -- Invalidate previous unused OTPs of same purpose for this email
    UPDATE otp_verifications
    SET is_used = TRUE
    WHERE email = p_email AND purpose = p_purpose AND is_used = FALSE;

    INSERT INTO otp_verifications (user_id, email, otp_code, purpose, ticket_id, expires_at)
    VALUES (p_user_id, p_email, p_otp_code, p_purpose, p_ticket_id, NOW() + (p_expires_minutes || ' minutes')::INTERVAL)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Verify OTP
CREATE OR REPLACE FUNCTION sp_verify_otp(
    p_email VARCHAR,
    p_otp_code VARCHAR,
    p_purpose otp_purpose
) RETURNS TABLE(is_valid BOOLEAN, otp_user_id UUID, otp_ticket_id UUID) AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT ov.id, ov.user_id, ov.ticket_id
    INTO v_record
    FROM otp_verifications ov
    WHERE ov.email = p_email
      AND ov.otp_code = p_otp_code
      AND ov.purpose = p_purpose
      AND ov.is_used = FALSE
      AND ov.expires_at > NOW()
    ORDER BY ov.created_at DESC
    LIMIT 1;

    IF v_record.id IS NOT NULL THEN
        UPDATE otp_verifications SET is_used = TRUE WHERE id = v_record.id;
        RETURN QUERY SELECT TRUE, v_record.user_id, v_record.ticket_id;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. TEAM & CATEGORY PROCEDURES
-- ============================================================

-- Create team
CREATE OR REPLACE FUNCTION sp_create_team(
    p_name VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_team_lead_id UUID DEFAULT NULL
) RETURNS TABLE(team_id INT, team_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO teams (name, description, team_lead_id)
    VALUES (p_name, p_description, p_team_lead_id)
    RETURNING id AS team_id, name AS team_name;
END;
$$ LANGUAGE plpgsql;

-- Add member to team
CREATE OR REPLACE FUNCTION sp_add_team_member(p_team_id INT, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO team_members (team_id, user_id) VALUES (p_team_id, p_user_id)
    ON CONFLICT (team_id, user_id) DO NOTHING;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get all teams
CREATE OR REPLACE FUNCTION sp_get_all_teams()
RETURNS TABLE(
    id INT, name VARCHAR, description TEXT,
    team_lead_id UUID, team_lead_name VARCHAR,
    member_count BIGINT, is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.description,
           t.team_lead_id, u.name AS team_lead_name,
           (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
           t.is_active
    FROM teams t
    LEFT JOIN users u ON t.team_lead_id = u.id
    WHERE t.is_active = TRUE
    ORDER BY t.name;
END;
$$ LANGUAGE plpgsql;

-- Create category
CREATE OR REPLACE FUNCTION sp_create_category(
    p_name VARCHAR,
    p_description TEXT DEFAULT NULL
) RETURNS TABLE(category_id INT, category_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO categories (name, description)
    VALUES (p_name, p_description)
    RETURNING id AS category_id, name AS category_name;
END;
$$ LANGUAGE plpgsql;

-- Create subcategory
CREATE OR REPLACE FUNCTION sp_create_subcategory(
    p_category_id INT,
    p_name VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_assigned_team_id INT DEFAULT NULL
) RETURNS TABLE(subcategory_id INT, subcategory_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO subcategories (category_id, name, description, assigned_team_id)
    VALUES (p_category_id, p_name, p_description, p_assigned_team_id)
    RETURNING id AS subcategory_id, name AS subcategory_name;
END;
$$ LANGUAGE plpgsql;

-- Get all categories with subcategories
CREATE OR REPLACE FUNCTION sp_get_categories_with_subcategories()
RETURNS TABLE(
    cat_id INT, cat_name VARCHAR, cat_description TEXT,
    sub_id INT, sub_name VARCHAR, sub_description TEXT,
    assigned_team_id INT, assigned_team_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.description,
           s.id, s.name, s.description,
           s.assigned_team_id, t.name
    FROM categories c
    LEFT JOIN subcategories s ON c.id = s.category_id AND s.is_active = TRUE
    LEFT JOIN teams t ON s.assigned_team_id = t.id
    WHERE c.is_active = TRUE
    ORDER BY c.name, s.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. TICKET PROCEDURES
-- ============================================================

-- Create ticket
CREATE OR REPLACE FUNCTION sp_create_ticket(
    p_title VARCHAR,
    p_description TEXT,
    p_category_id INT,
    p_subcategory_id INT DEFAULT NULL,
    p_priority ticket_priority DEFAULT 'medium',
    p_created_by UUID DEFAULT NULL,
    p_form_data JSONB DEFAULT NULL,
    p_on_behalf BOOLEAN DEFAULT FALSE,
    p_behalf_user_id UUID DEFAULT NULL
) RETURNS TABLE(
    ticket_id UUID, ticket_number VARCHAR, assigned_team_id INT,
    assigned_to UUID, status ticket_status
) AS $$
DECLARE
    v_ticket_number VARCHAR;
    v_team_id INT;
    v_assigned_to UUID;
    v_ticket_id UUID;
BEGIN
    -- Generate ticket number
    v_ticket_number := 'HD-' || LPAD(nextval('ticket_number_seq')::TEXT, 7, '0');

    -- Auto-assign team based on subcategory
    IF p_subcategory_id IS NOT NULL THEN
        SELECT s.assigned_team_id INTO v_team_id
        FROM subcategories s WHERE s.id = p_subcategory_id;

        -- Round-Robin: Assign to team member with fewest active tickets
        IF v_team_id IS NOT NULL THEN
            SELECT tm.user_id INTO v_assigned_to
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id AND u.is_active = TRUE
            LEFT JOIN tickets t ON t.assigned_to = tm.user_id AND t.status IN ('open', 'in_progress')
            WHERE tm.team_id = v_team_id
            GROUP BY tm.user_id
            ORDER BY COUNT(t.id) ASC, RANDOM()
            LIMIT 1;
        END IF;
    END IF;

    INSERT INTO tickets (
        ticket_number, title, description, category_id, subcategory_id,
        priority, created_by, assigned_to, assigned_team_id,
        form_data, created_on_behalf, behalf_user_id
    ) VALUES (
        v_ticket_number, p_title, p_description, p_category_id, p_subcategory_id,
        p_priority, p_created_by, v_assigned_to, v_team_id,
        p_form_data, p_on_behalf, p_behalf_user_id
    ) RETURNING id INTO v_ticket_id;

    -- Audit log
    INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_values)
    VALUES ('ticket', v_ticket_id::TEXT, 'created', p_created_by,
            jsonb_build_object('ticket_number', v_ticket_number, 'title', p_title, 'status', 'open'));

    RETURN QUERY
    SELECT v_ticket_id, v_ticket_number, v_team_id, v_assigned_to, 'open'::ticket_status;
END;
$$ LANGUAGE plpgsql;

-- Get tickets with filters
CREATE OR REPLACE FUNCTION sp_get_tickets(
    p_user_id UUID DEFAULT NULL,
    p_role user_role DEFAULT NULL,
    p_status ticket_status DEFAULT NULL,
    p_category_id INT DEFAULT NULL,
    p_assigned_to UUID DEFAULT NULL,
    p_team_id INT DEFAULT NULL,
    p_search VARCHAR DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE(
    id UUID, ticket_number VARCHAR, title VARCHAR, description TEXT,
    category_name VARCHAR, subcategory_name VARCHAR,
    priority ticket_priority, status ticket_status,
    creator_name VARCHAR, creator_email VARCHAR,
    assignee_name VARCHAR, team_name VARCHAR,
    created_at TIMESTAMP, updated_at TIMESTAMP,
    closed_at TIMESTAMP, total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.ticket_number, t.title, t.description,
           c.name AS category_name, s.name AS subcategory_name,
           t.priority, t.status,
           cu.name AS creator_name, cu.email AS creator_email,
           au.name AS assignee_name, tm.name AS team_name,
           t.created_at, t.updated_at,
           t.closed_at,
           COUNT(*) OVER() AS total_count
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN subcategories s ON t.subcategory_id = s.id
    LEFT JOIN users cu ON t.created_by = cu.id
    LEFT JOIN users au ON t.assigned_to = au.id
    LEFT JOIN teams tm ON t.assigned_team_id = tm.id
    WHERE (p_status IS NULL OR t.status = p_status)
      AND (p_category_id IS NULL OR t.category_id = p_category_id)
      AND (p_assigned_to IS NULL OR t.assigned_to = p_assigned_to)
      AND (p_team_id IS NULL OR t.assigned_team_id = p_team_id)
      AND (p_search IS NULL OR t.title ILIKE '%' || p_search || '%' OR t.ticket_number ILIKE '%' || p_search || '%')
      AND (
          p_role = 'admin'
          OR (p_role = 'technician' AND (t.assigned_to = p_user_id OR t.assigned_team_id IN (
              SELECT tm2.team_id FROM team_members tm2 WHERE tm2.user_id = p_user_id
          )))
          OR (p_role = 'user' AND (t.created_by = p_user_id OR t.behalf_user_id = p_user_id))
          OR p_role IS NULL
      )
    ORDER BY t.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get single ticket by ID
CREATE OR REPLACE FUNCTION sp_get_ticket_by_id(p_ticket_id UUID)
RETURNS TABLE(
    id UUID, ticket_number VARCHAR, title VARCHAR, description TEXT,
    category_id INT, category_name VARCHAR,
    subcategory_id INT, subcategory_name VARCHAR,
    priority ticket_priority, status ticket_status,
    created_by UUID, creator_name VARCHAR, creator_email VARCHAR,
    assigned_to UUID, assignee_name VARCHAR, assignee_email VARCHAR,
    assigned_team_id INT, team_name VARCHAR,
    form_data JSONB, created_on_behalf BOOLEAN,
    behalf_user_id UUID, behalf_user_name VARCHAR,
    with_user_since TIMESTAMP, total_user_hold_time INTERVAL,
    resolved_at TIMESTAMP, closed_at TIMESTAMP,
    created_at TIMESTAMP, updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.ticket_number, t.title, t.description,
           t.category_id, c.name,
           t.subcategory_id, s.name,
           t.priority, t.status,
           t.created_by, cu.name, cu.email,
           t.assigned_to, au.name, au.email,
           t.assigned_team_id, tm.name,
           t.form_data, t.created_on_behalf,
           t.behalf_user_id, bu.name,
           t.with_user_since, t.total_user_hold_time,
           t.resolved_at, t.closed_at,
           t.created_at, t.updated_at
    FROM tickets t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN subcategories s ON t.subcategory_id = s.id
    LEFT JOIN users cu ON t.created_by = cu.id
    LEFT JOIN users au ON t.assigned_to = au.id
    LEFT JOIN users bu ON t.behalf_user_id = bu.id
    LEFT JOIN teams tm ON t.assigned_team_id = tm.id
    WHERE t.id = p_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- Assign ticket
CREATE OR REPLACE FUNCTION sp_assign_ticket(
    p_ticket_id UUID,
    p_assigned_to UUID,
    p_assigned_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_assigned UUID;
BEGIN
    SELECT assigned_to INTO v_old_assigned FROM tickets WHERE id = p_ticket_id;

    UPDATE tickets SET
        assigned_to = p_assigned_to,
        status = 'in_progress',
        -- If ticket was with user, update hold time
        total_user_hold_time = CASE
            WHEN with_user_since IS NOT NULL
            THEN total_user_hold_time + (NOW() - with_user_since)
            ELSE total_user_hold_time
        END,
        with_user_since = NULL,
        updated_at = NOW()
    WHERE id = p_ticket_id;

    -- Audit log
    INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, old_values, new_values)
    VALUES ('ticket', p_ticket_id::TEXT, 'assigned', p_assigned_by,
            jsonb_build_object('assigned_to', v_old_assigned),
            jsonb_build_object('assigned_to', p_assigned_to));

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Update ticket status
CREATE OR REPLACE FUNCTION sp_update_ticket_status(
    p_ticket_id UUID,
    p_status ticket_status,
    p_updated_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_old_status ticket_status;
BEGIN
    SELECT status INTO v_old_status FROM tickets WHERE id = p_ticket_id;

    UPDATE tickets SET
        status = p_status,
        -- Track user hold time
        with_user_since = CASE
            WHEN p_status = 'with_user' THEN NOW()
            ELSE NULL
        END,
        total_user_hold_time = CASE
            WHEN v_old_status = 'with_user' AND p_status != 'with_user' AND with_user_since IS NOT NULL
            THEN total_user_hold_time + (NOW() - with_user_since)
            ELSE total_user_hold_time
        END,
        resolved_at = CASE WHEN p_status = 'resolved' THEN NOW() ELSE resolved_at END,
        closed_at = CASE WHEN p_status = 'closed' THEN NOW() ELSE closed_at END,
        updated_at = NOW()
    WHERE id = p_ticket_id;

    -- Audit log
    INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, old_values, new_values)
    VALUES ('ticket', p_ticket_id::TEXT, 'status_changed', p_updated_by,
            jsonb_build_object('status', v_old_status),
            jsonb_build_object('status', p_status));

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Close ticket (after OTP verification)
CREATE OR REPLACE FUNCTION sp_close_ticket(
    p_ticket_id UUID,
    p_closed_by UUID
) RETURNS TABLE(
    ticket_number VARCHAR, creator_email VARCHAR,
    assignee_email VARCHAR, ticket_title VARCHAR
) AS $$
DECLARE
    v_old_status ticket_status;
BEGIN
    SELECT status INTO v_old_status FROM tickets WHERE id = p_ticket_id;

    UPDATE tickets SET
        status = 'closed',
        closed_at = NOW(),
        total_user_hold_time = CASE
            WHEN with_user_since IS NOT NULL
            THEN total_user_hold_time + (NOW() - with_user_since)
            ELSE total_user_hold_time
        END,
        with_user_since = NULL,
        updated_at = NOW()
    WHERE id = p_ticket_id;

    -- Audit
    INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, old_values, new_values)
    VALUES ('ticket', p_ticket_id::TEXT, 'closed', p_closed_by,
            jsonb_build_object('status', v_old_status),
            jsonb_build_object('status', 'closed'));

    RETURN QUERY
    SELECT t.ticket_number, cu.email AS creator_email,
           au.email AS assignee_email, t.title AS ticket_title
    FROM tickets t
    LEFT JOIN users cu ON t.created_by = cu.id
    LEFT JOIN users au ON t.assigned_to = au.id
    WHERE t.id = p_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- Add ticket interaction
CREATE OR REPLACE FUNCTION sp_add_ticket_interaction(
    p_ticket_id UUID,
    p_user_id UUID,
    p_message TEXT,
    p_is_internal BOOLEAN DEFAULT FALSE
) RETURNS INT AS $$
DECLARE
    v_id INT;
BEGIN
    INSERT INTO ticket_interactions (ticket_id, user_id, message, is_internal)
    VALUES (p_ticket_id, p_user_id, p_message, p_is_internal)
    RETURNING id INTO v_id;

    -- Update ticket timestamp
    UPDATE tickets SET updated_at = NOW() WHERE id = p_ticket_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Get ticket interactions
CREATE OR REPLACE FUNCTION sp_get_ticket_interactions(
    p_ticket_id UUID,
    p_include_internal BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    id INT, message TEXT, is_internal BOOLEAN,
    user_id UUID, user_name VARCHAR, user_role user_role,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT ti.id, ti.message, ti.is_internal,
           ti.user_id, u.name, u.role,
           ti.created_at
    FROM ticket_interactions ti
    JOIN users u ON ti.user_id = u.id
    WHERE ti.ticket_id = p_ticket_id
      AND (p_include_internal = TRUE OR ti.is_internal = FALSE)
    ORDER BY ti.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Add ticket file
CREATE OR REPLACE FUNCTION sp_add_ticket_file(
    p_ticket_id UUID,
    p_uploaded_by UUID,
    p_original_name VARCHAR,
    p_stored_name VARCHAR,
    p_file_size INT DEFAULT NULL,
    p_mime_type VARCHAR DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    v_id INT;
BEGIN
    INSERT INTO ticket_files (ticket_id, uploaded_by, original_name, stored_name, file_size, mime_type)
    VALUES (p_ticket_id, p_uploaded_by, p_original_name, p_stored_name, p_file_size, p_mime_type)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Get ticket files
CREATE OR REPLACE FUNCTION sp_get_ticket_files(p_ticket_id UUID)
RETURNS TABLE(
    id INT, original_name VARCHAR, stored_name VARCHAR,
    file_size INT, mime_type VARCHAR, uploaded_by_name VARCHAR,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT tf.id, tf.original_name, tf.stored_name,
           tf.file_size, tf.mime_type, u.name,
           tf.created_at
    FROM ticket_files tf
    JOIN users u ON tf.uploaded_by = u.id
    WHERE tf.ticket_id = p_ticket_id
    ORDER BY tf.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Add ticket item (provided/replaced)
CREATE OR REPLACE FUNCTION sp_add_ticket_item(
    p_ticket_id UUID,
    p_item_name VARCHAR,
    p_item_type VARCHAR DEFAULT NULL,
    p_quantity INT DEFAULT 1,
    p_serial_number VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_provided_by UUID DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    v_id INT;
BEGIN
    INSERT INTO ticket_items (ticket_id, item_name, item_type, quantity, serial_number, notes, provided_by)
    VALUES (p_ticket_id, p_item_name, p_item_type, p_quantity, p_serial_number, p_notes, p_provided_by)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Get ticket items
CREATE OR REPLACE FUNCTION sp_get_ticket_items(p_ticket_id UUID)
RETURNS TABLE(
    id INT, item_name VARCHAR, item_type VARCHAR,
    quantity INT, serial_number VARCHAR, notes TEXT,
    provided_by_name VARCHAR, provided_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT ti.id, ti.item_name, ti.item_type,
           ti.quantity, ti.serial_number, ti.notes,
           u.name, ti.provided_at
    FROM ticket_items ti
    LEFT JOIN users u ON ti.provided_by = u.id
    WHERE ti.ticket_id = p_ticket_id
    ORDER BY ti.provided_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. FEEDBACK PROCEDURES
-- ============================================================

-- Submit feedback
CREATE OR REPLACE FUNCTION sp_submit_feedback(
    p_ticket_id UUID,
    p_user_id UUID,
    p_rating INT,
    p_comment TEXT DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    v_id INT;
BEGIN
    INSERT INTO feedback (ticket_id, user_id, rating, comment)
    VALUES (p_ticket_id, p_user_id, p_rating, p_comment)
    ON CONFLICT (ticket_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        created_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Get feedback for ticket
CREATE OR REPLACE FUNCTION sp_get_feedback(p_ticket_id UUID)
RETURNS TABLE(
    id INT, rating INT, comment TEXT,
    user_name VARCHAR, created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.rating, f.comment,
           u.name, f.created_at
    FROM feedback f
    JOIN users u ON f.user_id = u.id
    WHERE f.ticket_id = p_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. REPORT PROCEDURES
-- ============================================================

-- Count business hours between two timestamps (excluding holidays & weekends)
CREATE OR REPLACE FUNCTION sp_calculate_business_hours(
    p_start TIMESTAMP,
    p_end TIMESTAMP
) RETURNS NUMERIC AS $$
DECLARE
    v_current DATE;
    v_total_hours NUMERIC := 0;
    v_day_start TIMESTAMP;
    v_day_end TIMESTAMP;
    v_work_start TIME := '09:00:00';
    v_work_end TIME := '18:00:00';
BEGIN
    IF p_end IS NULL OR p_start IS NULL THEN
        RETURN 0;
    END IF;

    v_current := p_start::DATE;

    WHILE v_current <= p_end::DATE LOOP
        -- Skip weekends
        IF EXTRACT(DOW FROM v_current) NOT IN (0, 6) THEN
            -- Skip holidays
            IF NOT EXISTS (SELECT 1 FROM holidays WHERE holiday_date = v_current) THEN
                v_day_start := GREATEST(p_start, v_current + v_work_start);
                v_day_end := LEAST(p_end, v_current + v_work_end);

                IF v_day_end > v_day_start THEN
                    v_total_hours := v_total_hours + EXTRACT(EPOCH FROM (v_day_end - v_day_start)) / 3600.0;
                END IF;
            END IF;
        END IF;

        v_current := v_current + 1;
    END LOOP;

    RETURN ROUND(v_total_hours, 2);
END;
$$ LANGUAGE plpgsql;

-- Calculate turnaround time for a ticket
-- Total Time = (Closure - Arrival) - User Hold Time, in business hours
CREATE OR REPLACE FUNCTION sp_get_ticket_turnaround(p_ticket_id UUID)
RETURNS TABLE(
    ticket_number VARCHAR, total_business_hours NUMERIC,
    user_hold_hours NUMERIC, net_resolution_hours NUMERIC
) AS $$
DECLARE
    v_ticket RECORD;
    v_total NUMERIC;
    v_user_hold NUMERIC;
BEGIN
    SELECT t.ticket_number, t.created_at, t.closed_at, t.total_user_hold_time,
           t.with_user_since
    INTO v_ticket
    FROM tickets t WHERE t.id = p_ticket_id;

    -- Total business hours from creation to closure
    v_total := sp_calculate_business_hours(v_ticket.created_at, COALESCE(v_ticket.closed_at, NOW()));

    -- User hold time in hours
    v_user_hold := COALESCE(EXTRACT(EPOCH FROM v_ticket.total_user_hold_time) / 3600.0, 0);
    -- Add current hold if still with user
    IF v_ticket.with_user_since IS NOT NULL THEN
        v_user_hold := v_user_hold + EXTRACT(EPOCH FROM (NOW() - v_ticket.with_user_since)) / 3600.0;
    END IF;

    RETURN QUERY
    SELECT v_ticket.ticket_number,
           v_total,
           ROUND(v_user_hold::NUMERIC, 2),
           ROUND((v_total - v_user_hold)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;

-- Report: tickets by category
CREATE OR REPLACE FUNCTION sp_report_by_category(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    category_name VARCHAR, total_tickets BIGINT,
    open_tickets BIGINT, in_progress_tickets BIGINT,
    closed_tickets BIGINT, avg_resolution_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.name,
           COUNT(t.id),
           COUNT(t.id) FILTER (WHERE t.status = 'open'),
           COUNT(t.id) FILTER (WHERE t.status = 'in_progress'),
           COUNT(t.id) FILTER (WHERE t.status = 'closed'),
           ROUND(AVG(
               CASE WHEN t.closed_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (t.closed_at - t.created_at - t.total_user_hold_time)) / 3600.0
               END
           )::NUMERIC, 2) AS avg_resolution_hours
    FROM tickets t
    JOIN categories c ON t.category_id = c.id
    WHERE (p_start_date IS NULL OR t.created_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR t.created_at::DATE <= p_end_date)
      AND (p_user_id IS NULL OR t.created_by = p_user_id)
    GROUP BY c.name
    ORDER BY COUNT(t.id) DESC;
END;
$$ LANGUAGE plpgsql;

-- Report: tickets by team
CREATE OR REPLACE FUNCTION sp_report_by_team(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    team_name VARCHAR, total_tickets BIGINT,
    open_tickets BIGINT, in_progress_tickets BIGINT,
    closed_tickets BIGINT, avg_resolution_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT tm.name,
           COUNT(t.id),
           COUNT(t.id) FILTER (WHERE t.status = 'open'),
           COUNT(t.id) FILTER (WHERE t.status = 'in_progress'),
           COUNT(t.id) FILTER (WHERE t.status = 'closed'),
           ROUND(AVG(
               CASE WHEN t.closed_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (t.closed_at - t.created_at - t.total_user_hold_time)) / 3600.0
               END
           )::NUMERIC, 2) AS avg_resolution_hours
    FROM tickets t
    JOIN teams tm ON t.assigned_team_id = tm.id
    WHERE (p_start_date IS NULL OR t.created_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR t.created_at::DATE <= p_end_date)
      AND (p_user_id IS NULL OR t.created_by = p_user_id)
    GROUP BY tm.name
    ORDER BY COUNT(t.id) DESC;
END;
$$ LANGUAGE plpgsql;

-- Report: tickets by technician
CREATE OR REPLACE FUNCTION sp_report_by_technician(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    technician_name VARCHAR, technician_email VARCHAR,
    total_tickets BIGINT, open_tickets BIGINT,
    in_progress_tickets BIGINT, closed_tickets BIGINT,
    avg_resolution_hours NUMERIC, avg_feedback_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.name, u.email,
           COUNT(t.id),
           COUNT(t.id) FILTER (WHERE t.status = 'open'),
           COUNT(t.id) FILTER (WHERE t.status = 'in_progress'),
           COUNT(t.id) FILTER (WHERE t.status = 'closed'),
           ROUND(AVG(
               CASE WHEN t.closed_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (t.closed_at - t.created_at - t.total_user_hold_time)) / 3600.0
               END
           )::NUMERIC, 2),
           ROUND(AVG(f.rating)::NUMERIC, 2)
    FROM tickets t
    JOIN users u ON t.assigned_to = u.id
    LEFT JOIN feedback f ON t.id = f.ticket_id
    WHERE (p_start_date IS NULL OR t.created_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR t.created_at::DATE <= p_end_date)
      AND (p_user_id IS NULL OR t.created_by = p_user_id)
    GROUP BY u.name, u.email
    ORDER BY COUNT(t.id) DESC;
END;
$$ LANGUAGE plpgsql;

-- Dashboard stats
CREATE OR REPLACE FUNCTION sp_get_dashboard_stats(
    p_user_id UUID DEFAULT NULL,
    p_role user_role DEFAULT 'admin'
)
RETURNS TABLE(
    total_tickets BIGINT, open_tickets BIGINT,
    in_progress_tickets BIGINT, with_user_tickets BIGINT,
    resolved_tickets BIGINT, closed_tickets BIGINT,
    avg_resolution_hours NUMERIC, avg_feedback_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(t.id),
        COUNT(t.id) FILTER (WHERE t.status = 'open'),
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress'),
        COUNT(t.id) FILTER (WHERE t.status = 'with_user'),
        COUNT(t.id) FILTER (WHERE t.status = 'resolved'),
        COUNT(t.id) FILTER (WHERE t.status = 'closed'),
        ROUND(AVG(
            CASE WHEN t.closed_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (t.closed_at - t.created_at - t.total_user_hold_time)) / 3600.0
            END
        )::NUMERIC, 2),
        ROUND(AVG(f.rating)::NUMERIC, 2)
    FROM tickets t
    LEFT JOIN feedback f ON t.id = f.ticket_id
    WHERE (
        p_role = 'admin'
        OR (p_role = 'technician' AND t.assigned_to = p_user_id)
        OR (p_role = 'user' AND (t.created_by = p_user_id OR t.behalf_user_id = p_user_id))
    );
END;
$$ LANGUAGE plpgsql;

-- Get form fields for a subcategory (dynamic forms)
CREATE OR REPLACE FUNCTION sp_get_form_fields(p_subcategory_id INT)
RETURNS TABLE(
    id INT, field_name VARCHAR, field_label VARCHAR,
    field_type VARCHAR, field_options JSONB,
    is_required BOOLEAN, display_order INT,
    parent_field_id INT, parent_field_value VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT ff.id, ff.field_name::VARCHAR, ff.field_label::VARCHAR,
           ff.field_type::VARCHAR, ff.field_options,
           ff.is_required, ff.display_order,
           ff.parent_field_id, ff.parent_field_value::VARCHAR
    FROM form_fields ff
    WHERE ff.subcategory_id = p_subcategory_id
    ORDER BY ff.display_order ASC, ff.id ASC;
END;
$$ LANGUAGE plpgsql;

-- Get holidays
CREATE OR REPLACE FUNCTION sp_get_holidays(p_year INT DEFAULT NULL)
RETURNS TABLE(id INT, name VARCHAR, holiday_date DATE, is_recurring BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT h.id, h.name, h.holiday_date, h.is_recurring
    FROM holidays h
    WHERE p_year IS NULL OR EXTRACT(YEAR FROM h.holiday_date) = p_year
    ORDER BY h.holiday_date;
END;
$$ LANGUAGE plpgsql;
