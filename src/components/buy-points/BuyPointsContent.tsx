'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// 积分套餐类型定义
interface PointsPackage {
  id: string;
  name: string;
  points: number;
  price: number;
  description: string;
}

// 积分套餐数据
const pointsPackages: PointsPackage[] = [
  {
    id: 'basic',
    name: '基础套餐',
    points: 100,
    price: 10,
    description: '适合轻度使用的用户'
  },
  {
    id: 'standard',
    name: '标准套餐',
    points: 300,
    price: 25,
    description: '最受欢迎的选择，性价比高'
  },
  {
    id: 'premium',
    name: '高级套餐',
    points: 800,
    price: 50,
    description: '适合重度使用的用户，超值优惠'
  }
];

export default function BuyPointsContent() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');
  
  const [selectedPackage, setSelectedPackage] = useState<PointsPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 处理支付成功
  const handlePaymentSuccess = useCallback(async (orderId: string, packageId: string) => {
    try {
      setIsProcessing(true);
      
      // 清除本地存储的订单信息
      localStorage.removeItem('pendingOrderId');
      localStorage.removeItem('pendingPackageId');
      
      const response = await fetch('/api/payments/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderID: orderId,
          packageId: packageId,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '处理支付失败');
      }
      
      setSuccess(`支付成功！您获得了${result.data.points}积分`);
      setSelectedPackage(null);
      
      // 3秒后跳转到个人资料页面
      setTimeout(() => {
        router.push('/profile?tab=points');
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '处理支付时出错';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [router, setError, setSuccess, setIsProcessing, setSelectedPackage]);

  // 检查URL参数中是否有支付成功的标记
  useEffect(() => {
    // 检查标准PayPal回调参数
    const paypalOrderId = searchParams.get('token'); // PayPal在沙盒环境中使用token参数
    const paymentId = searchParams.get('paymentId');
    const payerId = searchParams.get('PayerID');
    
    // 检查自定义success参数
    const success = searchParams.get('success');
    const orderId = localStorage.getItem('pendingOrderId');
    const packageId = localStorage.getItem('pendingPackageId');
    
    console.log('检测到URL参数:', { paypalOrderId, paymentId, payerId, success });
    
    // 如果有PayPal回调参数或success标记，且有订单ID，处理支付结果
    if (((paypalOrderId || paymentId) && packageId) || (success === 'true' && orderId && packageId)) {
      // 优先使用PayPal回调的订单ID
      const finalOrderId = paypalOrderId || orderId;
      const finalPackageId = packageId;
      
      if (finalOrderId && finalPackageId) {
        console.log('处理支付成功:', { finalOrderId, finalPackageId });
        handlePaymentSuccess(finalOrderId, finalPackageId);
      }
    }
  }, [searchParams, handlePaymentSuccess]);
  
  // 选择积分套餐
  const handleSelectPackage = (pkg: PointsPackage) => {
    setSelectedPackage(pkg);
    setError(null);
    setSuccess(null);
  };
  
  // 创建PayPal支付链接并跳转
  const createPaymentLink = async () => {
    if (!selectedPackage) {
      setError('请选择一个积分套餐');
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      
      const response = await fetch('/api/payments/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          currency: 'USD',
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error || '创建支付链接失败');
        setIsProcessing(false);
        return;
      }
      
      // 检查支付链接是否存在
      if (!result.data.paymentLink) {
        console.error('API返回的数据中没有paymentLink:', result);
        setError('创建支付链接失败：无效的支付链接');
        setIsProcessing(false);
        return;
      }
      
      // 存储订单ID，用于支付成功后的处理
      localStorage.setItem('pendingOrderId', result.data.orderId);
      localStorage.setItem('pendingPackageId', selectedPackage.id);
      
      // 跳转到PayPal支付页面
      window.location.href = result.data.paymentLink;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '创建支付链接时出错';
      setError(errorMessage);
      setIsProcessing(false);
    }
  };
  
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
        <h1 className="text-2xl font-bold mb-4">未登录</h1>
        <p className="mb-4">请先登录以购买积分</p>
        <Button onClick={() => router.push('/auth/login')}>登录</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">购买积分</h1>
        
        {canceled && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
            <p>您取消了支付流程。如果您想继续购买积分，请选择一个套餐。</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
            <p>{success}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {pointsPackages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`cursor-pointer transition-all ${selectedPackage?.id === pkg.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}
              onClick={() => handleSelectPackage(pkg)}
            >
              <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-2">{pkg.points} <span className="text-lg font-normal">积分</span></div>
                <div className="text-2xl font-semibold">${pkg.price} USD</div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant={selectedPackage?.id === pkg.id ? "default" : "outline"}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPackage(pkg);
                  }}
                >
                  {selectedPackage?.id === pkg.id ? "已选择" : "选择此套餐"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <div className="font-semibold text-lg mb-2">
              {selectedPackage ? (
                <>已选择: <span className="text-blue-600">{selectedPackage.name}</span> - {selectedPackage.points}积分 (${selectedPackage.price})</>
              ) : (
                <>请选择一个积分套餐</>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <Button 
              size="lg" 
              onClick={createPaymentLink}
              disabled={!selectedPackage || isProcessing}
              className="px-8"
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  处理中...
                </>
              ) : (
                '使用PayPal支付'
              )}
            </Button>
            
            <p className="text-sm text-center text-gray-500">
              点击按钮后将跳转到PayPal支付页面完成付款
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 