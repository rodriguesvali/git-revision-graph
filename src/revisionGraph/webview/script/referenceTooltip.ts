export function renderRevisionGraphScriptReferenceTooltip(): string {
  return `
    let referenceTooltipHideTimer = 0;
    let activeReferenceTooltipHash = '';
    let commitShortStatByHash = new Map();
    let pendingCommitShortStatHashes = new Set();

    function bindReferenceTooltipEvents() {
      if (!referenceTooltip) {
        return;
      }

      referenceTooltip.addEventListener('mouseenter', cancelHideReferenceTooltip);
      referenceTooltip.addEventListener('mouseleave', scheduleHideReferenceTooltip);
      referenceTooltip.addEventListener('focusin', cancelHideReferenceTooltip);
      referenceTooltip.addEventListener('focusout', handleReferenceTooltipFocusOut);
      referenceTooltip.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          hideReferenceTooltip();
        }
      });
      referenceTooltip.addEventListener('click', handleReferenceTooltipActionClick);
    }

    function handleReferenceTooltipActionClick(event) {
      const actionElement = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('[data-reference-tooltip-action]')
        : null;
      const action = actionElement ? actionElement.getAttribute('data-reference-tooltip-action') : '';
      const commitHash = actionElement ? actionElement.getAttribute('data-commit-hash') : '';
      if (!action || !commitHash) {
        return;
      }

      event.preventDefault();
      if (action === 'copy-commit-hash') {
        vscode.postMessage(createRevisionGraphCopyCommitHashMessage(commitHash));
        return;
      }
      if (action === 'open-commit-on-github') {
        vscode.postMessage(createRevisionGraphOpenCommitOnGitHubMessage(commitHash));
      }
    }

    function handleReferenceTooltipReferenceFocusOut(event) {
      scheduleHideReferenceTooltipUnlessFocusRemainsInteractive(event);
    }

    function handleReferenceTooltipFocusOut(event) {
      scheduleHideReferenceTooltipUnlessFocusRemainsInteractive(event);
    }

    function scheduleHideReferenceTooltipUnlessFocusRemainsInteractive(event) {
      if (isReferenceTooltipFocusTarget(event && event.relatedTarget)) {
        return;
      }

      scheduleHideReferenceTooltip();
    }

    function isReferenceTooltipFocusTarget(target) {
      return isElementInside(referenceTooltip, target) || isNodeLayerReferenceTarget(target);
    }

    function isNodeLayerReferenceTarget(target) {
      if (!target || !nodeLayer || typeof target.closest !== 'function') {
        return false;
      }

      const refElement = target.closest('[data-ref-id]');
      return !!refElement && nodeLayer.contains(refElement);
    }

    function isElementInside(container, target) {
      return !!container && !!target && typeof container.contains === 'function' && container.contains(target);
    }

    function clearReferenceTooltipCommitStats() {
      commitShortStatByHash.clear();
      pendingCommitShortStatHashes.clear();
    }

    function showReferenceTooltip(refElement) {
      if (!referenceTooltip || !refElement) {
        return;
      }
      const refId = refElement.getAttribute('data-ref-id');
      const reference = refId ? getReference(refId) : null;
      const node = reference ? sceneNodeByHash.get(reference.hash) : null;
      if (!reference || !node) {
        hideReferenceTooltip();
        return;
      }

      cancelHideReferenceTooltip();
      activeReferenceTooltipHash = node.hash;

      referenceTooltip.innerHTML = renderReferenceTooltip(reference, node);
      referenceTooltip.hidden = false;
      placeReferenceTooltip(refElement);
      requestCommitShortStat(node.hash);
    }

    function renderReferenceTooltip(reference, node) {
      const flowBranch = isFlowGovernanceActive() ? getFlowBranchInfo(reference.name) : null;
      const flowKind = flowBranch ? flowBranch.kind : null;
      const kindLabel = flowKind
        ? (flowKindBadges[flowKind] || flowKind)
        : getReferenceKindLabel(reference.kind);
      const kindClass = flowKind ? ' flow-kind-' + escapeHtml(flowKind) : '';
      const description = reference.description
        ? '<div class="reference-tooltip-description">' + escapeHtml(reference.description) + '</div>'
        : '';

      return ''
        + '<div class="reference-tooltip-header">'
        + '  <span class="reference-tooltip-kind' + kindClass + '">' + escapeHtml(kindLabel) + '</span>'
        + '  <span class="reference-tooltip-name">' + escapeHtml(reference.name) + '</span>'
        + '</div>'
        + description
        + '<div class="reference-tooltip-subject">' + escapeHtml(node.subject || 'Structural commit') + '</div>'
        + '<div class="reference-tooltip-meta">'
        + '  <span>' + escapeHtml(node.author || 'Unknown author') + '</span>'
        + '  <span>' + escapeHtml(formatWebviewTooltipDate(node.date, 'Unknown date')) + '</span>'
        + '</div>'
        + renderReferenceTooltipStatsBlock(
          node.hash,
          commitShortStatByHash.get(node.hash),
          commitShortStatByHash.has(node.hash)
        )
        + '<div class="reference-tooltip-footer">'
        + '  <span class="reference-tooltip-hash">' + escapeHtml(formatShortCommitHash(node.hash)) + '</span>'
        + renderCopyHashIconButton('reference-tooltip-action reference-tooltip-action-icon', 'data-reference-tooltip-action', 'copy-commit-hash', node.hash)
        + '  <button class="reference-tooltip-action" type="button" data-reference-tooltip-action="open-commit-on-github" data-commit-hash="' + escapeHtml(node.hash) + '">Open on GitHub</button>'
        + '</div>';
    }

    function hideReferenceTooltip() {
      cancelHideReferenceTooltip();
      activeReferenceTooltipHash = '';
      if (referenceTooltip) {
        referenceTooltip.hidden = true;
      }
    }

    function scheduleHideReferenceTooltip() {
      cancelHideReferenceTooltip();
      referenceTooltipHideTimer = window.setTimeout(hideReferenceTooltip, 180);
    }

    function cancelHideReferenceTooltip() {
      if (referenceTooltipHideTimer) {
        window.clearTimeout(referenceTooltipHideTimer);
        referenceTooltipHideTimer = 0;
      }
    }

    function requestCommitShortStat(commitHash) {
      if (!commitHash || commitShortStatByHash.has(commitHash) || pendingCommitShortStatHashes.has(commitHash)) {
        return;
      }
      pendingCommitShortStatHashes.add(commitHash);
      vscode.postMessage(createRevisionGraphLoadCommitShortStatMessage(commitHash));
    }

    function setCommitShortStat(commitHash, shortStat) {
      if (!commitHash) {
        return;
      }
      pendingCommitShortStatHashes.delete(commitHash);
      commitShortStatByHash.set(commitHash, shortStat || null);
      if (activeReferenceTooltipHash !== commitHash || !referenceTooltip || referenceTooltip.hidden) {
        return;
      }
      const statsElement = referenceTooltip.querySelector('[data-reference-tooltip-stats]');
      if (statsElement) {
        statsElement.innerHTML = renderReferenceTooltipStats(shortStat, true);
        statsElement.hidden = !shortStat;
      }
    }

    function renderReferenceTooltipStats(shortStat, isLoaded) {
      if (!isLoaded) {
        return '<span class="reference-tooltip-muted">Loading changes...</span>';
      }
      if (!shortStat || !Number.isFinite(shortStat.files) || shortStat.files <= 0) {
        return '';
      }
      const fileLabel = shortStat.files === 1 ? 'file changed' : 'files changed';
      const parts = [shortStat.files + ' ' + fileLabel];
      if (shortStat.insertions > 0) {
        parts.push('<span class="reference-tooltip-insertions">' + shortStat.insertions + ' insertion(+)</span>');
      }
      if (shortStat.deletions > 0) {
        parts.push('<span class="reference-tooltip-deletions">' + shortStat.deletions + ' deletion(-)</span>');
      }
      return parts.join(', ');
    }

    function renderReferenceTooltipStatsBlock(commitHash, shortStat, isLoaded) {
      const hidden = isLoaded && !shortStat ? ' hidden' : '';
      return '<div class="reference-tooltip-stats" data-reference-tooltip-stats="' + escapeHtml(commitHash) + '"' + hidden + '>' +
        renderReferenceTooltipStats(shortStat, isLoaded) +
      '</div>';
    }

    function placeReferenceTooltip(refElement) {
      const margin = 12;
      const gap = 10;
      const anchor = refElement.getBoundingClientRect();
      const tooltipRect = referenceTooltip.getBoundingClientRect();
      let left = anchor.right + gap;
      if (left + tooltipRect.width > window.innerWidth - margin) {
        left = anchor.left - tooltipRect.width - gap;
      }
      const top = Math.max(margin, Math.min(anchor.top - 4, window.innerHeight - tooltipRect.height - margin));
      referenceTooltip.style.left = Math.max(margin, left) + 'px';
      referenceTooltip.style.top = top + 'px';
    }

    function getReferenceKindLabel(kind) {
      const labels = { head: 'head', branch: 'branch', remote: 'remote', tag: 'tag', stash: 'stash' };
      return labels[kind] || kind;
    }
  `;
}
