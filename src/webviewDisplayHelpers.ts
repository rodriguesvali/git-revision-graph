export function renderWebviewDisplayHelpers(): string {
  return `
    function formatWebviewShortDate(value) {
      const text = typeof value === 'string' ? value.trim() : '';
      if (!text) {
        return '';
      }

      const parsed = parseWebviewDisplayDate(text);
      if (!parsed) {
        return text;
      }

      const year = parsed.date.getFullYear();
      const month = String(parsed.date.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    }

    function formatWebviewTooltipDate(value, fallbackText) {
      const text = typeof value === 'string' ? value.trim() : '';
      if (!text) {
        return fallbackText;
      }

      const parsed = parseWebviewDisplayDate(text);
      if (!parsed) {
        return text;
      }

      const absolute = formatWebviewAbsoluteDate(parsed.date, parsed.hasTime);
      if (!parsed.hasTime) {
        return absolute;
      }

      return formatWebviewRelativeDate(parsed.date, new Date()) + ' (' + absolute + ')';
    }

    function parseWebviewDisplayDate(text) {
      const dateOnlyMatch = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(text);
      if (dateOnlyMatch) {
        const date = new Date(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3])
        );
        return Number.isNaN(date.getTime()) ? null : { date, hasTime: false };
      }

      const date = new Date(text);
      return Number.isNaN(date.getTime()) ? null : { date, hasTime: true };
    }

    function formatWebviewAbsoluteDate(date, hasTime) {
      const options = hasTime
        ? { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }
        : { year: 'numeric', month: 'long', day: 'numeric' };
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }

    function formatWebviewRelativeDate(date, now) {
      const diffMs = now.getTime() - date.getTime();
      const absMs = Math.abs(diffMs);
      const minuteMs = 60 * 1000;
      const hourMs = 60 * minuteMs;
      const dayMs = 24 * hourMs;
      const monthMs = 30 * dayMs;
      const yearMs = 365 * dayMs;
      const units = [
        { label: 'year', ms: yearMs },
        { label: 'month', ms: monthMs },
        { label: 'day', ms: dayMs },
        { label: 'hour', ms: hourMs },
        { label: 'minute', ms: minuteMs }
      ];

      for (const unit of units) {
        if (absMs >= unit.ms) {
          const count = Math.max(1, Math.round(absMs / unit.ms));
          return count + ' ' + unit.label + (count === 1 ? '' : 's') + (diffMs >= 0 ? ' ago' : ' from now');
        }
      }

      return diffMs >= 0 ? 'just now' : 'right now';
    }

    function renderCopyHashIconButton(buttonClassName, actionAttributeName, actionName, commitHash) {
      return '<button class="' + escapeHtml(buttonClassName) + '" type="button" title="Copy Hash" aria-label="Copy Hash" ' +
        actionAttributeName + '="' + escapeHtml(actionName) + '" data-commit-hash="' + escapeHtml(commitHash) + '">' +
        renderCopyHashIcon() +
      '</button>';
    }

    function renderCopyHashIcon() {
      return '<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">' +
        '<path d="M5 1.75A1.75 1.75 0 0 1 6.75 0h5.5A1.75 1.75 0 0 1 14 1.75v7.5A1.75 1.75 0 0 1 12.25 11h-5.5A1.75 1.75 0 0 1 5 9.25v-7.5ZM6.75 1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h5.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-5.5ZM2 4.75C2 3.784 2.784 3 3.75 3h.5a.75.75 0 0 1 0 1.5h-.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h5.5a.25.25 0 0 0 .25-.25v-.5a.75.75 0 0 1 1.5 0v.5A1.75 1.75 0 0 1 9.25 14h-5.5A1.75 1.75 0 0 1 2 12.25v-7.5Z"></path>' +
      '</svg>';
    }
  `;
}
