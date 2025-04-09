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

// Define message type
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
  
  // Current task ID being polled
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  // Polling interval (milliseconds)
  const POLL_INTERVAL = 2000;
  
  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAssistantMessage]);

  // Poll for task status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let pollingCount = 0;  // Track polling count
    const MAX_POLLING_COUNT = 60;  // Max polling attempts (about 2 minutes)
    
    if (currentTaskId) {
      // Start polling
      intervalId = setInterval(async () => {
        try {
          pollingCount++;
          console.log(`Polling task status (${pollingCount}/${MAX_POLLING_COUNT}), Task ID: ${currentTaskId}`);
          
          // Check if exceeded maximum polling count
          if (pollingCount >= MAX_POLLING_COUNT) {
            clearInterval(intervalId);
            setCurrentTaskId(null);
            setIsLoading(false);
            
            // Update message status
            setMessages(prev => {
              const newMessages = [...prev];
              const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
              if (loadingIndex !== -1) {
                newMessages[loadingIndex] = { 
                  role: 'assistant', 
                  content: 'Task timed out. Please try again later.' 
                };
              }
              return newMessages;
            });
            
            toast({
              title: 'Task Timeout',
              description: 'Generation task is taking too long. Please try again later.',
              variant: 'destructive',
            });
            
            return;
          }
          
          const response = await fetch(`/api/generate/status?taskId=${currentTaskId}`);
          const data = await response.json();
          
          if (!response.ok) {
            // Handle API errors
            console.error('Task status query failed:', data.error);
            // If 404 or similar, stop polling
            if (response.status === 404) {
              setCurrentTaskId(null);
              throw new Error('Task does not exist');
            }
            return;
          }
          
          // Process based on task status
          switch (data.status) {
            case 'completed':
              // Task completed, display result
              setMessages(prev => {
                const newMessages = [...prev];
                // Find and replace loading message
                const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
                if (loadingIndex !== -1) {
                  newMessages[loadingIndex] = { 
                    role: 'assistant', 
                    content: data.result 
                  };
                }
                return newMessages;
              });
              
              // Update user points
              if (data.points !== undefined) {
                updatePoints(data.points);
              }
              
              // Stop polling
              clearInterval(intervalId);
              setCurrentTaskId(null);
              setIsLoading(false);
              break;
              
            case 'failed':
              // Task failed, show error message
              setMessages(prev => {
                const newMessages = [...prev];
                // Find and replace loading message
                const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
                if (loadingIndex !== -1) {
                  newMessages[loadingIndex] = { 
                    role: 'assistant', 
                    content: `Sorry, an error occurred during generation: ${data.error || 'Unknown error'}` 
                  };
                }
                return newMessages;
              });
              
              // Show error notification
              toast({
                title: 'Generation Failed',
                description: data.error || 'Sorry, an error occurred during content generation',
                variant: 'destructive',
              });
              
              // Stop polling
              clearInterval(intervalId);
              setCurrentTaskId(null);
              setIsLoading(false);
              break;
              
            case 'pending':
              console.log('Task is pending, continue polling');
              break;
              
            case 'processing':
              // Task still processing, continue polling
              console.log('Task is processing, continue polling');
              
              // Update loading message every 10 polls to let user know it's still processing
              if (pollingCount % 10 === 0) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
                  if (loadingIndex !== -1) {
                    newMessages[loadingIndex] = { 
                      role: 'assistant', 
                      content: `Generating content, waited ${Math.floor(pollingCount * POLL_INTERVAL / 1000)} seconds...`, 
                      isLoading: true 
                    };
                  }
                  return newMessages;
                });
              }
              break;
              
            default:
              console.log('Unknown task status:', data.status);
          }
        } catch (error) {
          console.error('Error polling task status:', error);
          // Show error notification
          toast({
            title: 'Query Failed',
            description: error instanceof Error ? error.message : 'An error occurred while checking task status',
            variant: 'destructive',
          });
          
          // Stop polling and update message
          clearInterval(intervalId);
          setCurrentTaskId(null);
          setIsLoading(false);
          
          setMessages(prev => {
            const newMessages = [...prev];
            const loadingIndex = newMessages.findIndex(msg => msg.isLoading);
            if (loadingIndex !== -1) {
              newMessages[loadingIndex] = { 
                role: 'assistant', 
                content: 'Sorry, an error occurred while checking task status. Please try again.' 
              };
            }
            return newMessages;
          });
        }
      }, POLL_INTERVAL);
    }
    
    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentTaskId, updatePoints, POLL_INTERVAL]);

  // Submit user message and get AI response
  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    // Add user message to history
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Add a loading AI message
    const loadingMessage: Message = { role: 'assistant', content: '', isLoading: true };
    setMessages(prev => [...prev, loadingMessage]);
    
    // Clear input box
    setInput('');
    setIsLoading(true);
    
    try {
      // Build complete conversation history
      const historyMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add timeout control
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
        
        // Determine response type by Content-Type
        const contentType = response.headers.get('content-type');
        let data;
        let errorText = '';
        
        // If JSON type, try to parse JSON
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            throw new Error('Server returned invalid JSON data');
          }
        } else {
          // Non-JSON response, read as text
          errorText = await response.text();
          console.error('Non-JSON response:', errorText);
          throw new Error(`Server returned non-JSON data: ${errorText.substring(0, 100)}...`);
        }

        if (!response.ok) {
          throw new Error(data?.error || `Request failed (${response.status})`);
        }
        
        // Check if taskId was returned, if so, start polling
        if (data.taskId) {
          console.log('Received task ID, starting polling:', data.taskId);
          setCurrentTaskId(data.taskId);
        } else {
          // If no taskId but result returned, update messages directly
          // This is for backward compatibility with direct result returns
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Remove loading message
            return [...newMessages, { role: 'assistant', content: data.result || 'Generation completed, but no content returned' }];
          });
          
          // Update user points display
          if (data.points !== undefined) {
            updatePoints(data.points);
          }
          
          setIsLoading(false);
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        // Handle AbortError (timeout)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out, please try again later');
        }
        
        throw fetchError;
      }
    } catch (error: unknown) {
      console.error('Error:', error);
      
      // Show error notification
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Sorry, an error occurred during content generation, please try again later',
        variant: 'destructive',
      });
      
      // Update message history, replace loading message with error message
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Remove loading message
        return [...newMessages, { role: 'assistant', content: 'Sorry, an error occurred during content generation. Please try again later.' }];
      });
      
      setIsLoading(false);
      setCurrentTaskId(null);
    }
  };

  // Handle Enter key submission
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
          <CardTitle className="text-xl">Insults, perfected.</CardTitle>
          <CardDescription>
            The elegance of Shakespeare. The impact of a mic drop.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Message history area */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>Start a new conversation!</p>
                <p className="text-sm mt-2">Tip: Describe what the other person did that bothered you...</p>
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
                        <span>AI is thinking...</span>
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

          {/* Input area */}
          <div className="mt-4 border-t pt-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your message..."
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
                {isLoading ? <Spinner size="sm" /> : 'Send'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Tip: Press Enter to send, Shift+Enter for new line</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
