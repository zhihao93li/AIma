'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type PointTransaction = {
  id: string;
  amount: number;
  type: 'registration' | 'generation' | 'referral' | 'purchase';
  description: string;
  created_at: string;
};

type Pagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function PointsHistory() {
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取积分历史
  const fetchPointsHistory = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/points/history?page=${page}&pageSize=${pagination.pageSize}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '获取积分历史失败');
      }
      
      setTransactions(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching points history:', error);
      setError(error instanceof Error ? error.message : '获取积分历史失败');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  // 初始加载
  useEffect(() => {
    fetchPointsHistory();
  }, [fetchPointsHistory]);

  // 翻页
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      fetchPointsHistory(newPage);
    }
  }, [pagination.totalPages, fetchPointsHistory]);

  // 获取交易类型的中文名称
  const getTransactionTypeName = useCallback((type: string) => {
    const typeMap: Record<string, string> = {
      'registration': '注册奖励',
      'generation': '内容生成',
      'referral': '推荐奖励',
      'purchase': '购买积分'
    };
    return typeMap[type] || type;
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>积分历史</CardTitle>
        <CardDescription>查看您的积分变动记录</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchPointsHistory()}>
              重试
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>暂无积分记录</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{getTransactionTypeName(transaction.type)}</p>
                    <p className="text-sm text-muted-foreground">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
            
            {/* 分页控制 */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm">
                  第 {pagination.page} 页，共 {pagination.totalPages} 页
                </span>
                <Button 
                  variant="outline" 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}