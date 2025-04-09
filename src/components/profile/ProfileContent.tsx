'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PointsHistory } from '@/app/profile/points-history';
import { ShareStats } from '@/app/profile/share-stats';
import { useSearchParams } from 'next/navigation';

export default function ProfileContent() {
  const { user, profile, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }
  
  if (!user || !profile) {
    return (
      <div className="container mx-auto p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Not Logged In</h1>
        <p className="mb-4">Please log in to view your profile</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue={tabParam || "profile"} className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="points">Points History</TabsTrigger>
          <TabsTrigger value="share">Share Stats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>View and manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || ''} alt={profile.name || 'User'} />
                  <AvatarFallback className="text-2xl">{profile.name?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-2xl font-semibold">{profile.name || 'No Username Set'}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Registration Date</Label>
                  <div className="rounded-md bg-muted px-4 py-2 text-sm">
                    {new Date(profile.created_at).toLocaleString('en-US')}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Last Login</Label>
                  <div className="rounded-md bg-muted px-4 py-2 text-sm">
                    {profile.last_sign_in_at ? new Date(profile.last_sign_in_at).toLocaleString('en-US') : 'Unknown'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Points</Label>
                  <div className="rounded-md bg-muted px-4 py-2 text-sm">
                    {profile.points || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="points">
          <PointsHistory />
        </TabsContent>
        
        <TabsContent value="share">
          <ShareStats />
        </TabsContent>
      </Tabs>
    </div>
  );
} 