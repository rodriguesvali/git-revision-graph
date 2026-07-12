interface RevisionGraphWebviewViewportScrollTarget {
  scrollLeft: number;
  scrollTop: number;
  scrollTo?: (options: { left: number; top: number; behavior: 'auto' }) => void;
}

function scrollRevisionGraphWebviewViewportTo(
  viewport: RevisionGraphWebviewViewportScrollTarget,
  scrollLeft: number,
  scrollTop: number,
  threshold = 0.5
): boolean {
  const shouldScroll = shouldScrollRevisionGraphWebviewViewport(viewport, scrollLeft, scrollTop, threshold);
  if (!shouldScroll) {
    return false;
  }
  if (typeof viewport.scrollTo === 'function') {
    viewport.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'auto' });
  } else {
    viewport.scrollLeft = scrollLeft;
    viewport.scrollTop = scrollTop;
  }
  return true;
}

function shouldScrollRevisionGraphWebviewViewport(
  viewport: RevisionGraphWebviewViewportScrollTarget,
  scrollLeft: number,
  scrollTop: number,
  threshold = 0.5
): boolean {
  return Math.abs(viewport.scrollLeft - scrollLeft) > threshold ||
    Math.abs(viewport.scrollTop - scrollTop) > threshold;
}
