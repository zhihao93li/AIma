'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Navbar() {
  const { user, profile, isLoading, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="w-full h-16 border-b bg-background fixed top-0 left-0 right-0 z-50">
      <div className="container h-full mx-auto px-4 flex items-center justify-between">
        {/* 左侧Logo */}
        <Link href="/" className="font-bold text-xl">
          创意骂人生成器
        </Link>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2 md:gap-3">
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <>
              {/* 积分显示 */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="px-3 py-1 h-9 flex items-center">
                      <span className="mr-1">💰</span>
                      <span>{profile?.points || 0}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>当前积分余额</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* 购买积分按钮 */}
              <Button variant="outline" size="sm" className="h-9" asChild>
                <Link href="/buy-points">
                  <span className="mr-1">💳</span>购买积分
                </Link>
              </Button>
              
              {/* 分享按钮 */}
              <Button variant="outline" size="sm" className="h-9" asChild>
                <Link href="/profile?tab=share">
                  <span className="mr-1">🔗</span>分享
                </Link>
              </Button>
              
              {/* 用户头像 */}
              <Link href="/profile">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || '用户'} />
                  <AvatarFallback>{profile?.name?.charAt(0) || user.email?.charAt(0) || '用'}</AvatarFallback>
                </Avatar>
              </Link>
              
              {/* 退出登录按钮 */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9"
                onClick={() => signOut()}
              >
                退出登录
              </Button>
            </>
          ) : (
            <Button onClick={() => signInWithGoogle()}>
              使用谷歌登录
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}