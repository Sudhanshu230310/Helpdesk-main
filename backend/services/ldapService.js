// ============================================================
// LDAP Service — Authenticate technicians via LDAP
// ============================================================
// NOTE: This is a configurable stub. In production, install 'ldapjs' and
// point LDAP_URL to your real LDAP/AD server. For development/demo, this
// falls back to a mock authentication.

const { query } = require('../config/db');

/**
 * Authenticate a technician via LDAP
 * In production, this would bind to the LDAP server and search for the user.
 * @param {string} username - LDAP username or email
 * @param {string} password - LDAP password
 * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
 */
const ldapAuthenticate = async (username, password) => {
    const ldapUrl = process.env.LDAP_URL;

    // If LDAP is not configured, use mock authentication
    if (!ldapUrl || ldapUrl === 'ldap://localhost:389') {
        console.warn('⚠️  LDAP not configured — using mock authentication');
        return mockLdapAuth(username, password);
    }

    // Production LDAP authentication
    // Uncomment and install ldapjs for real LDAP:
    // const ldap = require('ldapjs');
    try {
        // 1. Create LDAP client
        // const client = ldap.createClient({ url: ldapUrl });

        // 2. Bind with service account
        // await new Promise((resolve, reject) => {
        //   client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD, (err) => {
        //     if (err) reject(err); else resolve();
        //   });
        // });

        // 3. Search for user
        // const searchResult = await new Promise((resolve, reject) => {
        //   const opts = {
        //     filter: `(mail=${username})`,
        //     scope: 'sub',
        //     attributes: ['dn', 'cn', 'mail', 'department']
        //   };
        //   client.search(process.env.LDAP_BASE_DN, opts, (err, res) => {
        //     if (err) return reject(err);
        //     const entries = [];
        //     res.on('searchEntry', (entry) => entries.push(entry));
        //     res.on('error', (err) => reject(err));
        //     res.on('end', () => resolve(entries));
        //   });
        // });

        // 4. Bind as user to verify password
        // 5. Return user info

        // For now, fallback to mock
        return mockLdapAuth(username, password);
    } catch (error) {
        console.error('❌ LDAP authentication error:', error.message);
        return { success: false, user: null, error: error.message };
    }
};

/**
 * Mock LDAP authentication for development
 * Checks if a technician exists in the database
 */
const mockLdapAuth = async (username, password) => {
    try {
        // For demo: any technician in the DB can login with LDAP
        // In real scenario, LDAP handles password verification
        const result = await query('SELECT * FROM sp_get_user_by_email($1)', [username]);

        if (result.rows.length === 0) {
            return { success: false, user: null, error: 'User not found in LDAP' };
        }

        const user = result.rows[0];
        if (user.role !== 'technician' && user.role !== 'admin') {
            return { success: false, user: null, error: 'Only technicians can use LDAP login' };
        }

        // Mock: check password with bcrypt (in real LDAP, the server handles this)
        const bcrypt = require('bcryptjs');
        if (user.password_hash) {
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                return { success: false, user: null, error: 'Invalid LDAP credentials' };
            }
        }

        return {
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                ldap_dn: user.ldap_dn || `cn=${user.name},${process.env.LDAP_BASE_DN}`,
            },
            error: null,
        };
    } catch (error) {
        return { success: false, user: null, error: error.message };
    }
};

module.exports = { ldapAuthenticate };
