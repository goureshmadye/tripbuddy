-- TripBuddy Database Schema
-- ============================================

-- 4.1. Core Tables
-- ============================================

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    profile_photo TEXT,
    default_currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trips Table
CREATE TABLE trips (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    creator_id UUID REFERENCES users(id),
    transportation_mode TEXT,
    trip_type TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trip Collaborators (Junction Table)
CREATE TABLE trip_collaborators (
    id UUID PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'editor' -- values: viewer, editor, owner
);

-- ============================================
-- 4.2. Itinerary & Logistics
-- ============================================

-- Itinerary Items
CREATE TABLE itinerary_items (
    id UUID PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    category TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    added_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Location Sharing
CREATE TABLE user_locations (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_updated TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY(user_id, trip_id)
);

-- ============================================
-- 4.3. Financials & Assets
-- ============================================

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    paid_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Expense Shares (Split Logic)
CREATE TABLE expense_shares (
    id UUID PRIMARY KEY,
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    share_amount DECIMAL(10, 2) NOT NULL
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    file_url TEXT NOT NULL, -- Link to Firebase Storage
    label TEXT,
    type TEXT, -- flight, hotel, activity
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX idx_trips_creator ON trips(creator_id);
CREATE INDEX idx_trip_collaborators_trip ON trip_collaborators(trip_id);
CREATE INDEX idx_trip_collaborators_user ON trip_collaborators(user_id);
CREATE INDEX idx_itinerary_items_trip ON itinerary_items(trip_id);
CREATE INDEX idx_itinerary_items_start_time ON itinerary_items(start_time);
CREATE INDEX idx_user_locations_trip ON user_locations(trip_id);
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_expense_shares_expense ON expense_shares(expense_id);
CREATE INDEX idx_documents_trip ON documents(trip_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- Enable RLS on all tables for Supabase
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
