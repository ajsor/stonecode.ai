-- Migration 014: Inquiries (landing-page conversational agent)
-- Tables for the public-facing "Agent Stone" chat: anonymous conversations,
-- per-message log, and qualified leads. All admin-only via RLS; the
-- landing-agent edge function writes via service role.

-- 1. Conversations (one row per anonymous browser session)
CREATE TABLE IF NOT EXISTS landing_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  -- Self-flagged by the model via flag_concern tool
  flag_categories TEXT[] NOT NULL DEFAULT '{}',
  flag_notes TEXT,
  -- Admin review state
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  ended_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_landing_conversations_started_at
  ON landing_conversations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_conversations_flagged
  ON landing_conversations(reviewed, last_message_at DESC)
  WHERE array_length(flag_categories, 1) > 0;

-- 2. Messages (per-turn transcript, content as JSONB to preserve tool blocks)
CREATE TABLE IF NOT EXISTS landing_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES landing_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content JSONB NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_messages_conversation
  ON landing_messages(conversation_id, created_at);

-- 3. Leads (captured contact info + synopsis)
CREATE TABLE IF NOT EXISTS landing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES landing_conversations(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  -- short label: 'consulting' | 'interview' | 'general' | 'partnership' | etc.
  interest TEXT,
  synopsis TEXT NOT NULL,
  contact_preference TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_leads_created_at
  ON landing_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_leads_status
  ON landing_leads(status, created_at DESC);

-- updated_at trigger for leads
CREATE OR REPLACE FUNCTION set_landing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_landing_leads_updated_at ON landing_leads;
CREATE TRIGGER trg_landing_leads_updated_at
  BEFORE UPDATE ON landing_leads
  FOR EACH ROW EXECUTE FUNCTION set_landing_leads_updated_at();

-- RLS: admins read/update; service role bypasses
ALTER TABLE landing_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read conversations" ON landing_conversations;
CREATE POLICY "Admins read conversations" ON landing_conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DROP POLICY IF EXISTS "Admins update conversations" ON landing_conversations;
CREATE POLICY "Admins update conversations" ON landing_conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DROP POLICY IF EXISTS "Admins read messages" ON landing_messages;
CREATE POLICY "Admins read messages" ON landing_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DROP POLICY IF EXISTS "Admins read leads" ON landing_leads;
CREATE POLICY "Admins read leads" ON landing_leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DROP POLICY IF EXISTS "Admins update leads" ON landing_leads;
CREATE POLICY "Admins update leads" ON landing_leads
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

COMMENT ON TABLE landing_conversations IS 'Anonymous browser sessions chatting with Agent Stone on stonecode.ai landing page.';
COMMENT ON TABLE landing_messages IS 'Per-turn transcript for landing_conversations. content is JSONB to preserve tool_use / tool_result blocks.';
COMMENT ON TABLE landing_leads IS 'Qualified leads captured by Agent Stone via the capture_lead tool.';
