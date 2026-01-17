import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, TrendingUp, AlertCircle, Lightbulb, BarChart3, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { toast } from 'sonner';

const quickActions = [
  { icon: TrendingUp, label: 'Market Analysis', prompt: 'Give me a quick market analysis for gold and silver' },
  { icon: AlertCircle, label: 'Risk Assessment', prompt: 'What are the current risks in the precious metals market?' },
  { icon: Lightbulb, label: 'Trading Ideas', prompt: 'Suggest some trading opportunities based on current market conditions' },
  { icon: BarChart3, label: 'Technical View', prompt: 'What do the technical indicators suggest for gold right now?' },
];

export default function Assistant() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useStreamingChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;
    setInput('');
    await sendMessage(messageText);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Assistant</h1>
              <p className="text-xs text-muted-foreground">Your personal trading advisor</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Quick Actions */}
        {messages.length === 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto py-3 px-4 flex flex-col items-start gap-1 text-left"
                onClick={() => handleSend(action.prompt)}
              >
                <action.icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Welcome message when empty */}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ask me about markets, trading strategies, or click a quick action above!</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' && "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-full shrink-0 h-fit",
                      message.role === 'assistant' 
                        ? "bg-primary/10" 
                        : "bg-secondary"
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <Bot className="w-4 h-4 text-primary" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-foreground" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 max-w-[80%]",
                      message.role === 'assistant'
                        ? "bg-card border border-border"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <div className="p-2 rounded-full bg-primary/10 h-fit">
                    <Bot className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.1s]" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Input */}
        <div className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about markets, trading strategies..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={() => handleSend()} 
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
