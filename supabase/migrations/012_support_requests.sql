-- Support requests table for Contact Support feature
-- DOM-115: Build Contact Support Form Screen

-- Support requests table
CREATE TABLE support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical_issue', 'account_help', 'billing_question', 'other')),
  description TEXT NOT NULL CHECK (char_length(description) >= 6),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_support_requests_user ON support_requests(user_id);
CREATE INDEX idx_support_requests_status ON support_requests(status);
CREATE INDEX idx_support_requests_created ON support_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own support requests
CREATE POLICY "Users can create their own support requests"
ON support_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own support requests
CREATE POLICY "Users can view their own support requests"
ON support_requests FOR SELECT
USING (auth.uid() = user_id);

-- Updated_at trigger (uses existing function from profiles table)
CREATE TRIGGER update_support_requests_updated_at
  BEFORE UPDATE ON support_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
