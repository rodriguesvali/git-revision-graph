import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';
export interface Origin {
  readonly repositoryPath: string;
  readonly contextId: string;
}

export interface PanelState {
  readonly viewMode?: string;
  readonly references?: readonly { readonly kind: string; readonly name: string; readonly hash: string }[];
  readonly repositoryPath?: string;
  readonly currentHeadName?: string;
  readonly projectionOptions?: Readonly<Record<string, unknown>>;
  readonly kind?: string;
  readonly loading?: boolean;
  readonly errorMessage?: string;
  readonly messageOrigin?: Origin;
  readonly sourceToken?: string;
  readonly sceneLayoutKey?: string;
  readonly items?: readonly {
    id: string;
    path: string;
    originalPath?: string;
  }[];
  readonly commits?: readonly {
    hash: string;
    changes: readonly {
      id: string;
      path: string;
    }[];
  }[];
}

interface Reply {
  readonly state?: PanelState;
  readonly sent: readonly Record<string, unknown>[];
  readonly error?: string;
  readonly menuItems?: readonly { readonly action: string; readonly label: string }[];
  readonly viewOptions?: readonly string[];
}

export class ObservedPanel {
  readonly token = randomUUID();
  readonly posted: {
    type: string;
    state?: PanelState;
  }[] = [];
  readonly received: Record<string, unknown>[] = [];
  disposed = false;
  loading = false;
  private currentState: PanelState | undefined;
  private sequence = 0;
  private readonly replies = new Map<number, (reply: Reply) => void>();
  readonly proxy: vscode.WebviewPanel;
  constructor(readonly panel: vscode.WebviewPanel, readonly viewType: string) {
    panel.onDidDispose(() => { this.disposed = true; });
    panel.webview.onDidReceiveMessage((message: Record<string, unknown>) => {
      this.received.push(message);
      if (message.type === '__e2e' && message.token === this.token) {
        this.replies.get(message.id as number)?.(message.reply as Reply);
      }
    });
    const webview = new Proxy(panel.webview, {
      set: (target, property, value) => {
        if (property === 'html')
          value = instrumentHtml(value as string, this.token);
        return Reflect.set(target, property, value);
      },
      get: (target, property) => {
        if (property === 'postMessage')
          return (message: {
            type: string;
            state?: PanelState;
            status?: PanelState;
          }) => {
            this.posted.push(message);
            if (['state', 'init-state', 'update-state'].includes(message.type) && message.state) {
              this.currentState = message.state;
              this.loading = !!message.state.loading;
            }
            if (message.type === 'set-loading')
              this.loading = true;
            if (message.type === 'set-error')
              this.loading = false;
            if (message.type === 'update-repository-status' && this.currentState && message.status
              && message.status.repositoryPath === this.currentState.repositoryPath
              && message.status.sceneLayoutKey === this.currentState.sceneLayoutKey) {
              this.currentState = { ...this.currentState, ...message.status };
              this.loading = false;
            }
            return target.postMessage(message);
          };
        const value = Reflect.get(target, property);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
    this.proxy = new Proxy(panel, {
      get: (target, property) => {
        if (property === 'webview')
          return webview;
        const value = Reflect.get(target, property);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set: (target, property, value) => Reflect.set(target, property, value)
    });
  }
  get state(): PanelState | undefined { return this.currentState; }
  async ready(): Promise<void> {
    await waitFor(() => this.received.some(message => message.type === 'ready' || message.type === 'webview-ready'), `${this.viewType} real browser bootstrap`);
  }
  async control(op: string, args: Record<string, unknown> = {}): Promise<Reply> {
    await this.ready();
    const id = ++this.sequence;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = new Promise<Reply>((resolve, reject) => {
        this.replies.set(id, resolve);
        timeout = setTimeout(() => reject(new Error(`Webview control timed out: ${op} ${this.viewType}`)), 20000);
      });
      assert.equal(await this.panel.webview.postMessage({ type: '__e2e-control', token: this.token, id, op, ...args }), true);
      const reply = await response.catch(error => {
        console.error('Webview control diagnostics', this.viewType, op, this.panel.visible, this.received.slice(-6).map(message => ({ type: message.type, id: message.id, token: message.token })), this.posted.map(message => message.type));
        throw error;
      });
      assert.equal(reply.error, undefined, `${this.viewType}: ${reply.error}`);
      return reply;
    }
    finally {
      clearTimeout(timeout);
      this.replies.delete(id);
    }
  }
  async send(message: object): Promise<void> { await this.control('send', { message }); }
  async snapshot(): Promise<PanelState> {
    const reply = await this.control('snapshot');
    assert.ok(reply.state, 'The real webview must have received host state');
    return reply.state;
  }
  async menu(selector: string, action: string): Promise<void> { await this.control('menu', { selector, action }); }
}

export async function waitFor(predicate: () => boolean | Promise<boolean>, description: string): Promise<void> {
  const deadline = Date.now() + 20000;
  while (!await predicate()) {
    if (Date.now() >= deadline)
      throw new Error(`Timed out waiting for ${description}`);
    await new Promise(resolve => setTimeout(resolve, 40));
  }
}

export function instrumentHtml(html: string, token: string): string {
  const nonce = html.match(/<script\b[^>]*nonce="([^"]+)"/u)?.[1];
  assert.ok(nonce, 'Production HTML must supply a nonce; E2E never relaxes CSP');
  return html.replace(/<script\b/u, `<script nonce="${nonce}">${bridgeScript(token)}</script><script`);
}

function bridgeScript(token: string): string {
  return `(() => {
  const token = ${JSON.stringify(token)}, acquire = globalThis.acquireVsCodeApi;
  let api, state;
  const sent = [];
  globalThis.acquireVsCodeApi = () => {
   api = acquire();
   return { getState: () => api.getState(), setState: value => api.setState(value),
    postMessage: message => { sent.push(message); api.postMessage(message); return true; } };
  };
  const reportError = error => { if(api) api.postMessage({type:'__e2e-browser-error',token,error:String(error)}); };
  window.addEventListener('error', event => reportError(event.message));
  window.addEventListener('unhandledrejection', event => reportError(event.reason));
  window.addEventListener('message', event => {
   const message = event.data;
   if (!message) return;
   if (['state', 'init-state', 'update-state'].includes(message.type) && message.state) state = message.state;
   if (message.type === 'update-repository-status' && state
    && message.status.repositoryPath === state.repositoryPath && message.status.sceneLayoutKey === state.sceneLayoutKey) state = {...state,...message.status};
   if (message.type !== '__e2e-control' || message.token !== token || !api) return;
   const start = sent.length;
   try {
    if (message.op === 'send') api.postMessage(message.message);
    let menuItems, viewOptions;
    if (message.op === 'viewOptions') {
     document.getElementById('viewOptionsButton').click();
     viewOptions = Array.from(document.querySelectorAll('#viewOptionsMenu label')).map(label => label.textContent.trim());
    }
    if (message.op === 'toggleViewOption') {
     const control = document.getElementById(message.controlId);
     if (!control) throw Error('Missing View control: ' + message.controlId);
     control.checked = message.checked;
     control.dispatchEvent(new Event('change', {bubbles:true}));
    }
    if (message.op === 'menu' || message.op === 'inspectMenu') {
     const target = document.querySelector(message.selector);
     if (!target) throw Error('Missing DOM target: ' + message.selector);
     target.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true,clientX:30,clientY:30}));
     if (message.op === 'inspectMenu') {
      menuItems = Array.from(document.querySelectorAll('[data-menu-action], [data-menu-key]')).map(button => ({
       action:button.getAttribute('data-menu-action') || button.getAttribute('data-menu-key'), label:button.textContent
      }));
     } else {
      const button = document.querySelector('[data-menu-action="' + message.action + '"], [data-menu-key="' + message.action + '"]');
      if (!button) throw Error('Missing menu action: ' + message.action);
      button.click();
     }
    }
    api.postMessage({type:'__e2e',token,id:message.id,reply:{state,sent:sent.slice(start),menuItems,viewOptions}});
   } catch (error) {
    api.postMessage({type:'__e2e',token,id:message.id,reply:{error:String(error),sent:[]}});
   }
  });
 })();`;
}

export async function command(id: string, ...args: unknown[]): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      vscode.commands.executeCommand(id, ...args),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out executing ${id}`)), 20000);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
