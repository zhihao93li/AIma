'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { ShareDialog } from '@/components/share-dialog';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/lib/auth-context';

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
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [...historyMessages, { role: 'user', content: input }]
        }),
      });

      const data = await response.json();
      
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
    } catch (error) {
      console.error('Error:', error);
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
    <div className="container mx-auto p-4 h-screen flex flex-col">
      <Toaster />
      <Card className="max-w-2xl mx-auto w-full h-full flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle>创意骂人生成器</CardTitle>
          <CardDescription>
            与AI对话，让它为您生成极具创意的嘲讽内容
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          {/* 消息历史区域 */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>开始一个新对话吧！</p>
                <p className="text-sm mt-2">提示：描述一下对方做了什么让你不爽的事情...</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800'}`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center justify-center py-2">
                        <Spinner size="sm" />
                        <span className="ml-2">思考中...</span>
                      </div>
                    ) : (
                      <div>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.role === 'assistant' && message.content && (
                          <div className="mt-2 flex justify-end">
                            <ShareDialog content={message.content} onShare={() => {}} />
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
          <div className="mt-auto">
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
