'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Share, Copy, Twitter, Facebook } from 'lucide-react';

type ShareDialogProps = {
  content: string;
  onShare?: () => void;
};

export function ShareDialog({ content, onShare }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Get share link
  const getShareLink = async () => {
    try {
      const response = await fetch('/api/share/stats');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get share link');
      }
      
      // Build share link with content preview
      const baseUrl = data.data.shareLink;
      // Take first 30 characters for preview
      const preview = encodeURIComponent(content.substring(0, 30) + (content.length > 30 ? '...' : ''));
      setShareUrl(`${baseUrl}&preview=${preview}`);
    } catch (error) {
      console.error('Error fetching share link:', error);
      toast({
        title: 'Failed to get share link',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };
  
  // Copy share link
  const copyShareLink = () => {
    if (!shareUrl) return;
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast({
          title: 'Copied successfully',
          description: 'Share link copied to clipboard',
        });
        if (onShare) onShare();
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
  
  // Share to Twitter
  const shareToTwitter = () => {
    if (!shareUrl) return;
    
    const text = encodeURIComponent('Check out this creative roast I generated with AI!');
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    if (onShare) onShare();
  };
  
  // Share to Facebook
  const shareToFacebook = () => {
    if (!shareUrl) return;
    
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    if (onShare) onShare();
  };
  
  // Get share link when dialog opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      getShareLink();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share className="mr-2" size={16} />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Content</DialogTitle>
          <DialogDescription>
            Share this creative content and earn 30 points each time a new user registers through your link
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Your unique share link</p>
            <div className="flex space-x-2">
              <Input 
                value={shareUrl} 
                readOnly 
                className="font-mono text-xs"
              />
              <Button onClick={copyShareLink}>
                <Copy size={16} />
                Copy
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Share to social media</p>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={shareToTwitter}>
                <Twitter size={16} />
                Twitter
              </Button>
              <Button variant="outline" onClick={shareToFacebook}>
                <Facebook size={16} />
                Facebook
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}