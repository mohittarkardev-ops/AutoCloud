'use client'

// If / Else node panel — plain-language version.
// It still reads/writes the SAME saved keys as before (conditionType, conditionLeft, conditionOperator,
// conditionRight, trueBranch, falseBranch, loopCount), so existing workflows and the Python engine keep working.
// The only new value is conditionOperator = 'not_exists' (for "element is NOT on the page").

import React from 'react'
import { GitBranch, CornerUpLeft, AlertTriangle } from 'lucide-react'

export type IfElseTarget = { id: string; sequence: number; label: string }

export type IfElseCfg = {
  conditionType?: string
  conditionLeft?: string
  conditionOperator?: string
  conditionRight?: string
  trueBranch?: string
  falseBranch?: string
  loopCount?: number
}

export type IfElsePatch = Record<string, string | number | undefined>

export type CheckId = 'el_exists' | 'el_missing' | 'el_text' | 'page_text' | 'url' | 'value'

const CHECKS: { id: CheckId; icon: string; title: string; desc: string }[] = [
  { id: 'el_exists',  icon: '👁', title: 'Element is on the page',     desc: 'A button, message or field is visible' },
  { id: 'el_missing', icon: '🚫', title: 'Element is NOT on the page', desc: 'Something is missing or has gone' },
  { id: 'el_text',    icon: '🔤', title: 'Text inside an element',     desc: 'Check what an element says' },
  { id: 'page_text',  icon: '📄', title: 'Page contains text',         desc: 'A word or message appears anywhere' },
  { id: 'url',        icon: '🔗', title: 'Page address (URL)',         desc: 'The web address has some text' },
  { id: 'value',      icon: '📊', title: 'Excel / saved value',        desc: 'Check a column or a variable' },
]

const TEXT_OPS = [
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'does NOT contain' },
  { value: 'equals',       label: 'is exactly' },
  { value: 'not_equals',   label: 'is NOT exactly' },
  { value: 'is_empty',     label: 'is empty' },
  { value: 'is_not_empty', label: 'is NOT empty' },
]

const OP_LABEL: Record<string, string> = {}
TEXT_OPS.forEach(o => { OP_LABEL[o.value] = o.label })

const isTextOp = (op?: string) => !!op && Object.prototype.hasOwnProperty.call(OP_LABEL, op)

// ───────────────────────── pure helpers (exported so they can be unit-tested) ─────────────────────────

/** Which plain-language check does the saved config represent? */
export function detectCheck(cfg: IfElseCfg): CheckId {
  const t = cfg.conditionType || 'element_exists'
  if (t === 'element_exists') return cfg.conditionOperator === 'not_exists' ? 'el_missing' : 'el_exists'
  if (t === 'element_text_equals' || t === 'element_text_contains') return 'el_text'
  if (t === 'page_has_text') return 'page_text'
  if (t === 'url_contains') return 'url'
  return 'value' // variable_empty / variable_equals / variable_contains
}

/** The operator that is actually in effect for text / value checks. */
export function effectiveOperator(cfg: IfElseCfg): string {
  if (cfg.conditionType === 'variable_empty') return 'is_empty'
  if (isTextOp(cfg.conditionOperator)) return cfg.conditionOperator as string
  return detectCheck(cfg) === 'value' ? 'equals' : 'contains'
}

/** Is the "compare with / look for" box needed for this check? */
export function needsRight(cfg: IfElseCfg): boolean {
  const c = detectCheck(cfg)
  if (c === 'page_text' || c === 'url') return true
  if (c === 'el_text' || c === 'value') {
    const op = effectiveOperator(cfg)
    return op !== 'is_empty' && op !== 'is_not_empty'
  }
  return false
}

