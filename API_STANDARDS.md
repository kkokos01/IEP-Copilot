# API Route Standards

**Last Updated:** 2026-01-03
**Status:** Active Standard for All Server-Side API Routes

## Standard Pattern for Server-Side API Routes

All server-side API routes in `src/app/api/**` MUST follow this standard pattern.

### 1. Client Usage Rule

**✅ ALWAYS use `getSupabaseAdmin()` for all operations in API routes**

**❌ NEVER use `getSupabaseClient()` in API routes**

#### Why?

- **Server-side context**: API routes run on the server and have NO browser session
- `getSupabaseClient()` uses the anonymous key and lacks user session context
- RLS policies that check `auth.uid()` will fail with anonymous clients
- `getSupabaseAdmin()` bypasses RLS and gives full control with explicit verification

### 2. Standard Authentication Flow

```typescript
export async function GET(request: NextRequest) {
  try {
    // Step 1: Extract and validate bearer token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(ERRORS.AUTH_MISSING);
    }

    const token = authHeader.slice(7);

    // Step 2: Verify token and get user (ALWAYS use admin client)
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

    if (authError || !user) {
      return errorResponse(ERRORS.AUTH_INVALID);
    }

    // Now you have authenticated user.id for verification
  } catch (error) {
    return errorResponse(ERRORS.INTERNAL_ERROR);
  }
}
```

### 3. Ownership Verification Pattern

**✅ Always verify ownership explicitly - never rely on RLS in API routes**

```typescript
// Pattern 1: Direct ownership check
const { data: child } = await getSupabaseAdmin()
  .from("children")
  .select("*")
  .eq("id", childId)
  .single();

if (!child || child.user_id !== user.id) {
  return errorResponse(ERRORS.NOT_FOUND);
}

// Pattern 2: Through relationships
const { data: document } = await getSupabaseAdmin()
  .from("documents")
  .select("*, cases!inner(children!inner(user_id))")
  .eq("id", documentId)
  .single();

if (!document || document.cases.children.user_id !== user.id) {
  return errorResponse(ERRORS.NOT_FOUND);
}

// Pattern 3: Filter by user's owned entities
const { data: children } = await getSupabaseAdmin()
  .from("children")
  .select("id")
  .eq("user_id", user.id);

const childIds = children.map(c => c.id);

const { data: documents } = await getSupabaseAdmin()
  .from("documents")
  .select("*")
  .in("case_id", caseIds);
```

### 4. Database Operations

**✅ Use admin client for all database operations**

```typescript
// READ
const { data, error } = await getSupabaseAdmin()
  .from("table_name")
  .select("*")
  .eq("id", id);

// CREATE
const { data, error } = await getSupabaseAdmin()
  .from("table_name")
  .insert({ ...fields })
  .select()
  .single();

// UPDATE
const { data, error } = await getSupabaseAdmin()
  .from("table_name")
  .update({ ...fields })
  .eq("id", id)
  .select()
  .single();

// DELETE
const { error } = await getSupabaseAdmin()
  .from("table_name")
  .delete()
  .eq("id", id);
```

### 5. Privileged Operations

**✅ Use admin client for operations that require elevated permissions**

```typescript
// Storage operations (bypass RLS)
await getSupabaseAdmin()
  .storage
  .from("documents")
  .remove(filePaths);

// Audit logging (bypass RLS)
await getSupabaseAdmin()
  .from("audit_log")
  .insert({
    user_id: user.id,
    action: "delete",
    entity_type: "document",
    entity_id: documentId,
    metadata: { ...details }
  });
```

### 6. Error Handling

**✅ Return structured errors with codes, messages, and hints**

```typescript
const ERRORS = {
  AUTH_MISSING: {
    code: "AUTH_MISSING",
    message: "Authentication required",
    hint: "Please sign in to access this resource",
    status: 401,
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    message: "Resource not found",
    hint: "The resource may have been deleted or you don't have permission",
    status: 404,
  },
  // ... more errors
};

function errorResponse(error: typeof ERRORS[keyof typeof ERRORS]) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        hint: error.hint,
      },
    },
    { status: error.status }
  );
}
```

### 7. Complete Example

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(ERRORS.AUTH_MISSING);
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);

    if (authError || !user) {
      return errorResponse(ERRORS.AUTH_INVALID);
    }

    // 2. Get resource
    const { id } = await params;
    const { data: document, error: fetchError } = await getSupabaseAdmin()
      .from("documents")
      .select("*, cases!inner(children!inner(user_id))")
      .eq("id", id)
      .single();

    if (fetchError || !document) {
      return errorResponse(ERRORS.NOT_FOUND);
    }

    // 3. Verify ownership
    if (document.cases.children.user_id !== user.id) {
      return errorResponse(ERRORS.NOT_FOUND);
    }

    // 4. Return success
    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("API error:", error);
    return errorResponse(ERRORS.INTERNAL_ERROR);
  }
}
```

## Client-Side vs Server-Side

### Client-Side (React Components)

**✅ Use `getSupabaseClient()` in client components**

```typescript
'use client';

export default function MyComponent() {
  const loadData = async () => {
    // Has session context from browser cookies
    const { data } = await getSupabaseClient()
      .from("documents")
      .select("*");
  };
}
```

### Server-Side (API Routes)

**✅ Use `getSupabaseAdmin()` in API routes**

```typescript
export async function GET(request: NextRequest) {
  // No browser session - use admin client
  const { data } = await getSupabaseAdmin()
    .from("documents")
    .select("*");
}
```

## Summary

| Context | Client | Auth | Ownership | RLS |
|---------|--------|------|-----------|-----|
| **Client-side components** | `getSupabaseClient()` | From session cookies | Via RLS | Enabled |
| **Server-side API routes** | `getSupabaseAdmin()` | From bearer token | Manual verification | Bypassed |

## Checklist for New API Routes

- [ ] Import only `getSupabaseAdmin` from `@/lib/supabase`
- [ ] Extract bearer token from Authorization header
- [ ] Validate token with `getSupabaseAdmin().auth.getUser(token)`
- [ ] Use `getSupabaseAdmin()` for ALL database operations
- [ ] Explicitly verify ownership before returning data
- [ ] Use structured error responses with codes and hints
- [ ] Add audit logging for sensitive operations
- [ ] Never use `getSupabaseClient()` in API routes

## Reference Implementations

✅ **Good Examples:**
- `src/app/api/documents/upload/route.ts` - Clean admin client usage
- `src/app/api/analytics/route.ts` - Multi-step filtering pattern
- `src/app/api/documents/[id]/route.ts` - Comprehensive CRUD with audit logging

❌ **Anti-Patterns to Avoid:**
- Using `getSupabaseClient()` in API routes
- Relying on RLS for server-side security
- Missing ownership verification
- Exposing internal error details to clients
