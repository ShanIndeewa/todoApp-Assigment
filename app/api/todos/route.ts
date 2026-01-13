import { db } from "@/lib/db";
import { todo } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

// GET: Fetch Todos
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  // ABAC: Managers & Admins see ALL. Users see OWN.
  if (role === "manager" || role === "admin") {
    const allTodos = await db.select().from(todo);
    return Response.json(allTodos);
  }
  
  const myTodos = await db.select().from(todo).where(eq(todo.userId, userId));
  return Response.json(myTodos);
}

// POST: Create Todo
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  await db.insert(todo).values({
    title: body.title,
    description: body.description || "",
    status: "draft",
    userId: session.user.id,
  });

  return Response.json({ success: true });
}

// DELETE: Remove Todo
export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const todoId = Number(searchParams.get("id"));

  // 1. Get the todo first to check ownership/status
  const [targetTodo] = await db.select().from(todo).where(eq(todo.id, todoId));
  if (!targetTodo) return new Response("Not Found", { status: 404 });

  // 2. ABAC Logic for Delete
  const isOwner = targetTodo.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  const isDraft = targetTodo.status === "draft";

  // Rule: Admin can delete ANY. User can delete OWN if DRAFT.
  if (isAdmin || (isOwner && isDraft)) {
    await db.delete(todo).where(eq(todo.id, todoId));
    return Response.json({ success: true });
  }

  return new Response("Forbidden: You cannot delete this task", { status: 403 });
}
