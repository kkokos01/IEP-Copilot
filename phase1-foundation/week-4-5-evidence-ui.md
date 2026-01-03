# Week 4-5: Evidence-Based UI

**Objective:** Build UI showing extracted data with field-level source citations

**Prerequisites:**
- Week 1-2 completed (extraction working)
- Week 3 completed (validators working)
- Have extracted IEP data with evidence arrays
- Designer available (part-time) for component polish

## What You're Building

By end of week 5, you'll have:
1. Evidence link component (shows source quote + page number)
2. Goals review table with inline editing
3. Validation issues panel with severity indicators
4. Updated document page integrating all components

## Design Philosophy

**Trust through Transparency:**
Every extracted field shows where it came from. Users can click to see the exact quote and jump to source page.

**Progressive Disclosure:**
Don't overwhelm with all evidence at once. Show "Page X" link, expand to quote on hover/click.

**Inline Editing:**
If extraction is wrong, let users fix it immediately without leaving the page.

## Step 1: Evidence Link Component

**File:** `src/components/iep/EvidenceLink.tsx`

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText } from 'lucide-react';

interface Evidence {
  page: number;
  quote: string;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence?: number;
}

interface EvidenceLinkProps {
  evidence?: Evidence[];
  documentId: string;
}

export function EvidenceLink({ evidence, documentId }: EvidenceLinkProps) {
  if (!evidence || evidence.length === 0) {
    return null;
  }

  const primaryEvidence = evidence[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <FileText className="h-3 w-3 mr-1" />
          Page {primaryEvidence.page}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-2">
          <div className="text-sm font-medium">Source Evidence</div>
          <div className="text-sm text-muted-foreground">
            Page {primaryEvidence.page}
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            "{primaryEvidence.quote}"
          </div>
          {primaryEvidence.confidence && (
            <div className="text-xs text-muted-foreground">
              Confidence: {(primaryEvidence.confidence * 100).toFixed(0)}%
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => {
              // Navigate to document viewer at specific page
              window.location.href = `/documents/${documentId}?page=${primaryEvidence.page}`;
            }}
          >
            View in Document
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Note:** This assumes shadcn/ui components are installed. If not:

```bash
npx shadcn-ui@latest add button popover
npm install lucide-react
```

## Step 2: Goals Review Table Component

**File:** `src/components/iep/GoalsReviewTable.tsx`

```typescript
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EvidenceLink } from './EvidenceLink';
import { Pencil, Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Goal {
  goalText?: {
    value: string;
    evidence?: any[];
  };
  domain?: {
    value: string;
    evidence?: any[];
  };
  baseline?: {
    value: string;
    evidence?: any[];
  };
  target?: {
    value: string;
    evidence?: any[];
  };
  measurementMethod?: {
    value: string;
    evidence?: any[];
  };
}

interface GoalsReviewTableProps {
  goals: Goal[];
  documentId: string;
  onUpdate?: (index: number, field: string, newValue: string) => void;
}

export function GoalsReviewTable({ goals, documentId, onUpdate }: GoalsReviewTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (row: number, field: string, currentValue: string) => {
    setEditingCell({ row, field });
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingCell && onUpdate) {
      onUpdate(editingCell.row, editingCell.field, editValue);
    }
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Goal</TableHead>
            <TableHead>Baseline</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Measurement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {goals.map((goal, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>

              {/* Domain */}
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="outline">
                    {goal.domain?.value || 'Not specified'}
                  </Badge>
                  <EvidenceLink evidence={goal.domain?.evidence} documentId={documentId} />
                </div>
              </TableCell>

              {/* Goal Text */}
              <TableCell className="max-w-md">
                {editingCell?.row === index && editingCell?.field === 'goalText' ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm">{goal.goalText?.value || 'Not found'}</div>
                    <div className="flex items-center gap-2">
                      <EvidenceLink evidence={goal.goalText?.evidence} documentId={documentId} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => startEdit(index, 'goalText', goal.goalText?.value || '')}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </TableCell>

              {/* Baseline */}
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">{goal.baseline?.value || 'Missing'}</div>
                  <EvidenceLink evidence={goal.baseline?.evidence} documentId={documentId} />
                </div>
              </TableCell>

              {/* Target */}
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">{goal.target?.value || 'Missing'}</div>
                  <EvidenceLink evidence={goal.target?.evidence} documentId={documentId} />
                </div>
              </TableCell>

              {/* Measurement Method */}
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">{goal.measurementMethod?.value || 'Not specified'}</div>
                  <EvidenceLink evidence={goal.measurementMethod?.evidence} documentId={documentId} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Install dependencies if needed:**
```bash
npx shadcn-ui@latest add table badge textarea
```

## Step 3: Validation Issues Panel Component

**File:** `src/components/iep/ValidationIssuesPanel.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Info, X, Check } from 'lucide-react';

interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  fieldPath?: string;
  status: 'open' | 'acknowledged' | 'fixed' | 'dismissed';
}

interface ValidationIssuesPanelProps {
  issues: ValidationIssue[];
  onDismiss?: (issueId: string) => void;
  onAcknowledge?: (issueId: string) => void;
}

const severityIcons = {
  error: <AlertCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

const severityColors = {
  error: 'destructive',
  warning: 'warning',
  info: 'secondary',
} as const;

export function ValidationIssuesPanel({ issues, onDismiss, onAcknowledge }: ValidationIssuesPanelProps) {
  const openIssues = issues.filter(i => i.status === 'open');

  if (openIssues.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-green-600">
          <Check className="h-5 w-5" />
          <div className="font-medium">No issues found</div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          This IEP passed all validation checks.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {openIssues.map((issue) => (
        <Card key={issue.id} className="p-4">
          <div className="flex items-start gap-3">
            <Badge variant={severityColors[issue.severity]} className="mt-0.5">
              {severityIcons[issue.severity]}
            </Badge>

            <div className="flex-1 space-y-1">
              <div className="font-medium">{issue.title}</div>
              <div className="text-sm text-muted-foreground">{issue.message}</div>
              {issue.fieldPath && (
                <div className="text-xs text-muted-foreground font-mono">
                  {issue.fieldPath}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {onAcknowledge && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAcknowledge(issue.id)}
                >
                  Acknowledge
                </Button>
              )}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(issue.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

**Install dependencies:**
```bash
npx shadcn-ui@latest add card
```

**Add warning variant to Badge:**

Edit `src/components/ui/badge.tsx` to add warning variant:

```typescript
const badgeVariants = cva(
  // ... existing code
  {
    variants: {
      variant: {
        // ... existing variants
        warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
      },
    },
  }
);
```

## Step 4: API Route for Updating Goals

**File:** `src/app/api/iep/update-goal/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { extractionId, goalIndex, field, newValue } = await request.json();

  // Get current extraction
  const { data: extraction, error: fetchError } = await supabase
    .from('extracted_iep_data')
    .select('data')
    .eq('id', extractionId)
    .single();

  if (fetchError || !extraction) {
    return NextResponse.json({ error: 'Extraction not found' }, { status: 404 });
  }

  // Update the specific field
  const updatedData = { ...extraction.data };
  updatedData.goals[goalIndex][field] = {
    ...updatedData.goals[goalIndex][field],
    value: newValue,
  };

  // Save back to database
  const { error: updateError } = await supabase
    .from('extracted_iep_data')
    .update({ data: updatedData, status: 'reviewed' })
    .eq('id', extractionId);

  if (updateError) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

## Step 5: API Route for Dismissing Issues

**File:** `src/app/api/iep/dismiss-issue/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { issueId, reason } = await request.json();

  const { error } = await supabase
    .from('validation_issues')
    .update({
      status: 'dismissed',
      dismissed_at: new Date().toISOString(),
      dismissal_reason: reason || 'User dismissed',
    })
    .eq('id', issueId);

  if (error) {
    return NextResponse.json({ error: 'Failed to dismiss issue' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

## Step 6: Integrate Components in Document Page

**File:** `src/app/documents/[id]/page.tsx`

```typescript
import { GoalsReviewTable } from '@/components/iep/GoalsReviewTable';
import { ValidationIssuesPanel } from '@/components/iep/ValidationIssuesPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getExtraction(documentId: string) {
  const { data, error } = await supabase
    .from('extracted_iep_data')
    .select('*')
    .eq('document_id', documentId)
    .single();

  if (error) throw error;
  return data;
}

async function getValidationIssues(extractionId: string) {
  const { data, error } = await supabase
    .from('validation_issues')
    .select('*')
    .eq('extracted_iep_data_id', extractionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const extraction = await getExtraction(params.id);
  const issues = await getValidationIssues(extraction.id);

  const handleGoalUpdate = async (index: number, field: string, newValue: string) => {
    await fetch('/api/iep/update-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extractionId: extraction.id,
        goalIndex: index,
        field,
        newValue,
      }),
    });
    // Refresh page or use React state to update locally
    window.location.reload();
  };

  const handleDismissIssue = async (issueId: string) => {
    await fetch('/api/iep/dismiss-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueId }),
    });
    // Refresh page or use React state to update locally
    window.location.reload();
  };

  const handleAcknowledgeIssue = async (issueId: string) => {
    // Similar to dismiss, but set status to 'acknowledged'
    console.log('Acknowledge issue:', issueId);
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">
        IEP Review: {extraction.data.student?.name?.value || 'Student'}
      </h1>

      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="accommodations">Accommodations</TabsTrigger>
          <TabsTrigger value="validation">
            Validation
            {issues.filter(i => i.status === 'open').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {issues.filter(i => i.status === 'open').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="mt-6">
          <GoalsReviewTable
            goals={extraction.data.goals || []}
            documentId={params.id}
            onUpdate={handleGoalUpdate}
          />
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          {/* TODO: Build services table similar to goals */}
          <p className="text-muted-foreground">Services table coming soon...</p>
        </TabsContent>

        <TabsContent value="accommodations" className="mt-6">
          {/* TODO: Build accommodations list */}
          <p className="text-muted-foreground">Accommodations list coming soon...</p>
        </TabsContent>

        <TabsContent value="validation" className="mt-6">
          <ValidationIssuesPanel
            issues={issues}
            onDismiss={handleDismissIssue}
            onAcknowledge={handleAcknowledgeIssue}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Install tabs:**
```bash
npx shadcn-ui@latest add tabs
```

**Note:** This is a Server Component example. For client-side interactions (editing), you'll need to convert parts to Client Components with `"use client"` directive.

## Testing Checklist

**Week 4 Milestones:**
- [ ] EvidenceLink shows page number
- [ ] Clicking EvidenceLink shows popover with quote
- [ ] GoalsReviewTable displays goals with evidence links
- [ ] Inline editing works (edit → save → persists)
- [ ] ValidationIssuesPanel shows issues by severity

**Week 5 Milestones:**
- [ ] Document page integrates all components
- [ ] Tabs work (Goals, Services, Accommodations, Validation)
- [ ] Validation tab shows issue count badge
- [ ] Dismissing issue updates status in database
- [ ] Page is responsive (mobile-friendly)

## Success Criteria

By end of week 5:

- ✅ Users see extracted data in clean tables
- ✅ Every field shows "Page X" link to source
- ✅ Clicking evidence link shows exact quote
- ✅ Users can edit fields inline
- ✅ Validation issues displayed with severity indicators
- ✅ No breaking changes to existing functionality

**User Experience:**
- Upload IEP → See extracted goals in <2 minutes
- Click "Page 3" → See exact quote from document
- Notice missing baseline → See warning in Validation tab
- Edit incorrect goal text → Saves immediately

## Designer Collaboration

**Week 4 (With Designer):**
- Review component layouts together
- Adjust spacing, colors, typography
- Ensure evidence links are discoverable
- Test with real IEP data (not lorem ipsum)

**Deliverables from Designer:**
- Figma mockups for Services and Accommodations tables
- Color palette for severity levels (error, warning, info)
- Icon selection for actions (edit, dismiss, acknowledge)

## Common Issues & Solutions

**Issue:** Evidence popover doesn't close
- **Solution:** Ensure PopoverTrigger wraps button properly. Check shadcn/ui Popover docs.

**Issue:** Inline editing breaks table layout
- **Solution:** Set fixed column widths or use `max-w-md` on editable cells.

**Issue:** Page refresh after save is jarring
- **Solution:** Use React state + optimistic updates. Consider React Query or SWR for data fetching.

**Issue:** Evidence links don't navigate correctly
- **Solution:** Verify document viewer supports `?page=X` query param. Build viewer if needed.

## Next Steps

After Week 4-5 completion:
1. Proceed to `week-6-analytics.md`
2. Build Services and Accommodations tables (similar patterns)
3. User test with 2-3 parents/advocates
4. Gather feedback on evidence UX (too much? too little?)

---

*Week 4-5 Implementation Guide*
*Last Updated: 2026-01-03*
