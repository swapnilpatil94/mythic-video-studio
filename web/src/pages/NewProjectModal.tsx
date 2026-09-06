import {useState} from 'react';
import {api} from '../api';
import JsonEditor from '../components/JsonEditor';

const SAMPLE_PACKAGE = `{
  "project_id": "your-story-id",
  "title": "Story title",
  "language": "hi-IN",
  "duration_seconds": 77,
  "characters": ["character_id"],
  "beats": [
    {"beat_id": "B01", "duration_seconds": 15, "visual_role": "hook", "asset_refs": ["character_id.master"], "camera": "push_in", "text": "...", "narration": "..."},
    {"beat_id": "B02", "duration_seconds": 15, "visual_role": "stakes", "asset_refs": ["character_id.master"], "camera": "tilt_up", "text": "...", "narration": "..."},
    {"beat_id": "B03", "duration_seconds": 15, "visual_role": "threat", "asset_refs": ["character_id.master"], "camera": "pan", "text": "...", "narration": "..."},
    {"beat_id": "B04", "duration_seconds": 16, "visual_role": "decision", "asset_refs": ["character_id.master"], "camera": "shot_reverse", "text": "...", "narration": "..."},
    {"beat_id": "B05", "duration_seconds": 16, "visual_role": "payoff", "asset_refs": ["character_id.master"], "camera": "slow_push", "text": "...", "narration": "..."}
  ]
}`;

export default function NewProjectModal({onClose, onCreated}: {onClose: () => void; onCreated: (id: string) => void}) {
  const [mode, setMode] = useState<'blank' | 'import'>('blank');

  // Blank project form state
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'SHORT' | 'LONGFORM'>('SHORT');
  const [language, setLanguage] = useState('hi-IN');
  const [duration, setDuration] = useState(77);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Import flow state
  const [json, setJson] = useState(SAMPLE_PACKAGE);
  const [importName, setImportName] = useState('');
  const [validation, setValidation] = useState<{ok: boolean; errors?: string[]; warnings?: string[]; fileErrors?: Record<string, string[]>} | null>(null);

  const createBlank = async () => {
    setError(null);
    if (!name.trim()) { setError('Project name is required.'); return; }
    setBusy(true);
    try {
      const files = await api.createProject({name, format, language, target_duration_seconds: duration});
      onCreated(files.project.project_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runValidate = async () => {
    setError(null);
    try {
      const parsed = JSON.parse(json);
      const result = await api.validateStoryPackage(parsed);
      setValidation(result);
    } catch (e) {
      setValidation({ok: false, errors: [(e as Error).message]});
    }
  };

  const createFromImport = async () => {
    setError(null);
    setBusy(true);
    try {
      const parsed = JSON.parse(json);
      const result = await api.importNewProject(parsed, importName || undefined);
      onCreated(result.files.project.project_id);
    } catch (e) {
      const payload = (e as Error & {payload?: {errors?: string[]}}).payload;
      setError(payload?.errors?.join(' • ') || (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{width: mode === 'import' ? 700 : 480}} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{marginBottom: 14}}>
          <h2 style={{margin: 0}}>New Project</h2>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>

        <div className="tabs" style={{marginBottom: 16}}>
          <button className={`tab ${mode === 'blank' ? 'active' : ''}`} onClick={() => setMode('blank')}>Blank project</button>
          <button className={`tab ${mode === 'import' ? 'active' : ''}`} onClick={() => setMode('import')}>Import story package</button>
        </div>

        {mode === 'blank' ? (
          <div className="stack">
            <div className="field">
              <label>Project name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Karna's Kavacha" />
            </div>
            <div className="row">
              <div className="field" style={{flex: 1}}>
                <label>Format</label>
                <select value={format} onChange={(e) => setFormat(e.target.value as 'SHORT' | 'LONGFORM')}>
                  <option value="SHORT">SHORT (45-120s)</option>
                  <option value="LONGFORM">LONGFORM (2-20min)</option>
                </select>
              </div>
              <div className="field" style={{flex: 1}}>
                <label>Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="hi-IN">Hindi (hi-IN)</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Target duration (seconds)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={45} max={1200} />
              <p className="hint">A starter 5-beat manifest is generated automatically and already passes pipeline validation — edit it in the Story/Script/Visuals tabs.</p>
            </div>
            {error ? <div className="errors-list"><li>{error}</li></div> : null}
            <div className="row" style={{justifyContent: 'flex-end'}}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={busy} onClick={createBlank}>{busy ? 'Creating…' : 'Create Project'}</button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <p className="hint">
              Paste either a full manifest (project_id/title/duration_seconds/beats — the same shape <code>examples/*.json</code> uses)
              or a package with <code>project/story/script/manifest/characters/metadata</code> sections. Missing sections are
              auto-derived from the manifest's beats where possible.
            </p>
            <div className="field">
              <label>Project name (optional — falls back to the pasted title)</label>
              <input type="text" value={importName} onChange={(e) => setImportName(e.target.value)} />
            </div>
            <JsonEditor value={json} onChange={setJson} rows={14} />
            <div className="row">
              <button className="btn" onClick={runValidate}>Validate</button>
            </div>
            {validation ? (
              validation.ok ? (
                <div className="card" style={{borderColor: '#7fbb85'}}>
                  Valid — ready to import.
                  {validation.warnings?.length ? <ul className="warnings-list">{validation.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul> : null}
                </div>
              ) : (
                <div className="card" style={{borderColor: 'var(--red)'}}>
                  <strong>Validation failed</strong>
                  <ul className="errors-list">
                    {(validation.errors ?? []).map((e, i) => <li key={i}>{e}</li>)}
                    {Object.entries(validation.fileErrors ?? {}).flatMap(([file, errs]) => errs.map((e, i) => <li key={`${file}-${i}`}>{file}: {e}</li>))}
                  </ul>
                </div>
              )
            ) : null}
            {error ? <div className="errors-list"><li>{error}</li></div> : null}
            <div className="row" style={{justifyContent: 'flex-end'}}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={busy} onClick={createFromImport}>{busy ? 'Importing…' : 'Import & Create Project'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
