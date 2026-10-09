export default function DecisionNode({ actions, disabled, onDecide }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--steel)]/80">Select the decision outcome. The server resolves the next step.</p>
      <div className="flex flex-wrap gap-2">
        {(actions || []).map((a) => (
          <button
            key={a.value}
            type="button"
            disabled={disabled}
            onClick={() => onDecide(a.value)}
            className={`px-4 py-2 text-sm font-medium border ${
              a.value === 'FAIL' || a.value === 'NO'
                ? 'border-[var(--danger)] text-[var(--danger)]'
                : 'border-[var(--ok)] text-[var(--ok)]'
            } disabled:opacity-50`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
