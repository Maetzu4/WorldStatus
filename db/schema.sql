-- schema.sql
CREATE TABLE IF NOT EXISTS weather_snapshots (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(100) NOT NULL, -- e.g. "lat:lon" or "city_code"
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    temperature NUMERIC,
    humidity NUMERIC,
    pressure NUMERIC,
    wind_speed NUMERIC,
    uvi NUMERIC,
    weather_type VARCHAR(50),
    source VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_articles (
    id SERIAL PRIMARY KEY,
    source VARCHAR(100),
    author VARCHAR(100),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT UNIQUE NOT NULL,
    image_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    category VARCHAR(50) NOT NULL,
    country VARCHAR(10),
    lat NUMERIC NULL,
    lon NUMERIC NULL,
    severity INTEGER NULL,
    relevance_score INTEGER DEFAULT 0,
    event_id INTEGER,
    impact_score INTEGER DEFAULT 0,
    sentiment_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    category VARCHAR(50),
    sentiment_score NUMERIC DEFAULT 0,
    impact_score INTEGER DEFAULT 0,
    article_count INTEGER DEFAULT 1,
    country VARCHAR(50),
    lat NUMERIC NULL,
    lon NUMERIC NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at DESC);

CREATE TABLE IF NOT EXISTS finance_indices (
    id SERIAL PRIMARY KEY,
    index_name VARCHAR(50) NOT NULL,
    value NUMERIC NOT NULL,
    change NUMERIC,
    timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS astronomy_events (
    id SERIAL PRIMARY KEY,
    event VARCHAR(100) NOT NULL,
    date TIMESTAMP WITH TIME ZONE,
    extra_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disaster_events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type VARCHAR(50), -- Volcano, Hurricane, Flood, Wildfire, Earthquake, Other
    severity VARCHAR(20), -- Low, Moderate, High, Critical
    impact_score INTEGER DEFAULT 0, -- 0-100
    location VARCHAR(100),
    country VARCHAR(100),
    latitude NUMERIC,
    longitude NUMERIC,
    source VARCHAR(100),
    url TEXT UNIQUE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
