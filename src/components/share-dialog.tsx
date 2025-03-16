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
  
  // 获取分享链接
  const getShareLink = async () => {
    try {
      const response = await fetch('/api/share/stats');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '获取分享链接失败');
      }
      
      // 构建带有内容预览的分享链接
      const baseUrl = data.data.shareLink;
      // 截取内容前30个字符作为预览
      const preview = encodeURIComponent(content.substring(0, 30) + (content.length > 30 ? '...' : ''));
      setShareUrl(`${baseUrl}&preview=${preview}`);
    } catch (error) {
      console.error('Error fetching share link:', error);
      toast({
        title: '获取分享链接失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };
  
  // 复制分享链接
  const copyShareLink = () => {
    if (!shareUrl) return;
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast({
          title: '复制成功',
          description: '分享链接已复制到剪贴板',
        });
        if (onShare) onShare();
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
  
  // 分享到Twitter
  const shareToTwitter = () => {
    if (!shareUrl) return;
    
    const text = encodeURIComponent('看看我用AI生成的创意骂人内容！');
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    if (onShare) onShare();
  };
  
  // 分享到Facebook
  const shareToFacebook = () => {
    if (!shareUrl) return;
    
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    if (onShare) onShare();
  };
  
  // 打开对话框时获取分享链接
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
          分享
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享内容</DialogTitle>
          <DialogDescription>
            分享这条创意内容，每当有新用户通过您的链接注册，您将获得30积分奖励
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">您的专属分享链接</p>
            <div className="flex space-x-2">
              <Input 
                value={shareUrl} 
                readOnly 
                className="font-mono text-xs"
              />
              <Button onClick={copyShareLink}>
                <Copy size={16} />
                复制
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">分享到社交媒体</p>
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