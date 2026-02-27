import React, { useState } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, Loader2, MessageSquare, FileText, Copy, Check } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { SUMMARIZE_CHAT_ROUTE, MARK_AS_READ_ROUTE } from '@/utils/constants';
import { useAppStore } from '@/store';
import { toast } from 'sonner';

function SummarizeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);

  const { selectedChatData, selectedChatType, clearUnreadForContact } = useAppStore();

  const handleSummarize = async () => {
    if (!selectedChatData?._id) return;

    setLoading(true);
    setSummary(null);

    try {
      // Use axios directly for Python backend (different host)
      const response = await axios.post(
        SUMMARIZE_CHAT_ROUTE,
        {
          chatId: selectedChatData._id,
          chatType: selectedChatType,
        },
        { withCredentials: true }
      );

      if (response.data) {
        setSummary(response.data);
        
        // Mark messages as read locally
        if (selectedChatData._id) {
          clearUnreadForContact(selectedChatData._id);
          
          // Also call the API to mark as read
          try {
            await apiClient.post(
              MARK_AS_READ_ROUTE,
              { contactId: selectedChatData._id },
              { withCredentials: true }
            );
          } catch (err) {
            // Silent fail for marking as read
          }
        }

        toast.success('Chat summarized successfully!');
      }
    } catch (error) {
      console.error('Error summarizing chat:', error);
      toast.error('Failed to summarize chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary?.summary) return;
    
    try {
      await navigator.clipboard.writeText(summary.summary);
      setCopied(true);
      toast.success('Summary copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy summary');
    }
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when dialog closes
      setSummary(null);
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-gray-400 hover:text-violet-400 hover:bg-violet-500/10"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-[#1a1a24] border-white/10">
            AI Summarize
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="bg-[#0d0d12] border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            AI Chat Summary
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Get an AI-powered summary of your conversation. This will also mark all messages as read.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!summary && !loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-violet-400" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-white">Ready to Summarize</h3>
                <p className="text-sm text-gray-400 max-w-sm">
                  Click the button below to generate an AI summary of your conversation with{' '}
                  <span className="text-violet-400 font-medium">
                    {selectedChatType === 'channel'
                      ? selectedChatData?.name
                      : selectedChatData?.firstName || selectedChatData?.email}
                  </span>
                </p>
              </div>
              <Button
                onClick={handleSummarize}
                className="mt-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Summary
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 flex items-center justify-center animate-pulse">
                <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-white">Analyzing Conversation...</h3>
                <p className="text-sm text-gray-400">
                  AI is reading through your messages and creating a summary
                </p>
              </div>
            </div>
          )}

          {summary && !loading && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-violet-500/20 text-violet-300 border-0">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {summary.messageCount} messages
                </Badge>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-0">
                  <FileText className="h-3 w-3 mr-1" />
                  {summary.textMessageCount} text messages
                </Badge>
              </div>

              {/* Summary Content */}
              <div className="relative">
                <ScrollArea className="h-[300px] rounded-xl bg-[#1a1a24] border border-white/5 p-4">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {summary.summary}
                    </div>
                  </div>
                </ScrollArea>
                
                {/* Copy Button */}
                <Button
                  onClick={handleCopy}
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 px-2 text-gray-400 hover:text-white hover:bg-white/10"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Regenerate Button */}
              <div className="flex justify-end gap-2">
                <Button
                  onClick={handleSummarize}
                  variant="outline"
                  className="border-white/10 text-gray-300 hover:bg-white/5"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SummarizeDialog;
