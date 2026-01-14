"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  

  // State for creating new todo
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // State for editing todo
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthPending && !session) {
      router.push("/login");
    }
  }, [session, isAuthPending, router]);


  
  // Fetch todos
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
    enabled: !!session 
  });

  // Create Todo
  const createTodo = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, description: newDesc }),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setNewTitle("");
      setNewDesc("");
    }
  });

  // Update Todo
  const updateTodo = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/todos?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: editTitle, 
          description: editDesc,
          status: editStatus 
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setEditingId(null);
    }
  });

  // Delete Todo
  const deleteTodo = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] })
  });

  const startEdit = (todo: any) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDesc(todo.description || "");
    setEditStatus(todo.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDesc("");
    setEditStatus("");
  };

  if (isAuthPending) return <div className="p-10 text-center">Checking User...</div>;
  if (!session) return <div className="p-10 text-center">Redirecting to Login...</div>;

  const isUser = session.user.role === 'user';
  const isManager = session.user.role === 'manager';
  const isAdmin = session.user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {isAdmin ? 'Admin' : isManager ? 'Manager' : 'My'} Dashboard
            </h1>
            <p className="text-gray-500">Welcome back, {session.user.name}</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <Badge variant={isAdmin ? "destructive" : isManager ? "secondary" : "default"}>
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

        {/* Create Todo Section - Only for USERS */}
        {isUser && (
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
                <Button onClick={() => createTodo.mutate()} disabled={!newTitle || createTodo.isPending}>
                  {createTodo.isPending ? "Adding..." : "Add Task"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manager/Admin Info Message */}
        {(isManager || isAdmin) && (
          <Card>
            <CardHeader>
              <CardTitle>
                {isAdmin ? 'Admin View' : 'Manager View'}
              </CardTitle>
              <CardDescription>
                {isAdmin 
                  ? 'You can view and delete all tasks from any user' 
                  : 'You can view all tasks but cannot modify them'}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Todo List Section */}
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold text-gray-700">
            {isUser ? 'Your Tasks' : 'All Tasks'}
          </h2>
          
          {isLoading ? (
            <p>Loading tasks...</p>
          ) : todos?.length === 0 ? (
            <p className="text-gray-400 italic">No tasks found. {isUser && 'Create one above!'}</p>
          ) : (
            todos?.map((t: any) => (
              <Card key={t.id} className="p-4">
                {editingId === t.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <Input 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                    />
                    <Input 
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Description"
                    />
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => updateTodo.mutate(t.id)}
                        disabled={updateTodo.isPending}
                      >
                        {updateTodo.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex flex-row items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          t.status === 'completed' ? 'bg-green-500' : 
                          t.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-300'
                        }`} />
                        <h3 className="font-bold text-lg">{t.title}</h3>
                      </div>
                      <p className="text-sm text-gray-500">{t.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {t.status.replace('_', ' ')}
                        </Badge>
                        {(isManager || isAdmin) && (
                          <span className="text-xs text-blue-500">User ID: {t.userId}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* Edit button - Only for task owner (user) */}
                      {isUser && t.userId === session.user.id && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => startEdit(t)}
                        >
                          Edit
                        </Button>
                      )}
                      
                      {/* Delete button - Admin can delete any, User can delete own drafts */}
                      {(isAdmin || (isUser && t.userId === session.user.id && t.status === 'draft')) && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => deleteTodo.mutate(t.id)}
                          disabled={deleteTodo.isPending}
                        >
                          {deleteTodo.isPending ? "..." : "Delete"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
