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

  // 获取分享统计
  const fetchShareStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/share/stats');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '获取分享统计失败');
      }
      
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching share stats:', error);
      setError(error instanceof Error ? error.message : '获取分享统计失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchShareStats();
  }, []);

  // 复制分享链接
  const copyShareLink = () => {
    if (!stats?.shareLink) return;
    
    navigator.clipboard.writeText(stats.shareLink)
      .then(() => {
        toast({
          title: '复制成功',
          description: '分享链接已复制到剪贴板',
        });
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        toast({
          title: '复制失败',
          description: '请手动复制链接',
          variant: 'destructive',
        });
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>分享统计</CardTitle>
        <CardDescription>查看您的分享数据并获取分享链接</CardDescription>
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
              重试
            </Button>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{stats.totalClicks}</p>
                <p className="text-sm text-muted-foreground">总点击次数</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{stats.successfulReferrals}</p>
                <p className="text-sm text-muted-foreground">成功邀请</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">+{stats.pointsEarned}</p>
                <p className="text-sm text-muted-foreground">获得积分</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">您的专属分享链接</p>
              <div className="flex space-x-2">
                <Input 
                  value={stats.shareLink} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button onClick={copyShareLink}>
                  复制
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                每当有新用户通过您的链接注册，您将获得30积分奖励
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}