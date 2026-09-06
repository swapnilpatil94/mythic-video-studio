import {useState} from 'react';

export default function JsonEditor({
  value, onChange, placeholder, rows = 16,
}: {value: string; onChange: (next: string) => void; placeholder?: string; rows?: number}) {
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const validate = () => {
    try {
      JSON.parse(value);
      setParseError(null);
      return true;
    } catch (e) {
      setParseError((e as Error).message);
      return false;
    }
  };

  const format = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(`${JSON.stringify(parsed, null, 2)}\n`);
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="stack" style={{gap: 8}}>
      <div className="row">
        <button className="btn btn-sm" onClick={validate}>Validate JSON</button>
        <button className="btn btn-sm" onClick={format}>Format</button>
        <button className="btn btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy JSON'}</button>
      </div>
      <textarea
        className={`json-editor ${parseError ? 'error' : ''}`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => { onChange(e.target.value); if (parseError) setParseError(null); }}
      />
      {parseError ? <div className="errors-list"><li>{parseError}</li></div> : null}
    </div>
  );
}
