import "./CodeReveal.css";

interface CodeRevealProps {
  codes: Array<{ label?: string; value: string | number }>;
  label?: string;
}

export const CodeReveal = ({ codes, label = "Ver código" }: CodeRevealProps) => (
  <details className="code-reveal">
    <summary>{label}</summary>
    <span className="code-reveal__values">
      {codes.map(({ label: codeLabel, value }) => (
        <span key={`${codeLabel ?? "code"}-${value}`}>
          {codeLabel && <small>{codeLabel}</small>}
          <strong>{value}</strong>
        </span>
      ))}
    </span>
  </details>
);
