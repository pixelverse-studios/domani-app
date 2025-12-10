-- Beta feedback table for Feedback form feature
-- DOM-116: Build Feedback Form Screen with Shared Form Components

-- Beta feedback table
CREATE TABLE beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug_report', 'feature_idea', 'what_i_love', 'general')),
  message TEXT NOT NULL CHECK (char_length(message) >= 1),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'actioned', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_beta_feedback_user ON beta_feedback(user_id);
CREATE INDEX idx_beta_feedback_status ON beta_feedback(status);
CREATE INDEX idx_beta_feedback_category ON beta_feedback(category);
CREATE INDEX idx_beta_feedback_created ON beta_feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

-- Users can create their own feedback
CREATE POLICY "Users can create their own feedback"
ON beta_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON beta_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Updated_at trigger (uses existing function from profiles table)
CREATE TRIGGER update_beta_feedback_updated_at
  BEFORE UPDATE ON beta_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
