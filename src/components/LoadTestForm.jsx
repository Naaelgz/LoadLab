import { Play, SlidersHorizontal, Timer, Waypoints } from "lucide-react";

function LoadTestForm({
  url,
  setUrl,
  numberOfRequests,
  setNumberOfRequests,
  maxRequests,
  concurrency,
  setConcurrency,
  maxConcurrency,
  timeout,
  setTimeoutValue,
  handleStartTest,
  isRunning,
}) {
  return (
    <form className="config-form" onSubmit={(event) => { event.preventDefault(); handleStartTest(); }}>
      <div className="field-group">
        <label htmlFor="target-url">Target URL</label>
        <input
          id="target-url"
          className="text-input"
          type="url"
          placeholder="https://example.com"
          autoComplete="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </div>
      <div className="field-group">
        <label htmlFor="request-count"><span className="field-label-icon"><SlidersHorizontal size={15} /></span> Request count</label>
        <div className="number-control">
          <input
            id="request-count"
            className="text-input number-input"
            type="number"
            min="1"
            max={maxRequests}
            step="1"
            value={numberOfRequests}
            onChange={(event) => setNumberOfRequests(Number(event.target.value))}
          />
          <span className="input-suffix">/ {maxRequests.toLocaleString()}</span>
        </div>
      </div>
      <div className="field-group">
        <label htmlFor="concurrency"><span className="field-label-icon"><Waypoints size={15} /></span> Concurrency</label>
        <div className="number-control">
          <input
            id="concurrency"
            className="text-input number-input"
            type="number"
            min="1"
            max={maxConcurrency}
            step="1"
            value={concurrency}
            onChange={(event) => setConcurrency(Number(event.target.value))}
          />
          <span className="input-suffix">/ {maxConcurrency}</span>
        </div>
        <div className="preset-control" aria-label="Concurrency presets">
          {[1, 5, 20, maxConcurrency].map((value) => (
            <button
              key={value}
              type="button"
              className={concurrency === value ? "preset-button is-selected" : "preset-button"}
              aria-pressed={concurrency === value}
              onClick={() => setConcurrency(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="field-group">
        <label htmlFor="timeout"><span className="field-label-icon"><Timer size={15} /></span> Timeout</label>
        <div className="number-control">
          <input
            id="timeout"
            className="text-input number-input"
            type="number"
            min="0.1"
            max="30"
            step="0.1"
            value={timeout}
            onChange={(event) => setTimeoutValue(Number(event.target.value))}
          />
          <span className="input-suffix">seconds</span>
        </div>
      </div>
      <button className="run-button" type="submit" disabled={isRunning}>
        {isRunning ? <span className="button-spinner" /> : <Play size={16} fill="currentColor" />}
        {isRunning ? "Test running" : "Start load test"}
      </button>
    </form>
  );
}

export default LoadTestForm;
