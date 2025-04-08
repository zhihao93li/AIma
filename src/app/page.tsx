'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { ShareDialog } from '@/components/share-dialog';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/components/ui/use-toast';

// 定义消息类型
type Message = {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
};

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAssistantMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { updatePoints } = useAuth();
  
  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAssistantMessage]);

  // 提交用户消息并获取AI回复
  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    // 添加用户消息到历史
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // 添加一个加载中的AI消息
    const loadingMessage: Message = { role: 'assistant', content: '', isLoading: true };
    setMessages(prev => [...prev, loadingMessage]);
    
    // 清空输入框
    setInput('');
    setIsLoading(true);
    
    try {
      // 构建完整的对话历史
      const historyMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            messages: [...historyMessages, { role: 'user', content: input }]
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // 尝试解析JSON响应
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('JSON解析错误:', parseError);
          // 如果JSON解析失败，尝试获取文本内容
          const textContent = await response.text();
          throw new Error(`服务器返回了无效的数据格式: ${textContent.substring(0, 100)}`);
        }

        if (!response.ok) {
          throw new Error(data.error || '请求失败');
        }
        
        // 更新消息历史，移除加载中的消息，添加实际回复
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // 移除加载中的消息
          return [...newMessages, { role: 'assistant', content: data.result }];
        });
        
        // 更新用户积分显示
        if (data.points !== undefined) {
          updatePoints(data.points);
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        // 处理AbortError (超时)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('请求超时，请稍后重试');
        }
        
        throw fetchError;
      }
    } catch (error: unknown) {
      console.error('Error:', error);
      
      // 显示错误通知
      toast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '抱歉，生成内容时出现错误，请稍后重试',
        variant: 'destructive',
      });
      
      // 更新消息历史，将加载中的消息替换为错误消息
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // 移除加载中的消息
        return [...newMessages, { role: 'assistant', content: '抱歉，生成内容时出现错误，请稍后重试。' }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 处理按Enter键提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto px-4">
      <Toaster />
      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg border-t">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-xl">创意骂人生成器</CardTitle>
          <CardDescription>
            与AI对话，让它为您生成极具创意的嘲讽内容
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* 消息历史区域 */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>开始一个新对话吧！</p>
                <p className="text-sm mt-2">提示：描述一下对方做了什么让你不爽的事情...</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Spinner size="sm" />
                        <span>AI正在思考...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                        {msg.role === 'assistant' && (
                          <div className="mt-2 text-right">
                            <ShareDialog content={msg.content} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="mt-4 border-t pt-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="输入你的消息..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] resize-none flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || !input.trim()}
                className="self-end"
              >
                {isLoading ? <Spinner size="sm" /> : '发送'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">提示：按Enter键发送，Shift+Enter换行</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
