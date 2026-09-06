import {useEffect, useState} from 'react';
import {api, type ProjectFiles} from '../../api';
import JsonEditor from '../../components/JsonEditor';
import SafeZoneDiagram from '../../components/SafeZoneDiagram';

export default function VisualsTab({data, projectId, reload}: {data: ProjectFiles; projectId: string; reload: () => void}) {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [platforms, setPlatforms] = useState<Array<Record<string, unknown>>>([]);
  const [manifestJson, setManifestJson] = useState(`${JSON.stringify(data.manifest, null, 2)}\n`);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.formatProfile(data.manifest.duration_seconds).then(setProfile);
    api.platformProfiles().then((all) => setPlatforms(all.filter((p) => (data.project.platform_profiles ?? ['youtube_shorts']).includes(p.id as string))));
  }, [data]);

  const saveManifest = async () => {
    setErrors(null);
    try {
      const parsed = JSON.parse(manifestJson);
      await api.writeManifest(projectId, parsed);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      reload();
    } catch (e) {
      const payload = (e as Error & {payload?: {errors?: string[]}}).payload;
      setErrors(payload?.errors ?? [(e as Error).message]);
    }
  };

  const desc = profile?.description as Record<string, string> | undefined;

  return (
    <div className="stack">
      <div className="card">
        <h3>Format profile ({(profile?.kind as string) ?? '…'})</h3>
        <p className="hint">Read directly from the renderer's own <code>src/remotion/format.ts</code> for this project's duration — not a separate set of numbers, so this always matches what the compositor actually does.</p>
        {desc ? (
          <table className="kv-table">
            <tbody>
              <tr><td>Timing</td><td>{desc.timing}</td></tr>
              <tr><td>Visual density</td><td>{desc.visualDensity}</td></tr>
              <tr><td>Camera intensity</td><td>{desc.cameraIntensity}</td></tr>
              <tr><td>Text frequency</td><td>{desc.textFrequency}</td></tr>
              <tr><td>Reveal frequency</td><td>{desc.revealFrequency}</td></tr>
              <tr><td>Pacing</td><td>{desc.pacing}</td></tr>
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="card">
        <h3>Platform safe zones</h3>
        <p className="hint">Burned-in captions/branding are positioned against these zones (see the Production run's actual render). Configured for: {(data.project.platform_profiles ?? ['youtube_shorts']).join(', ')}.</p>
        <div className="row" style={{flexWrap: 'wrap', gap: 24}}>
          {platforms.map((p) => <SafeZoneDiagram key={p.id as string} profile={p as never} />)}
        </div>
      </div>

      <div className="card">
        <h3>Beats</h3>
        <table className="kv-table">
          <tbody>
            {data.manifest.beats.map((b) => (
              <tr key={b.beat_id}>
                <td>{b.beat_id}</td>
                <td>{b.visual_role} · {b.duration_seconds}s · camera: {b.camera ?? '—'} · refs: {b.asset_refs.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Manifest (advanced — full JSON)</h3>
        <p className="hint">This is exactly <code>projects/{projectId}/manifest.json</code>, the same file the existing pipeline (<code>run.sh</code>) reads. Validated with the pipeline's own validator on save.</p>
        <JsonEditor value={manifestJson} onChange={setManifestJson} rows={18} />
        {errors ? <ul className="errors-list">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul> : null}
        <div className="row" style={{marginTop: 10}}>
          <button className="btn btn-primary" onClick={saveManifest}>{saved ? 'Saved' : 'Save manifest.json'}</button>
        </div>
      </div>
    </div>
  );
}
