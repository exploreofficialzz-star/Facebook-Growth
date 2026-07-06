import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const createProxySchema = z.object({
  type: z.enum(['mobile', 'residential', 'datacenter']),
  address: z.string().ip('Invalid IP address'),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
});

type CreateProxyInput = z.infer<typeof createProxySchema>;

export default function ProxyManager() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: proxies, isLoading, refetch } = trpc.proxies.list.useQuery();

  const form = useForm<CreateProxyInput>({
    resolver: zodResolver(createProxySchema),
    defaultValues: {
      type: 'mobile',
      address: '',
      port: 8080,
      username: '',
      password: '',
    },
  });

  const createMutation = trpc.proxies.create.useMutation({
    onSuccess: () => {
      toast.success('Proxy added successfully!');
      form.reset();
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add proxy');
    },
  });

  async function onSubmit(data: CreateProxyInput) {
    await createMutation.mutateAsync(data);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Proxy Manager</h1>
            <p className="text-slate-400 mt-2">Manage residential, mobile, and datacenter proxies</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 gap-2">
                <Plus className="w-4 h-4" />
                Add Proxy
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Proxy</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Proxy Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="mobile">Mobile</SelectItem>
                            <SelectItem value="residential">Residential</SelectItem>
                            <SelectItem value="datacenter">Datacenter</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">IP Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="192.168.1.1"
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
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="8080"
                            className="bg-slate-700/50 border-slate-600 text-white"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Username (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="proxy_user"
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Password (Optional)</FormLabel>
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
                    {createMutation.isPending ? 'Adding...' : 'Add Proxy'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Proxies Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : proxies && proxies.length > 0 ? (
          <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-900/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Address</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Success Rate</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Last Used</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proxies.map((proxy) => (
                    <tr key={proxy.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 text-sm">
                        <span className="capitalize font-semibold text-white">{proxy.type}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{proxy.address}:{proxy.port}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                          proxy.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          proxy.status === 'unhealthy' ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {proxy.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-semibold">{proxy.successRate}%</td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {proxy.lastUsedAt ? new Date(proxy.lastUsedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button size="sm" variant="destructive" className="gap-2">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center space-y-4">
            <Zap className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <p className="text-white font-semibold">No proxies added yet</p>
              <p className="text-slate-400 mt-1">Add proxies to enable stealth automation</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
