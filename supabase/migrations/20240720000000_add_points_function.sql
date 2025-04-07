-- 创建add_points函数用于添加积分并记录交易
CREATE OR REPLACE FUNCTION public.add_points(
  user_id UUID,
  points INTEGER,
  description TEXT,
  type TEXT
) RETURNS VOID AS $$
BEGIN
  -- 更新用户积分
  UPDATE public.profiles p
  SET points = COALESCE(p.points, 0) + add_points.points
  WHERE p.id = add_points.user_id;
  
  -- 记录积分交易
  INSERT INTO public.point_transactions (
    user_id,
    amount,
    type,
    description
  ) VALUES (
    add_points.user_id,
    add_points.points,
    add_points.type,
    add_points.description
  );
  
  -- 返回成功
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    -- 记录错误并重新抛出
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确保point_transactions表有正确的INSERT权限策略
DROP POLICY IF EXISTS "Service can insert point transactions" ON public.point_transactions;
CREATE POLICY "Service can insert point transactions"
  ON public.point_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (SELECT current_setting('role') = 'rls_definer'));