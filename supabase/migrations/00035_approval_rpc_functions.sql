-- ============================================================
-- Atomic approval/rejection functions for deals and weekly_plans
-- ============================================================
--
-- Why:
-- approveDeal / rejectDeal / approvePlan / rejectPlan each performed
-- 3-4 sequential writes (state update + approval_logs + activity_logs +
-- optionally nudges) through supabase-js. PostgREST has no client-side
-- transaction primitive, so a failure between writes left state
-- inconsistent: a "submitted" deal could become "approved" without ever
-- producing an approval_logs row, or be rejected without firing the
-- nudge that tells the owner.
--
-- These RPCs run the entire flow inside one PL/pgSQL function (= one
-- implicit transaction). All-or-nothing.
--
-- Design choices:
-- - SECURITY DEFINER + SET search_path = public, matching the pattern
--   already established by custom_access_token_hook and the cron
--   advisory-lock helpers.
-- - role and tenant_id are read from public.users — never from
--   auth.jwt() metadata, which the user can mutate.
-- - approve_deal_atomic enforces the prior approval_status='submitted'
--   precondition with a conditional UPDATE so two managers approving
--   the same deal at once cannot both succeed. This preserves the
--   precondition the TypeScript code already asserted.
-- - reject_deal_atomic / approve_plan_atomic / reject_plan_atomic
--   intentionally do NOT add new state preconditions; they preserve the
--   call-site's prior (looser) behavior.
-- - The functions return jsonb so the TypeScript caller can read the
--   plan/deal owner id and dispatch webhooks without a follow-up SELECT.
-- - Webhook dispatch and revalidatePath remain in TypeScript — those
--   side effects are not transactional and should not block on the DB
--   commit.

-- -----------------------------------------------------------
-- approve_deal_atomic
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_deal_atomic(
  p_deal_id UUID,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_actor_tenant UUID;
  v_actor_role TEXT;
  v_deal_owner UUID;
  v_deal_company TEXT;
  v_comment TEXT;
  v_updated INT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '認証が必要です');
  END IF;

  SELECT tenant_id, role INTO v_actor_tenant, v_actor_role
  FROM public.users WHERE id = v_actor;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ユーザーが見つかりません');
  END IF;

  IF v_actor_role NOT IN ('admin', 'manager', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', '承認権限がありません');
  END IF;

  SELECT user_id, company INTO v_deal_owner, v_deal_company
  FROM public.deals
  WHERE id = p_deal_id AND tenant_id = v_actor_tenant
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '案件が見つかりません');
  END IF;

  IF v_deal_owner = v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', '自分の案件は承認できません');
  END IF;

  v_comment := NULLIF(trim(coalesce(p_comment, '')), '');

  -- Conditional update: only flip 'submitted' -> 'approved'. If a second
  -- approver races, ROW_COUNT will be 0 and we abort cleanly.
  UPDATE public.deals
     SET approval_status = 'approved',
         updated_at = now()
   WHERE id = p_deal_id
     AND tenant_id = v_actor_tenant
     AND approval_status = 'submitted';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'この案件は承認待ちではありません');
  END IF;

  INSERT INTO public.approval_logs (tenant_id, target_type, target_id, action, actor_id, comment)
  VALUES (v_actor_tenant, 'deal', p_deal_id, 'approved', v_actor, v_comment);

  INSERT INTO public.activity_logs (tenant_id, user_id, source, raw_data)
  VALUES (
    v_actor_tenant, v_actor, 'approve:deal',
    jsonb_build_object(
      'action', 'approve',
      'resource', 'deal',
      'resource_id', p_deal_id,
      'details', CASE WHEN v_comment IS NOT NULL THEN jsonb_build_object('comment', v_comment) ELSE NULL END,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_actor_tenant,
    'deal_id', p_deal_id,
    'deal_owner', v_deal_owner,
    'deal_company', v_deal_company,
    'comment', v_comment
  );
END;
$$;

-- -----------------------------------------------------------
-- reject_deal_atomic
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_deal_atomic(
  p_deal_id UUID,
  p_comment TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_actor_tenant UUID;
  v_actor_role TEXT;
  v_actor_name TEXT;
  v_deal_owner UUID;
  v_deal_company TEXT;
  v_comment TEXT;
  v_updated INT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '認証が必要です');
  END IF;

  v_comment := NULLIF(trim(coalesce(p_comment, '')), '');
  IF v_comment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '差し戻しコメントは必須です');
  END IF;

  SELECT tenant_id, role, name
    INTO v_actor_tenant, v_actor_role, v_actor_name
  FROM public.users WHERE id = v_actor;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ユーザーが見つかりません');
  END IF;

  IF v_actor_role NOT IN ('admin', 'manager', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', '差し戻し権限がありません');
  END IF;

  SELECT user_id, company INTO v_deal_owner, v_deal_company
  FROM public.deals
  WHERE id = p_deal_id AND tenant_id = v_actor_tenant
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '案件が見つかりません');
  END IF;

  IF v_deal_owner = v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', '自分の案件は差し戻しできません');
  END IF;

  UPDATE public.deals
     SET approval_status = 'rejected',
         updated_at = now()
   WHERE id = p_deal_id
     AND tenant_id = v_actor_tenant;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    -- The earlier SELECT FOR UPDATE found the row, so this only fails on
    -- a tenant mismatch we already filtered. Treat as concurrent delete.
    RETURN jsonb_build_object('success', false, 'error', '案件が見つかりません');
  END IF;

  INSERT INTO public.approval_logs (tenant_id, target_type, target_id, action, actor_id, comment)
  VALUES (v_actor_tenant, 'deal', p_deal_id, 'rejected', v_actor, v_comment);

  INSERT INTO public.activity_logs (tenant_id, user_id, source, raw_data)
  VALUES (
    v_actor_tenant, v_actor, 'reject:deal',
    jsonb_build_object(
      'action', 'reject',
      'resource', 'deal',
      'resource_id', p_deal_id,
      'details', jsonb_build_object('comment', v_comment),
      'timestamp', now()
    )
  );

  INSERT INTO public.nudges (tenant_id, target_user_id, trigger_type, content, status)
  VALUES (
    v_actor_tenant,
    v_deal_owner,
    'deal_rejected',
    coalesce(v_actor_name, 'マネージャー') || 'が案件を差し戻しました: ' || v_comment,
    'pending'
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_actor_tenant,
    'deal_id', p_deal_id,
    'deal_owner', v_deal_owner,
    'deal_company', v_deal_company,
    'comment', v_comment
  );
