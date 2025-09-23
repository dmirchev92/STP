# ServiceText Pro - Simple PostgreSQL-Only Setup

## Why PostgreSQL Only?

For your local development and small-scale deployment, using only PostgreSQL makes perfect sense:

✅ **Simpler**: One database to manage instead of three  
✅ **Faster Setup**: Use your existing PostgreSQL installation  
✅ **Lower Resource Usage**: No need for MongoDB and Redis  
✅ **Easier Backup**: Single database backup  
✅ **Cost Effective**: No cloud database costs  

## What Goes Where?

### All in PostgreSQL:
- **Users & Authentication** → `users` table
- **GDPR Consents** → `gdpr_consents` table  
- **Conversations** → `conversations` table (instead of MongoDB)
- **Messages** → `messages` table (instead of MongoDB)
- **Analytics** → `analytics_events` table (instead of MongoDB)
- **Sessions** → `user_sessions` table (instead of Redis)
- **Templates** → `message_templates` table (instead of MongoDB)

## Database Schema (PostgreSQL Only)

```sql
-- Core user management
users (id, email, password_hash, role, phone_number, ...)
gdpr_consents (id, user_id, consent_type, granted, timestamp, ...)
businesses (id, eik, dds_number, company_name, ...)

-- Communication (moved from MongoDB)
conversations (id, business_id, customer_phone, platform, state, ...)
messages (id, conversation_id, content, direction, timestamp, ...)
message_templates (id, business_id, name, content, category, ...)

-- Analytics (moved from MongoDB) 
analytics_events (id, event_type, business_id, event_data, timestamp, ...)

-- System (moved from Redis)
user_sessions (id, user_id, session_id, token_hash, expires_at, ...)
password_reset_tokens (id, user_id, token, expires_at, ...)
audit_logs (id, user_id, action, resource, timestamp, ...)
```

## Performance Considerations

**PostgreSQL can handle everything:**
- **JSON Support**: Use `JSONB` columns for flexible data (like MongoDB)
- **Full-Text Search**: Built-in search capabilities
- **Indexing**: Excellent performance with proper indexes
- **Caching**: Built-in query caching
- **Concurrent Users**: Can easily handle 100+ concurrent users

## Setup Steps

1. **Use your existing PostgreSQL** at `E:\postgre`
2. **Create database**: `CREATE DATABASE servicetext_pro;`
3. **Run the app**: It will auto-create all tables
4. **Single connection string**: Just PostgreSQL, no MongoDB/Redis

## When to Add MongoDB/Redis?

Only add them later if you need:
- **MongoDB**: When you have 10,000+ conversations and need complex analytics
- **Redis**: When you have 500+ concurrent users and need faster caching

For most Bulgarian tradespeople businesses, PostgreSQL-only will be perfect!
