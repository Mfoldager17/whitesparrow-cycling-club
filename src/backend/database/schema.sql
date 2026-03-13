-- ============================================================
-- Cykelklub databasestruktur – Whitesparrow Cycling Club
-- PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM typer
-- ============================================================

CREATE TYPE user_role AS ENUM ('member', 'admin');
CREATE TYPE activity_type AS ENUM ('event', 'ride');
CREATE TYPE difficulty_level AS ENUM ('easy', 'moderate', 'hard', 'extreme');
CREATE TYPE registration_status AS ENUM ('registered', 'waitlisted', 'cancelled');

-- ============================================================
-- TABELLER
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    role            user_role NOT NULL DEFAULT 'member',
    avatar_url      TEXT,
    bio             TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by          UUID NOT NULL REFERENCES users(id),
    type                activity_type NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    starts_at           TIMESTAMPTZ NOT NULL,
    ends_at             TIMESTAMPTZ,
    start_location      TEXT,
    start_lat           NUMERIC(9, 6),
    start_lng           NUMERIC(9, 6),
    approx_km           INTEGER,
    difficulty          difficulty_level,
    max_participants    INTEGER,
    route_url           TEXT,
    is_cancelled        BOOLEAN NOT NULL DEFAULT FALSE,
    cancellation_reason TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_approx_km CHECK (approx_km IS NULL OR approx_km > 0),
    CONSTRAINT chk_max_participants CHECK (max_participants IS NULL OR max_participants > 0),
    CONSTRAINT chk_ends_after_starts CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id     UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    status          registration_status NOT NULL DEFAULT 'registered',
    note            TEXT,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_one_registration UNIQUE (activity_id, user_id)
);

CREATE TABLE comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    body        TEXT NOT NULL,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEKSER
-- ============================================================

CREATE INDEX idx_activities_starts_at   ON activities(starts_at);
CREATE INDEX idx_activities_type        ON activities(type);
CREATE INDEX idx_activities_created     ON activities(created_by);
CREATE INDEX idx_registrations_activity ON registrations(activity_id);
CREATE INDEX idx_registrations_user     ON registrations(user_id);
CREATE INDEX idx_comments_activity      ON comments(activity_id);

-- ============================================================
-- TRIGGERS – opdater updated_at automatisk
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_activities_updated
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_registrations_updated
    BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_comments_updated
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER – sæt ny registrering på venteliste automatisk
-- ============================================================

CREATE OR REPLACE FUNCTION check_capacity_on_register()
RETURNS TRIGGER AS $$
DECLARE
    max_p        INTEGER;
    active_count INTEGER;
BEGIN
    IF NEW.status = 'registered' THEN
        SELECT max_participants INTO max_p
        FROM activities WHERE id = NEW.activity_id;

        IF max_p IS NOT NULL THEN
            SELECT COUNT(*) INTO active_count
            FROM registrations
            WHERE activity_id = NEW.activity_id AND status = 'registered';

            IF active_count >= max_p THEN
                NEW.status := 'waitlisted';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_capacity
    BEFORE INSERT ON registrations
    FOR EACH ROW EXECUTE FUNCTION check_capacity_on_register();

-- ============================================================
-- TRIGGER – ryk første på venteliste op ved afmelding
-- ============================================================

CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
    max_p        INTEGER;
    active_count INTEGER;
    next_waiting UUID;
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status = 'registered' THEN
        SELECT max_participants INTO max_p
        FROM activities WHERE id = NEW.activity_id;

        IF max_p IS NOT NULL THEN
            SELECT COUNT(*) INTO active_count
            FROM registrations
            WHERE activity_id = NEW.activity_id AND status = 'registered';

            IF active_count < max_p THEN
                SELECT id INTO next_waiting
                FROM registrations
                WHERE activity_id = NEW.activity_id AND status = 'waitlisted'
                ORDER BY registered_at ASC
                LIMIT 1;

                IF next_waiting IS NOT NULL THEN
                    UPDATE registrations SET status = 'registered'
                    WHERE id = next_waiting;
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promote_waitlist
    AFTER UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION promote_from_waitlist();

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW v_upcoming_activities AS
SELECT
    a.*,
    u.full_name                                                 AS organizer_name,
    COUNT(r.id) FILTER (WHERE r.status = 'registered')         AS registered_count,
    COUNT(r.id) FILTER (WHERE r.status = 'waitlisted')         AS waitlist_count
FROM activities a
JOIN users u ON u.id = a.created_by
LEFT JOIN registrations r ON r.activity_id = a.id
WHERE a.starts_at > NOW()
  AND a.is_cancelled = FALSE
GROUP BY a.id, u.full_name
ORDER BY a.starts_at ASC;

CREATE VIEW v_my_registrations AS
SELECT
    a.id            AS activity_id,
    a.title,
    a.type,
    a.starts_at,
    a.approx_km,
    a.difficulty,
    a.start_location,
    a.route_url,
    r.status        AS registration_status,
    r.registered_at,
    r.user_id
FROM registrations r
JOIN activities a ON a.id = r.activity_id
WHERE a.is_cancelled = FALSE
ORDER BY a.starts_at ASC;
