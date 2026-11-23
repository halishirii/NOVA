-- ============================================================================
-- NOVA ACTION PLAN - DATABASE SCHEMA (PostgreSQL / SQLite Compatible)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(80) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'rep',
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(64),
    user_agent VARCHAR(255),
    login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(150) NOT NULL,
    medical_code VARCHAR(40) NOT NULL UNIQUE,
    specialty VARCHAR(120) DEFAULT '',
    city VARCHAR(80) DEFAULT 'تهران',
    district VARCHAR(80) DEFAULT 'محدوده مرکزی',
    address VARCHAR(300) DEFAULT '',
    schedule VARCHAR(180) DEFAULT '',
    high_priority BOOLEAN NOT NULL DEFAULT 0,
    created_by INTEGER NULL,
    updated_by INTEGER NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS action_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(180) NOT NULL,
    daily_visits INTEGER NOT NULL DEFAULT 5,
    start_date_jalali VARCHAR(16) NOT NULL,
    end_date_jalali VARCHAR(16) NOT NULL,
    excluded_rules VARCHAR(255) DEFAULT 'جمعه',
    min_gap_enabled BOOLEAN NOT NULL DEFAULT 0,
    min_gap_days INTEGER NOT NULL DEFAULT 5,
    created_by INTEGER NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS action_plan_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    doctor_id INTEGER NULL,
    visit_date_jalali VARCHAR(16) NOT NULL,
    visit_weekday VARCHAR(20) NOT NULL,
    doctor_name VARCHAR(150) NOT NULL,
    medical_code VARCHAR(40) NOT NULL,
    specialty VARCHAR(120) DEFAULT '',
    location VARCHAR(300) DEFAULT '',
    schedule VARCHAR(180) DEFAULT '',
    priority_label VARCHAR(80) DEFAULT 'عادی',
    is_high_priority BOOLEAN NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'planned',
    FOREIGN KEY (plan_id) REFERENCES action_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NULL,
    username VARCHAR(80) DEFAULT 'anonymous',
    event_type VARCHAR(40) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(80) NULL,
    details TEXT NULL,
    ip_address VARCHAR(64) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_doctors_code ON doctors(medical_code);
CREATE INDEX IF NOT EXISTS idx_doctors_city_district ON doctors(city, district);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan_date ON action_plan_items(plan_id, visit_date_jalali);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_event ON audit_logs(user_id, event_type);
