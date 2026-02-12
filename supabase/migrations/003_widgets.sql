-- Widget preferences per user
CREATE TABLE widget_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  layout JSONB NOT NULL DEFAULT '[]',
  widget_configs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google OAuth tokens for Calendar integration
CREATE TABLE google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE widget_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for widget_preferences
CREATE POLICY "Users can view own widget preferences"
  ON widget_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widget preferences"
  ON widget_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widget preferences"
  ON widget_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widget preferences"
  ON widget_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for google_oauth_tokens
CREATE POLICY "Users can view own OAuth tokens"
  ON google_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OAuth tokens"
  ON google_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OAuth tokens"
  ON google_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own OAuth tokens"
  ON google_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_widget_preferences_updated_at
  BEFORE UPDATE ON widget_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_oauth_tokens_updated_at
  BEFORE UPDATE ON google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for faster lookups
CREATE INDEX idx_widget_preferences_user_id ON widget_preferences(user_id);
CREATE INDEX idx_google_oauth_tokens_user_id ON google_oauth_tokens(user_id);
