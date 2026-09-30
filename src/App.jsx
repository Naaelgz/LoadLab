import { useState } from "react";
import { Activity, CircleAlert } from "lucide-react";

import LoadTestForm from "./components/LoadTestForm";
import ResultsList from "./components/ResultsList";
import ResourceUsage from "./components/ResourceUsage";
import ClearResults from "./components/ClearResults";
import Help from "./Footer/Help";
import Info from "./Footer/info";

function App() {
  const maxRequests = 1000;
  const maxConcurrency = 50;
  const [url, setUrl] = useState("");
  const [numberOfRequests, setNumberOfRequests] = useState(1);
  const [concurrency, setConcurrency] = useState(5);
  const [timeout, setTimeoutValue] = useState(10);
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
  });

  const handleStartTest = async () => {
    setErrorMessage("");
    if (
      !url ||
      !Number.isInteger(numberOfRequests) ||
      numberOfRequests < 1 ||
      numberOfRequests > maxRequests ||
      !Number.isInteger(concurrency) ||
      concurrency < 1 ||
      concurrency > maxConcurrency ||
      timeout < 0.1 ||
      timeout > 30
    ) {
      setErrorMessage("Check the test settings. Values must stay within the displayed limits.");
      return;
    }

    let target;
    try {
      target = new URL(url);
      if (!['http:', 'https:'].includes(target.protocol)) {
        throw new Error('Unsupported protocol');
      }
    } catch {
      setErrorMessage("Enter a valid HTTP or HTTPS target URL.");
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch("/api/load-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: target.href,
          numberOfRequests,
          concurrency,
          timeoutSeconds: timeout,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Load test request failed.");
      }

      setResults(payload.results);
      setStatistics(payload.statistics);
    } catch (error) {
      setErrorMessage(error.message || "Unable to reach the load test backend.");
    } finally {
      setIsRunning(false);
    }
  };


  const clearResults = () => {
    setResults([]);
    setStatistics({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
    });
    setErrorMessage("");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Load Lab home">
          <span className="brand-mark"><Activity size={19} strokeWidth={2.4} /></span>
          <span className="brand-name">load<span>lab</span></span>
        </a>
        <div className="topbar-tools">
          <span className="environment-tag"><span className="environment-dot" /> Test runner</span>
          <Help />
          <Info />
        </div>
      </header>

      <main className="workspace" id="top">
        <section className="page-intro">
          <div>
            <p className="eyebrow">PERFORMANCE WORKSPACE <span> / </span> HTTP</p>
            <h1>Load test</h1>
            <p className="intro-copy">HTTP endpoint performance</p>
          </div>
          <div className={`run-state ${isRunning ? "is-running" : results.length ? "has-results" : "is-idle"}`} aria-live="polite">
            <span className="run-state-dot" />
            {isRunning ? "Run in progress" : results.length ? "Last run complete" : "Ready to run"}
          </div>
        </section>

        <div className="dashboard-grid">
          <aside className="control-panel" aria-labelledby="config-title">
            <div className="panel-heading">
              <div className="panel-index">01</div>
              <div>
                <p className="eyebrow">SETUP</p>
                <h2 id="config-title">Test configuration</h2>
              </div>
            </div>
        <LoadTestForm
          url={url}
          setUrl={setUrl}
          numberOfRequests={numberOfRequests}
          setNumberOfRequests={setNumberOfRequests}
          maxRequests={maxRequests}
          concurrency={concurrency}
          setConcurrency={setConcurrency}
          maxConcurrency={maxConcurrency}
          timeout={timeout}
          setTimeoutValue={setTimeoutValue}
          handleStartTest={handleStartTest}
        />
          </aside>

          <section className="results-panel" aria-labelledby="results-title">
            <div className="results-heading">
              <div className="panel-heading">
                <div className="panel-index panel-index-coral">02</div>
                <div>
                  <p className="eyebrow">OUTPUT</p>
                  <h2 id="results-title">Run results</h2>
                </div>
              </div>
              <ClearResults clearResults={clearResults} disabled={!results.length || isRunning} />
            </div>
            {errorMessage && (
              <div className="error-banner" role="alert">
                <CircleAlert size={17} />
                <span>{errorMessage}</span>
              </div>
            )}
            {isRunning && (
              <div className="progress-banner" role="status">
                <span className="progress-track"><span /></span>
                <span>Sending {numberOfRequests.toLocaleString()} requests, up to {concurrency} at once</span>
              </div>
            )}
            <ResultsList results={results} statistics={statistics} isRunning={isRunning} />
          </section>
        </div>

        <footer className="workspace-footer">
          <span>LOADLAB <span className="footer-divider">/</span> HTTP RUNNER</span>
          <ResourceUsage />
          <span className="footer-limit">MAX {maxRequests.toLocaleString()} REQUESTS <i /> {maxConcurrency} CONCURRENT</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