END;
$$;

-- -----------------------------------------------------------
-- approve_plan_atomic
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_plan_atomic(
  p_plan_id UUID,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_actor_tenant UUID;
  v_actor_role TEXT;
  v_plan_owner UUID;
  v_comment TEXT;
  v_updated INT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '認証が必要です');
  END IF;

  SELECT tenant_id, role INTO v_actor_tenant, v_actor_role
  FROM public.users WHERE id = v_actor;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ユーザーが見つかりません');
  END IF;

  IF v_actor_role NOT IN ('admin', 'manager', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', '承認権限がありません');
  END IF;

  SELECT user_id INTO v_plan_owner
  FROM public.weekly_plans
  WHERE id = p_plan_id AND tenant_id = v_actor_tenant
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '対象の計画が見つかりません');
  END IF;

  IF v_plan_owner = v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', '自分の計画は承認できません');
  END IF;

  v_comment := NULLIF(trim(coalesce(p_comment, '')), '');

  UPDATE public.weekly_plans
     SET status = 'approved',
         approved_by = v_actor,
         approved_at = now(),
         updated_at = now()
   WHERE id = p_plan_id
     AND tenant_id = v_actor_tenant;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', '対象の計画が見つかりません');
  END IF;

  INSERT INTO public.approval_logs (tenant_id, target_type, target_id, action, actor_id, comment)
  VALUES (v_actor_tenant, 'weekly_plan', p_plan_id, 'approved', v_actor, v_comment);

  INSERT INTO public.activity_logs (tenant_id, user_id, source, raw_data)
  VALUES (
    v_actor_tenant, v_actor, 'approve:weekly_plan',
    jsonb_build_object(
      'action', 'approve',
      'resource', 'weekly_plan',
      'resource_id', p_plan_id,
      'details', CASE WHEN v_comment IS NOT NULL THEN jsonb_build_object('comment', v_comment) ELSE NULL END,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_actor_tenant,
    'plan_id', p_plan_id,
    'plan_owner', v_plan_owner,
    'comment', v_comment
  );
END;
$$;

-- -----------------------------------------------------------
-- reject_plan_atomic
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_plan_atomic(
  p_plan_id UUID,
  p_comment TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_actor_tenant UUID;
  v_actor_role TEXT;
  v_actor_name TEXT;
  v_plan_owner UUID;
  v_comment TEXT;
  v_updated INT;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '認証が必要です');
  END IF;

  v_comment := NULLIF(trim(coalesce(p_comment, '')), '');
  IF v_comment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '差し戻しコメントは必須です');
  END IF;

  SELECT tenant_id, role, name
    INTO v_actor_tenant, v_actor_role, v_actor_name
  FROM public.users WHERE id = v_actor;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ユーザーが見つかりません');
  END IF;

  IF v_actor_role NOT IN ('admin', 'manager', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', '承認権限がありません');
  END IF;

  SELECT user_id INTO v_plan_owner
  FROM public.weekly_plans
  WHERE id = p_plan_id AND tenant_id = v_actor_tenant
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '対象の計画が見つかりません');
  END IF;

  IF v_plan_owner = v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', '自分の計画は差し戻しできません');
  END IF;

  UPDATE public.weekly_plans
     SET status = 'rejected',
         updated_at = now()
   WHERE id = p_plan_id
     AND tenant_id = v_actor_tenant;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', '対象の計画が見つかりません');
  END IF;

  INSERT INTO public.approval_logs (tenant_id, target_type, target_id, action, actor_id, comment)
  VALUES (v_actor_tenant, 'weekly_plan', p_plan_id, 'rejected', v_actor, v_comment);

  INSERT INTO public.activity_logs (tenant_id, user_id, source, raw_data)
  VALUES (
    v_actor_tenant, v_actor, 'reject:weekly_plan',
    jsonb_build_object(
      'action', 'reject',
      'resource', 'weekly_plan',
      'resource_id', p_plan_id,
      'details', jsonb_build_object('comment', v_comment),
      'timestamp', now()
    )
  );

  INSERT INTO public.nudges (tenant_id, target_user_id, trigger_type, content, status)
  VALUES (
    v_actor_tenant,
    v_plan_owner,
    'plan_rejected',
    coalesce(v_actor_name, 'マネージャー') || 'が週次計画を差し戻しました: ' || v_comment,
    'pending'
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_actor_tenant,
    'plan_id', p_plan_id,
    'plan_owner', v_plan_owner,
    'comment', v_comment
  );
END;
$$;

-- -----------------------------------------------------------
-- Grants — only authenticated users can call these RPCs.
-- -----------------------------------------------------------
REVOKE ALL ON FUNCTION public.approve_deal_atomic(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_deal_atomic(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_plan_atomic(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_plan_atomic(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.approve_deal_atomic(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_deal_atomic(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_plan_atomic(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_plan_atomic(UUID, TEXT) TO authenticated;
