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
  
  // 当前正在轮询的任务ID
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  // 轮询间隔 (毫秒)
  const POLL_INTERVAL = 2000;
  
  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAssistantMessage]);

  // 轮询任务状态
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let pollingCount = 0;  // 记录轮询次数
    const MAX_POLLING_COUNT = 60;  // 最大轮询次数 (约2分钟)
    
    if (currentTaskId) {
      // 启动轮询
      intervalId = setInterval(async () => {
        try {
          pollingCount++;
          console.log(`轮询任务状态 (${pollingCount}/${MAX_POLLING_COUNT}), 任务ID: ${currentTaskId}`);
          
          // 检查是否超过最大轮询次数
          if (pollingCount >= MAX_POLLING_COUNT) {
            clearInterval(intervalId);
            setCurrentTaskId(null);
            setIsLoading(false);
            
            // 更新消息状态
            setMessages(prev => {
              const newMessages = [...prev];
              const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
              if (loadingIndex !== -1) {
                newMessages[loadingIndex] = { 
                  role: 'assistant', 
                  content: '生成任务超时，请尝试重新提交或稍后再试。' 
                };
              }
              return newMessages;
            });
            
            toast({
              title: '任务超时',
              description: '生成任务处理时间过长，请稍后再试',
              variant: 'destructive',
            });
            
            return;
          }
          
          const response = await fetch(`/api/generate/status?taskId=${currentTaskId}`);
          const data = await response.json();
          
          if (!response.ok) {
            // 处理API错误
            console.error('任务状态查询失败:', data.error);
            // 如果是404之类的错误，停止轮询
            if (response.status === 404) {
              setCurrentTaskId(null);
              throw new Error('任务不存在');
            }
            return;
          }
          
          // 根据任务状态处理
          switch (data.status) {
            case 'completed':
              // 任务完成，展示结果
              setMessages(prev => {
                const newMessages = [...prev];
                // 找到并替换加载中的消息
                const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
                if (loadingIndex !== -1) {
                  newMessages[loadingIndex] = { 
                    role: 'assistant', 
                    content: data.result 
                  };
                }
                return newMessages;
              });
              
              // 更新用户积分
              if (data.points !== undefined) {
                updatePoints(data.points);
              }
              
              // 停止轮询
              clearInterval(intervalId);
              setCurrentTaskId(null);
              setIsLoading(false);
              break;
              
            case 'failed':
              // 任务失败，显示错误信息
              setMessages(prev => {
                const newMessages = [...prev];
                // 找到并替换加载中的消息
                const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
                if (loadingIndex !== -1) {
                  newMessages[loadingIndex] = { 
                    role: 'assistant', 
                    content: `抱歉，生成内容时出现错误: ${data.error || '未知错误'}` 
                  };
                }
                return newMessages;
              });
              
              // 显示错误通知
              toast({
                title: '生成失败',
                description: data.error || '抱歉，生成内容时出现错误',
                variant: 'destructive',
              });
              
              // 停止轮询
              clearInterval(intervalId);
              setCurrentTaskId(null);
              setIsLoading(false);
              break;
              
            case 'pending':
              console.log('任务处于pending状态，继续轮询');
              break;
              
            case 'processing':
              // 任务仍在处理中，继续轮询
              console.log('任务正在处理中，继续轮询');
              
              // 每10次轮询更新一次加载信息，让用户知道还在处理
              if (pollingCount % 10 === 0) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
                  if (loadingIndex !== -1) {
                    newMessages[loadingIndex] = { 
                      role: 'assistant', 
                      content: `正在生成内容，已等待${Math.floor(pollingCount * POLL_INTERVAL / 1000)}秒...`, 
                      isLoading: true 
                    };
                  }
                  return newMessages;
                });
              }
              break;
              
            default:
              console.log('未知任务状态:', data.status);
          }
        } catch (error) {
          console.error('轮询任务状态时出错:', error);
          // 显示错误通知
          toast({
            title: '查询失败',
            description: error instanceof Error ? error.message : '查询任务状态时出现错误',
            variant: 'destructive',
          });
          
          // 停止轮询并更新消息
          clearInterval(intervalId);
          setCurrentTaskId(null);
          setIsLoading(false);
          
          setMessages(prev => {
            const newMessages = [...prev];
            const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
            if (loadingIndex !== -1) {
              newMessages[loadingIndex] = { 
                role: 'assistant', 
                content: '抱歉，查询任务状态时出错，请重试。' 
              };
            }
            return newMessages;
          });
        }
      }, POLL_INTERVAL);
    }
    
    // 清理函数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentTaskId, updatePoints, POLL_INTERVAL]);

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
        
        // 根据Content-Type判断响应类型
        const contentType = response.headers.get('content-type');
        let data;
        let errorText = '';
        
        // 如果是JSON类型，尝试解析JSON
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            throw new Error('服务器返回了无效的JSON数据');
          }
        } else {
          // 非JSON响应，直接读取文本
          errorText = await response.text();
          console.error('非JSON响应:', errorText);
          throw new Error(`服务器返回了非JSON数据: ${errorText.substring(0, 100)}...`);
        }

        if (!response.ok) {
          throw new Error(data?.error || `请求失败 (${response.status})`);
        }
        
        // 判断是否返回了taskId，如果有，则启动轮询
        if (data.taskId) {
          console.log('收到任务ID，开始轮询:', data.taskId);
          setCurrentTaskId(data.taskId);
        } else {
          // 如果没有返回taskId但返回了result，则直接更新消息
          // 这是为了兼容可能的直接返回结果的情况
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // 移除加载中的消息
            return [...newMessages, { role: 'assistant', content: data.result || '生成完成，但没有返回内容' }];
          });
          
          // 更新用户积分显示
          if (data.points !== undefined) {
            updatePoints(data.points);
          }
          
          setIsLoading(false);
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
      
      setIsLoading(false);
      setCurrentTaskId(null);
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
                        {msg.role === 'assistant' && msg.content && (
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