/** Fields to save when the user picks a check card (type + operator together, never half-applied). */
export function checkPatch(id: CheckId, cfg: IfElseCfg): IfElsePatch {
  const cur = detectCheck(cfg)
  const keepOp = (cur === 'el_text' || cur === 'value') && isTextOp(cfg.conditionOperator) ? cfg.conditionOperator : undefined
  switch (id) {
    case 'el_exists':
      return { conditionType: 'element_exists', conditionOperator: 'is_empty' } // operator is ignored by this check
    case 'el_missing':
      return { conditionType: 'element_exists', conditionOperator: 'not_exists' }
    case 'el_text':
      return {
        conditionType: cfg.conditionType === 'element_text_contains' ? 'element_text_contains' : 'element_text_equals',
        conditionOperator: keepOp ?? 'contains',
      }
    case 'page_text':
      return { conditionType: 'page_has_text', conditionOperator: 'contains' }
    case 'url':
      return { conditionType: 'url_contains', conditionOperator: 'contains' }
    case 'value': {
      const t = cfg.conditionType
      const keepType = t === 'variable_equals' || t === 'variable_contains' ? t : 'variable_equals'
      return { conditionType: keepType, conditionOperator: keepOp ?? 'equals' }
    }
  }
}

/** Fields to save when the user changes the operator drop-down. */
export function operatorPatch(op: string, cfg: IfElseCfg): IfElsePatch {
  if (cfg.conditionType === 'variable_empty') return { conditionType: 'variable_equals', conditionOperator: op }
  return { conditionOperator: op }
}

const q = (s?: string) => (s && s.trim() ? `“${s.trim()}”` : '…')

export function describeCondition(cfg: IfElseCfg): string {
  const c = detectCheck(cfg)
  const op = OP_LABEL[effectiveOperator(cfg)] || ''
  const right = needsRight(cfg) ? ` ${q(cfg.conditionRight)}` : ''
  switch (c) {
    case 'el_exists':  return `the element ${q(cfg.conditionLeft)} is on the page`
    case 'el_missing': return `the element ${q(cfg.conditionLeft)} is NOT on the page`
    case 'el_text':    return `the text of ${q(cfg.conditionLeft)} ${op}${right}`
    case 'page_text':  return `the page contains ${q(cfg.conditionRight)}`
    case 'url':        return `the page address contains ${q(cfg.conditionRight)}`
    default:           return `${q(cfg.conditionLeft)} ${op}${right}`
  }
}

export function targetName(id: string | undefined, targets: IfElseTarget[]): string {
  if (!id) return 'the next step'
  const t = targets.find(x => x.id === id)
  return t ? `Step ${t.sequence}: ${t.label}` : 'an unknown step (old link)'
}

// ───────────────────────── UI ─────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{children}</p>
}

function TargetSelect({
  value, onChange, targets, currentSequence, tone,
}: {
  value?: string
  onChange: (v: string) => void
  targets: IfElseTarget[]
  currentSequence: number
  tone: string
}) {
  const unknown = !!value && !targets.some(t => t.id === value)
  return (
    <select className={`cp-select text-[11px] font-semibold ${tone}`} value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">Continue with the next step</option>
      {unknown && <option value={value}>⚠ Old link ({value}) - please pick again</option>}
      {targets
        .filter(t => t.sequence !== currentSequence)
        .map(t => (
          <option key={t.id} value={t.id}>
            {t.sequence < currentSequence ? '↩ ' : ''}Step {t.sequence}: {t.label}
          </option>
        ))}
    </select>
  )
}

