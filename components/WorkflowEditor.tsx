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
  Layers, Monitor, Info, Database, Calculator, UserCheck,
  Shield, Shuffle, AlertTriangle, Variable, SplitSquareHorizontal,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveWorkflow } from '@/app/actions/workflows';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface NodeConfig {
  // Core
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
  checkAction?: 'ensure_checked' | 'ensure_unchecked' | 'toggle';
  stateSelector?: string;
  fileName?: string;
  notes?: string;
  action?: string;
  waitAfterMs?: number;

  // ── NEW: Save to Variable ──
  variableName?: string;
  variableSource?: 'element_text' | 'element_value' | 'element_attr' | 'url' | 'page_title';
  variableAttr?: string;

  // ── NEW: Calculate / Modify Data ──
  calcOperation?: 'date_subtract' | 'date_add' | 'number_add' | 'number_subtract' | 'text_split' | 'text_join' | 'text_replace';
  calcInput?: string;        // {{TPEndDate}} or raw value
  calcOperand?: string;      // e.g. "5" (years/months/days/number)
  calcUnit?: 'years' | 'months' | 'days' | 'number';
  calcSplitIndex?: number;   // which word/part to grab (0-based)
  calcOutputVar?: string;    // variable name to store result

  // ── NEW: If/Else — data-driven conditions ──
  conditionType?: 'element_exists' | 'element_text_equals' | 'element_text_contains'
    | 'variable_empty' | 'variable_equals' | 'variable_contains'
    | 'url_contains' | 'page_has_text';
  conditionLeft?: string;    // {{variable}} or selector
  conditionOperator?: 'is_empty' | 'is_not_empty' | 'equals' | 'not_equals' | 'contains' | 'not_contains';
  conditionRight?: string;   // comparison value
  trueBranch?: string;       // label for true path
  falseBranch?: string;      // label for false path

  // ── NEW: Try-Catch Fallback ──
  tryStepIds?: string[];
  catchCondition?: string;   // e.g. ".swal2-html-container"
  catchConditionType?: 'element_appears' | 'element_text_contains' | 'exception';
  fallbackStepIds?: string[];

  // ── NEW: Human-in-the-Loop ──
  hitlMessage?: string;
  hitlTrigger?: 'always' | 'if_element' | 'if_variable_empty';
  hitlTriggerSelector?: string;
  hitlTriggerVariable?: string;

  // ── NEW: PIN Fallback ──
  pinPrimaryColumn?: string;
  pinSecondaryColumn?: string;
  pinTargetSelector?: string;
  pinErrorSelector?: string;
  pinErrorTextMatch?: string;
  pinSubmitSelector?: string;

  // ── NEW: Fill Strategy ──
  fillStrategy?: 'fill_if_empty' | 'force_fill' | 'fill_if_zero_or_na';

  // ── NEW: Logout Detection ──
  logoutDetectSelector?: string;
  logoutMessage?: string;

  // ── NEW: Scroll behaviour ──
  scrollIntoView?: boolean;
  scrollBlock?: 'start' | 'center' | 'end';

  // ── NEW: select by value vs text ──
  selectBy?: 'value' | 'text' | 'index' | 'mat_autocomplete';
  matWords?: number;          // how many words to use in autocomplete search
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
// ICICI PRESETS — expanded
// ─────────────────────────────────────────────
const ICICI_PRESETS: Record<string, Array<{
  label: string; selector?: string; value?: string; technique?: string;
  waitType?: string; waitTarget?: string; waitTimeout?: number;
  fillStrategy?: string; scrollIntoView?: boolean;
}>> = {
  type_text: [
    { label: 'Registration No',         selector: '#txtreg',                                              technique: 'send_keys',      fillStrategy: 'fill_if_empty' },
    { label: 'Engine Number',           selector: "//input[@id='txtreg'][@placeholder='Engine Number']",  technique: 'send_keys',      fillStrategy: 'fill_if_empty' },
    { label: 'Chassis Number',          selector: '#carreg',                                              technique: 'send_keys',      fillStrategy: 'fill_if_empty' },
    { label: 'TP Policy Number',        selector: '#TPpolno',                                             technique: 'send_keys',      fillStrategy: 'fill_if_empty' },
    { label: 'SAOD Policy Number',      selector: '#prevpolno',                                           technique: 'send_keys',      fillStrategy: 'fill_if_empty' },
    { label: 'Insured Name',            selector: '#nameCstm',                                            technique: 'send_keys',      fillStrategy: 'force_fill'    },
    { label: 'Mobile Number',           selector: '#mobile',                                              technique: 'send_keys',      fillStrategy: 'fill_if_empty' },
    { label: 'Email',                   selector: '#email',                                               technique: 'send_keys',      fillStrategy: 'fill_if_empty' },
    { label: 'Pincode (Primary)',        selector: '#pincode',                                             technique: 'send_keys',      fillStrategy: 'force_fill'    },
    { label: 'PAN Number',              selector: '#pan_no',                                              technique: 'native_setter'   },
    { label: 'Date of Birth (KYC)',     selector: '#pan_dob',                                             technique: 'native_setter'   },
    { label: 'IDV Value',               selector: '#sirangeinput',                                        technique: 'dispatch_event'  },
    { label: 'TP Start Date (JS)',       selector: '#TPpolstartdate',                                      technique: 'dispatch_event'  },
    { label: 'TP End Date (JS)',         selector: '#TPpolenddate',                                        technique: 'dispatch_event'  },
    { label: 'SAOD Prev Policy End',    selector: '#prevpolenddate',                                      technique: 'dispatch_event'  },
    { label: 'Non-Electrical Value',    selector: "input[type='text'][id='NonElectricalAccessories']",    technique: 'send_keys',      fillStrategy: 'force_fill'    },
    { label: 'DOB (Proposal)',          selector: '#scpaDOB',                                             technique: 'dispatch_event'  },
    { label: 'Permanent Address',       selector: '#address1',                                            technique: 'send_keys',      fillStrategy: 'force_fill'    },
  ],
  click: [
    { label: 'Fetch Vehicle Details',      selector: '#showHiddenForm',                                    technique: 'js_click', scrollIntoView: true },
    { label: 'Get Quote Button',           selector: '#get_quote',                                         technique: 'standard_click'  },
    { label: 'Recalculate Button',         selector: '#submit_quote',                                      technique: 'standard_click'  },
    { label: 'Final Submit',              selector: '#submit_quote',                                      technique: 'js_click', scrollIntoView: true },
    { label: 'Create Proposal (buypol)', selector: '#buypol',                                             technique: 'js_click', scrollIntoView: true },
    { label: 'Do It Later (KYC Radio)', selector: "label[for='doItLater']",                              technique: 'js_click'        },
    { label: 'Complete KYC Radio',        selector: "label[for='kycbtn']",                                technique: 'js_click'        },
    { label: 'Click Here (Customise)',   selector: "//a[normalize-space()='Click here']",                 technique: 'js_click', scrollIntoView: true },
    { label: 'Send Link Button',          selector: "//span[normalize-space()='Send Link']",              technique: 'js_click', scrollIntoView: true },
    { label: 'Inline SUBMIT (SendLink)', selector: "//div[@id='sendLinkInline']//button[normalize-space()='SUBMIT']", technique: 'js_click', scrollIntoView: true },
    { label: 'Final OK Button',           selector: "//button[normalize-space()='OK']",                  technique: 'js_click', scrollIntoView: true },
    { label: 'OK (SweetAlert Popup)',    selector: 'button.swal2-confirm',                               technique: 'js_click'        },
    { label: 'Proceed (KYC/Arya)',       selector: '#arya_proceed_btn',                                  technique: 'js_click'        },
  ],
  select: [
    { label: 'NCB → 0%',             selector: "//select[.//option[contains(normalize-space(), '0%')]]", value: '0%',       technique: 'native_select', fillStrategy: 'force_fill' },
    { label: 'Zero Dep → Silver',    selector: "//select[.//option[contains(normalize-space(), 'Silver')]]", value: 'Silver', technique: 'native_select', fillStrategy: 'force_fill' },
    { label: 'TP Insurer Name',      selector: "input[formcontrolname='tpInsurerName']",                      technique: 'mat_autocomplete', fillStrategy: 'fill_if_empty' },
    { label: 'SAOD Insurer Name',    selector: "input[formcontrolname='previousPolicyInsurerName']",          technique: 'mat_autocomplete', fillStrategy: 'fill_if_empty' },
  ],
  checkbox: [
    { label: 'Standalone OD Toggle',         selector: "label[for='switch']",                  technique: 'js_click' },
    { label: 'Non-Electrical Accessories',   selector: "label[for='NonElectricalAccessories']", technique: 'js_click' },
    { label: 'Uncheck PA Cover',             selector: '#scpaCoverSAOD1',                      technique: 'js_click' },
    { label: 'Uncheck IL Smart Assist',      selector: "label[for='ILSmartAssistPrime']",      technique: 'js_click' },
    { label: 'Zero Dep Checkbox',            selector: "label[for='ZeroDepPlanName']",         technique: 'js_click' },
  ],
  wait: [
    { label: 'Wait for Quote Section',       waitTarget: '#quotesection',                                  waitType: 'element', waitTimeout: 20 },
    { label: 'Wait for Backdrop to Hide',    waitTarget: '.backdrop',                                      waitType: 'hidden',  waitTimeout: 15 },
    { label: 'Wait for KYC / PAN field',     waitTarget: '#pan_no',                                        waitType: 'element', waitTimeout: 10 },
    { label: 'Wait for Proposal Form',       waitTarget: '#nameCstm',                                      waitType: 'element', waitTimeout: 20 },
    { label: 'Wait for Send Link Button',    waitTarget: "//span[normalize-space()='Send Link']",           waitType: 'element', waitTimeout: 30 },
    { label: 'Wait for ZeroDep Section',     waitTarget: '#ZeroDepPlanName',                               waitType: 'element', waitTimeout: 10 },
    { label: 'Wait for Customise Backdrop',  waitTarget: '.backdrop',                                      waitType: 'hidden',  waitTimeout: 20 },
  ],
  save_variable: [
    { label: 'Read TP Insurer Name',         selector: '#previnstp',   value: 'tp_insurer'     },
    { label: 'Read SAOD Insurer Name',       selector: '#previns',     value: 'saod_insurer'   },
    { label: 'Read TP Policy Number',        selector: '#TPpolno',     value: 'tp_policy_no'   },
    { label: 'Read TP End Date',             selector: '#TPpolenddate', value: 'tp_end_date'   },
    { label: 'Read IDV Min',                 selector: '#sirangeinput', value: 'idv_min'       },
    { label: 'Read Auto-Selected City',      selector: '#pincode',     value: 'selected_city'  },
  ],
  calculate: [
    { label: 'TP Start Date (End − 5 yrs)', value: '{{tp_end_date}}',  selector: 'date_subtract' },
    { label: 'SAOD End Date (End − 4 yrs)', value: '{{tp_end_date}}',  selector: 'date_subtract' },
    { label: 'IDV Min + 1',                  value: '{{idv_min}}',      selector: 'number_add'   },
    { label: 'IDV Max − 1',                  value: '{{idv_max}}',      selector: 'number_subtract' },
    { label: 'Insurer First 2 Words',        value: '{{tp_insurer}}',   selector: 'text_split'   },
  ],
  pin_fallback: [
    { label: 'Pincode with PIN / PIN 2 fallback', selector: '#pincode', value: 'PIN' },
  ],
  try_catch: [
    { label: 'Fetch → Popup → Retry',         selector: '.swal2-html-container' },
    { label: 'ZeroDep Silver → Reset retry',  selector: '#ZeroDepPlanName'      },
    { label: 'Click here → Section Open',     selector: '#ZeroDepPlanName'      },
  ],
  human_in_loop: [
    { label: 'Login / Session Expired',       value: 'Please log in manually then click Resume.' },
    { label: 'OTP / Captcha Required',        value: 'Please complete the OTP/Captcha then click Resume.' },
  ],
  js_inject: [
    {
      label: 'Date Math & Inject (TP Start & SAOD End)',
      value: `let tpEndStr = '{{tp_end_date}}';\nif(tpEndStr && tpEndStr.includes('/')) {\n  let parts = tpEndStr.split('/');\n  let d = parseInt(parts[0],10), m = parseInt(parts[1],10)-1, y = parseInt(parts[2],10);\n  let tpStart = new Date(y-5, m, d+1);\n  let saodEnd = new Date(y-4, m, d);\n  let fmt = (dt) => String(dt.getDate()).padStart(2,'0')+'/'+String((dt.getMonth()+1)).padStart(2,'0')+'/'+dt.getFullYear();\n  let elStart = document.getElementById('TPpolstartdate');\n  if(elStart){ elStart.value=fmt(tpStart); elStart.dispatchEvent(new Event('input',{bubbles:true})); }\n  let elSaod = document.getElementById('prevpolenddate');\n  if(elSaod){ elSaod.value=fmt(saodEnd); elSaod.dispatchEvent(new Event('input',{bubbles:true})); }\n}`
    },
    {
      label: 'IDV Min/Max Boundary Check',
      value: `let idvEl = document.getElementById('sirangeinput');\nif(idvEl) {\n  let minVal = parseInt(idvEl.min)||0, maxVal = parseInt(idvEl.max)||99999999;\n  let excelIdv = parseInt('{{IDV}}'.replace(/,/g,''))||0;\n  let finalIdv = excelIdv > 0 && excelIdv < minVal ? minVal + 1 : (excelIdv > maxVal ? maxVal - 1 : excelIdv);\n  if(finalIdv > 0) {\n    idvEl.value = finalIdv;\n    idvEl.dispatchEvent(new Event('input',{bubbles:true}));\n    idvEl.dispatchEvent(new Event('blur',{bubbles:true}));\n  }\n}`
    }
  ],
};

// ─────────────────────────────────────────────
// NODE ICON RESOLVER
// ─────────────────────────────────────────────
const NodeIcon = ({ iName, size = 14 }: { iName: string; size?: number }) => {
  const p = { size };
  switch (iName) {
    case 'Play':               return <Play {...p} />;
    case 'FileSpreadsheet':    return <FileSpreadsheet {...p} />;
    case 'Globe':              return <Globe {...p} />;
    case 'MousePointerClick':  return <MousePointerClick {...p} />;
    case 'Keyboard':           return <Keyboard {...p} />;
    case 'ListFilter':         return <ListFilter {...p} />;
    case 'CheckSquare':        return <CheckSquare {...p} />;
    case 'Timer':              return <Timer {...p} />;
    case 'Code':               return <Code {...p} />;
    case 'GitBranch':          return <GitBranch {...p} />;
    case 'RefreshCw':          return <RefreshCw {...p} />;
    case 'Download':           return <Download {...p} />;
    case 'Layers':             return <Layers {...p} />;
    case 'Monitor':            return <Monitor {...p} />;
    case 'Database':           return <Database {...p} />;
    case 'Calculator':         return <Calculator {...p} />;
    case 'UserCheck':          return <UserCheck {...p} />;
    case 'Shield':             return <Shield {...p} />;
    case 'Shuffle':            return <Shuffle {...p} />;
    case 'AlertTriangle':      return <AlertTriangle {...p} />;
    case 'Variable':           return <Variable {...p} />;
    case 'SplitSquareHorizontal': return <SplitSquareHorizontal {...p} />;
    default:                   return <Play {...p} />;
  }
};

// ─────────────────────────────────────────────
// CATEGORY STYLES
// ─────────────────────────────────────────────
const catStyle = (category: string) => {
  switch (category) {
    case 'trigger':   return { header: 'bg-green-500/8 border-b border-green-500/15',    icon: 'bg-green-500/15 text-green-600 dark:text-green-400'     };
    case 'action':    return { header: 'bg-blue-500/8 border-b border-blue-500/15',      icon: 'bg-blue-500/15 text-blue-600 dark:text-blue-400'       };
    case 'data':      return { header: 'bg-teal-500/8 border-b border-teal-500/15',      icon: 'bg-teal-500/15 text-teal-600 dark:text-teal-400'       };
    case 'logic':     return { header: 'bg-purple-500/8 border-b border-purple-500/15',  icon: 'bg-purple-500/15 text-purple-600 dark:text-purple-400'  };
    case 'advanced':  return { header: 'bg-amber-500/8 border-b border-amber-500/15',    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400'     };
    case 'memory':    return { header: 'bg-indigo-500/8 border-b border-indigo-500/15',  icon: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'  };
    case 'safety':    return { header: 'bg-rose-500/8 border-b border-rose-500/15',      icon: 'bg-rose-500/15 text-rose-600 dark:text-rose-400'        };
    default:          return { header: 'bg-muted/50 border-b border-border',              icon: 'bg-muted text-muted-foreground'                         };
  }
};

const statusRing = (s?: string) => {
  if (s === 'running') return 'ring-2 ring-amber-400 ring-offset-1';
  if (s === 'success') return 'ring-2 ring-green-500 ring-offset-1';
  if (s === 'error')   return 'ring-2 ring-red-500 ring-offset-1';
  return '';
};

// ─────────────────────────────────────────────
// AUTOMATION NODE
// ─────────────────────────────────────────────
const AutomationNode = ({ data, selected }: { data: AutomationNodeData; selected: boolean }) => {
  const s   = catStyle(data.category);
  const cfg = data.config || {};

  const getPreview = () => {
    switch (data.nodeType) {
      case 'open_url':       return cfg.url || 'No URL set';
      case 'loop_excel':     return cfg.fileName || 'No file mapped';
      case 'type_text':      return cfg.selector ? `${cfg.selector} → ${(cfg.value || '').substring(0, 20)}` : 'No selector';
      case 'click':          return cfg.selector || 'No selector';
      case 'select':         return cfg.selector ? `${cfg.selector} → ${cfg.value || '?'}` : 'No selector';
      case 'checkbox': {
        const a = cfg.checkAction === 'ensure_checked' ? '✓ ON' : cfg.checkAction === 'ensure_unchecked' ? '✗ OFF' : '⇄ Toggle';
        return cfg.selector ? `${a} · ${cfg.selector}` : a;
      }
      case 'wait':           return cfg.waitType === 'time' ? `Wait ${cfg.waitTimeout}s` : (cfg.waitTarget || 'No target');
      case 'if_else':        return `IF ${cfg.conditionLeft || '?'} ${cfg.conditionOperator || ''} ${cfg.conditionRight || ''}`.trim();
      case 'loop':           return `Repeat ${cfg.loopCount || 3}×`;
      case 'js_inject':      return cfg.jsCode ? cfg.jsCode.substring(0, 30) + '…' : 'No code';
      case 'extract':        return cfg.extractFields ? cfg.extractFields.split('\n')[0] : 'No fields';
      case 'switch_iframe':  return cfg.action === 'exit' ? 'Exit → Main Page' : `Enter: ${cfg.selector || '—'}`;
      case 'switch_tab':     return `Tab: ${cfg.action || 'next'}`;
      case 'press_key':      return cfg.selector ? `${cfg.value || 'ENTER'} on ${cfg.selector}` : `Key: ${cfg.value || 'ENTER'}`;

      // ── NEW NODES ──
      case 'save_variable':
        return cfg.variableName ? `{{${cfg.variableName}}} ← ${cfg.selector || cfg.variableSource || '?'}` : 'No variable name';
      case 'calculate':
        return cfg.calcOutputVar
          ? `{{${cfg.calcOutputVar}}} = ${cfg.calcInput || '?'} ${cfg.calcOperation?.replace('_', ' ') || ''} ${cfg.calcOperand || ''}`
          : 'No output variable';
      case 'try_catch':
        return cfg.catchCondition ? `CATCH: ${cfg.catchCondition}` : 'No catch condition';
      case 'human_in_loop':
        return cfg.hitlMessage ? cfg.hitlMessage.substring(0, 40) + '…' : 'No message set';
      case 'pin_fallback':
        return cfg.pinPrimaryColumn ? `PIN: {{${cfg.pinPrimaryColumn}}} / {{${cfg.pinSecondaryColumn || '—'}}}` : 'Not configured';
      case 'logout_detect':
        return cfg.logoutDetectSelector || 'No selector set';

      default: return data.label;
    }
  };

  const techBadge = cfg.technique && !['send_keys', 'standard_click', 'standard'].includes(cfg.technique)
    ? cfg.technique.replace(/_/g, ' ') : null;
  const fillBadge = cfg.fillStrategy === 'force_fill' ? 'force-fill' : cfg.fillStrategy === 'fill_if_empty' ? 'if-empty' : null;

  return (
    <div className={`
      bg-card border rounded-xl shadow-sm w-[270px] overflow-hidden transition-all duration-150
      ${selected ? 'border-primary shadow-md shadow-primary/10' : 'border-border hover:border-border/80 hover:shadow-md'}
      ${statusRing(data.status)}
    `}>
      {/* Header */}
      <div className={`px-3 py-2.5 flex items-center gap-2.5 ${s.header}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.icon}`}>
          <NodeIcon iName={data.iName} size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold leading-none truncate">{data.label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{data.subline}</div>
        </div>
        <div className={`min-w-[22px] h-[22px] rounded-full px-1.5 flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
          data.sequence > 0
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground border border-dashed border-border'
        }`}>
          {data.sequence > 0 ? data.sequence : '?'}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1.5">
        <div className="bg-muted/60 rounded-md px-2 py-1 text-[10px] font-mono text-muted-foreground truncate border border-border/40">
          {getPreview()}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {techBadge && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{techBadge}</span>}
          {fillBadge && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">{fillBadge}</span>}
          {(cfg.retries ?? 0) > 0 && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">↺ {cfg.retries}×</span>}
          {cfg.onError === 'continue' && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">skip-on-fail</span>}
          {cfg.scrollIntoView && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">scroll</span>}
          {data.nodeType === 'checkbox' && cfg.checkAction !== 'toggle' && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">state-aware</span>}
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
            }`}>{data.status}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = { automation: AutomationNode };
const getId = () => `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// ─────────────────────────────────────────────
// JSON EXPORT BUILDER — full Python runner schema
// ─────────────────────────────────────────────
function buildWorkflowJSON(nodes: Node[]) {
  const allColumns = new Set<string>();
  const allVars    = new Set<string>();

  const ordered = [...nodes]
    .filter(n => (n.data as unknown as AutomationNodeData).sequence > 0)
    .sort((a, b) => {
      const sa = (a.data as unknown as AutomationNodeData).sequence;
      const sb = (b.data as unknown as AutomationNodeData).sequence;
      return sa - sb;
    });

  const extractTokens = (str: string) => {
    if (!str) return;
    for (const m of str.matchAll(/\{\{([^}]+)\}\}/g)) {
      const tok = m[1];
      if (tok === tok.toUpperCase() || tok.includes(' ')) allColumns.add(tok);
      else allVars.add(tok);
    }
  };

  const steps = ordered.map((node) => {
    const d = node.data as unknown as AutomationNodeData;
    const c = d.config || {};

    const base = {
      sequence:      d.sequence,
      id:            node.id,
      type:          d.nodeType,
      label:         d.label,
      notes:         c.notes || '',
      wait_after_ms: c.waitAfterMs ?? 0,
      scroll_into_view: c.scrollIntoView ?? false,
      scroll_block:  c.scrollBlock || 'center',
      error_handling: {
        on_error:       c.onError || 'stop',
        retries:        Number(c.retries ?? 0),
        retry_delay_ms: Number(c.retryDelay ?? 1000),
      },
    };

    // Core nodes
    if (d.nodeType === 'trigger')    return base;
    if (d.nodeType === 'open_url')   return { ...base, url: c.url };
    if (d.nodeType === 'loop_excel') return { ...base, file: c.fileName || '[provided_by_runner]', columns: Array.from(allColumns) };
    if (d.nodeType === 'extract')    return { ...base, fields: c.extractFields, output_file: c.outputFile };

    if (d.nodeType === 'wait')       return {
      ...base,
      wait_type:       c.waitType,
      target:          c.waitTarget,
      timeout_seconds: Number(c.waitTimeout ?? 10),
    };

    if (d.nodeType === 'if_else')    return {
      ...base,
      condition: {
        type:     c.conditionType || 'element_exists',
        left:     c.conditionLeft || '',
        operator: c.conditionOperator || 'is_empty',
        right:    c.conditionRight || '',
      },
      true_branch:  c.trueBranch  || '',
      false_branch: c.falseBranch || '',
    };

    if (d.nodeType === 'loop')       return { ...base, repeat: Number(c.loopCount ?? 3) };

    if (d.nodeType === 'js_inject') {
      extractTokens(c.jsCode || '');
      return { ...base, code: c.jsCode };
    }

    if (d.nodeType === 'switch_iframe') return { ...base, action: c.action || 'enter', selector: c.selector };
    if (d.nodeType === 'switch_tab')    return { ...base, action: c.action || 'next' };
    if (d.nodeType === 'press_key')     return { ...base, value: c.value || 'ENTER', selector: c.selector };

    if (d.nodeType === 'checkbox')   return {
      ...base,
      selector:       c.selector,
      action:         c.checkAction || 'ensure_checked',
      state_selector: c.stateSelector || '',
      technique:      c.technique,
    };

    if (['type_text', 'click', 'select'].includes(d.nodeType)) {
      extractTokens(c.value || '');
      extractTokens(c.selector || '');
      return {
        ...base,
        selector:  c.selector,
        value:     c.value,
        technique: c.technique,
        fill_strategy: c.fillStrategy || 'force_fill',
        ...(d.nodeType === 'select' ? {
          select_by:       c.selectBy || (c.technique === 'mat_autocomplete' ? 'mat_autocomplete' : 'value'),
          mat_words:       c.matWords ?? 2,
        } : {}),
      };
    }

    // ── NEW NODES ──

    if (d.nodeType === 'save_variable') {
      allVars.add(c.variableName || '');
      return {
        ...base,
        selector:       c.selector,
        variable_name:  c.variableName,
        source:         c.variableSource || 'element_value',
        attribute:      c.variableAttr || '',
      };
    }

    if (d.nodeType === 'calculate') {
      extractTokens(c.calcInput || '');
      allVars.add(c.calcOutputVar || '');
      return {
        ...base,
        operation:   c.calcOperation,
        input:       c.calcInput,
        operand:     c.calcOperand,
        unit:        c.calcUnit || 'years',
        split_index: c.calcSplitIndex ?? 0,
        output_var:  c.calcOutputVar,
      };
    }

    if (d.nodeType === 'try_catch') {
      return {
        ...base,
        try_step_ids:        c.tryStepIds || [],
        catch_condition:     c.catchCondition,
        catch_condition_type: c.catchConditionType || 'element_appears',
        fallback_step_ids:   c.fallbackStepIds || [],
      };
    }

    if (d.nodeType === 'human_in_loop') {
      return {
        ...base,
        message:          c.hitlMessage,
        trigger:          c.hitlTrigger || 'always',
        trigger_selector: c.hitlTriggerSelector || '',
        trigger_variable: c.hitlTriggerVariable || '',
      };
    }

    if (d.nodeType === 'pin_fallback') {
      return {
        ...base,
        pin_primary_column:   c.pinPrimaryColumn,
        pin_secondary_column: c.pinSecondaryColumn,
        target_selector:      c.pinTargetSelector || '#pincode',
        submit_selector:      c.pinSubmitSelector || '#buypol',
        error_selector:       c.pinErrorSelector  || '.swal2-html-container',
        error_text_match:     c.pinErrorTextMatch  || 'enter customer city',
      };
    }

    if (d.nodeType === 'logout_detect') {
      return {
        ...base,
        logout_selector: c.logoutDetectSelector || "//button[contains(@class,'cstmbtn') and contains(.,'LOGIN')]",
        message:         c.logoutMessage || 'You have been logged out. Please log in manually and click OK.',
      };
    }

    return base;
  });

  return {
    meta: {
      workflow_version:        '3.0',
      execution_mode:          'sequential_by_step_number',
      created:                 new Date().toISOString(),
      total_steps:             steps.length,
      excel_columns_required:  Array.from(allColumns),
      runtime_variables_used:  Array.from(allVars).filter(Boolean),
    },
    steps,
  };
}

// ─────────────────────────────────────────────
// CONFIG PANEL
// ─────────────────────────────────────────────
const ConfigPanel = ({
  selectedNode, updateNodeData, availableColumns, setAvailableColumns,
}: {
  selectedNode: Node | null;
  updateNodeData: (id: string, data: Partial<AutomationNodeData>) => void;
  availableColumns: string[];
  setAvailableColumns: (cols: string[]) => void;
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [localSeq, setLocalSeq] = useState<string | number>('');

  // 🔴 THE FIX: Dependency list mein sirf ID rakhi hai.
  // Ab React Flow aapke typing ke beech mein kabhi tang nahi aadayega!
  useEffect(() => {
    if (selectedNode) {
      setLocalSeq((selectedNode.data as unknown as AutomationNodeData).sequence || '');
    }
  }, [selectedNode?.id]);

  if (!selectedNode) {
    return (
      <aside className="w-[300px] border-l bg-card flex flex-col items-center justify-center text-center text-muted-foreground p-6 flex-shrink-0">
        <Settings2 size={36} className="mb-3 opacity-15" />
        <p className="text-sm font-medium">No block selected</p>
        <p className="text-xs mt-1 text-muted-foreground/70">Click any block on the canvas to configure it</p>
      </aside>
    );
  }

  const d   = selectedNode.data as unknown as AutomationNodeData;
  const cfg = d.config || {};

  const updateCfg   = (key: keyof NodeConfig, value: unknown) =>
    updateNodeData(selectedNode.id, { config: { ...cfg, [key]: value } });
  const updateLabel = (label: string) => updateNodeData(selectedNode.id, { label });

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data     = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws       = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
        const headers  = (jsonData[0] || []).filter(h => h && String(h).trim() !== '');
        setAvailableColumns(headers);
        updateCfg('fileName', file.name);
      } catch { alert('Could not read Excel file.'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const applyPreset = (preset: Record<string, unknown>) => {
    if (preset.selector !== undefined) updateCfg('selector', preset.selector as string);
    if (preset.value    !== undefined) {
      // 🔴 THE FIX: JS Injection ke liye preset.value ko jsCode me save karna hai
      if (d.nodeType === 'js_inject') {
        updateCfg('jsCode', preset.value as string);
      } else if (['save_variable', 'calculate'].includes(d.nodeType)) {
        if (d.nodeType === 'save_variable') updateCfg('variableName', preset.value as string);
        if (d.nodeType === 'calculate')     updateCfg('calcInput',    preset.value as string);
      } else {
        updateCfg('value', preset.value as string);
      }
    }
    if (preset.waitTarget)               updateCfg('waitTarget', preset.waitTarget as string);
    if (preset.waitType)     updateCfg('waitType',     preset.waitType as never);
    if (preset.waitTimeout)  updateCfg('waitTimeout',  preset.waitTimeout as number);
    if (preset.fillStrategy) updateCfg('fillStrategy', preset.fillStrategy as never);
    if (preset.scrollIntoView !== undefined) updateCfg('scrollIntoView', preset.scrollIntoView as boolean);
    setShowPresets(false);
  };

  const insertColumn = (col: string) => {
    if (d.nodeType === 'calculate') updateCfg('calcInput', (cfg.calcInput || '') + `{{${col}}}`);
    else updateCfg('value', (cfg.value || '') + `{{${col}}}`);
  };

  const hasPresets = ICICI_PRESETS[d.nodeType];
  const s = catStyle(d.category);

  return (
    <aside className="w-[300px] border-l bg-card flex flex-col h-full overflow-hidden flex-shrink-0">
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
          <input type="text" value={d.label} onChange={e => updateLabel(e.target.value)} className="cp-input" />
        </Field>

        {/* Step Number */}
        <Field label="Step Number" hint="Type number and click anywhere outside to apply">
          <input
            type="number" min={1}
            value={localSeq}
            onChange={e => setLocalSeq(e.target.value)}
            onBlur={e => { 
              const v = parseInt(e.target.value as string); 
              const finalSeq = isNaN(v) ? 0 : v;
              // 🔴 THE FIX: Sirf tabhi Data save hoga jab actual me number badla ho
              if (finalSeq !== (selectedNode.data as unknown as AutomationNodeData).sequence) {
                updateNodeData(selectedNode.id, { sequence: finalSeq }); 
              }
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="cp-input text-lg font-black text-center py-2 text-blue-600 dark:text-blue-400 border-blue-200"
            placeholder="e.g. 10"
          />
        </Field>

        {/* Wait After */}
        {d.nodeType !== 'trigger' && (
          <div className="bg-sky-500/5 border border-sky-500/15 rounded-lg p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <Timer size={11} /> Wait After This Step
            </p>
            <Field label="Delay (milliseconds)">
              <div className="flex items-center gap-2">
                <input type="number" min={0} step={100} value={cfg.waitAfterMs ?? 0}
                  onChange={e => updateCfg('waitAfterMs', Number(e.target.value))} className="cp-input" />
                <span className="text-[10px] text-muted-foreground">ms</span>
              </div>
            </Field>
            <div className="flex flex-wrap gap-1">
              {[0, 500, 1000, 2000, 3000, 5000].map(ms => (
                <button key={ms} onClick={() => updateCfg('waitAfterMs', ms)}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                    (cfg.waitAfterMs ?? 0) === ms
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-700 dark:text-sky-300'
                      : 'border-border text-muted-foreground hover:border-sky-500/30'
                  }`}>
                  {ms === 0 ? 'None' : `${ms}ms`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Handling */}
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
                <input type="number" min={0} max={10} className="cp-input" value={cfg.retries ?? 2}
                  onChange={e => updateCfg('retries', Number(e.target.value))} />
              </Field>
            </div>
            <Field label="Retry delay (ms)">
              <input type="number" step={500} min={0} className="cp-input" value={cfg.retryDelay ?? 1000}
                onChange={e => updateCfg('retryDelay', Number(e.target.value))} />
            </Field>
          </div>
        )}

        <div className="border-t border-border/50" />

        {/* ICICI Presets */}
        {hasPresets && (
          <div>
            <button onClick={() => setShowPresets(v => !v)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border/80 transition-all">
              <FileSearch size={12} /> Load ICICI Preset
              <ChevronDown size={11} className={`ml-auto transition-transform ${showPresets ? 'rotate-180' : ''}`} />
            </button>
            {showPresets && (
              <div className="mt-1.5 border border-border rounded-lg overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                {(ICICI_PRESETS[d.nodeType] as any[]).map((p, i) => (
                  <button key={i} onClick={() => applyPreset(p)}
                    className="w-full text-left px-3 py-2 border-b border-border last:border-0 hover:bg-primary/5 transition-colors">
                    <div className="text-[11px] font-medium">{p.label}</div>
                    {p.selector ? <div className="text-[10px] text-muted-foreground font-mono truncate">{p.selector}</div> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            OPEN URL
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'open_url' && (
          <Field label="Website URL">
            <input type="text" placeholder="https://…" value={cfg.url || ''}
              onChange={e => updateCfg('url', e.target.value)} className="cp-input" />
          </Field>
        )}

        {/* ═══════════════════════════════════════════
            SELECTOR — shared for click / type / select
        ═══════════════════════════════════════════ */}
        {['type_text', 'click', 'select'].includes(d.nodeType) && (
          <>
            <Field label="Target Selector" hint="CSS selector or XPath">
              <input type="text" placeholder="e.g. #txtreg or //input[@id='carreg']"
                value={cfg.selector || ''} onChange={e => updateCfg('selector', e.target.value)}
                className="cp-input font-mono text-[11px]" />
            </Field>

            {/* Scroll into view */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Scroll Into View</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateCfg('scrollIntoView', !cfg.scrollIntoView)}
                  className={`w-8 h-4 rounded-full transition-all relative ${cfg.scrollIntoView ? 'bg-primary' : 'bg-muted border border-border'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${cfg.scrollIntoView ? 'left-4' : 'left-0.5'}`} />
                </button>
                {cfg.scrollIntoView && (
                  <select className="cp-select w-20" value={cfg.scrollBlock || 'center'} onChange={e => updateCfg('scrollBlock', e.target.value as never)}>
                    <option value="start">start</option>
                    <option value="center">center</option>
                    <option value="end">end</option>
                  </select>
                )}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════
            VALUE + FILL STRATEGY (type_text / select)
        ═══════════════════════════════════════════ */}
        {['type_text', 'select'].includes(d.nodeType) && (
          <>
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
              <textarea placeholder="Type value or click a column chip…"
                value={cfg.value || ''} onChange={e => updateCfg('value', e.target.value)} className="cp-textarea" />
            </Field>

            {/* Fill Strategy — for type_text AND select */}
            {['type_text', 'select'].includes(d.nodeType) && (
              <Field label="Fill Strategy" hint="When to fill vs skip the field">
                <div className="grid grid-cols-1 gap-1">
                  {([
                    { value: 'force_fill',      label: '⚡ Force Fill', desc: 'Always clear & type (use for Name, Address, PIN)' },
                    { value: 'fill_if_empty',   label: '🔍 Fill if Empty', desc: 'Skips if already has a value (safe for auto-fetched fields)' },
                    { value: 'fill_if_zero_or_na', label: '0️⃣ Fill if 0 / NA', desc: 'Fills if empty, "0", or "NA" (original logic)' },
                  ] as const).map(opt => (
                    <button key={opt.value} onClick={() => updateCfg('fillStrategy', opt.value)}
                      className={`text-left px-3 py-2 rounded-lg border transition-all ${
                        (cfg.fillStrategy || 'fill_if_zero_or_na') === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border/80 hover:bg-muted/40'
                      }`}>
                      <div className="text-[11px] font-semibold">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════
            SELECT — extra options
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'select' && (
          <div className="space-y-3 pt-1 border-t border-border/50">
            <Field label="Select Method">
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { value: 'value',           label: 'By Value',        desc: 'option value="0"'     },
                  { value: 'text',            label: 'By Visible Text',  desc: 'option text "Silver"' },
                  { value: 'mat_autocomplete', label: 'Material Autocomplete', desc: 'Type & click option' },
                  { value: 'index',           label: 'By Index',         desc: '0-based position'    },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => updateCfg('selectBy', opt.value)}
                    className={`text-left p-2 rounded-lg border transition-all ${
                      (cfg.selectBy || 'value') === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}>
                    <div className="text-[10px] font-semibold">{opt.label}</div>
                    <div className="text-[9px] text-muted-foreground">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </Field>
            {cfg.selectBy === 'mat_autocomplete' && (
              <Field label="Search First N Words" hint="Python uses first 2 words to search autocomplete">
                <input type="number" min={1} max={5} value={cfg.matWords ?? 2}
                  onChange={e => updateCfg('matWords', Number(e.target.value))} className="cp-input" />
              </Field>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            CHECKBOX
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'checkbox' && (
          <div className="space-y-3">
            <Field label="Click Target (selector)" hint="Element to click — label or input">
              <input type="text" placeholder="e.g. label[for='switch']"
                value={cfg.selector || ''} onChange={e => updateCfg('selector', e.target.value)}
                className="cp-input font-mono text-[11px]" />
            </Field>
            <Field label="Desired Action">
              <div className="grid grid-cols-1 gap-1.5">
                {([
                  { value: 'ensure_checked',   icon: '✅', title: 'Ensure ON',     desc: 'Clicks only if currently OFF' },
                  { value: 'ensure_unchecked', icon: '⬜', title: 'Ensure OFF',    desc: 'Clicks only if currently ON'  },
                  { value: 'toggle',           icon: '⇄',  title: 'Always Toggle', desc: 'Always click regardless of state' },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => updateCfg('checkAction', opt.value)}
                    className={`text-left px-3 py-2 rounded-lg border transition-all ${
                      (cfg.checkAction || 'ensure_checked') === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span>{opt.icon}</span>
                      <span className="text-[11px] font-semibold">{opt.title}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 ml-6">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </Field>
            {(cfg.checkAction || 'ensure_checked') !== 'toggle' && (
              <Field label="State Selector (optional)" hint="The real input behind a label, e.g. #switch">
                <input type="text" placeholder="e.g. #switch"
                  value={cfg.stateSelector || ''} onChange={e => updateCfg('stateSelector', e.target.value)}
                  className="cp-input font-mono text-[11px]" />
              </Field>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TECHNIQUE GRID
        ═══════════════════════════════════════════ */}
        {['type_text', 'click', 'select', 'checkbox'].includes(d.nodeType) && (
          <div className="space-y-2 pt-1 border-t border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1">Injection Technique</p>
            <TechGrid nodeType={d.nodeType} value={cfg.technique || 'send_keys'} onChange={v => updateCfg('technique', v)} />
          </div>
        )}

        {/* ═══════════════════════════════════════════
            LOOP EXCEL
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'loop_excel' && (
          <div className="bg-teal-500/5 border border-teal-500/15 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
              <ShieldCheck size={12} />
              <p className="text-[10px] font-bold uppercase tracking-tight">Local Mapping Mode</p>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Select your Excel file to extract column headers locally (not uploaded).
            </p>
            <div>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleLocalFileSelect} className="hidden" id="local-excel-mapper" />
              <label htmlFor="local-excel-mapper"
                className="flex items-center justify-center gap-2 w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold rounded-md cursor-pointer transition-colors">
                <FileSearch size={12} /> Select Sample File
              </label>
            </div>
            {cfg.fileName && (
              <div className="flex items-center justify-between bg-background rounded-md px-2 py-1.5 border border-teal-500/20">
                <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400 truncate max-w-[200px]">{cfg.fileName}</span>
                <CheckCircle2 size={12} className="text-teal-500 flex-shrink-0" />
              </div>
            )}
            {availableColumns.length > 0 && (
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold text-center">{availableColumns.length} columns ready for mapping</p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            WAIT
        ═══════════════════════════════════════════ */}
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
              <input type="text" placeholder="#selector" value={cfg.waitTarget || ''}
                onChange={e => updateCfg('waitTarget', e.target.value)} className="cp-input font-mono text-[11px]" />
            </Field>
            <Field label="Timeout (seconds)">
              <input type="number" min={1} max={120} value={cfg.waitTimeout ?? 10}
                onChange={e => updateCfg('waitTimeout', Number(e.target.value))} className="cp-input" />
            </Field>
          </>
        )}

        {/* ═══════════════════════════════════════════
            IF / ELSE — DATA-DRIVEN
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'if_else' && (
          <div className="space-y-3">
            <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-1.5">
                <GitBranch size={11} /> Condition Builder
              </p>

              <Field label="Condition Type">
                <select className="cp-select" value={cfg.conditionType || 'element_exists'}
                  onChange={e => updateCfg('conditionType', e.target.value as never)}>
                  <optgroup label="Element-based">
                    <option value="element_exists">Element exists on page</option>
                    <option value="element_text_equals">Element text equals</option>
                    <option value="element_text_contains">Element text contains</option>
                  </optgroup>
                  <optgroup label="Variable / Runtime">
                    <option value="variable_empty">Variable is empty</option>
                    <option value="variable_equals">Variable equals value</option>
                    <option value="variable_contains">Variable contains text</option>
                  </optgroup>
                  <optgroup label="Page-level">
                    <option value="url_contains">URL contains text</option>
                    <option value="page_has_text">Page has text</option>
                  </optgroup>
                </select>
              </Field>

              <Field label="Left side (selector or {{variable}})" hint="e.g. #previnstp or {{tp_insurer}}">
                <input type="text" placeholder="#selector or {{variable_name}}"
                  value={cfg.conditionLeft || ''} onChange={e => updateCfg('conditionLeft', e.target.value)}
                  className="cp-input font-mono text-[11px]" />
              </Field>

              <Field label="Operator">
                <select className="cp-select" value={cfg.conditionOperator || 'is_empty'}
                  onChange={e => updateCfg('conditionOperator', e.target.value as never)}>
                  <option value="is_empty">is empty</option>
                  <option value="is_not_empty">is NOT empty</option>
                  <option value="equals">equals (exact)</option>
                  <option value="not_equals">does NOT equal</option>
                  <option value="contains">contains</option>
                  <option value="not_contains">does NOT contain</option>
                </select>
              </Field>

              {!['is_empty', 'is_not_empty'].includes(cfg.conditionOperator || 'is_empty') && (
                <Field label="Right side (comparison value)">
                  <input type="text" placeholder="text or {{variable}}"
                    value={cfg.conditionRight || ''} onChange={e => updateCfg('conditionRight', e.target.value)}
                    className="cp-input font-mono text-[11px]" />
                </Field>
              )}
            </div>

            {/* 🔴 UPGRADED: IF/ELSE Jump Logic */}
            <div className="grid grid-cols-2 gap-2">
              <Field label="✅ If TRUE → Jump to Step">
                <input type="number" min={1} placeholder="e.g. 5"
                  value={cfg.trueBranch || ''} onChange={e => updateCfg('trueBranch', e.target.value)}
                  className="cp-input text-[11px] font-bold text-green-600" />
              </Field>
              <Field label="❌ If FALSE → Jump to Step">
                <input type="number" min={1} placeholder="e.g. 8"
                  value={cfg.falseBranch || ''} onChange={e => updateCfg('falseBranch', e.target.value)}
                  className="cp-input text-[11px] font-bold text-red-600" />
              </Field>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            LOOP N TIMES
        ═══════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════
            LOOP N TIMES
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'loop' && (
          <div className="space-y-3">
            <Field label="Repeat Count (How many times?)">
              <input type="number" min={1} max={999} value={cfg.loopCount ?? 3}
                onChange={e => updateCfg('loopCount', Number(e.target.value))} className="cp-input" />
            </Field>
            <Field label="Steps to Repeat" hint="Comma-separated step numbers (e.g. 5,6,7)">
              <input type="text" placeholder="5,6,7" value={cfg.action || ''}
                onChange={e => updateCfg('action', e.target.value)} className="cp-input font-mono text-[11px]" />
            </Field>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            JS INJECTION
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'js_inject' && (
          <Field label={<>JavaScript Code <span className="ml-1 text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">ADVANCED</span></>}>
            <textarea value={cfg.jsCode || ''} onChange={e => updateCfg('jsCode', e.target.value)}
              placeholder={"// {{ColumnName}} injects Excel values\nlet el = document.getElementById('sirangeinput');\nel.value = '{{IDV}}';\nel.dispatchEvent(new Event('input', {bubbles: true}));\nel.dispatchEvent(new Event('change', {bubbles: true}));\nel.dispatchEvent(new Event('blur', {bubbles: true}));"}
              className="cp-textarea min-h-[130px]" />
            <p className="text-[10px] text-muted-foreground mt-1">
              Use <code className="bg-muted px-1 rounded">{'{{ColumnName}}'}</code> for Excel data,{' '}
              <code className="bg-muted px-1 rounded">{'{{variable_name}}'}</code> for runtime variables
            </p>
          </Field>
        )}

        {/* ═══════════════════════════════════════════
            EXTRACT
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'extract' && (
          <>
            <Field label="Fields to Extract" hint="Format: Label: #selector — one per line">
              <textarea value={cfg.extractFields || ''} onChange={e => updateCfg('extractFields', e.target.value)}
                placeholder={"Premium: #premium-amount\nQuote No: .quote-id\nPolicy Date: #pol-date"}
                className="cp-textarea min-h-[90px]" />
            </Field>
            <Field label="Output filename">
              <input type="text" placeholder="results.xlsx" value={cfg.outputFile || 'results.xlsx'}
                onChange={e => updateCfg('outputFile', e.target.value)} className="cp-input" />
            </Field>
          </>
        )}

        {/* ═══════════════════════════════════════════
            IFRAME / TAB / KEY
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'switch_iframe' && (
          <>
            <Field label="Action">
              <select className="cp-select" value={cfg.action || 'enter'} onChange={e => updateCfg('action', e.target.value)}>
                <option value="enter">Enter specific Iframe</option>
                <option value="exit">Exit to Main Page</option>
              </select>
            </Field>
            {cfg.action !== 'exit' && (
              <Field label="Iframe Selector">
                <input type="text" placeholder="#my-iframe" value={cfg.selector || ''}
                  onChange={e => updateCfg('selector', e.target.value)} className="cp-input font-mono text-[11px]" />
              </Field>
            )}
          </>
        )}

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
            <Field label="Target Selector (optional)">
              <input type="text" placeholder="#search-input (optional)" value={cfg.selector || ''}
                onChange={e => updateCfg('selector', e.target.value)} className="cp-input font-mono text-[11px]" />
            </Field>
          </>
        )}

        {/* ═══════════════════════════════════════════
            ★ NEW: SAVE TO VARIABLE
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'save_variable' && (
          <div className="space-y-3">
            <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Variable size={11} /> Runtime Variable Config
              </p>

              <Field label="Variable Name" hint="Use this as {{variable_name}} in later blocks">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px]">{'{{{'}</span>
                  <input type="text" placeholder="tp_insurer" value={cfg.variableName || ''}
                    onChange={e => updateCfg('variableName', e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase())}
                    className="cp-input flex-1" />
                  <span className="text-muted-foreground text-[11px]">{'}}}'}</span>
                </div>
              </Field>

              <Field label="Read From">
                <select className="cp-select" value={cfg.variableSource || 'element_value'}
                  onChange={e => updateCfg('variableSource', e.target.value as never)}>
                  <option value="element_value">Element .value attribute (input fields)</option>
                  <option value="element_text">Element inner text (labels, spans)</option>
                  <option value="element_attr">Element custom attribute</option>
                  <option value="url">Current page URL</option>
                  <option value="page_title">Page title</option>
                </select>
              </Field>

              {cfg.variableSource !== 'url' && cfg.variableSource !== 'page_title' && (
                <Field label="Source Selector" hint="CSS selector or XPath of the element to read">
                  <input type="text" placeholder="e.g. #previnstp" value={cfg.selector || ''}
                    onChange={e => updateCfg('selector', e.target.value)} className="cp-input font-mono text-[11px]" />
                </Field>
              )}

              {cfg.variableSource === 'element_attr' && (
                <Field label="Attribute Name" hint="e.g. data-value, aria-label, href">
                  <input type="text" placeholder="data-value" value={cfg.variableAttr || ''}
                    onChange={e => updateCfg('variableAttr', e.target.value)} className="cp-input font-mono text-[11px]" />
                </Field>
              )}

              {cfg.variableName && (
                <div className="bg-indigo-500/8 rounded-md p-2 text-[10px] text-indigo-700 dark:text-indigo-300">
                  After this step, use <code className="font-mono bg-indigo-500/10 px-1 rounded">{'{{' + cfg.variableName + '}}'}</code> in any Type Text or If/Else block.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ★ NEW: CALCULATE / MODIFY DATA
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'calculate' && (
          <div className="space-y-3">
            <div className="bg-teal-500/5 border border-teal-500/15 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                <Calculator size={11} /> Calculation Config
              </p>

              <Field label="Operation">
                <select className="cp-select" value={cfg.calcOperation || 'date_subtract'}
                  onChange={e => updateCfg('calcOperation', e.target.value as never)}>
                  <optgroup label="Date Math">
                    <option value="date_subtract">Date − N (subtract period)</option>
                    <option value="date_add">Date + N (add period)</option>
                  </optgroup>
                  <optgroup label="Number Math">
                    <option value="number_add">Number + N</option>
                    <option value="number_subtract">Number − N</option>
                  </optgroup>
                  <optgroup label="Text Operations">
                    <option value="text_split">Text → first N words</option>
                    <option value="text_join">Join with separator</option>
                    <option value="text_replace">Find & Replace</option>
                  </optgroup>
                </select>
              </Field>

              <Field label="Input Value / Variable" hint="Use {{variable_name}} or a raw value">
                {availableColumns.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {availableColumns.map(col => (
                      <button key={col} onClick={() => insertColumn(col)}
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors border border-purple-500/20">
                        {`{{${col}}}`}
                      </button>
                    ))}
                  </div>
                )}
                <input type="text" placeholder="{{tp_end_date}} or {{IDV_Min}}"
                  value={cfg.calcInput || ''} onChange={e => updateCfg('calcInput', e.target.value)}
                  className="cp-input font-mono text-[11px]" />
              </Field>

              {['date_subtract', 'date_add', 'number_add', 'number_subtract'].includes(cfg.calcOperation || 'date_subtract') && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Operand (amount)">
                    <input type="number" min={0} value={cfg.calcOperand || '5'}
                      onChange={e => updateCfg('calcOperand', e.target.value)} className="cp-input" />
                  </Field>
                  {['date_subtract', 'date_add'].includes(cfg.calcOperation || '') && (
                    <Field label="Unit">
                      <select className="cp-select" value={cfg.calcUnit || 'years'} onChange={e => updateCfg('calcUnit', e.target.value as never)}>
                        <option value="years">Years</option>
                        <option value="months">Months</option>
                        <option value="days">Days</option>
                      </select>
                    </Field>
                  )}
                </div>
              )}

              {cfg.calcOperation === 'text_split' && (
                <Field label="Take first N words">
                  <input type="number" min={1} value={cfg.calcSplitIndex ?? 2}
                    onChange={e => updateCfg('calcSplitIndex', Number(e.target.value))} className="cp-input" />
                </Field>
              )}

              <Field label="Save result to Variable" hint="Access result as {{variable_name}} in later steps">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px]">{'{{{'}</span>
                  <input type="text" placeholder="calculated_date" value={cfg.calcOutputVar || ''}
                    onChange={e => updateCfg('calcOutputVar', e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase())}
                    className="cp-input flex-1" />
                  <span className="text-muted-foreground text-[11px]">{'}}}'}</span>
                </div>
              </Field>

              {cfg.calcInput && cfg.calcOutputVar && (
                <div className="bg-teal-500/8 rounded-md p-2 text-[10px] text-teal-700 dark:text-teal-300 font-mono">
                  {`{{${cfg.calcOutputVar}}} = ${cfg.calcInput} ${
                    cfg.calcOperation === 'date_subtract' ? `− ${cfg.calcOperand || '?'} ${cfg.calcUnit}` :
                    cfg.calcOperation === 'date_add' ? `+ ${cfg.calcOperand || '?'} ${cfg.calcUnit}` :
                    cfg.calcOperation === 'number_add' ? `+ ${cfg.calcOperand || '?'}` :
                    cfg.calcOperation === 'number_subtract' ? `− ${cfg.calcOperand || '?'}` :
                    cfg.calcOperation === 'text_split' ? `[first ${cfg.calcSplitIndex ?? 2} words]` : ''
                  }`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ★ NEW: TRY-CATCH FALLBACK
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'try_catch' && (
          <div className="space-y-3">
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Shield size={11} /> Try-Catch Logic
              </p>
              <div className="bg-amber-500/8 rounded-md p-2 text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                <b>How it works:</b> The Python runner executes <b>TRY steps</b> first.
                If the CATCH condition appears (popup, error), it runs <b>FALLBACK steps</b> instead of crashing.
              </div>

              <Field label="Catch Trigger Condition" hint="What element/error triggers the fallback?">
                <select className="cp-select" value={cfg.catchConditionType || 'element_appears'}
                  onChange={e => updateCfg('catchConditionType', e.target.value as never)}>
                  <option value="element_appears">Element appears on page</option>
                  <option value="element_text_contains">Element text contains value</option>
                  <option value="exception">Any Python exception</option>
                </select>
              </Field>

              <Field label="Catch Selector / Text" hint="e.g. .swal2-html-container or 'Unable to fetch'">
                <input type="text" placeholder=".swal2-html-container"
                  value={cfg.catchCondition || ''} onChange={e => updateCfg('catchCondition', e.target.value)}
                  className="cp-input font-mono text-[11px]" />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="TRY Step Numbers" hint="Comma-separated step #s">
                  <input type="text" placeholder="e.g. 5,6,7" value={(cfg.tryStepIds || []).join(',')}
                    onChange={e => updateCfg('tryStepIds', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                    className="cp-input font-mono text-[11px]" />
                </Field>
                <Field label="FALLBACK Step Numbers" hint="Comma-separated step #s">
                  <input type="text" placeholder="e.g. 8,9,10" value={(cfg.fallbackStepIds || []).join(',')}
                    onChange={e => updateCfg('fallbackStepIds', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                    className="cp-input font-mono text-[11px]" />
                </Field>
              </div>

              {cfg.retries && Number(cfg.retries) > 0 && (
                <div className="bg-amber-500/8 rounded-md p-2 text-[10px] text-amber-700 dark:text-amber-300">
                  ↺ Will retry TRY block up to <b>{cfg.retries}×</b> before giving up.
                </div>
              )}
            </div>

            <div className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg p-2.5 leading-relaxed border border-border/50">
              <b>Real example:</b> Fetch Vehicle Details (TRY: step 5) →<br/>
              IF .swal2-html-container appears (CATCH) →<br/>
              Click OK + Retry (FALLBACK: steps 6,7) → Skip record after 2 fails.
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ★ NEW: HUMAN IN THE LOOP
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'human_in_loop' && (
          <div className="space-y-3">
            <div className="bg-rose-500/5 border border-rose-500/15 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <UserCheck size={11} /> Human Pause Config
              </p>
              <div className="bg-rose-500/8 rounded-md p-2 text-[10px] text-rose-700 dark:text-rose-300 leading-relaxed">
                When reached, the Python runner shows a <b>blocking Windows popup</b> and waits.
                The browser stays open. Click <b>OK/Resume</b> to continue automation.
              </div>

              <Field label="Message to Show User">
                <textarea value={cfg.hitlMessage || ''}
                  onChange={e => updateCfg('hitlMessage', e.target.value)}
                  placeholder="Please log in manually and click OK to resume."
                  className="cp-textarea min-h-[70px]" />
              </Field>

              <Field label="When to Trigger">
                <select className="cp-select" value={cfg.hitlTrigger || 'always'}
                  onChange={e => updateCfg('hitlTrigger', e.target.value as never)}>
                  <option value="always">Always pause at this step</option>
                  <option value="if_element">Only if element is visible</option>
                  <option value="if_variable_empty">Only if variable is empty</option>
                </select>
              </Field>

              {cfg.hitlTrigger === 'if_element' && (
                <Field label="Trigger Selector" hint="Pause only if this element is present">
                  <input type="text" placeholder="//button[contains(@class,'cstmbtn')]"
                    value={cfg.hitlTriggerSelector || ''} onChange={e => updateCfg('hitlTriggerSelector', e.target.value)}
                    className="cp-input font-mono text-[11px]" />
                </Field>
              )}

              {cfg.hitlTrigger === 'if_variable_empty' && (
                <Field label="Trigger Variable" hint="Pause only if {{variable}} is empty">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-[11px]">{'{{{'}</span>
                    <input type="text" placeholder="variable_name"
                      value={cfg.hitlTriggerVariable || ''} onChange={e => updateCfg('hitlTriggerVariable', e.target.value)}
                      className="cp-input flex-1" />
                    <span className="text-muted-foreground text-[11px]">{'}}}'}</span>
                  </div>
                </Field>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ★ NEW: PIN FALLBACK
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'pin_fallback' && (
          <div className="space-y-3">
            <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <Shuffle size={11} /> PIN / City Fallback Logic
              </p>
              <div className="bg-cyan-500/8 rounded-md p-2 text-[10px] text-cyan-700 dark:text-cyan-300 leading-relaxed">
                Tries <b>Primary PIN</b> first. If an error popup appears with the trigger text,
                dismisses it and tries <b>Secondary PIN</b>. Validates 6-digit format automatically.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Primary PIN Column">
                  <div className="relative">
                    <select className="cp-select" value={cfg.pinPrimaryColumn || ''}
                      onChange={e => updateCfg('pinPrimaryColumn', e.target.value)}>
                      <option value="">Select column…</option>
                      {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      {!availableColumns.length && <option value="PIN">PIN</option>}
                    </select>
                  </div>
                </Field>
                <Field label="Fallback PIN Column">
                  <select className="cp-select" value={cfg.pinSecondaryColumn || ''}
                    onChange={e => updateCfg('pinSecondaryColumn', e.target.value)}>
                    <option value="">(none)</option>
                    {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    {!availableColumns.length && <option value="PIN 2">PIN 2</option>}
                  </select>
                </Field>
              </div>

              <Field label="Pincode Field Selector">
                <input type="text" placeholder="#pincode" value={cfg.pinTargetSelector || '#pincode'}
                  onChange={e => updateCfg('pinTargetSelector', e.target.value)} className="cp-input font-mono text-[11px]" />
              </Field>

              <Field label="Submit Button Selector">
                <input type="text" placeholder="#buypol" value={cfg.pinSubmitSelector || '#buypol'}
                  onChange={e => updateCfg('pinSubmitSelector', e.target.value)} className="cp-input font-mono text-[11px]" />
              </Field>

              <Field label="Error Popup Selector">
                <input type="text" placeholder=".swal2-html-container" value={cfg.pinErrorSelector || '.swal2-html-container'}
                  onChange={e => updateCfg('pinErrorSelector', e.target.value)} className="cp-input font-mono text-[11px]" />
              </Field>

              <Field label="Error Text to Match (triggers fallback)" hint="Case-insensitive partial match">
                <input type="text" placeholder="enter customer city"
                  value={cfg.pinErrorTextMatch || 'enter customer city'}
                  onChange={e => updateCfg('pinErrorTextMatch', e.target.value)} className="cp-input text-[11px]" />
              </Field>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ★ NEW: LOGOUT DETECTION
        ═══════════════════════════════════════════ */}
        {d.nodeType === 'logout_detect' && (
          <div className="space-y-3">
            <div className="bg-rose-500/5 border border-rose-500/15 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle size={11} /> Logout Detection Config
              </p>
              <div className="bg-rose-500/8 rounded-md p-2 text-[10px] text-rose-700 dark:text-rose-300 leading-relaxed">
                Automatically checked after every error. If the Login button is visible,
                shows a popup and <b>retries the current record</b> after user logs back in.
              </div>

              <Field label="Login Button Selector" hint="XPath or CSS that identifies the LOGIN button">
                <input type="text"
                  placeholder="//button[contains(@class,'cstmbtn') and contains(.,'LOGIN')]"
                  value={cfg.logoutDetectSelector || "//button[contains(@class,'cstmbtn') and contains(.,'LOGIN')]"}
                  onChange={e => updateCfg('logoutDetectSelector', e.target.value)}
                  className="cp-input font-mono text-[10px]" />
              </Field>

              <Field label="Message to User">
                <textarea value={cfg.logoutMessage || 'You have been logged out. Please log in manually and click OK.'}
                  onChange={e => updateCfg('logoutMessage', e.target.value)}
                  className="cp-textarea min-h-[60px]" />
              </Field>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="border-t border-border/50 pt-3">
          <Field label="Notes (optional)">
            <input type="text" placeholder="Reminder or explanation…" value={cfg.notes || ''}
              onChange={e => updateCfg('notes', e.target.value)} className="cp-input" />
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
    { value: 'send_keys',      icon: '⌨', name: 'send_keys()',   desc: 'Standard Selenium'   },
    { value: 'dispatch_event', icon: '⚡', name: 'dispatchEvent', desc: 'Angular/React fields' },
    { value: 'native_setter',  icon: '🔒', name: 'Native Setter', desc: 'Bypass trackers'      },
  ],
  click: [
    { value: 'standard_click', icon: '🖱', name: 'Standard',    desc: 'Normal .click()'    },
    { value: 'js_click',       icon: '⚡', name: 'JS Execute',  desc: 'Bypass overlays'    },
  ],
  select: [
    { value: 'native_select',    icon: '▼', name: 'Native Select', desc: 'HTML <select>'   },
    { value: 'mat_autocomplete', icon: '✦', name: 'Autocomplete',  desc: 'Material UI'     },
  ],
  checkbox: [
    { value: 'standard_click', icon: '🖱', name: 'Standard',    desc: 'Normal click'      },
    { value: 'js_click',       icon: '⚡', name: 'JS Execute',  desc: 'Hidden toggles'    },
  ],
};

const TechGrid = ({ nodeType, value, onChange }: { nodeType: string; value: string; onChange: (v: string) => void }) => {
  const opts = TECH_OPTIONS[nodeType] || [];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {opts.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`text-left p-2 rounded-lg border transition-all ${
            value === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-muted/50'
          }`}>
          <div className="text-base mb-0.5">{opt.icon}</div>
          <div className="text-[10px] font-semibold">{opt.name}</div>
          <div className="text-[9px] text-muted-foreground">{opt.desc}</div>
        </button>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// FLOW CANVAS
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
  const reactFlowWrapper              = useRef<HTMLDivElement>(null);
  const dropProcessed                 = useRef(false);
  const { screenToFlowPosition }      = useReactFlow();
  const router                        = useRouter();
  const [isSaving, setIsSaving]       = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [wfName, setWfName]           = useState(initialName);
  const [wfDesc, setWfDesc]           = useState(initialDesc);

  useEffect(() => { if (initialName) setWfName(initialName); }, [initialName]);
  useEffect(() => { if (initialDesc) setWfDesc(initialDesc); }, [initialDesc]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(nds => applyNodeChanges(changes, nds)),
    [setNodes],
  );

  useOnSelectionChange({
    onChange: ({ nodes: sel }) => setSelectedNodeId(sel.length > 0 ? sel[0].id : null),
  });

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move';
  }, []);

  useEffect(() => {
    const el = reactFlowWrapper.current;
    if (!el) return;
    const over  = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; };
    const enter = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dropProcessed.current = false; };
    el.addEventListener('dragover', over); el.addEventListener('dragenter', enter);
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
      rType === 'checkbox' ? 'js_click'       : 'send_keys';

    const newNode: Node = {
      id: getId(),
      type: 'automation',
      position,
      data: {
        nodeType: rType, label: rLabel, subline: rSubline, iName: rIName, category: rCat,
        sequence: 0,
        config: {
          retries: 2, retryDelay: 1000, onError: 'stop',
          technique: defaultTechnique,
          waitType: 'element', waitTimeout: 10,
          loopCount: 3,
          checkAction: 'ensure_checked',
          stateSelector: '',
          waitAfterMs: 0,
          fillStrategy: 'fill_if_zero_or_na',
          scrollIntoView: false,
          scrollBlock: 'center',
          selectBy: 'value',
          matWords: 2,
          variableSource: 'element_value',
          calcOperation: 'date_subtract',
          calcUnit: 'years',
          calcSplitIndex: 2,
          catchConditionType: 'element_appears',
          hitlTrigger: 'always',
          pinTargetSelector: '#pincode',
          pinSubmitSelector: '#buypol',
          pinErrorSelector: '.swal2-html-container',
          pinErrorTextMatch: 'enter customer city',
          logoutDetectSelector: "//button[contains(@class,'cstmbtn') and contains(.,'LOGIN')]",
          conditionType: 'element_exists',
          conditionOperator: 'is_empty',
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
    const result = await saveWorkflow(workflowId || null, wfName, wfDesc, nodes, []);
    if (result.success) {
      setSaved(true); setSaveDialogOpen(false);
      setTimeout(() => router.push('/workflows'), 1500);
    } else {
      alert('Failed to save workflow to database!');
      setIsSaving(false);
    }
  };

  const jsonString   = jsonDialogOpen ? JSON.stringify(buildWorkflowJSON(nodes), null, 2) : '';
  const copyJson     = () => navigator.clipboard.writeText(jsonString).catch(() => {});
  const downloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (wfName || 'workflow') + '.json'; a.click();
  };

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver} style={{ position: 'relative' }}>
      <ReactFlow
        nodes={nodes} edges={[]}
        onNodesChange={onNodesChange}
        onEdgesChange={() => {}} onConnect={() => {}}
        nodeTypes={nodeTypes} fitView colorMode="system"
      >
        <Background gap={24} size={1} color="hsl(var(--border) / 0.4)" />
        <Controls className="bg-card border border-border shadow-sm rounded-lg overflow-hidden" />
      </ReactFlow>

      {/* Legend */}
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
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-[700px] max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Code size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold flex-1">Workflow JSON — Python Runner Payload (v3.0)</h2>
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
                <input type="text" placeholder="e.g. ICICI Lombard OD Full Flow" value={wfName}
                  onChange={e => setWfName(e.target.value)} className="cp-input" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</label>
                <textarea placeholder="What does this automation do?" value={wfDesc}
                  onChange={e => setWfDesc(e.target.value)} className="cp-textarea" />
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
// SIDEBAR — expanded with all new blocks
// ─────────────────────────────────────────────
interface ToolDef {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string; nodeType: string; sub: string; iName: string; category: string;
  badge?: string; badgeColor?: string;
}

const TOOL_SECTIONS: Array<{ title: string; tools: ToolDef[] }> = [
  { title: 'Core', tools: [
    { icon: Play,            label: 'Start',            nodeType: 'trigger',       sub: 'Entry point',        iName: 'Play',             category: 'trigger'  },
    { icon: Globe,           label: 'Open URL',         nodeType: 'open_url',      sub: 'Navigate to page',   iName: 'Globe',            category: 'action'   },
  ]},
  { title: 'Data & Memory', tools: [
    { icon: FileSpreadsheet, label: 'Loop Excel / CSV', nodeType: 'loop_excel',    sub: 'Per-row iteration',  iName: 'FileSpreadsheet',  category: 'data'     },
    { icon: Download,        label: 'Extract & Save',   nodeType: 'extract',       sub: 'Scrape to file',     iName: 'Download',         category: 'data'     },
    { icon: Database,        label: 'Save to Variable', nodeType: 'save_variable', sub: 'Read & store value', iName: 'Database',         category: 'memory',  badge: 'NEW', badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    { icon: Calculator,      label: 'Calculate / Modify', nodeType: 'calculate',   sub: 'Date, number, text', iName: 'Calculator',       category: 'memory',  badge: 'NEW', badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  ]},
  { title: 'Interactions', tools: [
    { icon: Keyboard,        label: 'Type Text / Date', nodeType: 'type_text',     sub: 'Fill text field',    iName: 'Keyboard',         category: 'action'   },
    { icon: MousePointerClick, label: 'Click Element',  nodeType: 'click',         sub: 'Button / link / JS', iName: 'MousePointerClick', category: 'action'  },
    { icon: ListFilter,      label: 'Select Dropdown',  nodeType: 'select',        sub: 'Native or Material', iName: 'ListFilter',       category: 'action'   },
    { icon: CheckSquare,     label: 'Toggle Checkbox',  nodeType: 'checkbox',      sub: 'Smart state-aware',  iName: 'CheckSquare',      category: 'action'   },
  ]},
  { title: 'Logic & Flow', tools: [
    { icon: Timer,           label: 'Smart Wait',       nodeType: 'wait',          sub: 'Element or delay',   iName: 'Timer',            category: 'logic'   },
    { icon: GitBranch,       label: 'If / Else Branch', nodeType: 'if_else',       sub: 'Data-driven logic',  iName: 'GitBranch',        category: 'logic',   badge: '↑', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { icon: RefreshCw,       label: 'Loop N Times',     nodeType: 'loop',          sub: 'Repeat steps',       iName: 'RefreshCw',        category: 'logic'   },
    { icon: Shield,          label: 'Try-Catch',        nodeType: 'try_catch',     sub: 'Fallback on error',  iName: 'Shield',           category: 'logic',   badge: 'NEW', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  ]},
  { title: 'Safety & Human', tools: [
    { icon: UserCheck,       label: 'Human-in-Loop',    nodeType: 'human_in_loop', sub: 'Pause & resume',     iName: 'UserCheck',        category: 'safety',  badge: 'NEW', badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    { icon: Shuffle,         label: 'PIN Fallback',     nodeType: 'pin_fallback',  sub: 'Primary/backup PIN', iName: 'Shuffle',          category: 'safety',  badge: 'NEW', badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    { icon: AlertTriangle,   label: 'Logout Detect',    nodeType: 'logout_detect', sub: 'Session recovery',   iName: 'AlertTriangle',    category: 'safety',  badge: 'NEW', badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  ]},
  { title: 'Advanced', tools: [
    { icon: Code,            label: 'JS Injection',     nodeType: 'js_inject',     sub: 'Custom JavaScript',  iName: 'Code',             category: 'advanced', badge: 'ADV', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { icon: Layers,          label: 'Iframe Switch',    nodeType: 'switch_iframe', sub: 'Enter/Exit Iframes', iName: 'Layers',           category: 'advanced', badge: 'ADV', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { icon: Monitor,         label: 'Tab Manager',      nodeType: 'switch_tab',    sub: 'Switch/Close Tabs',  iName: 'Monitor',          category: 'advanced', badge: 'ADV', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { icon: Keyboard,        label: 'Press Key',        nodeType: 'press_key',     sub: 'ENTER, TAB, etc.',   iName: 'Keyboard',         category: 'advanced', badge: 'ADV', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  ]},
];

const Sidebar = () => {
  const [search, setSearch] = useState('');
  const onDragStart = (e: React.DragEvent, tool: ToolDef) => {
    e.dataTransfer.setData('application/reactflow-nodeType', tool.nodeType);
    e.dataTransfer.setData('application/reactflow-label',    tool.label);
    e.dataTransfer.setData('application/reactflow-subline',  tool.sub);
    e.dataTransfer.setData('application/reactflow-iName',    tool.iName);
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search blocks…"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
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
  const [nodes, setNodes]                         = useState<Node[]>([]);
  const [selectedNodeId, setSelectedNodeId]       = useState<string | null>(null);
  const [availableColumns, setAvailableColumns]   = useState<string[]>([]);
  const [isLoading, setIsLoading]                 = useState(false);
  const [workflowName, setWorkflowName]           = useState('');
  const [workflowDesc, setWorkflowDesc]           = useState('');

  const searchParams = useSearchParams();
  const workflowId = searchParams ? searchParams.get('id') : null;

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
      } catch (err) { console.error('Failed to load workflow:', err); }
      finally { setIsLoading(false); }
    };
    load();
  }, [workflowId]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  const updateNodeData = (id: string, patch: Partial<AutomationNodeData>) => {
    setNodes(nds => {
      const targetNode = nds.find(n => n.id === id);
      if (!targetNode) return nds;

      const currentData = targetNode.data as unknown as AutomationNodeData;
      const oldSeq = currentData.sequence || 0;
      const newSeq = patch.sequence !== undefined ? patch.sequence : oldSeq;

      // 🔴 THE MAGIC: Auto Shift / Cascade Logic
      return nds.map(node => {
        const nodeData = node.data as unknown as AutomationNodeData;
        let seq = nodeData.sequence || 0;

        // 1. Agar ye wahi block hai jisko user update kar raha hai
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...currentData,
              ...patch,
              config: patch.config ? { ...currentData.config, ...patch.config } : currentData.config,
            },
          };
        }

        // 2. Dusre blocks ki numbering automatically theek karo (Shift logic)
        if (patch.sequence !== undefined && seq > 0) {
          if (oldSeq === 0 && newSeq > 0) {
            // NAYA INSERT: Agar kisi naye block ko number diya hai, toh uske aage walo ko +1 kar do
            if (seq >= newSeq) seq++;
          } 
          else if (oldSeq > 0 && newSeq === 0) {
            // REMOVE: Agar kisi ka number hataya hai (0 kiya), toh uske aage walo ko -1 kar do
            if (seq > oldSeq) seq--;
          } 
          else if (oldSeq > 0 && newSeq > 0) {
            // MOVE/SWAP: Agar block ko upar ya neeche khiskaya hai
            if (newSeq < oldSeq && seq >= newSeq && seq < oldSeq) {
              seq++; // Upar khiskaya, toh baaki sabko +1 neeche dhakelo
            } else if (newSeq > oldSeq && seq > oldSeq && seq <= newSeq) {
              seq--; // Neeche khiskaya, toh baaki sabko -1 upar kheencho
            }
          }
        }

        // Agar sequence change hua hai tabhi naya data return karo
        if (seq !== nodeData.sequence) {
          return { ...node, data: { ...nodeData, sequence: seq } };
        }

        return node; // Koi change nahi
      });
    });
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

      <div className="w-full h-[740px] border border-border rounded-xl overflow-hidden bg-background flex shadow-xl relative">
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
            nodes={nodes} setNodes={setNodes}
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