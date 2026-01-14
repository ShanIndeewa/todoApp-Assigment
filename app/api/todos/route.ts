import { db } from "@/lib/db";
import { todo } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

// GET Todos
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  // Validate user
  if (role === "manager" || role === "admin") {
    const allTodos = await db.select().from(todo);
    return Response.json(allTodos);
  }
  
  const myTodos = await db.select().from(todo).where(eq(todo.userId, userId));
  return Response.json(myTodos);
}

// Create Todo
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
 
  if(session.user.role === "user"){
    const body = await req.json();

  await db.insert(todo).values({
    title: body.title,
    description: body.description || "",
    status: "draft",
    userId: session.user.id,
  });

  return Response.json({ success: true });
  }
  return new Response("Forbidden: Only users can create tasks", { status: 403 });
  
}

// DELETE Todo
export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const todoId = Number(searchParams.get("id"));

  // Get the todo first to check status
  const [targetTodo] = await db.select().from(todo).where(eq(todo.id, todoId));
  if (!targetTodo) return new Response("Not Found", { status: 404 });


  // ABAC Logic for Delete
  const isOwner = targetTodo.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  const isDraft = targetTodo.status === "draft";
  const isUser = session.user.role === "user";

  if (isAdmin || (isOwner && isDraft && isUser)) {
    await db.delete(todo).where(eq(todo.id, todoId));
    return Response.json({ success: true });
  }

  return new Response("Forbidden: You cannot delete this task", { status: 403 });

}

// UPDATE Todo
export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const todoId = Number(searchParams.get("id"));
  const body = await req.json();

  // Get the todo first to check ownership
  const [targetTodo] = await db.select().from(todo).where(eq(todo.id, todoId));
  if (!targetTodo) return new Response("Not Found", { status: 404 });

  const isOwner = targetTodo.userId === session.user.id;
  const isUser = session.user.role === "user";

  // Only owners can update their todos
  if (isOwner && isUser) {
    await db.update(todo)
      .set({
        title: body.title ?? targetTodo.title,
        description: body.description ?? targetTodo.description,
        status: body.status ?? targetTodo.status,
      })
      .where(eq(todo.id, todoId));

    return Response.json({ success: true });
  }

  return new Response("Forbidden: You cannot update this task", { status: 403 });
}