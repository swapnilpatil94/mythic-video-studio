import {useState} from 'react';
import {api, type ProjectFiles, type Story} from '../../api';
import JsonEditor from '../../components/JsonEditor';

function TagList({values, onChange}: {values: string[]; onChange: (next: string[]) => void}) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <div className="row" style={{flexWrap: 'wrap', marginBottom: 6}}>
        {values.map((v, i) => (
          <span key={i} className="badge" style={{cursor: 'pointer'}} onClick={() => onChange(values.filter((_, j) => j !== i))}>{v} ×</span>
        ))}
      </div>
      <div className="row">
        <input type="text" value={draft} placeholder="Add and press Enter" onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { onChange([...values, draft.trim()]); setDraft(''); } }} />
      </div>
    </div>
  );
}

export default function StoryTab({data, projectId, reload}: {data: ProjectFiles; projectId: string; reload: () => void}) {
  const [story, setStory] = useState<Story>(data.story);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string[] | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[] | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      await api.writeFile(projectId, 'story.json', story);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const runImport = async () => {
    setImportError(null);
    setImportWarnings(null);
    try {
      const parsed = JSON.parse(importJson);
      const result = await api.importIntoProject(projectId, parsed);
      setImportWarnings(result.warnings);
      reload();
    } catch (e) {
      const payload = (e as Error & {payload?: {errors?: string[]}}).payload;
      setImportError(payload?.errors ?? [(e as Error).message]);
    }
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="row-between">
          <h3 style={{margin: 0}}>Story package import</h3>
          <button className="btn btn-sm" onClick={() => setShowImport((s) => !s)}>{showImport ? 'Hide' : 'Paste JSON'}</button>
        </div>
        <p className="hint">Paste one JSON (a full manifest, or a project/story/script/manifest/characters/metadata package) to re-split and overwrite this project's six files.</p>
        {showImport ? (
          <div className="stack" style={{marginTop: 10}}>
            <JsonEditor value={importJson} onChange={setImportJson} rows={10} placeholder="Paste story package or manifest JSON here…" />
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={runImport}>Validate &amp; Import into this project</button>
            </div>
            {importError ? <ul className="errors-list">{importError.map((e, i) => <li key={i}>{e}</li>)}</ul> : null}
            {importWarnings?.length ? <ul className="warnings-list">{importWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul> : null}
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3>Story</h3>
        <div className="field">
          <label>Hook</label>
          <textarea rows={2} value={story.hook} onChange={(e) => setStory({...story, hook: e.target.value})} />
        </div>
        <div className="field">
          <label>Summary</label>
          <textarea rows={4} value={story.summary} onChange={(e) => setStory({...story, summary: e.target.value})} />
        </div>
        <div className="field">
          <label>Source notes (canonical vs. interpretation)</label>
          <textarea rows={3} value={story.source_notes} onChange={(e) => setStory({...story, source_notes: e.target.value})} />
        </div>
        <div className="field">
          <label>Continuity notes</label>
          <textarea rows={2} value={story.continuity_notes} onChange={(e) => setStory({...story, continuity_notes: e.target.value})} />
        </div>
        <div className="row">
          <div className="field" style={{flex: 1}}>
            <label>Title candidates</label>
            <TagList values={story.title_candidates} onChange={(v) => setStory({...story, title_candidates: v})} />
          </div>
        </div>
        <div className="row">
          <div className="field" style={{flex: 1}}>
            <label>Locations</label>
            <TagList values={story.locations} onChange={(v) => setStory({...story, locations: v})} />
          </div>
          <div className="field" style={{flex: 1}}>
            <label>Props</label>
            <TagList values={story.props} onChange={(v) => setStory({...story, props: v})} />
          </div>
        </div>
        <div className="field">
          <label>Visual opportunities</label>
          <TagList values={story.visual_opportunities} onChange={(v) => setStory({...story, visual_opportunities: v})} />
        </div>
        <div className="row">
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save story.json'}</button>
        </div>
      </div>
    </div>
  );
}
