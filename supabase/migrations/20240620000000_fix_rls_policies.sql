-- 为point_transactions表添加INSERT权限策略
CREATE POLICY "Service can insert point transactions"
  ON public.point_transactions
  FOR INSERT
  WITH CHECK (true);

-- 为generations表添加INSERT权限策略
CREATE POLICY "Service can insert generations"
  ON public.generations
  FOR INSERT
  WITH CHECK (true);

-- 创建处理生成内容的事务函数
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
      -- 发生错误时回滚事务
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 修复get_point_stats函数，确保正确返回sum类型
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
END;
$$ LANGUAGE plpgsql;