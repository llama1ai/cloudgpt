import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { type Message, type ChatSession } from '@shared/schema';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Plus,
  Trash2,
  MoreHorizontal,
  Edit3,
} from 'lucide-react';

interface NewSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentSessionId?: number | null;
  onSessionSelect?: (sessionId: number) => void;
}

function formatTimeAgo(timestamp: string | Date): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  
  return date.toLocaleDateString();
}

function groupSessionsByTime(sessions: ChatSession[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups = {
    today: [] as ChatSession[],
    yesterday: [] as ChatSession[],
    lastWeek: [] as ChatSession[],
    lastMonth: [] as ChatSession[],
    older: [] as ChatSession[]
  };

  sessions.forEach(session => {
    const sessionDate = new Date(session.timestamp);
    
    if (sessionDate >= today) {
      groups.today.push(session);
    } else if (sessionDate >= yesterday) {
      groups.yesterday.push(session);
    } else if (sessionDate >= lastWeek) {
      groups.lastWeek.push(session);
    } else if (sessionDate >= lastMonth) {
      groups.lastMonth.push(session);
    } else {
      groups.older.push(session);
    }
  });

  return groups;
}

export const NewSidebar: React.FC<NewSidebarProps> = ({ 
  isOpen, 
  onOpenChange, 
  currentSessionId, 
  onSessionSelect 
}) => {
  const [hoveredSession, setHoveredSession] = useState<number | null>(null);

  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ["/api/chat-sessions"],
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/chat-sessions', { title: 'New Chat' });
      return response.json();
    },
    onSuccess: (newSession: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      onSessionSelect?.(newSession.id);
      onOpenChange(false);
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('DELETE', `/api/chat-sessions/${sessionId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    }
  });

  const handleNewChat = () => {
    createSessionMutation.mutate();
  };

  const handleDeleteSession = (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSessionMutation.mutate(sessionId);
  };

  const handleSessionClick = (sessionId: number) => {
    onSessionSelect?.(sessionId);
    onOpenChange(false);
  };

  const groupedSessions = groupSessionsByTime(sessions);

  const renderSessionGroup = (title: string, sessions: ChatSession[]) => {
    if (sessions.length === 0) return null;

    return (
      <div key={title} className="mb-4">
        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </div>
        <div className="space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`
                group relative flex items-center px-3 py-2.5 mx-2 rounded-lg cursor-pointer
                transition-all duration-200 ease-in-out
                ${currentSessionId === session.id 
                  ? 'bg-gray-100 dark:bg-gray-800 border-l-2 border-gray-400' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }
              `}
              onClick={() => handleSessionClick(session.id)}
              onMouseEnter={() => setHoveredSession(session.id)}
              onMouseLeave={() => setHoveredSession(null)}
            >
              <MessageSquare className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {session.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimeAgo(session.timestamp)}
                </div>
              </div>
              
              {(hoveredSession === session.id || currentSessionId === session.id) && (
                <div className="flex items-center space-x-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                  >
                    <Trash2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="p-0 w-80 border-0 bg-white dark:bg-gray-900"
      >
        <div className="flex flex-col h-full">
          {/* New Chat Button */}
          <div className="p-4">
            <Button
              onClick={handleNewChat}
              disabled={createSessionMutation.isPending}
              className="w-full bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black border-0 rounded-lg py-2.5 font-medium transition-colors focus:outline-none focus:ring-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              New chat
            </Button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto py-4 border-t border-gray-200 dark:border-gray-700">
            {sessions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No conversations yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Start a new chat to begin
                </p>
              </div>
            ) : (
              <div>
                {renderSessionGroup('Today', groupedSessions.today)}
                {renderSessionGroup('Yesterday', groupedSessions.yesterday)}
                {renderSessionGroup('Previous 7 Days', groupedSessions.lastWeek)}
                {renderSessionGroup('Previous 30 Days', groupedSessions.lastMonth)}
                {renderSessionGroup('Older', groupedSessions.older)}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};