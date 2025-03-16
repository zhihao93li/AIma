-- 创建积分交易记录表
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'generation', 'referral', 'purchase')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为积分交易记录表创建索引
CREATE INDEX IF NOT EXISTS point_transactions_user_id_idx ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS point_transactions_type_idx ON public.point_transactions(type);
CREATE INDEX IF NOT EXISTS point_transactions_created_at_idx ON public.point_transactions(created_at);

-- 设置行级安全策略
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的积分交易记录
CREATE POLICY "Users can view their own point transactions" 
  ON public.point_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 创建分享记录表
CREATE TABLE IF NOT EXISTS public.share_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sharer_id UUID REFERENCES public.profiles(id) NOT NULL,
  visitor_id UUID REFERENCES public.profiles(id),
  logged_in BOOLEAN DEFAULT false,
  rewarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为分享记录表创建索引
CREATE INDEX IF NOT EXISTS share_clicks_sharer_id_idx ON public.share_clicks(sharer_id);
CREATE INDEX IF NOT EXISTS share_clicks_visitor_id_idx ON public.share_clicks(visitor_id);

-- 设置行级安全策略
ALTER TABLE public.share_clicks ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看与自己相关的分享记录
CREATE POLICY "Users can view their own share clicks" 
  ON public.share_clicks 
  FOR SELECT 
  USING (auth.uid() = sharer_id);

-- 创建积分统计存储过程
CREATE OR REPLACE FUNCTION get_point_stats(user_id UUID)
RETURNS TABLE (
  type TEXT,
  sum BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.type, SUM(pt.amount) as sum
  FROM point_transactions pt
  WHERE pt.user_id = get_point_stats.user_id
  GROUP BY pt.type;
END;
$$ LANGUAGE plpgsql;

-- 创建推荐关系表
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES public.profiles(id) NOT NULL,
  referred_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_referred_id UNIQUE (referred_id)
);

-- 为推荐关系表创建索引
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON public.referrals(referrer_id);

-- 设置行级安全策略
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看与自己相关的推荐关系
CREATE POLICY "Users can view their own referrals" 
  ON public.referrals 
  FOR SELECT 
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- 创建内容生成记录表
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  target TEXT NOT NULL,
  result TEXT NOT NULL,
  points_consumed INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为内容生成记录表创建索引
CREATE INDEX IF NOT EXISTS generations_user_id_idx ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS generations_created_at_idx ON public.generations(created_at);

-- 设置行级安全策略
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的内容生成记录
CREATE POLICY "Users can view their own generations" 
  ON public.generations 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 创建触发器函数：在用户注册时自动添加积分交易记录
CREATE OR REPLACE FUNCTION public.handle_new_user_points()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (
    NEW.id,
    50,
    'registration',
    '注册奖励'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：当新用户注册时自动添加积分交易记录
CREATE TRIGGER on_auth_user_created_points
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_points();

-- 创建触发器函数：处理推荐奖励
CREATE OR REPLACE FUNCTION public.handle_referral_reward()
RETURNS TRIGGER AS $$
BEGIN
  -- 为推荐人添加积分
  UPDATE public.profiles
  SET points = points + 30
  WHERE id = NEW.referrer_id;
  
  -- 记录积分交易
  INSERT INTO public.point_transactions (user_id, amount, type, description)
  VALUES (
    NEW.referrer_id,
    30,
    'referral',
    '推荐新用户奖励'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：当新的推荐关系创建时奖励推荐人
CREATE TRIGGER on_referral_created
  AFTER INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_reward();