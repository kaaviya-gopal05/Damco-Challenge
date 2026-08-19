import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useGmailConnectionStatus, useScanAndClassifyEmails } from '@/hooks/useAgents';
import { completeGmailOAuth, connectGmailAccount } from '@/services/agentService';
import { notify } from '@/lib/toast';

function redirectUri(): string {
  return `${window.location.origin}/app/settings`;
}

export function GmailConnectionCard() {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useGmailConnectionStatus();
  const scanAndClassify = useScanAndClassifyEmails();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const handledCodeRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code || handledCodeRef.current) return;
    handledCodeRef.current = true;
    setIsConnecting(true);
    completeGmailOAuth(code, redirectUri())
      .then(() => {
        notify.success('Gmail connected — Email Monitor is now watching your inbox.');
        queryClient.invalidateQueries({ queryKey: ['gmail-connection-status'] });
      })
      .catch(() => notify.error('Could not connect Gmail. Please try again.'))
      .finally(() => {
        setIsConnecting(false);
        const next = new URLSearchParams(searchParams);
        next.delete('code');
        next.delete('scope');
        setSearchParams(next, { replace: true });
      });
  }, [searchParams, setSearchParams, queryClient]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Connected accounts</CardTitle>
        <CardDescription>Let Email Monitor watch your inbox for learning goals.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-900">Gmail</p>
              {isLoading || isConnecting ? (
                <p className="text-xs text-ink-400">Checking connection…</p>
              ) : status?.connected ? (
                <p className="text-xs text-ink-400">{status.gmailEmail ?? 'Connected'}</p>
              ) : (
                <p className="text-xs text-ink-400">Not connected</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.connected && <Badge variant="success">Connected</Badge>}
            {status?.connected ? (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                isLoading={scanAndClassify.isPending}
                onClick={() => scanAndClassify.mutate()}
              >
                Scan now
              </Button>
            ) : (
              <Button size="sm" isLoading={isConnecting} onClick={() => connectGmailAccount(redirectUri())}>
                Connect Gmail
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
