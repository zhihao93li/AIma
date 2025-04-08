-- 创建用于存储生成任务的表
CREATE TABLE public.generation_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  messages JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  result TEXT,
  error TEXT,
  points_consumed INTEGER,
  remaining_points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 添加索引
CREATE INDEX generation_tasks_user_id_idx ON public.generation_tasks(user_id);
CREATE INDEX generation_tasks_status_idx ON public.generation_tasks(status);

-- 行级安全策略
ALTER TABLE public.generation_tasks ENABLE ROW LEVEL SECURITY;

-- 只允许用户查看和修改自己的任务
CREATE POLICY "Users can view their own tasks" 
  ON public.generation_tasks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can do all" 
  ON public.generation_tasks 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generation_tasks_modtime
BEFORE UPDATE ON public.generation_tasks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 