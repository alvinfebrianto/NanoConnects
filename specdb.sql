-- ============================================
-- NanoConnect Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Step 2: Create tables (IF NOT EXISTS for safety)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT 'managed_by_supabase',
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('sme', 'influencer', 'admin')),
    avatar_url TEXT,
    bio TEXT,
    phone VARCHAR(50),
    email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS influencers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followers_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    niche VARCHAR(100),
    price_per_post DECIMAL(10,2),
    instagram_handle VARCHAR(100),
    tiktok_handle VARCHAR(100),
    youtube_handle VARCHAR(100),
    twitter_handle VARCHAR(100),
    location VARCHAR(255),
    languages TEXT[],
    content_categories TEXT[],
    is_available BOOLEAN DEFAULT TRUE,
    avg_delivery_days INTEGER DEFAULT 7,
    portfolio_url TEXT,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE RESTRICT,
    sme_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_status VARCHAR(20) DEFAULT 'pending' CHECK (order_status IN ('pending', 'in_progress', 'completed', 'cancelled', 'disputed')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    total_price DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    deliverables TEXT[],
    delivery_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    reported BOOLEAN DEFAULT FALSE,
    report_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 3: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON influencers(user_id);
CREATE INDEX IF NOT EXISTS idx_influencers_niche ON influencers(niche);
CREATE INDEX IF NOT EXISTS idx_influencers_verification ON influencers(verification_status);
CREATE INDEX IF NOT EXISTS idx_influencers_available ON influencers(is_available) WHERE is_available = TRUE;

-- Composite index for AI recommendations query (availability + verification)
CREATE INDEX IF NOT EXISTS idx_influencers_available_verified ON influencers(is_available, verification_status) WHERE is_available = TRUE AND verification_status = 'verified';

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_influencers_location ON influencers(location);

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_influencers_price ON influencers(price_per_post);

-- Composite index for followers count sorting with availability filter
CREATE INDEX IF NOT EXISTS idx_influencers_available_followers ON influencers(is_available, followers_count DESC) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_influencer ON orders(influencer_id);
CREATE INDEX IF NOT EXISTS idx_orders_sme ON orders(sme_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(is_verified);

-- ============================================
-- Step 4: Create updated_at trigger function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- Step 5: Drop existing triggers (if any)
-- ============================================

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_influencers_updated_at ON influencers;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- Step 6: Create updated_at triggers
-- ============================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON influencers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Step 7: Enable RLS on all tables
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 8: Drop existing RLS policies (if any)
-- ============================================

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON users;

-- Influencers policies
DROP POLICY IF EXISTS "Influencers are viewable by everyone" ON influencers;
DROP POLICY IF EXISTS "Users can update own influencer profile" ON influencers;

-- Orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "SMEs can create orders" ON orders;

-- Reviews policies
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "SMEs can create reviews for their orders" ON reviews;

-- ============================================
-- Step 9: Drop trigger function if exists
-- ============================================

DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================
-- Step 10: Create automatic user profile trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, user_type, status, email_verified, password_hash)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'user_type', 'sme'),
        'active',
        NEW.email_confirmed_at IS NOT NULL,
        'managed_by_supabase'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Step 11: Create public-safe user profile view
-- ============================================

DROP VIEW IF EXISTS public_user_profiles;

CREATE VIEW public_user_profiles AS
SELECT
    id,
    name,
    avatar_url,
    bio
FROM users
WHERE user_type = 'influencer'
  AND status = 'active';

GRANT SELECT ON public_user_profiles TO anon, authenticated;

-- ============================================
-- Step 12: Create homepage stats RPC
-- ============================================

DROP FUNCTION IF EXISTS public.get_homepage_stats();

CREATE OR REPLACE FUNCTION public.get_homepage_stats()
RETURNS TABLE (
    umkm_count BIGINT,
    influencer_count BIGINT,
    successful_campaign_count BIGINT,
    satisfaction_rate INTEGER
) LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
    SELECT
        (
            SELECT COUNT(*)
            FROM public.users
            WHERE user_type = 'sme' AND status = 'active'
        ) AS umkm_count,
        (
            SELECT COUNT(*)
            FROM public.influencers
            WHERE is_available = TRUE
        ) AS influencer_count,
        (
            SELECT COUNT(*)
            FROM public.orders
            WHERE order_status = 'completed'
        ) AS successful_campaign_count,
        COALESCE(
            ROUND(
                (
                    SELECT AVG(rating::numeric)
                    FROM public.reviews
                ) * 20
            ),
            0
        )::INTEGER AS satisfaction_rate;
$$;

REVOKE ALL ON FUNCTION public.get_homepage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_homepage_stats() TO anon, authenticated;

-- ============================================
-- Step 13: Create RLS policies
-- ============================================

-- Users RLS
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- Influencers RLS
CREATE POLICY "Influencers are viewable by everyone" ON influencers
    FOR SELECT USING (true);

CREATE POLICY "Users can update own influencer profile" ON influencers
    FOR ALL USING (auth.uid() = user_id);

