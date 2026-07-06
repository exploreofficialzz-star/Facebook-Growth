import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Play, Pause, Trash2, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function CampaignDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const campaignId = params?.id ? parseInt(params.id as string) : null;

  if (!campaignId) {
    return <div className="text-white">Invalid campaign ID</div>;
  }

  const { data: campaign, isLoading } = trpc.campaigns.getById.useQuery({ id: campaignId });
  const { data: activityLogs } = trpc.dashboard.getActivityLogs.useQuery({ campaignId });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8">
        <Skeleton className="h-screen" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8">
        <div className="text-white">Campaign not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/dashboard')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">{campaign.facebookPageUrl}</h1>
            <p className="text-slate-400 mt-1">Campaign ID: {campaign.id}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 gap-2"
            >
              <Play className="w-4 h-4" />
              Start
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
            <Button size="sm" variant="destructive" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700/50 p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Overall Progress</h2>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300">Completion</span>
                  <span className="text-2xl font-bold text-cyan-400">{campaign.progress}%</span>
                </div>
                <Progress value={campaign.progress} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Status</p>
                  <p className="text-white font-semibold capitalize">{campaign.status}</p>
                </div>
                <div>
                  <p className="text-slate-400">Created</p>
                  <p className="text-white font-semibold">{new Date(campaign.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50 p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Engagement Targets</h2>
              <div className="space-y-3">
                <EngagementTarget
                  label="Followers"
                  current={campaign.currentFollowers}
                  target={campaign.targetFollowers}
                />
                <EngagementTarget
                  label="Likes"
                  current={campaign.currentLikes}
                  target={campaign.targetLikes}
                />
                <EngagementTarget
                  label="Comments"
                  current={campaign.currentComments}
                  target={campaign.targetComments}
                />
                <EngagementTarget
                  label="Shares"
                  current={campaign.currentShares}
                  target={campaign.targetShares}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="bg-slate-800/50 border-slate-700/50">
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Recent Actions</h2>
                {activityLogs && activityLogs.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                          <div>
                            <p className="text-white capitalize">{log.actionType}</p>
                            <p className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold capitalize ${log.status === 'success' ? 'text-green-400' : log.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">No activity yet</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Campaign Settings</h2>
                <p className="text-slate-400">Settings panel coming soon...</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface EngagementTargetProps {
  label: string;
  current: number;
  target: number;
}

function EngagementTarget({ label, current, target }: EngagementTargetProps) {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm font-semibold text-cyan-400">{current} / {target}</span>
      </div>
      <Progress value={Math.min(percentage, 100)} className="h-1.5" />
    </div>
  );
}
