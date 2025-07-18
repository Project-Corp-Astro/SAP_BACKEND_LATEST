-- Database Schema for Subscription Service
-- Creates tables and indexes needed for subscription management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    duration_months INTEGER NOT NULL CHECK (duration_months > 0),
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    max_users INTEGER DEFAULT 1,
    max_storage_gb INTEGER DEFAULT 10,
    api_calls_limit INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    payment_method VARCHAR(100),
    auto_renew BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP WITH TIME ZONE
);

-- Create subscription_usage table for tracking usage
CREATE TABLE IF NOT EXISTS public.subscription_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL, -- 'storage', 'api_calls', 'users', etc.
    usage_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subscription_id, resource_type, usage_date)
);

-- Create subscription_invoices table
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(status, expires_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON public.subscription_plans(name);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_id ON public.subscription_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_date ON public.subscription_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_resource_type ON public.subscription_usage(resource_type);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_subscription_id ON public.subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON public.subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_due_date ON public.subscription_invoices(due_date);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_usage_updated_at ON public.subscription_usage;
CREATE TRIGGER update_subscription_usage_updated_at
    BEFORE UPDATE ON public.subscription_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_invoices_updated_at ON public.subscription_invoices;
CREATE TRIGGER update_subscription_invoices_updated_at
    BEFORE UPDATE ON public.subscription_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price, duration_months, features, max_users, max_storage_gb, api_calls_limit)
VALUES 
    ('Basic', 'Basic subscription plan with essential features', 9.99, 1, 
     '["Basic Support", "5GB Storage", "Standard API Access"]'::jsonb, 
     1, 5, 1000),
    ('Pro', 'Professional plan with advanced features', 29.99, 1,
     '["Priority Support", "50GB Storage", "Advanced API Access", "Analytics Dashboard"]'::jsonb,
     5, 50, 10000),
    ('Enterprise', 'Enterprise plan with unlimited features', 99.99, 1,
     '["24/7 Support", "Unlimited Storage", "Full API Access", "Custom Integrations", "Dedicated Account Manager"]'::jsonb,
     -1, -1, -1)
ON CONFLICT (name) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW public.active_subscriptions AS
SELECT 
    s.*,
    sp.name as plan_name,
    sp.price as plan_price,
    sp.features as plan_features
FROM public.subscriptions s
JOIN public.subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active' 
  AND (s.expires_at IS NULL OR s.expires_at > NOW());

CREATE OR REPLACE VIEW public.subscription_summary AS
SELECT 
    sp.name as plan_name,
    COUNT(s.id) as total_subscriptions,
    COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions,
    SUM(CASE WHEN s.status = 'active' THEN sp.price ELSE 0 END) as monthly_revenue
FROM public.subscription_plans sp
LEFT JOIN public.subscriptions s ON sp.id = s.plan_id
GROUP BY sp.id, sp.name, sp.price
ORDER BY sp.price;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO subscription_service_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO subscription_service_user;

-- Add comments for documentation
COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans with pricing and features';
COMMENT ON TABLE public.subscriptions IS 'User subscriptions with status and billing information';
COMMENT ON TABLE public.subscription_usage IS 'Daily usage tracking for billing and limits';
COMMENT ON TABLE public.subscription_invoices IS 'Invoice records for subscription billing';

COMMENT ON COLUMN public.subscriptions.metadata IS 'Additional subscription data as JSON (payment info, preferences, etc.)';
COMMENT ON COLUMN public.subscription_plans.features IS 'Plan features as JSON array';
COMMENT ON COLUMN public.subscription_usage.metadata IS 'Additional usage data as JSON';

-- Verify tables were created
SELECT schemaname, tablename, tableowner 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'subscription%'
ORDER BY tablename;
