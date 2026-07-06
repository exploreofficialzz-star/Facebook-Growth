import { useAuth } from '@/_core/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, Zap, Activity, Plus } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery();
  const { data: campaigns, isLoading: campaignsLoading } = trpc.campaigns.list.useQuery();
  const { data: botAccounts, isLoading: accountsLoading } = trpc.botAccounts.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 mt-2">Welcome back, {user?.name || user?.email}</p>
          </div>
          <Button
            onClick={() => setLocation('/')}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 gap-2"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          {statsLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700/50 p-6">
                <Skeleton className="h-20" />
              </Card>
            ))
          ) : (
            <>
              <StatCard
                icon={TrendingUp}
                label="Active Campaigns"
                value={stats?.activeCampaigns || 0}
                total={stats?.totalCampaigns || 0}
              />
              <StatCard
                icon={Users}
                label="Bot Accounts"
                value={stats?.activeBotAccounts || 0}
                total={stats?.totalBotAccounts || 0}
              />
              <StatCard
                icon={Zap}
                label="Healthy Proxies"
                value={stats?.healthyProxies || 0}
                total={stats?.totalProxies || 0}
              />
              <StatCard
                icon={Activity}
                label="Today's Engagements"
                value={stats?.todayEngagements || 0}
                trend={true}
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="bg-slate-800/50 border-slate-700/50">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="accounts">Bot Accounts</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            {campaignsLoading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : campaigns && campaigns.length > 0 ? (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Card
                    key={campaign.id}
                    className="bg-slate-800/50 border-slate-700/50 p-4 cursor-pointer hover:bg-slate-800 transition"
                    onClick={() => setLocation(`/campaign/${campaign.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{campaign.facebookPageUrl}</p>
                        <p className="text-sm text-slate-400 mt-1">Status: {campaign.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-cyan-400">{campaign.progress}%</p>
                        <p className="text-xs text-slate-400">Progress</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
                <p className="text-slate-400">No campaigns yet. Create one to get started!</p>
              </Card>
            )}
          </TabsContent>

          {/* Bot Accounts Tab */}
          <TabsContent value="accounts" className="space-y-4">
            {accountsLoading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : botAccounts && botAccounts.length > 0 ? (
              <div className="space-y-3">
                {botAccounts.map((account) => (
                  <Card key={account.id} className="bg-slate-800/50 border-slate-700/50 p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{account.facebookEmail}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-400">
                          <span>Phase: {account.warmupPhase}</span>
                          <span>Days: {account.daysActive}</span>
                          <span>Status: {account.status}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-cyan-400">{account.totalLikes + account.totalComments + account.totalShares + account.totalFollows} actions</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
                <p className="text-slate-400">No bot accounts yet. Add one to start automating!</p>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
              <p className="text-slate-400">Recent activity will appear here</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  total?: number;
  trend?: boolean;
}

function StatCard({ icon: Icon, label, value, total, trend }: StatCardProps) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {total !== undefined && (
            <p className="text-xs text-slate-500 mt-1">of {total} total</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
      </div>
    </Card>
  );
}
