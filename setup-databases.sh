#!/bin/bash
# 🍃 SAP Backend Microservices - MongoDB + Supabase Setup
# Configure databases for microservices architecture

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}🍃 Setting up MongoDB + Supabase for SAP Backend Microservices${NC}"

# =================================================================
# MONGODB SETUP
# =================================================================
echo -e "${YELLOW}📋 MongoDB Configuration${NC}"

echo "🍃 MongoDB databases for microservices:"
echo "  • auth_db - Authentication & JWT tokens"
echo "  • users_db - User profiles & data"
echo "  • content_db - Content storage & metadata"

# Create MongoDB connection strings (you'll need to update these)
echo -e "${PURPLE}📝 Update these MongoDB connection strings in secrets.yaml:${NC}"
echo "mongodb-auth-url: mongodb+srv://username:password@your-cluster.mongodb.net/auth_db"
echo "mongodb-users-url: mongodb+srv://username:password@your-cluster.mongodb.net/users_db"
echo "mongodb-content-url: mongodb+srv://username:password@your-cluster.mongodb.net/content_db"

# =================================================================
# SUPABASE SETUP
# =================================================================
echo -e "${YELLOW}📋 Supabase Configuration${NC}"

echo "🔗 Supabase setup for subscription service:"
echo "  • Create project at https://supabase.com"
echo "  • Enable authentication"
echo "  • Create subscription tables"
echo "  • Configure payment webhooks"

echo -e "${PURPLE}📝 Update these Supabase credentials in secrets.yaml:${NC}"
echo "supabase-url: https://your-project-id.supabase.co"
echo "supabase-anon-key: your-anon-key"
echo "supabase-service-key: your-service-role-key"

# =================================================================
# REDIS SETUP
# =================================================================
echo -e "${YELLOW}📋 Redis Configuration${NC}"

echo "🔴 Redis caching strategy:"
echo "  • auth_cache - JWT tokens & sessions"
echo "  • user_cache - User session data" 
echo "  • content_cache - Content delivery cache"
echo "  • subscription_cache - Billing cache"

# =================================================================
# DATABASE SCHEMAS
# =================================================================
echo -e "${YELLOW}📋 Creating Database Schemas${NC}"

# MongoDB Collections
cat > mongodb_schema.js << 'EOF'
// MongoDB Collections for SAP Backend Microservices

// Auth Database
use auth_db;
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "createdAt"],
      properties: {
        email: { bsonType: "string" },
        password: { bsonType: "string" },
        roles: { bsonType: "array" },
        isActive: { bsonType: "bool" },
        lastLogin: { bsonType: "date" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "token", "expiresAt"],
      properties: {
        userId: { bsonType: "objectId" },
        token: { bsonType: "string" },
        expiresAt: { bsonType: "date" },
        userAgent: { bsonType: "string" },
        ipAddress: { bsonType: "string" }
      }
    }
  }
});

// Users Database
use users_db;
db.createCollection("profiles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "name", "email"],
      properties: {
        userId: { bsonType: "objectId" },
        name: { bsonType: "string" },
        email: { bsonType: "string" },
        avatar: { bsonType: "string" },
        preferences: { bsonType: "object" },
        metadata: { bsonType: "object" }
      }
    }
  }
});

// Content Database
use content_db;
db.createCollection("content", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "type", "createdAt"],
      properties: {
        title: { bsonType: "string" },
        type: { bsonType: "string" },
        content: { bsonType: "object" },
        metadata: { bsonType: "object" },
        tags: { bsonType: "array" },
        isPublished: { bsonType: "bool" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});
EOF

echo "📄 MongoDB schema created: mongodb_schema.js"

# Supabase SQL Schema
cat > supabase_schema.sql << 'EOF'
-- Supabase Schema for SAP Backend Subscription Service

-- Subscription Plans
CREATE TABLE subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) NOT NULL, -- monthly, yearly
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL, -- active, canceled, expired, trial
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT true,
  payment_method_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment History
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES user_subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL, -- pending, completed, failed, refunded
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);

-- Row Level Security (RLS)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies (users can only see their own data)
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM user_subscriptions WHERE id = subscription_id
    )
  );
EOF

echo "📄 Supabase schema created: supabase_schema.sql"

# =================================================================
# DEPLOYMENT INSTRUCTIONS
# =================================================================
echo -e "${YELLOW}📋 Next Steps for Deployment${NC}"

echo -e "${GREEN}✅ Database Configuration Complete!${NC}"
echo ""
echo "🚀 To deploy with MongoDB + Supabase:"
echo ""
echo "1. Update secrets.yaml with your actual credentials:"
echo "   - MongoDB connection strings"
echo "   - Supabase project URL and keys"
echo "   - JWT secrets"
echo ""
echo "2. Apply database schemas:"
echo "   - Run mongodb_schema.js in MongoDB Compass/Shell"
echo "   - Run supabase_schema.sql in Supabase SQL Editor"
echo ""
echo "3. Deploy microservices:"
echo "   chmod +x ../deploy-microservices.sh"
echo "   ./deploy-microservices.sh"
echo ""
echo -e "${BLUE}📊 Your microservices will use:${NC}"
echo "🍃 MongoDB: Auth, Users, Content"
echo "🔗 Supabase: Subscriptions, Payments"
echo "🔴 Redis: Caching for all services"

echo -e "${PURPLE}🔐 Security Notes:${NC}"
echo "• Use strong passwords for MongoDB"
echo "• Enable Supabase RLS policies"
echo "• Rotate JWT secrets regularly"
echo "• Use TLS for all database connections"