-- Orders RLS
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = sme_id OR auth.uid() IN (
        SELECT user_id FROM influencers WHERE id = influencer_id
    ));

CREATE POLICY "SMEs can create orders" ON orders
    FOR INSERT WITH CHECK (
        (SELECT auth.uid()) = sme_id
        AND EXISTS (
            SELECT 1
            FROM users
            WHERE id = (SELECT auth.uid())
              AND user_type = 'sme'
        )
    );

-- Reviews RLS
CREATE POLICY "Reviews are viewable by everyone" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "SMEs can create reviews for their orders" ON reviews
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT sme_id FROM orders WHERE id = order_id
    ));

-- ============================================
-- Step 14: Insert sample data (optional - comment out if not needed)
-- ============================================

-- Users (5 records)
INSERT INTO users (id, name, email, password_hash, user_type, avatar_url, bio, phone, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@nanoconnect.com', '$2b$10$hashedpassword', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', 'Platform administrator', '+1234567890', 'active'),
('22222222-2222-2222-2222-222222222222', 'TechStart Inc', 'sme1@example.com', '$2b$10$hashedpassword', 'sme', 'https://api.dicebear.com/7.x/avataaars/svg?seed=SME1', 'Tech startup looking for influencers', '+1234567891', 'active'),
('33333333-3333-3333-3333-333333333333', 'Fashion Brand Co', 'sme2@example.com', '$2b$10$hashedpassword', 'sme', 'https://api.dicebear.com/7.x/avataaars/svg?seed=SME2', 'Fashion brand seeking promotion', '+1234567892', 'active'),
('44444444-4444-4444-4444-444444444444', 'Sarah Johnson', 'influencer1@example.com', '$2b$10$hashedpassword', 'influencer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Influencer1', 'Lifestyle & fashion content creator', '+1234567893', 'active'),
('55555555-5555-5555-5555-555555555555', 'Mike Chen', 'influencer2@example.com', '$2b$10$hashedpassword', 'influencer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Influencer2', 'Tech reviewer and gadget enthusiast', '+1234567894', 'active')
ON CONFLICT (id) DO NOTHING;

-- Influencers (2 records - linked to influencer users)
INSERT INTO influencers (id, user_id, followers_count, engagement_rate, niche, price_per_post, instagram_handle, tiktok_handle, location, languages, content_categories, is_available, avg_delivery_days, verification_status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 150000, 4.5, 'Fashion & Gaya Hidup', 500000.00, '@sarahstyle', '@sarahtiktok', 'Jakarta', ARRAY['Indonesian', 'English'], ARRAY['Fashion', 'Beauty', 'Lifestyle'], true, 5, 'verified'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 85000, 6.2, 'Teknologi', 350000.00, '@miketech', '@miketechtok', 'Surabaya', ARRAY['Indonesian'], ARRAY['Technology', 'Gaming', 'Reviews'], true, 3, 'verified')
ON CONFLICT (id) DO NOTHING;

-- Orders (5 records)
INSERT INTO orders (id, influencer_id, sme_id, order_status, payment_status, total_price, platform_fee, title, description, requirements, deliverables, delivery_date) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'completed', 'paid', 500000.00, 50000.00, 'Summer Fashion Campaign', 'Promote our new summer collection', 'Create 3 Instagram posts and 2 stories', ARRAY['Instagram Post', 'Instagram Story'], '2024-07-15'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'in_progress', 'paid', 350000.00, 35000.00, 'Gadget Review Video', 'Review our latest smartphone', 'Create a 5-minute YouTube review video', ARRAY['YouTube Video'], '2024-08-01'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'pending', 'pending', 750000.00, 75000.00, 'Brand Awareness Campaign', 'Increase brand visibility', 'Create 5 posts over 2 weeks', ARRAY['Instagram Post', 'TikTok Video'], '2024-08-15'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'completed', 'paid', 350000.00, 35000.00, 'Product Launch Announcement', 'Announce our new product line', 'Create announcement content', ARRAY['Instagram Post', 'Instagram Story'], '2024-06-20'),
('11111111-2222-3333-4444-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'cancelled', 'refunded', 500000.00, 50000.00, 'Holiday Special', 'Holiday promotion campaign', 'Create holiday-themed content', ARRAY['Instagram Post'], '2024-12-01')
ON CONFLICT (id) DO NOTHING;

-- Reviews (5 records)
INSERT INTO reviews (id, order_id, rating, comment, is_verified, helpful_count) VALUES
('77777777-7777-7777-7777-777777777777', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, 'Excellent work! Sarah delivered high-quality content on time. Highly recommend!', true, 12),
('88888888-8888-8888-8888-888888888888', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 4, 'Great video review. Mike provided detailed insights about the product.', true, 8),
('99999999-9999-9999-9999-999999999999', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 5, 'Outstanding collaboration! Professional and creative approach.', true, 15),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 4, 'Good engagement on the posts. Would work with again.', true, 5),
('ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 5, 'Amazing results! Our sales increased significantly after the campaign.', true, 20)
ON CONFLICT (id) DO NOTHING;
