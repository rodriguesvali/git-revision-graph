import type { Repository } from '../git';

export interface RevisionFilePickerServices {
  loadFiles(root: string, commit: string, signal: AbortSignal): Promise<string[]>;
  pickFile(files: Promise<string[]>, commit: string, signal: AbortSignal): Promise<string | undefined>;
  openFile(repository: Repository, file: string, commit: string, isCurrent: () => boolean): Promise<void>;
}

export class RevisionFilePicker {
  private active: AbortController | undefined;

  constructor(private readonly services?: RevisionFilePickerServices) {}

  cancel(): void {
    this.active?.abort();
    this.active = undefined;
  }

  async open(repository: Repository, commit: string, isCurrent: () => boolean): Promise<void> {
    this.cancel();
    const request = new AbortController();
    this.active = request;
    const current = () => this.active === request && !request.signal.aborted && isCurrent();
    try {
      const services = this.services ?? await import('../workbenchRevisionFilePicker');
      if (!current()) return;
      const files = services.loadFiles(repository.rootUri.fsPath, commit, request.signal);
      const selected = await services.pickFile(files, commit, request.signal);
      if (!selected || !current()) return;
      if (!(await files).includes(selected)) throw new Error('The chosen file is not in the selected revision.');
      if (current()) await services.openFile(repository, selected, commit, current);
    } catch (error) {
      if (current()) throw error;
    } finally {
      if (this.active === request) this.active = undefined;
      request.abort();
    }
  }
}
