/** Keyboard focus lifecycle shared by the Flow forms. */
function createRevisionGraphFlowDialogFocus(close: () => void) {
  let previous: HTMLElement | null = null;
  let form: HTMLElement | undefined;
  function discard(): void { previous = null; form = undefined; }
  function focus(): void { form?.focus(); }
  return {
    capture(): void {
      if (!form) previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    open(backdrop: HTMLElement, initial: HTMLElement): void {
      form = backdrop.children[0] as HTMLElement;
      form.tabIndex = -1;
      initial.focus();
    },
    close(): void {
      if (!form) return;
      const target = previous;
      discard();
      const fallback = document.getElementById('viewOptionsButton');
      if (target && isRevisionGraphFlowFocusAvailable(target)) target.focus();
      else if (fallback && isRevisionGraphFlowFocusAvailable(fallback)) fallback.focus();
    },
    keydown(event: KeyboardEvent): void {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab' || !form) return;
      const controls = Array.from(form.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]'))
        .filter((element) => element.tabIndex >= 0 && isRevisionGraphFlowFocusAvailable(element));
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (controls.length === 0) { event.preventDefault(); focus(); return; }
      if (index < 0 || (event.shiftKey ? index === 0 : index === controls.length - 1)) {
        event.preventDefault();
        controls[event.shiftKey ? controls.length - 1 : 0].focus();
      }
    },
    focus,
    discard
  };
}

function isRevisionGraphFlowFocusAvailable(element: HTMLElement): boolean {
  return element.isConnected && !element.matches(':disabled') && element.getClientRects().length > 0;
}
