import { ClientLayout } from "@/components/layouts/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Clock, Bell, Loader2, Send } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";

interface CommunicationStats {
  unreadMessages: number;
  totalMessages: number;
  availableTeamMembers: number;
  averageResponseTime: number;
  notifications: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  isRead: boolean;
}

export default function ClientCommunication() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const socket = useWebSocket();

  const { data: stats, isLoading: isStatsLoading } = useQuery<CommunicationStats>({
    queryKey: ['/api/communication/stats'],
    enabled: !isAuthLoading && !!user,
  });

  const { data: initialMessages, isLoading: isMessagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/communication/messages'],
    enabled: !isAuthLoading && !!user,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/communication/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
      socket?.emit('new_message', newMsg);
    },
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (socket) {
      const cleanup = socket.on('message', (msg: Message) => {
        setMessages(prev => [...prev, msg]);
      });

      return () => {
        cleanup();
      };
    }
  }, [socket]);

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessage.mutate(newMessage);
      setNewMessage("");
    }
  };

  if (isAuthLoading || isStatsLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6 p-6 pb-16">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Communication</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your communications and stay updated with your service providers.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.unreadMessages || 0} unread
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.availableTeamMembers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Available to chat
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.averageResponseTime || 0}m</div>
              <p className="text-xs text-muted-foreground mt-1">
                Average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.notifications || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col h-[400px]">
              <ScrollArea className="flex-grow mb-4">
                <div className="space-y-4">
                  {isMessagesLoading ? (
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.senderId === user?.id ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.senderId === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span className="text-xs opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend} disabled={sendMessage.isPending}>
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}