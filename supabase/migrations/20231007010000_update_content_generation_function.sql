-- 先删除旧函数
DROP FUNCTION IF EXISTS public.handle_content_generation(UUID, TEXT, TEXT, INTEGER);

-- 更新内容生成处理的事务函数，支持任务系统
CREATE OR REPLACE FUNCTION public.handle_content_generation(
  p_user_id UUID,
  p_target TEXT,
  p_result TEXT,
  p_points_consumed INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_current_points INTEGER;
  v_updated_points INTEGER;
  v_generation_id UUID;
  v_success BOOLEAN := TRUE;
  v_error TEXT := NULL;
BEGIN
  -- 开始事务
  BEGIN
    -- 检查用户积分是否足够
    SELECT points INTO v_current_points
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE; -- 锁定行避免并发更新
    
    IF v_current_points IS NULL THEN
      v_success := FALSE;
      v_error := '用户资料不存在';
      RETURN json_build_object('success', v_success, 'error', v_error);
    END IF;
    
    IF v_current_points < p_points_consumed THEN
      v_success := FALSE;
      v_error := '积分不足';
      RETURN json_build_object('success', v_success, 'error', v_error);
    END IF;
    
    -- 扣除积分
    v_updated_points := v_current_points - p_points_consumed;
    
    UPDATE public.profiles
    SET points = v_updated_points
    WHERE id = p_user_id;
    
    -- 创建积分交易记录
    INSERT INTO public.point_transactions (
      user_id,
      type,
      amount,
      description
    ) VALUES (
      p_user_id,
      'generation',
      -p_points_consumed,
      '生成内容消费'
    );
    
    -- 创建生成记录
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
    ) RETURNING id INTO v_generation_id;
    
    -- 返回成功结果
    RETURN json_build_object(
      'success', v_success, 
      'generation_id', v_generation_id, 
      'updated_points', v_updated_points
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- 捕获任何异常
      v_success := FALSE;
      v_error := SQLERRM;
      RETURN json_build_object('success', v_success, 'error', v_error);
  END;
END;
$$ LANGUAGE plpgsql; 