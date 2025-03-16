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
    <nav className="border-b bg-background fixed top-0 left-0 right-0 z-50 w-full">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">创意骂人生成器</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-4">
              {/* 显示用户积分 */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="px-3 py-1">
                      <span className="mr-1">💰</span>
                      <span>{profile?.points || 0}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>当前积分余额</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* 添加分享按钮 */}
              <Link href="/profile?tab=share" className="flex items-center gap-1 text-sm px-3 py-1 border rounded-md hover:bg-muted transition-colors">
                <span className="mr-1">🔗</span>
                <span>分享</span>
              </Link>
              
              <Link href="/profile">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || '用户'} />
                  <AvatarFallback>{profile?.name?.charAt(0) || user.email?.charAt(0) || '用'}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="outline" onClick={() => signOut()}>
                退出登录
              </Button>
            </div>
          ) : (
            <Button onClick={() => signInWithGoogle()}>
              使用谷歌登录
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}