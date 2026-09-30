import { Activity, Check, CircleAlert, Clock3, Gauge } from "lucide-react";

function ResultsList({ results, statistics }) {
  const hasResults = results.length > 0;
  const metrics = [
    {
      label: "Total requests",
      value: hasResults ? statistics.totalRequests.toLocaleString() : "—",
      detail: hasResults ? "completed" : "no run yet",
      icon: <Activity size={17} />,
      tone: "metric-ink",
    },
    {
      label: "Successful",
      value: hasResults ? statistics.successfulRequests.toLocaleString() : "—",
      detail: hasResults ? `${Math.round((statistics.successfulRequests / statistics.totalRequests) * 100)}% success` : "2xx responses",
      icon: <Check size={17} />,
      tone: "metric-green",
    },
    {
      label: "Failed",
      value: hasResults ? statistics.failedRequests.toLocaleString() : "—",
      detail: hasResults ? "non-2xx or error" : "non-2xx or error",
      icon: <CircleAlert size={17} />,
      tone: "metric-coral",
    },
    {
      label: "Avg. latency",
      value: hasResults ? `${statistics.averageResponseTime.toFixed(1)} ms` : "—",
      detail: "per request",
      icon: <Gauge size={17} />,
      tone: "metric-blue",
    },
  ];

  return (
    <div className="results-content">
      <div className="metric-grid">
        {metrics.map((metric) => (
          <article className={`metric-card ${metric.tone}`} key={metric.label}>
            <div className="metric-topline">
              <span>{metric.label}</span>
              <span className="metric-icon">{metric.icon}</span>
            </div>
            <strong className="metric-value">{metric.value}</strong>
            <span className="metric-detail">{metric.detail}</span>
          </article>
        ))}
      </div>

      <div className="request-list-heading">
        <div>
          <h3>Request log</h3>
          <span>{hasResults ? `${results.length.toLocaleString()} responses` : "Individual response timings"}</span>
        </div>
        {hasResults && <span className="log-count">{results.length.toLocaleString()} ROWS</span>}
      </div>

      {hasResults ? (
        <div className="table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th scope="col">Request</th>
                <th scope="col">Status</th>
                <th scope="col">Response</th>
                <th scope="col" className="align-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const isSuccess = Number(result.statusCode) >= 200 && Number(result.statusCode) < 300;
                return (
                  <tr key={result.requestNumber}>
                    <td className="request-number">#{String(result.requestNumber).padStart(3, "0")}</td>
                    <td>
                      <span className={`status-pill ${isSuccess ? "status-success" : "status-failed"}`}>
                        <span />{result.statusCode}
                      </span>
                    </td>
                    <td className="reason-cell" title={result.reasonPhrase}>{result.reasonPhrase}</td>
                    <td className="latency-cell align-right">{result.responseTime.toFixed(2)} <span>ms</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state" aria-live="polite">
          <div className="empty-visual"><Clock3 size={22} /></div>
          <p className="empty-title">No test results</p>
        </div>
      )}
    </div>
  );
}

export default ResultsList;
