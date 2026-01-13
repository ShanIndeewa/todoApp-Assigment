"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 1. Initialize TanStack Query
const queryClient = new QueryClient();


export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

function Dashboard() {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const queryClient = useQueryClient();
  
  // State for the "Create Todo" form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthPending && !session) {
      router.push("/login");
    }
  }, [session, isAuthPending, router]);

  // 2. Fetch Todos from API
  const { data: todos, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const res = await fetch('/api/todos');
      if (res.status === 401) {
        router.push("/login");
        return [];
      }
      return res.json();
    },
    // Only run this if the user is logged in
    enabled: !!session 
  });

  // 3. Create Todo Mutation
  const createTodo = useMutation({
    mutationFn: async () => {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, description: newDesc }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] }); // Refresh list
      setNewTitle("");
      setNewDesc("");
    }
  });

  // 4. Delete Todo Mutation (Only for Admins/Owners)
  const deleteTodo = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] })
  });

  if (isAuthPending) return <div className="p-10 text-center">Checking User...</div>;
  if (!session) return <div className="p-10 text-center">Redirecting to Login...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
            <p className="text-gray-500">Welcome back, {session.user.name}</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <Badge variant={session.user.role === 'admin' ? "destructive" : "default"}>
              {session.user.role.toUpperCase()}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => authClient.signOut({ callbackURL: "/login" })}
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Create Todo Section */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Task</CardTitle>
            <CardDescription>What needs to be done today?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row">
              <Input 
                placeholder="Task Title (e.g., Fix Bug)" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1"
              />
              <Input 
                placeholder="Description (Optional)" 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => createTodo.mutate()} disabled={!newTitle}>
                {createTodo.isPending ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Todo List Section */}
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold text-gray-700">Your Tasks</h2>
          
          {isLoading ? (
            <p>Loading tasks...</p>
          ) : todos?.length === 0 ? (
            <p className="text-gray-400 italic">No tasks found. Create one above!</p>
          ) : (
            todos?.map((t: any) => (
              <Card key={t.id} className="flex flex-row items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      t.status === 'completed' ? 'bg-green-500' : 
                      t.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-300'
                    }`} />
                    <h3 className="font-bold text-lg">{t.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500">{t.description}</p>
                  <p className="text-xs text-gray-400">Status: {t.status}</p>
                </div>

                {/* Permissions Logic: 
                    User can delete draft. 
                    Admin can delete anything. 
                */}
                {(session.user.role === 'admin' || t.status === 'draft') && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteTodo.mutate(t.id)}
                  >
                    Delete
                  </Button>
                )}
              </Card>
            ))
          )}
        </div>

      </div>
    </div>
  );
}