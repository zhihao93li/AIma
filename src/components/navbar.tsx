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
        {/* Left side Logo */}
        <Link href="/" className="font-bold text-xl">
          FlameCraft
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <>
              {/* Points display */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="px-3 py-1 h-9 flex items-center">
                      <span className="mr-1">💰</span>
                      <span>{profile?.points || 0}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Current points balance</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Buy points button */}
              <Button variant="outline" size="sm" className="h-9" asChild>
                <Link href="/buy-points">
                  <span className="mr-1">💳</span>Buy Points
                </Link>
              </Button>
              
              {/* Share button */}
              <Button variant="outline" size="sm" className="h-9" asChild>
                <Link href="/profile?tab=share">
                  <span className="mr-1">🔗</span>Share
                </Link>
              </Button>
              
              {/* User avatar */}
              <Link href="/profile">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || 'User'} />
                  <AvatarFallback>{profile?.name?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              </Link>
              
              {/* Logout button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9"
                onClick={() => signOut()}
              >
                Logout
              </Button>
            </>
          ) : (
            <Button onClick={() => signInWithGoogle()}>
              Login with Google
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}