'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/use-toast';

type ShareStats = {
  totalClicks: number;
  successfulReferrals: number;
  pointsEarned: number;
  shareLink: string;
};

export function ShareStats() {
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch share statistics
  const fetchShareStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/share/stats');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch share statistics');
      }
      
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching share stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch share statistics');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchShareStats();
  }, []);

  // Copy share link
  const copyShareLink = () => {
    if (!stats?.shareLink) return;
    
    navigator.clipboard.writeText(stats.shareLink)
      .then(() => {
        toast({
          title: 'Copied successfully',
          description: 'Share link copied to clipboard',
        });
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        toast({
          title: 'Copy failed',
          description: 'Please copy the link manually',
          variant: 'destructive',
        });
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Statistics</CardTitle>
        <CardDescription>View your sharing data and get your share link</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchShareStats}>
              Retry
            </Button>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{stats.totalClicks}</p>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{stats.successfulReferrals}</p>
                <p className="text-sm text-muted-foreground">Successful Referrals</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">+{stats.pointsEarned}</p>
                <p className="text-sm text-muted-foreground">Points Earned</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Your unique share link</p>
              <div className="flex space-x-2">
                <Input 
                  value={stats.shareLink} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button onClick={copyShareLink}>
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Earn 30 points every time a new user registers through your link
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}