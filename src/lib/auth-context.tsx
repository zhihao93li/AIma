'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, User, getUserProfile } from './supabase';

// 定义认证上下文类型
type AuthContextType = {
  user: SupabaseUser | null;
  profile: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时检查用户登录状态
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        // 获取当前会话
        const { data: { session } } = await supabase.auth.getSession();
        
        // 添加调试日志
        console.log('AuthContext - Session:', session ? 'Exists' : 'Null');
        
        if (session?.user) {
          console.log('AuthContext - User ID:', session.user.id);
          setUser(session.user);
          
          // 获取用户资料
          const { data, error } = await getUserProfile(session.user.id);
          console.log('AuthContext - Profile:', data ? 'Exists' : 'Null', error ? `Error: ${error.message}` : 'No Error');
          setProfile(data as User);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          
          // 获取用户资料
          const { data } = await getUserProfile(session.user.id);
          setProfile(data as User);
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 使用谷歌登录
  const signInWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  // 登出
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证上下文的钩子
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 