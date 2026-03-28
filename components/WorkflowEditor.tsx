'use client'

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  ReactFlowProvider,
  useReactFlow,
  NodeChange,
  Node,
  useOnSelectionChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as XLSX from 'xlsx';
import {
  Play, MousePointerClick, Globe, Keyboard, Timer, Save, Settings2,
  Code, CheckSquare, ListFilter, FileSpreadsheet, CheckCircle2,
  Loader2, ShieldCheck, FileSearch, AlertCircle,
  GitBranch, RefreshCw, Download, Eye, ChevronDown,
  Layers, Monitor,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { saveWorkflow } from '@/app/actions/workflows';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface NodeConfig {
  selector?: string;
  value?: string;
  technique?: string;
  url?: string;
  retries?: number;
  retryDelay?: number;
  onError?: 'stop' | 'continue' | 'retry';
  waitType?: 'element' | 'hidden' | 'time' | 'url';
  waitTarget?: string;
  waitTimeout?: number;
  loopCount?: number;
  condition?: string;
  jsCode?: string;
  extractFields?: string;
  outputFile?: string;
  checkAction?: 'check' | 'uncheck' | 'toggle';
  fileName?: string;
  notes?: string;
  action?: string;
  // ── NEW: per-block post-action wait (milliseconds) ──
  waitAfterMs?: number;
}

interface AutomationNodeData {
  nodeType: string;
  label: string;
  subline: string;
  iName: string;
  category: string;
  sequence: number;
  config: NodeConfig;
  status?: 'idle' | 'running' | 'success' | 'error';
}

// ─────────────────────────────────────────────
// ICICI PRESETS (unchanged)
// ─────────────────────────────────────────────
const ICICI_PRESETS: Record<string, Array<{ label: string; selector?: string; value?: string; technique?: string; waitType?: string; waitTarget?: string; waitTimeout?: number }>> = {
  type_text: [
    { label: 'Registration No', selector: '#txtreg', technique: 'send_keys' },
    { label: 'Engine Number', selector: "//input[@id='txtreg'][@placeholder='Engine Number']", technique: 'send_keys' },
    { label: 'Chassis Number', selector: '#carreg', technique: 'send_keys' },
    { label: 'TP Policy Number', selector: '#TPpolno', technique: 'send_keys' },
    { label: 'SAOD Policy Number', selector: '#prevpolno', technique: 'send_keys' },
    { label: 'Insured Name', selector: '#nameCstm', technique: 'send_keys' },
    { label: 'Mobile Number', selector: '#mobile', technique: 'send_keys' },
    { label: 'Email', selector: '#email', technique: 'send_keys' },
    { label: 'Pincode', selector: '#pincode', technique: 'send_keys' },
    { label: 'PAN Number', selector: '#pan_no', technique: 'native_setter' },
    { label: 'Date of Birth (KYC)', selector: '#pan_dob', technique: 'native_setter' },
    { label: 'IDV Value', selector: '#sirangeinput', technique: 'dispatch_event' },
    { label: 'TP Start Date', selector: '#TPpolstartdate', technique: 'dispatch_event' },
    { label: 'TP End Date', selector: '#TPpolenddate', technique: 'dispatch_event' },
    { label: 'Non-Electrical Value', selector: "input[type='text'][id='NonElectricalAccessories']", technique: 'send_keys' },
  ],
  click: [
    { label: 'Fetch Vehicle Details', selector: '#showHiddenForm', technique: 'js_click' },
    { label: 'Get Quote Button', selector: '#get_quote', technique: 'standard_click' },
    { label: 'Recalculate Button', selector: '#submit_quote', technique: 'standard_click' },
    { label: 'Final Submit', selector: '#submit_quote', technique: 'js_click' },
    { label: 'Create Proposal', selector: '#buypol', technique: 'js_click' },
    { label: 'Complete KYC Radio', selector: "label[for='kycbtn']", technique: 'js_click' },
    { label: 'Send Link Button', selector: "//span[normalize-space()='Send Link']", technique: 'js_click' },
    { label: 'OK (SweetAlert Popup)', selector: 'button.swal2-confirm', technique: 'js_click' },
    { label: 'Proceed (KYC Customer)', selector: '#arya_proceed_btn', technique: 'js_click' },
  ],
  select: [
    { label: 'NCB → 0%', selector: "//select[.//option[text()='0%']]", value: '0', technique: 'native_select' },
    { label: 'Zero Dep Plan → Silver', selector: '#zerodep', value: 'Silver', technique: 'native_select' },
    { label: 'TP Insurer Name', selector: '#previnstp', technique: 'mat_autocomplete' },
    { label: 'SAOD Insurer Name', selector: '#previns', technique: 'mat_autocomplete' },
  ],
  checkbox: [
    { label: 'Standalone OD Toggle', selector: "label[for='switch']", technique: 'js_click' },
    { label: 'Non-Electrical Accessories', selector: "label[for='NonElectricalAccessories']", technique: 'js_click' },
    { label: 'Uncheck PA Cover', selector: '#scpaCoverSAOD1', technique: 'js_click' },
    { label: 'Uncheck IL Smart Assist', selector: "label[for='ILSmartAssistPrime']", technique: 'js_click' },
    { label: 'Zero Dep Checkbox', selector: "label[for='ZeroDepPlanName']", technique: 'js_click' },
  ],
  wait: [
    { label: 'Wait for Quote Section', waitTarget: '#quotesection', waitType: 'element', waitTimeout: 20 },
    { label: 'Wait for Backdrop to Hide', waitTarget: '.backdrop', waitType: 'hidden', waitTimeout: 15 },
    { label: 'Wait for KYC Popup', waitTarget: '#pan_no', waitType: 'element', waitTimeout: 10 },
    { label: 'Wait for Proposal Form', waitTarget: '#nameCstm', waitType: 'element', waitTimeout: 20 },
    { label: 'Wait for Send Link Section', waitTarget: "//span[normalize-space()='Send Link']", waitType: 'element', waitTimeout: 30 },
  ],
};

// ─────────────────────────────────────────────
// NODE ICON RESOLVER
// ─────────────────────────────────────────────
const NodeIcon = ({ iName, size = 14 }: { iName: string; size?: number }) => {
  const props = { size };
  switch (iName) {
    case 'Play': return <Play {...props} />;
    case 'FileSpreadsheet': return <FileSpreadsheet {...props} />;
    case 'Globe': return <Globe {...props} />;
    case 'MousePointerClick': return <MousePointerClick {...props} />;
    case 'Keyboard': return <Keyboard {...props} />;
    case 'ListFilter': return <ListFilter {...props} />;
    case 'CheckSquare': return <CheckSquare {...props} />;
    case 'Timer': return <Timer {...props} />;
    case 'Code': return <Code {...props} />;
    case 'GitBranch': return <GitBranch {...props} />;
    case 'RefreshCw': return <RefreshCw {...props} />;
    case 'Download': return <Download {...props} />;
    case 'Layers': return <Layers {...props} />;
    case 'Monitor': return <Monitor {...props} />;
    default: return <Play {...props} />;
  }
};

// ─────────────────────────────────────────────
// CATEGORY STYLES
// ─────────────────────────────────────────────
const catStyle = (category: string) => {
  switch (category) {
    case 'trigger':  return { header: 'bg-green-500/8 border-b border-green-500/15',   icon: 'bg-green-500/15 text-green-600 dark:text-green-400' };
    case 'action':   return { header: 'bg-blue-500/8 border-b border-blue-500/15',     icon: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' };
    case 'data':     return { header: 'bg-teal-500/8 border-b border-teal-500/15',     icon: 'bg-teal-500/15 text-teal-600 dark:text-teal-400' };
    case 'logic':    return { header: 'bg-purple-500/8 border-b border-purple-500/15', icon: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' };
    case 'advanced': return { header: 'bg-amber-500/8 border-b border-amber-500/15',   icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
    default:         return { header: 'bg-muted/50 border-b border-border',             icon: 'bg-muted text-muted-foreground' };
  }
};

const statusRing = (status?: string) => {
  switch (status) {
    case 'running': return 'ring-2 ring-amber-400 ring-offset-1';
    case 'success': return 'ring-2 ring-green-500 ring-offset-1';
    case 'error':   return 'ring-2 ring-red-500 ring-offset-1';
    default: return '';
  }
};

// ─────────────────────────────────────────────
// AUTOMATION NODE — No handles/wires
// ─────────────────────────────────────────────
const AutomationNode = ({ data, selected }: { data: AutomationNodeData; selected: boolean }) => {
  const s = catStyle(data.category);
  const cfg = data.config || {};

  const getPreview = () => {
    if (data.nodeType === 'open_url')      return cfg.url || 'No URL set';
    if (data.nodeType === 'loop_excel')    return cfg.fileName || 'No file mapped';
    if (data.nodeType === 'type_text')     return cfg.selector ? `${cfg.selector} → ${(cfg.value || '').substring(0, 18)}` : 'No selector';
    if (data.nodeType === 'click')         return cfg.selector || 'No selector';
    if (data.nodeType === 'select')        return cfg.selector ? `${cfg.selector} → ${cfg.value || '?'}` : 'No selector';
    if (data.nodeType === 'checkbox')      return cfg.selector || 'No selector';
    if (data.nodeType === 'wait')          return cfg.waitType === 'time' ? `Wait ${cfg.waitTimeout}s` : (cfg.waitTarget || 'No target');
    if (data.nodeType === 'if_else')       return cfg.condition || 'No condition';
    if (data.nodeType === 'loop')          return `Repeat ${cfg.loopCount || 3} times`;
    if (data.nodeType === 'js_inject')     return cfg.jsCode ? cfg.jsCode.substring(0, 28) + '…' : 'No code';
    if (data.nodeType === 'extract')       return cfg.extractFields ? cfg.extractFields.split('\n')[0] : 'No fields';
    if (data.nodeType === 'switch_iframe') return cfg.action === 'exit' ? 'Exit → Main Page' : `Enter: ${cfg.selector || 'No selector'}`;
    if (data.nodeType === 'switch_tab')    return `Tab: ${cfg.action || 'next'}`;
    if (data.nodeType === 'press_key')     return cfg.selector ? `${cfg.value || 'ENTER'} on ${cfg.selector}` : `Key: ${cfg.value || 'ENTER'}`;
    return data.label;
  };

  const techBadge = cfg.technique && !['send_keys', 'standard_click', 'standard'].includes(cfg.technique)
    ? cfg.technique.replace('_', ' ')
    : null;

  return (
    <div className={`
      bg-card border rounded-xl shadow-sm w-[260px] overflow-hidden transition-all duration-150
      ${selected ? 'border-primary shadow-md shadow-primary/10' : 'border-border hover:border-border/80 hover:shadow-md'}
      ${statusRing(data.status)}
    `}>
      {/* ── HEADER ── */}
      <div className={`px-3 py-2.5 flex items-center gap-2.5 ${s.header}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.icon}`}>
          <NodeIcon iName={data.iName} size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold leading-none truncate">{data.label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{data.subline}</div>
        </div>
        {/* Step Number Badge */}
        <div className={`min-w-[22px] h-[22px] rounded-full px-1.5 flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
          data.sequence > 0
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground border border-dashed border-border'
        }`}>
          {data.sequence > 0 ? data.sequence : '?'}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="px-3 py-2 space-y-1.5">
        <div className="bg-muted/60 rounded-md px-2 py-1 text-[10px] font-mono text-muted-foreground truncate border border-border/40">
          {getPreview()}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {techBadge && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {techBadge}
            </span>
          )}
          {(cfg.retries ?? 0) > 0 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              ↺ {cfg.retries}x
            </span>
          )}
          {cfg.onError === 'continue' && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
              skip-on-fail
            </span>
          )}
          {/* Wait-after badge */}
          {(cfg.waitAfterMs ?? 0) > 0 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-0.5">
              <Timer size={8} /> +{cfg.waitAfterMs}ms
            </span>
          )}
          {data.status && data.status !== 'idle' && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-auto ${
              data.status === 'running' ? 'bg-amber-500/10 text-amber-600' :
              data.status === 'success' ? 'bg-green-500/10 text-green-600' :
              'bg-red-500/10 text-red-600'
            }`}>
              {data.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = { automation: AutomationNode };
const getId = () => `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// ─────────────────────────────────────────────
// JSON EXPORT BUILDER (no edges)
// ─────────────────────────────────────────────
function buildWorkflowJSON(nodes: Node[]) {
  const allColumns = new Set<string>();

  // Sort by manual sequence number, skip unset (0)
  const ordered = [...nodes]
    .filter(n => (n.data as unknown as AutomationNodeData).sequence > 0)
    .sort((a, b) => {
      const seqA = (a.data as unknown as AutomationNodeData).sequence;
      const seqB = (b.data as unknown as AutomationNodeData).sequence;
      return seqA - seqB;
    });

  const extractCols = (str: string) => {
    if (!str) return;
    const matches = str.matchAll(/\{\{([^}]+)\}\}/g);
    for (const m of matches) allColumns.add(m[1]);
  };

  const steps = ordered.map((node, idx) => {
    const d = node.data as unknown as AutomationNodeData;
    const c = d.config || {};

    const base = {
      sequence: d.sequence,
      id: node.id,
      type: d.nodeType,
      label: d.label,
      notes: c.notes || '',
      wait_after_ms: c.waitAfterMs ?? 0,   // ← NEW FIELD
      error_handling: {
        on_error: c.onError || 'stop',
        retries: Number(c.retries ?? 0),
        retry_delay_ms: Number(c.retryDelay ?? 1000),
      },
    };

    if (d.nodeType === 'trigger') return base;
    if (d.nodeType === 'open_url') return { ...base, url: c.url };
    if (d.nodeType === 'loop_excel') return { ...base, file: c.fileName || '[provided_by_runner]', columns: [] };
    if (d.nodeType === 'extract') return { ...base, fields: c.extractFields, output_file: c.outputFile };
    if (d.nodeType === 'wait') return { ...base, wait_type: c.waitType, target: c.waitTarget, timeout_seconds: Number(c.waitTimeout ?? 10) };
    if (d.nodeType === 'if_else') return { ...base, condition: c.condition };
    if (d.nodeType === 'loop') return { ...base, repeat: Number(c.loopCount ?? 3) };
    if (d.nodeType === 'js_inject') {
      extractCols(c.jsCode || '');
      return { ...base, code: c.jsCode, excel_columns_used: Array.from(allColumns) };
    }
    if (d.nodeType === 'switch_iframe') return { ...base, action: c.action || 'enter', selector: c.selector };
    if (d.nodeType === 'switch_tab')    return { ...base, action: c.action || 'next' };
    if (d.nodeType === 'press_key')     return { ...base, value: c.value || 'ENTER', selector: c.selector };

    if (['type_text', 'click', 'select', 'checkbox'].includes(d.nodeType)) {
      extractCols(c.value || '');
      const colsUsed: string[] = [];
      (c.value || '').replace(/\{\{([^}]+)\}\}/g, (_, m) => { colsUsed.push(m); return ''; });
      return {
        ...base,
        selector: c.selector,
        value: c.value,
        technique: c.technique,
        ...(d.nodeType === 'checkbox' ? { action: c.checkAction } : {}),
        ...(d.nodeType === 'select' && c.technique === 'mat_autocomplete' ? { search_first_n_words: 2 } : {}),
        excel_columns_used: Array.from(new Set(colsUsed)),
      };
    }
    return base;
  });

  return {
    meta: {
      workflow_version: '2.0',
      execution_mode: 'sequential_by_step_number',
      created: new Date().toISOString(),
      total_steps: steps.length,
      excel_columns_required: Array.from(allColumns),
    },
    steps,
  };
}

// ─────────────────────────────────────────────
// CONFIG PANEL
// ─────────────────────────────────────────────
const ConfigPanel = ({
  selectedNode,
  updateNodeData,
  availableColumns,
  setAvailableColumns,
}: {
  selectedNode: Node | null;
  updateNodeData: (id: string, data: Partial<AutomationNodeData>) => void;
  availableColumns: string[];
  setAvailableColumns: (cols: string[]) => void;
}) => {
  const [showPresets, setShowPresets] = useState(false);

  if (!selectedNode) {
    return (
      <aside className="w-[290px] border-l bg-card flex flex-col items-center justify-center text-center text-muted-foreground p-6 flex-shrink-0">
        <Settings2 size={36} className="mb-3 opacity-15" />
        <p className="text-sm font-medium">No block selected</p>
        <p className="text-xs mt-1 text-muted-foreground/70">Click any block on the canvas to configure it</p>
      </aside>
    );
  }

  const d = selectedNode.data as unknown as AutomationNodeData;
  const cfg = d.config || {};

  const updateCfg = (key: keyof NodeConfig, value: unknown) => {
    updateNodeData(selectedNode.id, { config: { ...cfg, [key]: value } });
  };
  const updateLabel = (label: string) => updateNodeData(selectedNode.id, { label });

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
        const headers = (jsonData[0] || []).filter(h => h && String(h).trim() !== '');
        setAvailableColumns(headers);
        updateCfg('fileName', file.name);
      } catch {
        alert('Could not read Excel file. Ensure it is a valid .xlsx or .csv file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const applyPreset = (preset: (typeof ICICI_PRESETS)[string][number]) => {
    if (preset.selector  !== undefined) updateCfg('selector',   preset.selector);
    if (preset.value     !== undefined) updateCfg('value',      preset.value);
    if (preset.technique)               updateCfg('technique',  preset.technique as never);
    if (preset.waitTarget)              updateCfg('waitTarget', preset.waitTarget);
    if (preset.waitType)                updateCfg('waitType',   preset.waitType as never);
    if (preset.waitTimeout)             updateCfg('waitTimeout',preset.waitTimeout);
    setShowPresets(false);
  };

  const insertColumn = (col: string) => updateCfg('value', (cfg.value || '') + `{{${col}}}`);

  const hasPresets = ICICI_PRESETS[d.nodeType];
  const s = catStyle(d.category);

  return (
    <aside className="w-[290px] border-l bg-card flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center gap-2.5 flex-shrink-0 ${s.header}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.icon}`}>
          <NodeIcon iName={d.iName} size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Configure Block</p>
          <p className="text-xs font-medium truncate">{d.label}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Block Name */}
        <Field label="Block Name">
          <input
            type="text"
            value={d.label}
            onChange={e => updateLabel(e.target.value)}
            className="cp-input"
          />
        </Field>

        {/* Step Number */}
        <Field label="Step Number" hint="Execution order. Steps run lowest → highest (1, 2, 3…)">
          <input
            type="number"
            min={1}
            value={d.sequence || ''}
            onChange={e => updateNodeData(selectedNode.id, { sequence: parseInt(e.target.value) || 0 })}
            className="cp-input font-bold text-blue-600 dark:text-blue-400"
            placeholder="e.g. 1"
          />
        </Field>

        {/* ── WAIT AFTER (every non-trigger block) ── */}
        {d.nodeType !== 'trigger' && (
          <div className="bg-sky-500/5 border border-sky-500/15 rounded-lg p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <Timer size={11} /> Wait After This Step
            </p>
            <Field label="Delay (milliseconds)" hint="Engine waits this long after step completes. 0 = no extra wait.">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={cfg.waitAfterMs ?? 0}
                  onChange={e => updateCfg('waitAfterMs', Number(e.target.value))}
                  className="cp-input"
                  placeholder="0"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">ms</span>
              </div>
            </Field>
            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-1">
              {[0, 500, 1000, 2000, 3000].map(ms => (
                <button
                  key={ms}
                  onClick={() => updateCfg('waitAfterMs', ms)}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                    (cfg.waitAfterMs ?? 0) === ms
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-700 dark:text-sky-300'
                      : 'border-border text-muted-foreground hover:border-sky-500/30 hover:text-sky-600'
                  }`}
                >
                  {ms === 0 ? 'None' : `${ms}ms`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ERROR HANDLING ── */}
        {d.nodeType !== 'trigger' && (
          <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle size={11} /> Error Handling
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="On Error">
                <select className="cp-select" value={cfg.onError || 'stop'} onChange={e => updateCfg('onError', e.target.value as never)}>
                  <option value="stop">Stop workflow</option>
                  <option value="continue">Skip &amp; continue</option>
                  <option value="retry">Retry then stop</option>
                </select>
              </Field>
              <Field label="Retries">
                <input type="number" min={0} max={10} className="cp-input" value={cfg.retries ?? 2} onChange={e => updateCfg('retries', Number(e.target.value))} />
              </Field>
            </div>
            <Field label="Retry delay (ms)">
              <input type="number" step={500} min={0} className="cp-input" value={cfg.retryDelay ?? 1000} onChange={e => updateCfg('retryDelay', Number(e.target.value))} />
            </Field>
          </div>
        )}

        <div className="border-t border-border/50" />

        {/* ── ICICI PRESETS ── */}
        {hasPresets && (
          <div>
            <button
              onClick={() => setShowPresets(v => !v)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border/80 transition-all"
            >
              <FileSearch size={12} />
              Load ICICI Preset
              <ChevronDown size={11} className={`ml-auto transition-transform ${showPresets ? 'rotate-180' : ''}`} />
            </button>
            {showPresets && (
              <div className="mt-1.5 border border-border rounded-lg overflow-hidden shadow-sm">
                {ICICI_PRESETS[d.nodeType].map((p, i) => (
                  <button key={i} onClick={() => applyPreset(p)} className="w-full text-left px-3 py-2 border-b border-border last:border-0 hover:bg-primary/5 transition-colors">
                    <div className="text-[11px] font-medium">{p.label}</div>
                    {p.selector && <div className="text-[10px] text-muted-foreground font-mono truncate">{p.selector}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── OPEN URL ── */}
        {d.nodeType === 'open_url' && (
          <Field label="Website URL">
            <input type="text" placeholder="https://…" value={cfg.url || ''} onChange={e => updateCfg('url', e.target.value)} className="cp-input" />
          </Field>
        )}

        {/* ── SELECTOR ── */}
        {['type_text', 'click', 'select', 'checkbox'].includes(d.nodeType) && (
          <Field label="Target Selector" hint="CSS selector or XPath">
            <input
              type="text"
              placeholder="e.g. #txtreg or //input[@id='carreg']"
              value={cfg.selector || ''}
              onChange={e => updateCfg('selector', e.target.value)}
              className="cp-input font-mono text-[11px]"
            />
          </Field>
        )}

        {/* ── VALUE ── */}
        {['type_text', 'select'].includes(d.nodeType) && (
          <Field label="Value">
            {availableColumns.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {availableColumns.map(col => (
                  <button key={col} onClick={() => insertColumn(col)}
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer border border-purple-500/20">
                    {`{{${col}}}`}
                  </button>
                ))}
              </div>
            )}
            <textarea
              placeholder={availableColumns.length > 0 ? 'Type value or click a column chip above…' : 'Type value or add a Loop Excel block to map columns…'}
              value={cfg.value || ''}
              onChange={e => updateCfg('value', e.target.value)}
              className="cp-textarea"
            />
            {availableColumns.length === 0 && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <AlertCircle size={10} /> Add a Loop Excel block to map dynamic data.
              </p>
            )}
          </Field>
        )}

        {/* ── CHECKBOX ACTION ── */}
        {d.nodeType === 'checkbox' && (
          <Field label="Action">
            <select className="cp-select" value={cfg.checkAction || 'toggle'} onChange={e => updateCfg('checkAction', e.target.value as never)}>
              <option value="check">Check (enable)</option>
              <option value="uncheck">Uncheck (disable)</option>
              <option value="toggle">Toggle state</option>
            </select>
          </Field>
        )}

        {/* ── INJECTION TECHNIQUE ── */}
        {['type_text', 'click', 'select', 'checkbox'].includes(d.nodeType) && (
          <div className="space-y-2 pt-1 border-t border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1">Injection Technique</p>
            <TechGrid nodeType={d.nodeType} value={cfg.technique || 'send_keys'} onChange={v => updateCfg('technique', v)} />
          </div>
        )}

        {/* ── LOOP EXCEL ── */}
        {d.nodeType === 'loop_excel' && (
          <div className="bg-teal-500/5 border border-teal-500/15 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
              <ShieldCheck size={12} />
              <p className="text-[10px] font-bold uppercase tracking-tight">Local Mapping Mode</p>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Select your Excel file to extract column headers. The file is <b>NOT</b> uploaded — only headers are read locally.</p>
            <div>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleLocalFileSelect} className="hidden" id="local-excel-mapper" />
              <label htmlFor="local-excel-mapper" className="flex items-center justify-center gap-2 w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-md cursor-pointer transition-colors">
                <FileSearch size={12} /> Select Sample File
              </label>
            </div>
            {cfg.fileName && (
              <div className="flex items-center justify-between bg-background rounded-md px-2 py-1.5 border border-teal-500/20">
                <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400 truncate max-w-[180px]">{cfg.fileName}</span>
                <CheckCircle2 size={12} className="text-teal-500 flex-shrink-0" />
              </div>
            )}
            {availableColumns.length > 0 && (
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold text-center">{availableColumns.length} columns ready for mapping</p>
            )}
          </div>
        )}

        {/* ── WAIT ── */}
        {d.nodeType === 'wait' && (
          <>
            <Field label="Wait Type">
              <select className="cp-select" value={cfg.waitType || 'element'} onChange={e => updateCfg('waitType', e.target.value as never)}>
                <option value="element">Wait for element to appear</option>
                <option value="hidden">Wait for element to disappear</option>
                <option value="time">Fixed delay (seconds)</option>
                <option value="url">Wait for URL change</option>
              </select>
            </Field>
            <Field label="Selector / URL keyword" hint="CSS, XPath, or URL fragment">
              <input type="text" placeholder="#selector or keyword" value={cfg.waitTarget || ''} onChange={e => updateCfg('waitTarget', e.target.value)} className="cp-input font-mono text-[11px]" />
            </Field>
            <Field label="Timeout (seconds)">
              <input type="number" min={1} max={120} value={cfg.waitTimeout ?? 10} onChange={e => updateCfg('waitTimeout', Number(e.target.value))} className="cp-input" />
            </Field>
          </>
        )}

        {/* ── IF / ELSE ── */}
        {d.nodeType === 'if_else' && (
          <Field label="Condition" hint="e.g. element_exists #popup-ok">
            <input type="text" placeholder="element_exists #selector" value={cfg.condition || ''} onChange={e => updateCfg('condition', e.target.value)} className="cp-input font-mono text-[11px]" />
            <p className="text-[10px] text-muted-foreground mt-1">
              Supported: <code className="bg-muted px-1 rounded">element_exists</code>, <code className="bg-muted px-1 rounded">url_contains</code>, <code className="bg-muted px-1 rounded">text_contains</code>
            </p>
          </Field>
        )}

        {/* ── LOOP N TIMES ── */}
        {d.nodeType === 'loop' && (
          <Field label="Repeat Count">
            <input type="number" min={1} max={999} value={cfg.loopCount ?? 3} onChange={e => updateCfg('loopCount', Number(e.target.value))} className="cp-input" />
          </Field>
        )}

        {/* ── JS INJECTION ── */}
        {d.nodeType === 'js_inject' && (
          <Field label={<>JavaScript Code <span className="ml-1 text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">ADVANCED</span></>}>
            <textarea
              value={cfg.jsCode || ''}
              onChange={e => updateCfg('jsCode', e.target.value)}
              placeholder={"// Use {{ColumnName}} for Excel data\ndocument.getElementById('txtreg').value = '{{Registration No}}';\ndocument.getElementById('txtreg').dispatchEvent(new Event('input', {bubbles:true}));"}
              className="cp-textarea min-h-[120px]"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Use <code className="bg-muted px-1 rounded">{'{{ColumnName}}'}</code> to inject Excel values
            </p>
          </Field>
        )}

        {/* ── EXTRACT ── */}
        {d.nodeType === 'extract' && (
          <>
            <Field label="Fields to Extract" hint="Format: Label: #selector — one per line">
              <textarea value={cfg.extractFields || ''} onChange={e => updateCfg('extractFields', e.target.value)} placeholder={"Premium: #premium-amount\nQuote No: .quote-id\nPolicy Date: #pol-date"} className="cp-textarea min-h-[90px]" />
            </Field>
            <Field label="Output filename">
              <input type="text" placeholder="results.xlsx" value={cfg.outputFile || 'results.xlsx'} onChange={e => updateCfg('outputFile', e.target.value)} className="cp-input" />
            </Field>
          </>
        )}

        {/* ── SWITCH IFRAME ── */}
        {d.nodeType === 'switch_iframe' && (
          <>
            <Field label="Action">
              <select className="cp-select" value={cfg.action || 'enter'} onChange={e => updateCfg('action', e.target.value)}>
                <option value="enter">Enter specific Iframe</option>
                <option value="exit">Exit to Main Page</option>
              </select>
            </Field>
            {cfg.action !== 'exit' && (
              <Field label="Iframe Selector" hint="CSS selector or XPath for the iframe element">
                <input type="text" placeholder="e.g. #my-iframe or iframe.modal-frame" value={cfg.selector || ''} onChange={e => updateCfg('selector', e.target.value)} className="cp-input font-mono text-[11px]" />
              </Field>
            )}
          </>
        )}

        {/* ── SWITCH TAB ── */}
        {d.nodeType === 'switch_tab' && (
          <Field label="Action">
            <select className="cp-select" value={cfg.action || 'next'} onChange={e => updateCfg('action', e.target.value)}>
              <option value="next">Next Tab</option>
              <option value="main">Main / First Tab</option>
              <option value="last">Latest Tab</option>
              <option value="close">Close Current Tab</option>
            </select>
          </Field>
        )}

        {/* ── PRESS KEY ── */}
        {d.nodeType === 'press_key' && (
          <>
            <Field label="Key to Press">
              <select className="cp-select" value={cfg.value || 'ENTER'} onChange={e => updateCfg('value', e.target.value)}>
                <option value="ENTER">ENTER</option>
                <option value="TAB">TAB</option>
                <option value="ESCAPE">ESCAPE</option>
                <option value="SPACE">SPACE</option>
                <option value="BACKSPACE">BACKSPACE</option>
                <option value="UP">UP ↑</option>
                <option value="DOWN">DOWN ↓</option>
              </select>
            </Field>
            <Field label="Target Selector (Optional)" hint="Leave blank to press on active element">
              <input type="text" placeholder="e.g. #search-input (optional)" value={cfg.selector || ''} onChange={e => updateCfg('selector', e.target.value)} className="cp-input font-mono text-[11px]" />
            </Field>
          </>
        )}

        {/* Notes */}
        <div className="border-t border-border/50 pt-3">
          <Field label="Notes (optional)">
            <input type="text" placeholder="Reminder or explanation…" value={cfg.notes || ''} onChange={e => updateCfg('notes', e.target.value)} className="cp-input" />
          </Field>
        </div>

      </div>
    </aside>
  );
};

// ─────────────────────────────────────────────
// SMALL UI HELPERS
// ─────────────────────────────────────────────
const Field = ({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
  </div>
);

const TECH_OPTIONS: Record<string, Array<{ value: string; icon: string; name: string; desc: string }>> = {
  type_text: [
    { value: 'send_keys',      icon: '⌨', name: 'send_keys()',  desc: 'Standard Selenium' },
    { value: 'dispatch_event', icon: '⚡', name: 'dispatchEvent', desc: 'Angular / React'  },
    { value: 'native_setter',  icon: '🔒', name: 'Native Setter', desc: 'Bypass trackers'  },
  ],
  click: [
    { value: 'standard_click', icon: '🖱', name: 'Standard',    desc: 'Normal .click()' },
    { value: 'js_click',       icon: '⚡', name: 'JS Execute',  desc: 'Bypass overlays' },
  ],
  select: [
    { value: 'native_select',    icon: '▼', name: 'Native Select', desc: 'HTML <select>'  },
    { value: 'mat_autocomplete', icon: '✦', name: 'Autocomplete',  desc: 'Material UI'   },
  ],
  checkbox: [
    { value: 'standard_click', icon: '🖱', name: 'Standard',   desc: 'Normal click'    },
    { value: 'js_click',       icon: '⚡', name: 'JS Execute', desc: 'Hidden toggles'  },
  ],
};

const TechGrid = ({ nodeType, value, onChange }: { nodeType: string; value: string; onChange: (v: string) => void }) => {
  const opts = TECH_OPTIONS[nodeType] || [];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {opts.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`text-left p-2 rounded-lg border transition-all ${value === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-muted/50'}`}>
          <div className="text-base mb-0.5">{opt.icon}</div>
          <div className="text-[10px] font-semibold">{opt.name}</div>
          <div className="text-[9px] text-muted-foreground">{opt.desc}</div>
        </button>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// FLOW CANVAS (no edges / wire logic)
// ─────────────────────────────────────────────
const FlowCanvas = ({
  nodes, setNodes, setSelectedNodeId, availableColumns,
  workflowId, initialName, initialDesc,
}: {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setSelectedNodeId: (id: string | null) => void;
  availableColumns: string[];
  workflowId: string | null;
  initialName: string;
  initialDesc: string;
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const dropProcessed = useRef(false);
  const { screenToFlowPosition } = useReactFlow();
  const router = useRouter();
  const [isSaving, setIsSaving]           = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [wfName, setWfName] = useState(initialName);
  const [wfDesc, setWfDesc] = useState(initialDesc);

  useEffect(() => {
    if (initialName) setWfName(initialName);
    if (initialDesc) setWfDesc(initialDesc);
  }, [initialName, initialDesc]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(nds => applyNodeChanges(changes, nds)),
    [setNodes],
  );

  useOnSelectionChange({
    onChange: ({ nodes: sel }) => setSelectedNodeId(sel.length > 0 ? sel[0].id : null),
  });

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  useEffect(() => {
    const el = reactFlowWrapper.current;
    if (!el) return;
    const over = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; };
    const enter = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dropProcessed.current = false; };
    el.addEventListener('dragover', over);
    el.addEventListener('dragenter', enter);
    return () => { el.removeEventListener('dragover', over); el.removeEventListener('dragenter', enter); };
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dropProcessed.current) return;
    dropProcessed.current = true;
    setTimeout(() => { dropProcessed.current = false; }, 100);
    if (!reactFlowWrapper.current) return;

    const nodeType = e.dataTransfer.getData('application/reactflow-nodeType');
    const label    = e.dataTransfer.getData('application/reactflow-label');
    const subline  = e.dataTransfer.getData('application/reactflow-subline');
    const iName    = e.dataTransfer.getData('application/reactflow-iName');
    const category = e.dataTransfer.getData('application/reactflow-category');

    let rType = nodeType, rLabel = label, rSubline = subline, rIName = iName, rCat = category;
    if (!rType || !rLabel) {
      try {
        const fb = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
        rType = fb.nodeType || rType; rLabel = fb.label || rLabel; rSubline = fb.subline || rSubline;
        rIName = fb.iName || rIName; rCat = fb.category || rCat;
      } catch { /* ignore */ }
    }
    if (!rType || !rLabel) return;

    const bounds   = reactFlowWrapper.current.getBoundingClientRect();
    const position = screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });

    const defaultTechnique =
      rType === 'click'    ? 'standard_click' :
      rType === 'select'   ? 'native_select'  :
      rType === 'checkbox' ? 'standard_click' : 'send_keys';

    const newNode: Node = {
      id: getId(),
      type: 'automation',
      position,
      data: {
        nodeType: rType, label: rLabel, subline: rSubline, iName: rIName, category: rCat,
        sequence: 0,
        config: {
          retries: 2, retryDelay: 1000, onError: 'stop',
          technique: defaultTechnique, waitType: 'element',
          waitTimeout: 10, loopCount: 3, checkAction: 'toggle',
          waitAfterMs: 0,   // ← default: no extra wait
          action: rType === 'switch_iframe' ? 'enter' : rType === 'switch_tab' ? 'next' : undefined,
          value: rType === 'press_key' ? 'ENTER' : undefined,
        },
        status: 'idle',
      } as unknown as Record<string, unknown>,
    };
    setNodes(nds => nds.concat(newNode));
  }, [reactFlowWrapper, screenToFlowPosition, setNodes]);

  const handleFinalSave = async () => {
    if (!wfName) { alert('Please enter a workflow name'); return; }
    setIsSaving(true);
    // Pass empty edges array — wires removed
    const result = await saveWorkflow(workflowId || null, wfName, wfDesc, nodes, []);
    if (result.success) {
      setSaved(true); setSaveDialogOpen(false);
      setTimeout(() => router.push('/workflows'), 1500);
    } else {
      alert('Failed to save workflow to database!');
      setIsSaving(false);
    }
  };

  const jsonString = jsonDialogOpen ? JSON.stringify(buildWorkflowJSON(nodes), null, 2) : '';

  const copyJson     = () => navigator.clipboard.writeText(jsonString).catch(() => {});
  const downloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (wfName || 'workflow') + '.json'; a.click();
  };

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver} style={{ position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={[]}              // ← always empty, no wires
        onNodesChange={onNodesChange}
        onEdgesChange={() => {}} // no-op
        onConnect={() => {}}     // no-op
        nodeTypes={nodeTypes}
        fitView
        colorMode="system"
      >
        <Background gap={24} size={1} color="hsl(var(--border) / 0.4)" />
        <Controls className="bg-card border border-border shadow-sm rounded-lg overflow-hidden" />
      </ReactFlow>

      {/* Step-order legend */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-card/90 border border-border rounded-lg px-3 py-1.5 shadow-sm backdrop-blur-sm">
        <div className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[9px] font-bold">1</div>
        <span className="text-[10px] text-muted-foreground">Steps run in number order — set Step Number in each block</span>
      </div>

      {/* Top-right toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {saved && (
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-green-500/20">
            <CheckCircle2 size={13} /> Saved
          </span>
        )}
        <button onClick={() => setJsonDialogOpen(true)} disabled={nodes.length === 0}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-card border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50 transition-all shadow-sm">
          <Eye size={13} /> View JSON
        </button>
        <button onClick={() => setSaveDialogOpen(true)} disabled={isSaving || saved || nodes.length === 0}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm">
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {isSaving ? 'Saving…' : workflowId ? 'Update Workflow' : 'Save Workflow'}
        </button>
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center border-2 border-dashed border-border/50 rounded-2xl px-12 py-10 bg-background/60 backdrop-blur-sm">
            <div className="text-4xl mb-3 opacity-30">⬡</div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Design your automation flow</h3>
            <p className="text-xs text-muted-foreground/60">Drag blocks from the left panel, then set Step Numbers to order them</p>
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              {['Drag to add', 'Set Step Number', 'Configure block'].map(t => (
                <span key={t} className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JSON Dialog */}
      {jsonDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-[680px] max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Code size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold flex-1">Workflow JSON — Python Runner Payload</h2>
              <div className="flex items-center gap-2">
                <button onClick={copyJson} className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors">Copy</button>
                <button onClick={downloadJson} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"><Download size={11} /> Download</button>
                <button onClick={() => setJsonDialogOpen(false)} className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors">Close</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-zinc-950 text-zinc-100 rounded-xl p-4 text-[11px] font-mono leading-relaxed overflow-x-auto">
                <pre>{jsonString}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-[400px] p-6">
            <h2 className="text-base font-semibold mb-1">{workflowId ? 'Update Automation Blueprint' : 'Save Automation Blueprint'}</h2>
            <p className="text-xs text-muted-foreground mb-5">{workflowId ? 'This will overwrite the existing workflow.' : 'Saves the workflow to the database.'}</p>
            <div className="space-y-3 mb-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Workflow Name</label>
                <input type="text" placeholder="e.g. ICICI Lombard Form Fill" value={wfName} onChange={e => setWfName(e.target.value)} className="cp-input" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</label>
                <textarea placeholder="What does this automation do?" value={wfDesc} onChange={e => setWfDesc(e.target.value)} className="cp-textarea" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSaveDialogOpen(false)} className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleFinalSave} disabled={!wfName || isSaving}
                className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors">
                {isSaving ? 'Saving…' : workflowId ? 'Confirm Update' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// SIDEBAR (unchanged visually)
// ─────────────────────────────────────────────
interface ToolDef {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  nodeType: string;
  sub: string;
  iName: string;
  category: string;
  badge?: string;
  badgeColor?: string;
}

const TOOL_SECTIONS: Array<{ title: string; tools: ToolDef[] }> = [
  { title: 'Core', tools: [
    { icon: Play, label: 'Start', nodeType: 'trigger', sub: 'Entry point', iName: 'Play', category: 'trigger' },
    { icon: Globe, label: 'Open URL', nodeType: 'open_url', sub: 'Navigation', iName: 'Globe', category: 'action' },
  ]},
  { title: 'Data', tools: [
    { icon: FileSpreadsheet, label: 'Loop Excel / CSV', nodeType: 'loop_excel', sub: 'Per-row iteration', iName: 'FileSpreadsheet', category: 'data' },
    { icon: Download, label: 'Extract & Save', nodeType: 'extract', sub: 'Scrape to file', iName: 'Download', category: 'data' },
  ]},
  { title: 'Interactions', tools: [
    { icon: Keyboard, label: 'Type Text / Date', nodeType: 'type_text', sub: 'Fill text field', iName: 'Keyboard', category: 'action' },
    { icon: MousePointerClick, label: 'Click Element', nodeType: 'click', sub: 'Button / link', iName: 'MousePointerClick', category: 'action' },
    { icon: ListFilter, label: 'Select Dropdown', nodeType: 'select', sub: 'Native or Material', iName: 'ListFilter', category: 'action' },
    { icon: CheckSquare, label: 'Toggle Checkbox', nodeType: 'checkbox', sub: 'Check / uncheck', iName: 'CheckSquare', category: 'action' },
  ]},
  { title: 'Logic', tools: [
    { icon: Timer, label: 'Smart Wait', nodeType: 'wait', sub: 'Element or delay', iName: 'Timer', category: 'logic', badge: 'NEW', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { icon: GitBranch, label: 'If / Else Branch', nodeType: 'if_else', sub: 'Condition logic', iName: 'GitBranch', category: 'logic', badge: 'NEW', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { icon: RefreshCw, label: 'Loop N Times', nodeType: 'loop', sub: 'Repeat steps', iName: 'RefreshCw', category: 'logic', badge: 'NEW', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  ]},
  { title: 'Advanced', tools: [
    { icon: Code, label: 'JS Injection', nodeType: 'js_inject', sub: 'Custom JavaScript', iName: 'Code', category: 'advanced', badge: 'ADV', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { icon: Layers, label: 'Iframe Switch', nodeType: 'switch_iframe', sub: 'Enter/Exit Iframes', iName: 'Layers', category: 'advanced', badge: 'ADV', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { icon: Monitor, label: 'Tab Manager', nodeType: 'switch_tab', sub: 'Switch/Close Tabs', iName: 'Monitor', category: 'advanced', badge: 'ADV', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { icon: Keyboard, label: 'Press Key', nodeType: 'press_key', sub: 'ENTER, TAB, etc.', iName: 'Keyboard', category: 'advanced', badge: 'ADV', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  ]},
];

const Sidebar = () => {
  const [search, setSearch] = useState('');
  const onDragStart = (e: React.DragEvent, tool: ToolDef) => {
    e.dataTransfer.setData('application/reactflow-nodeType', tool.nodeType);
    e.dataTransfer.setData('application/reactflow-label', tool.label);
    e.dataTransfer.setData('application/reactflow-subline', tool.sub);
    e.dataTransfer.setData('application/reactflow-iName', tool.iName);
    e.dataTransfer.setData('application/reactflow-category', tool.category);
    e.dataTransfer.setData('text/plain', JSON.stringify({ nodeType: tool.nodeType, label: tool.label, subline: tool.sub, iName: tool.iName, category: tool.category }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const filtered = search.trim().toLowerCase();

  return (
    <aside className="w-56 border-r bg-card flex flex-col overflow-hidden flex-shrink-0 z-10">
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
            <Play size={12} className="text-background" />
          </div>
          <div>
            <div className="text-xs font-bold leading-none">Flow Builder</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Drag blocks to canvas</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-md px-2 py-1.5 border border-border/50">
          <span className="text-muted-foreground text-xs">⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search blocks…" className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {TOOL_SECTIONS.map(section => {
          const tools = section.tools.filter(t => !filtered || t.label.toLowerCase().includes(filtered) || t.sub.toLowerCase().includes(filtered));
          if (!tools.length) return null;
          return (
            <div key={section.title} className="mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{section.title}</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>
              <div className="space-y-1">
                {tools.map(tool => {
                  const s = catStyle(tool.category);
                  return (
                    <div key={tool.nodeType} draggable onDragStart={e => onDragStart(e, tool)}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-all group">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${s.icon}`}>
                        <tool.icon size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium leading-none">{tool.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{tool.sub}</div>
                      </div>
                      {tool.badge && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${tool.badgeColor}`}>{tool.badge}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────
export function WorkflowEditor() {
  const [nodes, setNodes]               = useState<Node[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDesc, setWorkflowDesc] = useState('');

  const workflowId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('id')
    : null;

  useEffect(() => {
    if (!workflowId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res  = await fetch(`/api/workflows/${workflowId}`);
        const data = await res.json();
        if (data.success && data.workflow) {
          setNodes(data.workflow.nodes || []);
          setWorkflowName(data.workflow.name || '');
          setWorkflowDesc(data.workflow.description || '');
        }
      } catch (err) {
        console.error('Failed to load workflow for editing:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [workflowId]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  const updateNodeData = (id: string, patch: Partial<AutomationNodeData>) => {
    setNodes(nds => nds.map(node => {
      if (node.id !== id) return node;
      const current = node.data as unknown as AutomationNodeData;
      return {
        ...node,
        data: {
          ...current,
          ...patch,
          config: patch.config ? { ...current.config, ...patch.config } : current.config,
        },
      };
    }));
  };

  return (
    <>
      <style>{`
        .cp-input { width:100%; font-size:12px; padding:6px 9px; border-radius:8px; border:1px solid hsl(var(--border)); background:hsl(var(--background)); color:hsl(var(--foreground)); outline:none; font-family:inherit; transition:border-color .15s; }
        .cp-input:focus { border-color:hsl(var(--primary)); }
        .cp-input.font-mono { font-family:ui-monospace,monospace; }
        .cp-select { width:100%; font-size:12px; padding:6px 9px; border-radius:8px; border:1px solid hsl(var(--border)); background:hsl(var(--background)); color:hsl(var(--foreground)); outline:none; cursor:pointer; font-family:inherit; }
        .cp-textarea { width:100%; font-size:11px; padding:6px 9px; border-radius:8px; border:1px solid hsl(var(--border)); background:hsl(var(--background)); color:hsl(var(--foreground)); outline:none; resize:vertical; min-height:72px; font-family:ui-monospace,monospace; line-height:1.6; }
        .cp-textarea:focus { border-color:hsl(var(--primary)); }
      `}</style>

      <div className="w-full h-[720px] border border-border rounded-xl overflow-hidden bg-background flex shadow-xl relative">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Loading workflow…</p>
            </div>
          </div>
        )}
        <ReactFlowProvider>
          <Sidebar />
          <FlowCanvas
            nodes={nodes}
            setNodes={setNodes}
            setSelectedNodeId={setSelectedNodeId}
            availableColumns={availableColumns}
            workflowId={workflowId}
            initialName={workflowName}
            initialDesc={workflowDesc}
          />
          <ConfigPanel
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
            availableColumns={availableColumns}
            setAvailableColumns={setAvailableColumns}
          />
        </ReactFlowProvider>
      </div>
    </>
  );
}