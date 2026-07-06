import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const createBotAccountSchema = z.object({
  facebookEmail: z.string().email('Invalid email address'),
  facebookPassword: z.string().min(6, 'Password must be at least 6 characters'),
  facebookUsername: z.string().min(3, 'Username must be at least 3 characters'),
});

type CreateBotAccountInput = z.infer<typeof createBotAccountSchema>;

export default function BotAccounts() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: accounts, isLoading, refetch } = trpc.botAccounts.list.useQuery();

  const form = useForm<CreateBotAccountInput>({
    resolver: zodResolver(createBotAccountSchema),
    defaultValues: {
      facebookEmail: '',
      facebookPassword: '',
      facebookUsername: '',
    },
  });

  const createMutation = trpc.botAccounts.create.useMutation({
    onSuccess: () => {
      toast.success('Bot account created successfully!');
      form.reset();
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create bot account');
    },
  });

  async function onSubmit(data: CreateBotAccountInput) {
    await createMutation.mutateAsync(data);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Bot Account Manager</h1>
            <p className="text-slate-400 mt-2">Manage and monitor your automation accounts</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 gap-2">
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Bot Account</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="facebookEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="account@example.com"
                            className="bg-slate-700/50 border-slate-600 text-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facebookUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="facebook_username"
                            className="bg-slate-700/50 border-slate-600 text-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facebookPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="bg-slate-700/50 border-slate-600 text-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Account'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Accounts Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id} className="bg-slate-800/50 border-slate-700/50 p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white truncate">{account.facebookEmail}</p>
                    <p className="text-sm text-slate-400">{account.facebookUsername}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                    account.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    account.status === 'warming' ? 'bg-yellow-500/20 text-yellow-400' :
                    account.status === 'banned' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {account.status}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Warming Phase</span>
                    <span className="text-white font-semibold">{account.warmupPhase}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Days Active</span>
                    <span className="text-white font-semibold">{account.daysActive}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Actions</span>
                    <span className="text-cyan-400 font-semibold">
                      {account.totalLikes + account.totalComments + account.totalShares + account.totalFollows}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-2">
                    <Shield className="w-4 h-4" />
                    Details
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <p className="text-white font-semibold">No bot accounts yet</p>
              <p className="text-slate-400 mt-1">Add your first account to get started with automation</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
