import { CircleHelp, X } from "lucide-react";
import { useState } from "react";

function Help() {
  const [showHelp, setShowHelp] = useState(false);

  const toggleHelp = () => {
    setShowHelp((prev) => !prev);
  };

  const closeHelp = () => {
    setShowHelp(false);
  };

  return (
    <div className="modal-control">
      <button
        onClick={toggleHelp}
        className="utility-button"
        title="Help"
        aria-label="Open help"
      >
        <CircleHelp size={17} />
      </button>

      {showHelp && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeHelp(); }}>
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">QUICK REFERENCE</p>
                <h2 id="help-title">Run settings</h2>
              </div>
              <button className="dialog-close" onClick={closeHelp} aria-label="Close help"><X size={18} /></button>
            </div>
            <dl className="help-list">
              <div><dt>Target URL</dt><dd>The HTTP or HTTPS endpoint to test. Private and local network addresses are blocked.</dd></div>
              <div><dt>Request count</dt><dd>Total requests sent in one run, up to 1,000.</dd></div>
              <div><dt>Concurrency</dt><dd>Maximum requests running at the same time, up to 50.</dd></div>
              <div><dt>Timeout</dt><dd>Maximum wait per request, between 0.1 and 30 seconds.</dd></div>
              <div><dt>Response log</dt><dd>2xx responses count as successful. Other HTTP statuses and network errors count as failed.</dd></div>
            </dl>
            <button className="dialog-done" onClick={closeHelp}>Done</button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Help;
