-- 更新handle_content_generation函数，优化事务处理和错误处理
CREATE OR REPLACE FUNCTION public.handle_content_generation(
  p_user_id UUID,
  p_target TEXT,
  p_result TEXT,
  p_points_consumed INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
  v_current_points INTEGER;
  v_result JSONB;
BEGIN
  -- 获取用户当前积分
  SELECT points INTO v_current_points
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- 检查积分是否足够
  IF v_current_points < p_points_consumed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '积分不足',
      'points', v_current_points
    );
  END IF;
  
  -- 开始事务处理
  BEGIN
    -- 扣除用户积分
    UPDATE public.profiles
    SET points = points - p_points_consumed
    WHERE id = p_user_id;
    
    -- 记录积分交易
    INSERT INTO public.point_transactions (
      user_id,
      amount,
      type,
      description
    ) VALUES (
      p_user_id,
      -p_points_consumed,
      'generation',
      '生成内容消耗'
    );
    
    -- 记录生成内容
    INSERT INTO public.generations (
      user_id,
      target,
      result,
      points_consumed
    ) VALUES (
      p_user_id,
      p_target,
      p_result,
      p_points_consumed
    );
    
    -- 返回成功结果
    RETURN jsonb_build_object(
      'success', true,
      'points', v_current_points - p_points_consumed
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- 发生错误时回滚事务并记录错误
      RAISE LOG 'Error in handle_content_generation: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'points', v_current_points
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确保point_transactions表有正确的INSERT权限策略
DROP POLICY IF EXISTS "Service can insert point transactions" ON public.point_transactions;
CREATE POLICY "Service can insert point transactions"
  ON public.point_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (SELECT current_setting('role') = 'rls_definer'));

-- 确保generations表有正确的INSERT权限策略
DROP POLICY IF EXISTS "Service can insert generations" ON public.generations;
CREATE POLICY "Service can insert generations"
  ON public.generations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (SELECT current_setting('role') = 'rls_definer'));

-- 优化get_point_stats函数，确保正确处理空结果和类型转换
CREATE OR REPLACE FUNCTION get_point_stats(user_id UUID)
RETURNS TABLE (
  type TEXT,
  sum BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.type, COALESCE(SUM(pt.amount), 0)::BIGINT as sum
  FROM point_transactions pt
  WHERE pt.user_id = get_point_stats.user_id
  GROUP BY pt.type;
  
  -- 如果没有记录，返回空结果集
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 创建一个新的函数用于获取分享统计信息
CREATE OR REPLACE FUNCTION get_share_stats(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_clicks_count INTEGER;
  v_referrals_count INTEGER;
  v_referral_points BIGINT;
BEGIN
  -- 获取分享点击统计
  SELECT COUNT(id) INTO v_clicks_count
  FROM share_clicks
  WHERE sharer_id = user_id;
  
  -- 获取成功推荐统计
  SELECT COUNT(id) INTO v_referrals_count
  FROM referrals
  WHERE referrer_id = user_id;
  
  -- 获取通过分享获得的积分
  SELECT COALESCE(SUM(amount), 0) INTO v_referral_points
  FROM point_transactions
  WHERE user_id = get_share_stats.user_id AND type = 'referral';
  
  -- 返回统计结果
  RETURN jsonb_build_object(
    'totalClicks', v_clicks_count,
    'successfulReferrals', v_referrals_count,
    'pointsEarned', v_referral_points
  );
END;
$$ LANGUAGE plpgsql;