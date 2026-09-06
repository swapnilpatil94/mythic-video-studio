import {useState} from 'react';
import {api, type ProjectFiles, type Script} from '../../api';

export default function ScriptTab({data, projectId}: {data: ProjectFiles; projectId: string; reload: () => void}) {
  const [script, setScript] = useState<Script>(data.script.narration_beats.length ? data.script : {
    narration_beats: data.manifest.beats.map((b) => ({beat_id: b.beat_id, text: b.text ?? '', narration: b.narration ?? ''})),
    full_narration: data.manifest.beats.map((b) => b.narration).filter(Boolean).join(' '),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateBeat = (beatId: string, field: 'text' | 'narration', value: string) => {
    setScript({
      ...script,
      narration_beats: script.narration_beats.map((b) => b.beat_id === beatId ? {...b, [field]: value} : b),
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const full_narration = script.narration_beats.map((b) => b.narration).filter(Boolean).join(' ');
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

  return (
    <div className="stack">
      <div className="card">
        <div className="row-between">
          <h3 style={{margin: 0}}>Narration beats</h3>
          <span className="hint">{words} words total</span>
        </div>
        <p className="hint">Each row's <code>beat_id</code> is matched to the manifest's beats — edit narration here, or edit beat timing/camera/visual_role in the Visuals tab's manifest editor.</p>
        {script.narration_beats.map((b) => (
          <div key={b.beat_id} className="card" style={{marginTop: 10, background: 'var(--cream)'}}>
            <div className="row-between" style={{marginBottom: 6}}>
              <strong>{b.beat_id}</strong>
            </div>
            <div className="field">
              <label>On-screen text (short)</label>
              <input type="text" value={b.text} onChange={(e) => updateBeat(b.beat_id, 'text', e.target.value)} />
            </div>
            <div className="field">
              <label>Narration (spoken)</label>
              <textarea rows={2} value={b.narration} onChange={(e) => updateBeat(b.beat_id, 'narration', e.target.value)} />
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
