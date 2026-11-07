CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    major VARCHAR(100) NOT NULL,
    graduation_year INTEGER NOT NULL CHECK (graduation_year BETWEEN 2000 AND 2030),
    bio TEXT NOT NULL DEFAULT '',
    profile_picture_url TEXT,
    dining_halls TEXT[] NOT NULL DEFAULT '{}',
    favorite_foods TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connections (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connected_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, connected_user_id),
    CHECK (user_id <> connected_user_id)
);