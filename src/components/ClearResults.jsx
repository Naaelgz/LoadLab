import { Trash2 } from "lucide-react";

function ClearResults({ clearResults, disabled }) {
  return (
    <button
      className="clear-button"
      type="button"
      onClick={clearResults}
      disabled={disabled}
    >
      <Trash2 size={15} />
      Clear results
    </button>
  );
}

export default ClearResults;
