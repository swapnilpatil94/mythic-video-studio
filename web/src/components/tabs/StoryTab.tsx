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
        <p className="hint">
          Paste one story-package JSON (see <code>prompts/story-package.md</code> / <code>schemas/story-package.schema.json</code> —
          project/story/script/characters/environments/props/visual_manifest/audio/metadata/sources) or a flat manifest,
          to re-split and overwrite this project's six files.
        </p>
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
          <label>Title</label>
          <input type="text" value={story.title} onChange={(e) => setStory({...story, title: e.target.value})} />
        </div>
        <div className="field">
          <label>Hook</label>
          <textarea rows={2} value={story.hook} onChange={(e) => setStory({...story, hook: e.target.value})} />
        </div>
        <div className="field">
          <label>Premise</label>
          <textarea rows={3} value={story.premise} onChange={(e) => setStory({...story, premise: e.target.value})} />
        </div>
        <div className="row">
          <div className="field" style={{flex: 1}}>
            <label>Conflict</label>
            <textarea rows={2} value={story.conflict} onChange={(e) => setStory({...story, conflict: e.target.value})} />
          </div>
          <div className="field" style={{flex: 1}}>
            <label>Reveal</label>
            <textarea rows={2} value={story.reveal} onChange={(e) => setStory({...story, reveal: e.target.value})} />
          </div>
        </div>
        <div className="row">
          <div className="field" style={{flex: 1}}>
            <label>Climax</label>
            <textarea rows={2} value={story.climax} onChange={(e) => setStory({...story, climax: e.target.value})} />
          </div>
          <div className="field" style={{flex: 1}}>
            <label>Payoff</label>
            <textarea rows={2} value={story.payoff} onChange={(e) => setStory({...story, payoff: e.target.value})} />
          </div>
        </div>
        <div className="field">
          <label>Emotional core</label>
          <input type="text" value={story.emotional_core} onChange={(e) => setStory({...story, emotional_core: e.target.value})} />
        </div>
        <div className="field">
          <label>Story arc</label>
          <textarea rows={2} value={story.story_arc} onChange={(e) => setStory({...story, story_arc: e.target.value})} />
        </div>
        <div className="row">
          <div className="field" style={{flex: 1}}>
            <label>Established facts</label>
            <TagList values={story.facts} onChange={(v) => setStory({...story, facts: v})} />
          </div>
          <div className="field" style={{flex: 1}}>
            <label>Interpretations / tradition</label>
            <TagList values={story.interpretations} onChange={(v) => setStory({...story, interpretations: v})} />
          </div>
        </div>
        <div className="row">
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save story.json'}</button>
        </div>
      </div>

      <div className="card">
        <h3>Sources</h3>
        <p className="hint">Reliable references, each marked as a fact your source directly supports vs. a traditional interpretation — the mythology rule: never invent canon.</p>
        {story.sources.map((s, i) => (
          <div key={i} className="row" style={{marginBottom: 8, alignItems: 'flex-start'}}>
            <input type="text" style={{flex: 2}} value={s.source} placeholder="Source"
              onChange={(e) => setStory({...story, sources: story.sources.map((x, j) => j === i ? {...x, source: e.target.value} : x)})} />
            <input type="text" style={{flex: 2}} value={s.claim_supported} placeholder="Claim supported"
              onChange={(e) => setStory({...story, sources: story.sources.map((x, j) => j === i ? {...x, claim_supported: e.target.value} : x)})} />
            <select style={{flex: 1}} value={s.fact_or_interpretation}
              onChange={(e) => setStory({...story, sources: story.sources.map((x, j) => j === i ? {...x, fact_or_interpretation: e.target.value as 'fact' | 'interpretation'} : x)})}>
              <option value="fact">fact</option>
              <option value="interpretation">interpretation</option>
            </select>
            <button className="btn btn-sm btn-danger" onClick={() => setStory({...story, sources: story.sources.filter((_, j) => j !== i)})}>Remove</button>
          </div>
        ))}
        <button className="btn btn-sm" onClick={() => setStory({...story, sources: [...story.sources, {source: '', claim_supported: '', fact_or_interpretation: 'fact'}]})}>+ Add source</button>
        <div className="row" style={{marginTop: 10}}>
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save story.json'}</button>
        </div>
      </div>
    </div>
  );
}
