-- ============ 1. Link users to Supabase Auth + add roles ============
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

-- ============ 2. user_profiles: one-to-one with users ============
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    hometown VARCHAR(100),
    pronouns VARCHAR(50),
    instagram_handle VARCHAR(50),
    dietary_restrictions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Give existing users empty profile row
INSERT INTO user_profiles (id) SELECT id FROM users ON CONFLICT DO NOTHING;

-- Automatically give future users profiles
CREATE OR REPLACE FUNCTION create_empty_profile()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_create_profile ON users;
CREATE TRIGGER users_create_profile
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_empty_profile();

-- ============ 3. posts ============
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);

-- ============ 4. Row Level Security (RLS) ============
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signed-in users can read posts"
  ON posts FOR SELECT TO authenticated USING (true);