'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// 动态导入客户端组件，避免服务器组件直接使用 useSearchParams
const BuyPointsContent = dynamic(
  () => import('@/components/buy-points/BuyPointsContent')
);

// 页面加载时显示的加载状态
function LoadingFallback() {
  return (
    <div className="container mx-auto p-4 flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
    </div>
  );
}

// 主页面组件
export default function BuyPointsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BuyPointsContent />
    </Suspense>
  );
}