export function IfElseConfigPanel({
  cfg, patch, targets, currentSequence,
}: {
  cfg: IfElseCfg
  patch: (p: IfElsePatch) => void
  targets: IfElseTarget[]
  currentSequence: number
}) {
  const check = detectCheck(cfg)
  const op = effectiveOperator(cfg)
  const showOperator = check === 'el_text' || check === 'value'
  const showLeft = check === 'el_exists' || check === 'el_missing' || check === 'el_text' || check === 'value'
  const showRight = needsRight(cfg)

  const isBack = (id?: string) => {
    const t = targets.find(x => x.id === id)
    return !!t && t.sequence < currentSequence
  }
  const goesBack = isBack(cfg.trueBranch) || isBack(cfg.falseBranch)
  const hasOldLink = [cfg.trueBranch, cfg.falseBranch].some(id => !!id && !targets.some(t => t.id === id))

  const leftLabel = check === 'value' ? 'Value to check' : 'Which element?'
  const leftPlaceholder = check === 'value' ? '{{Customer_Name}}' : "#error-message  or  //button[text()='Submit']"
  const leftHint = check === 'value'
    ? 'Use an Excel column like {{Customer_Name}} or a saved variable.'
    : 'CSS selector or XPath. Tip: on the website right-click the element, choose Inspect, then copy the selector.'
  const rightLabel =
    check === 'page_text' ? 'Text to look for' :
    check === 'url' ? 'Address contains' :
    check === 'value' ? 'Compare with' : 'Text to compare with'

  return (
    <div className="space-y-3">
      {/* 1 — WHAT TO CHECK */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
          <GitBranch size={11} /> 1 · What do you want to check?
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {CHECKS.map(c => {
            const active = c.id === check
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => patch(checkPatch(c.id, cfg))}
                className={`text-left rounded-xl border px-2.5 py-2 transition-colors ${
                  active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-accent'
                }`}
              >
                <span className="block text-[11px] font-semibold leading-tight">
                  <span className="mr-1">{c.icon}</span>{c.title}
                </span>
                <span className="block text-[9.5px] leading-tight text-muted-foreground mt-0.5">{c.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2 — DETAILS */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">2 · Details</p>

        {showLeft && (
          <div>
            <Label>{leftLabel}</Label>
            <input
              type="text"
              placeholder={leftPlaceholder}
              value={cfg.conditionLeft || ''}
              onChange={e => patch({ conditionLeft: e.target.value })}
              className="cp-input font-mono text-[11px]"
            />
            <p className="text-[10px] text-muted-foreground/70 mt-1">{leftHint}</p>
          </div>
        )}

        {showOperator && (
          <div>
            <Label>It…</Label>
            <select
              className="cp-select"
              value={op}
              onChange={e => patch(operatorPatch(e.target.value, cfg))}
            >
              {TEXT_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        {showRight && (
          <div>
            <Label>{rightLabel}</Label>
            <input
              type="text"
              placeholder="text or {{ColumnName}}"
              value={cfg.conditionRight || ''}
              onChange={e => patch({ conditionRight: e.target.value })}
              className="cp-input font-mono text-[11px]"
            />
          </div>
        )}

        {!showLeft && !showRight && (
          <p className="text-[10px] text-muted-foreground">Nothing more to fill in for this check.</p>
        )}
      </div>

      {/* 3 — WHAT HAPPENS NEXT */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">3 · What happens next?</p>
        <div>
          <Label>✅ If YES, go to</Label>
          <TargetSelect
            value={cfg.trueBranch}
            onChange={v => patch({ trueBranch: v })}
            targets={targets}
            currentSequence={currentSequence}
            tone="text-green-600"
          />
        </div>
        <div>
          <Label>❌ If NO, go to</Label>
          <TargetSelect
            value={cfg.falseBranch}
            onChange={v => patch({ falseBranch: v })}
            targets={targets}
            currentSequence={currentSequence}
            tone="text-red-600"
          />
        </div>
        <p className="text-[10px] text-muted-foreground/80">
          “Continue with the next step” means: do nothing special and move on to the following step.
        </p>

        {goesBack && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <CornerUpLeft size={12} /> This goes back to an earlier step (retry)
            </p>
            <div className="flex items-center gap-2 mt-2 text-[11px]">
              <span>Retry at most</span>
              <input
                type="number"
                min={1}
                max={20}
                value={cfg.loopCount ?? 3}
                onChange={e => patch({ loopCount: Math.min(20, Math.max(1, Number(e.target.value) || 3)) })}
                className="cp-input w-16 text-center"
              />
              <span>times, then the record is marked FAILED.</span>
            </div>
          </div>
        )}

        {hasOldLink && (
          <p className="text-[10px] text-red-600 flex items-start gap-1.5">
            <AlertTriangle size={12} className="mt-px shrink-0" />
            One of the targets uses an old link (the steps were renumbered). Please pick it again.
          </p>
        )}
      </div>

      {/* PREVIEW IN PLAIN WORDS */}
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-[11px] leading-relaxed">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">In plain words</p>
        <p><b>IF</b> {describeCondition(cfg)}</p>
        <p className="text-green-700 dark:text-green-400">✅ <b>THEN</b> go to {targetName(cfg.trueBranch, targets)}</p>
        <p className="text-red-700 dark:text-red-400">❌ <b>OTHERWISE</b> go to {targetName(cfg.falseBranch, targets)}</p>
      </div>
    </div>
  )
}
