import { supabase } from './supabase'

export type AppIssueSeverity = 'warning' | 'error'

export interface AppIssue {
  id: string
  app: string
  severity: AppIssueSeverity
  message: string
  details: string | null
  source: string | null
  location: string | null
  user_id: string | null
  created_at: string
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
}

export async function getUnresolvedIssueCount(): Promise<number> {
  const { count, error } = await supabase
    .from('app_issues')
    .select('id', { count: 'exact', head: true })
    .eq('resolved', false)
  if (error) {
    console.error('Failed to count app_issues:', error)
    return 0
  }
  return count ?? 0
}

export async function getAppIssues(includeResolved = false): Promise<AppIssue[]> {
  const query = supabase
    .from('app_issues')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  const { data, error } = includeResolved ? await query : await query.eq('resolved', false)
  if (error) {
    console.error('Failed to fetch app_issues:', error)
    return []
  }
  return (data ?? []) as AppIssue[]
}

export async function resolveAppIssue(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('app_issues')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id ?? null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteAppIssue(id: string): Promise<void> {
  const { error } = await supabase.from('app_issues').delete().eq('id', id)
  if (error) throw error
}

// Build a Claude Code prompt that a developer can paste into a new session
// to investigate and fix the issue. Includes enough provenance that Claude
// can find the relevant code without further interrogation.
export function buildFixPrompt(issue: AppIssue): string {
  const lines: string[] = []
  lines.push(`I'm seeing a ${issue.severity} in the ${issue.app} app that I'd like to fix.`)
  lines.push('')
  lines.push(`**App:** ${issue.app}`)
  lines.push(`**Severity:** ${issue.severity}`)
  lines.push(`**When:** ${issue.created_at}`)
  if (issue.source) lines.push(`**Source:** ${issue.source}`)
  if (issue.location) lines.push(`**Location:** ${issue.location}`)
  lines.push('')
  lines.push('**Message:**')
  lines.push('```')
  lines.push(issue.message)
  lines.push('```')
  if (issue.details) {
    lines.push('')
    lines.push('**Details:**')
    lines.push('```')
    lines.push(issue.details)
    lines.push('```')
  }
  lines.push('')
  lines.push('Please:')
  lines.push('1. Locate the relevant code in the codebase.')
  lines.push('2. Diagnose the root cause (not just the symptom).')
  lines.push('3. Propose a fix; if it\'s a clear bug, implement it.')
  lines.push('4. If the issue suggests a class of problems (e.g. missing error handling), check whether siblings are affected.')
  return lines.join('\n')
}
