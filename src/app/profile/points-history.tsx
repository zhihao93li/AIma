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

  // Fetch points history
  const fetchPointsHistory = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/points/history?page=${page}&pageSize=${pagination.pageSize}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch points history');
      }
      
      setTransactions(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching points history:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch points history');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize]);

  // Initial load
  useEffect(() => {
    fetchPointsHistory();
  }, [fetchPointsHistory]);

  // Page change handler
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      fetchPointsHistory(newPage);
    }
  }, [pagination.totalPages, fetchPointsHistory]);

  // Get transaction type name
  const getTransactionTypeName = useCallback((type: string) => {
    const typeMap: Record<string, string> = {
      'registration': 'Registration Bonus',
      'generation': 'Content Generation',
      'referral': 'Referral Reward',
      'purchase': 'Points Purchase'
    };
    return typeMap[type] || type;
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Points History</CardTitle>
            <CardDescription>View your points transaction records</CardDescription>
          </div>
          <Button 
            onClick={() => window.location.href = '/buy-points'}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Buy Points
          </Button>
        </div>
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
              Retry
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No points records yet</p>
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
                      {new Date(transaction.created_at).toLocaleString('en-US')}
                    </p>
                  </div>
                  <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination controls */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button 
                  variant="outline" 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}