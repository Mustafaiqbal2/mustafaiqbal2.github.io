export function CommandConsole() {
  return (
    <div className="console" data-console hidden>
      <div className="console-backdrop" data-console-close aria-hidden="true" />
      <div
        className="console-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Command console"
        data-console-panel
      >
        <div className="console-grip" data-console-grip aria-hidden="true">
          <span />
        </div>
        <div className="console-input-row">
          <span className="console-carat" aria-hidden="true">
            &rsaquo;
          </span>
          <input
            className="console-input"
            data-console-input
            type="text"
            placeholder="Run a system, jump to a page, or copy my email…"
            aria-label="Command console. Type to filter, arrow keys to navigate, enter to run."
            aria-controls="console-results"
            role="combobox"
            aria-expanded="true"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <kbd className="console-esc" aria-hidden="true">
            esc
          </kbd>
        </div>
        <ul className="console-results" id="console-results" data-console-results role="listbox" aria-label="Commands" />
        <p className="console-empty" data-console-empty hidden>
          No matches. Try &ldquo;work&rdquo;, &ldquo;resume&rdquo;, or a project name.
        </p>
        <div className="console-hint">
          <span aria-hidden="true">
            <kbd>&uarr;</kbd>
            <kbd>&darr;</kbd> navigate
          </span>
          <span aria-hidden="true">
            <kbd>&crarr;</kbd> run
          </span>
          <span aria-hidden="true">
            <kbd>esc</kbd> close
          </span>
          <span className="console-hint-count" data-console-count role="status" />
        </div>
      </div>
    </div>
  );
}
