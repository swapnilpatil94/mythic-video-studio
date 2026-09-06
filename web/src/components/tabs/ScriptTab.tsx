import {useState} from 'react';
import {api, type ProjectFiles, type Script} from '../../api';

export default function ScriptTab({data, projectId}: {data: ProjectFiles; projectId: string; reload: () => void}) {
  const [script, setScript] = useState<Script>(data.script.beats.length ? data.script : {
    full_narration: data.manifest.beats.map((b) => b.narration).filter(Boolean).join(' '),
    beats: data.manifest.beats.map((b) => ({id: b.beat_id, narration: b.narration ?? '', emotion: '', pace: '', duration_seconds: b.duration_seconds})),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateBeat = (id: string, patch: Partial<Script['beats'][number]>) => {
    setScript({...script, beats: script.beats.map((b) => b.id === id ? {...b, ...patch} : b)});
  };

  const save = async () => {
    setSaving(true);
    try {
      const full_narration = script.beats.map((b) => b.narration).filter(Boolean).join(' ');
      const next = {...script, full_narration};
      await api.writeFile(projectId, 'script.json', next);
      setScript(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const words = script.full_narration.trim() ? script.full_narration.trim().split(/\s+/).length : 0;
  const totalSeconds = script.beats.reduce((n, b) => n + (b.duration_seconds || 0), 0);

  return (
    <div className="stack">
      <div className="card">
        <div className="row-between">
          <h3 style={{margin: 0}}>Narration beats</h3>
          <span className="hint">{words} words · {totalSeconds.toFixed(1)}s total</span>
        </div>
        <div className="field">
          <label>Target WPM</label>
          <input type="number" value={script.target_wpm ?? ''} placeholder="e.g. 150"
            onChange={(e) => setScript({...script, target_wpm: e.target.value ? Number(e.target.value) : undefined})} style={{maxWidth: 160}} />
        </div>
        <p className="hint">Each row's <code>id</code> is matched to the manifest's beats (via <code>visual_manifest</code> on import) — duration here is the approximate timing that drives the beat's length in the manifest.</p>
        {script.beats.map((b) => (
          <div key={b.id} className="card" style={{marginTop: 10, background: 'var(--cream)'}}>
            <div className="row-between" style={{marginBottom: 6}}>
              <strong>{b.id}</strong>
            </div>
            <div className="row">
              <div className="field" style={{flex: 1}}>
                <label>Emotion</label>
                <input type="text" value={b.emotion} onChange={(e) => updateBeat(b.id, {emotion: e.target.value})} />
              </div>
              <div className="field" style={{flex: 1}}>
                <label>Pace</label>
                <input type="text" value={b.pace} placeholder="slow / medium / fast" onChange={(e) => updateBeat(b.id, {pace: e.target.value})} />
              </div>
              <div className="field" style={{width: 140}}>
                <label>Duration (s)</label>
                <input type="number" value={b.duration_seconds} onChange={(e) => updateBeat(b.id, {duration_seconds: Number(e.target.value)})} />
              </div>
            </div>
            <div className="field">
              <label>Narration (spoken Hindi)</label>
              <textarea rows={2} value={b.narration} onChange={(e) => updateBeat(b.id, {narration: e.target.value})} />
            </div>
          </div>
        ))}
        <div className="row" style={{marginTop: 14}}>
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save script.json'}</button>
        </div>
      </div>
    </div>
  );
}
