'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Points package type definition
interface PointsPackage {
  id: string;
  name: string;
  points: number;
  price: number;
  description: string;
}

// Points package data
const pointsPackages: PointsPackage[] = [
  {
    id: 'basic',
    name: 'Basic Package',
    points: 100,
    price: 10,
    description: 'Perfect for casual users'
  },
  {
    id: 'standard',
    name: 'Standard Package',
    points: 300,
    price: 25,
    description: 'Most popular choice, great value'
  },
  {
    id: 'premium',
    name: 'Premium Package',
    points: 800,
    price: 50,
    description: 'For power users, best savings'
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
  
  // Handle payment success
  const handlePaymentSuccess = useCallback(async (orderId: string, packageId: string) => {
    try {
      setIsProcessing(true);
      
      // Clear stored order info
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
        throw new Error(result.error || 'Payment processing failed');
      }
      
      setSuccess(`Payment successful! You received ${result.data.points} points`);
      setSelectedPackage(null);
      
      // Redirect to profile page after 3 seconds
      setTimeout(() => {
        router.push('/profile?tab=points');
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error processing payment';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [router, setError, setSuccess, setIsProcessing, setSelectedPackage]);

  // Check for payment success markers in URL
  useEffect(() => {
    // Check standard PayPal callback params
    const paypalOrderId = searchParams.get('token'); // PayPal uses token param in sandbox
    const paymentId = searchParams.get('paymentId');
    const payerId = searchParams.get('PayerID');
    
    // Check custom success param
    const success = searchParams.get('success');
    const orderId = localStorage.getItem('pendingOrderId');
    const packageId = localStorage.getItem('pendingPackageId');
    
    console.log('Detected URL params:', { paypalOrderId, paymentId, payerId, success });
    
    // If PayPal callback params or success flag present with order ID, process payment
    if (((paypalOrderId || paymentId) && packageId) || (success === 'true' && orderId && packageId)) {
      // Prefer PayPal callback order ID if available
      const finalOrderId = paypalOrderId || orderId;
      const finalPackageId = packageId;
      
      if (finalOrderId && finalPackageId) {
        console.log('Processing payment success:', { finalOrderId, finalPackageId });
        handlePaymentSuccess(finalOrderId, finalPackageId);
      }
    }
  }, [searchParams, handlePaymentSuccess]);
  
  // Select points package
  const handleSelectPackage = (pkg: PointsPackage) => {
    setSelectedPackage(pkg);
    setError(null);
    setSuccess(null);
  };
  
  // Create PayPal payment link and redirect
  const createPaymentLink = async () => {
    if (!selectedPackage) {
      setError('Please select a points package');
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
        setError(result.error || 'Failed to create payment link');
        setIsProcessing(false);
        return;
      }
      
      // Check if payment link exists
      if (!result.data.paymentLink) {
        console.error('API response does not contain paymentLink:', result);
        setError('Failed to create payment link: Invalid payment link');
        setIsProcessing(false);
        return;
      }
      
      // Store order ID for processing after payment
      localStorage.setItem('pendingOrderId', result.data.orderId);
      localStorage.setItem('pendingPackageId', selectedPackage.id);
      
      // Redirect to PayPal payment page
      window.location.href = result.data.paymentLink;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating payment link';
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
        <h1 className="text-2xl font-bold mb-4">Not Logged In</h1>
        <p className="mb-4">Please log in to purchase points</p>
        <Button onClick={() => router.push('/auth/login')}>Login</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Buy Points</h1>
        
        {canceled && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
            <p>You&apos;ve canceled the payment process. If you want to continue buying points, please select a package.</p>
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
                <div className="text-4xl font-bold mb-2">{pkg.points} <span className="text-lg font-normal">points</span></div>
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
                  {selectedPackage?.id === pkg.id ? "Selected" : "Choose This Package"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <div className="font-semibold text-lg mb-2">
              {selectedPackage ? (
                <>Selected: <span className="text-blue-600">{selectedPackage.name}</span> - {selectedPackage.points} points (${selectedPackage.price})</>
              ) : (
                <>Please select a points package</>
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
                  Processing...
                </>
              ) : (
                'Pay with PayPal'
              )}
            </Button>
            
            <p className="text-sm text-center text-gray-500">
              After clicking, you&apos;ll be redirected to PayPal to complete payment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 