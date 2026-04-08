-- ============================================================
-- Notifications: コメント・リアクション・ピアボーナスなどの通知
-- ============================================================

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'comment',
    'reaction',
    'peer_bonus',
    'comment_reply',
    'approval',
    'rejection'
  )),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                         -- e.g. /reports/<entry_id>
  reference_id UUID,                 -- related entity id (entry_id, comment_id, etc.)
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_notifications_target_user ON notifications(target_user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (
    target_user_id = auth.uid()
    OR (
      (auth.jwt() ->> 'role') = 'super_admin'
    )
  );

-- Users can update (mark as read) their own notifications
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (
    target_user_id = auth.uid()
  )
  WITH CHECK (
    target_user_id = auth.uid()
  );

-- Only service_role inserts (via server actions)
-- No INSERT policy for regular users - handled by admin client

-- Allow Supabase Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
