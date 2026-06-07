import { color, radius } from "@/design/tokens";
import { btnSecondary } from "./config-styles";

type Props = {
  apiUrl: string;
  jsonPath: string;
  statTesting: boolean;
  statTestResult: string | null;
  onTest: () => void;
  testLabel: string;
  testingLabel: string;
  helpText: string;
};

export function StatConfig({ apiUrl, statTesting, statTestResult, onTest, testLabel, testingLabel, helpText }: Props) {
  return (
    <div style={{ padding: 10, background: color.surface2, borderRadius: radius.inner, border: `1px solid ${color.hairline}` }}>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onTest}
          disabled={statTesting || !apiUrl}
          style={{ ...btnSecondary, opacity: statTesting ? 0.6 : 1 }}
        >
          {statTesting ? testingLabel : testLabel}
        </button>
        {statTestResult !== null && (
          <span style={{ fontSize: 12, color: statTestResult.startsWith("Failed") || statTestResult.startsWith("Error") ? color.neg : color.pos }}>
            {statTestResult.length > 40 ? statTestResult.slice(0, 40) + "..." : statTestResult}
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: color.textMuted }}>{helpText}</div>
    </div>
  );
}
