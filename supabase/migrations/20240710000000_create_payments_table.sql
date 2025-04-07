-- 创建支付记录表
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  points_added INTEGER NOT NULL,
  payment_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为支付记录表创建索引
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON public.payments(created_at);

-- 设置行级安全策略
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的支付记录
CREATE POLICY "Users can view their own payments" 
  ON public.payments 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 创建策略：服务可以插入支付记录
CREATE POLICY "Service can insert payments" 
  ON public.payments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR (SELECT current_setting('role') = 'rls_definer'));

-- 创建策略：服务可以更新支付记录
CREATE POLICY "Service can update payments" 
  ON public.payments 
  FOR UPDATE 
  USING (auth.uid() = user_id OR (SELECT current_setting('role') = 'rls_definer'));