import { Info as InfoIcon, X } from "lucide-react";
import { useState } from "react";

function Info() {
  const [showInfo, setShowInfo] = useState(false);

  const toggleInfo = () => {
    setShowInfo((prev) => !prev);
  };

  const closeInfo = () => {
    setShowInfo(false);
  };

  return (
    <div className="modal-control">
      <button
        onClick={toggleInfo}
        className="utility-button"
        title="Info"
        aria-label="Open runner information"
      >
        <InfoIcon size={17} />
      </button>

      {showInfo && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeInfo(); }}>
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">ABOUT THE RUNNER</p>
                <h2 id="info-title">Measurement notes</h2>
              </div>
              <button className="dialog-close" onClick={closeInfo} aria-label="Close information"><X size={18} /></button>
            </div>
            <p className="dialog-copy">Requests are issued by the Node.js server, not by your browser. Latency includes the time for the target response body to complete.</p>
            <div className="info-callout"><strong>Success definition</strong><span>Only HTTP 2xx responses are counted as successful. Redirects are followed and each destination is validated.</span></div>
            <div className="info-callout"><strong>Network metrics</strong><span>Results show per-request latency and status. Server CPU and memory metrics are not currently collected.</span></div>
            <button className="dialog-done" onClick={closeInfo}>Done</button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Info;
