'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Navbar() {
  const { user, profile, isLoading, signInWithGoogle, signOut } = useAuth();

  return (
    <nav className="border-b bg-background">
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