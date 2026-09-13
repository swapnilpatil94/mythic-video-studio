import {useEffect, useRef, useState} from 'react';
import {api, type ProjectFiles} from '../../api';

const GATES: Array<{key: string; label: string; hint: string}> = [
  {key: 'REQUIRE_GENERATED_ASSETS', label: 'Require generated assets', hint: 'Fail if master assets are missing (needs a configured FLUX adapter)'},
  {key: 'REQUIRE_ASSET_REQUIREMENTS', label: 'Require asset requirements', hint: 'Enforce every beat\'s asset_refs resolve'},
  {key: 'REQUIRE_TTS', label: 'Require TTS', hint: 'Fail if narration audio is missing (needs the selected voice engine\'s adapter configured)'},
  {key: 'REQUIRE_AUDIO_MIX', label: 'Require audio mix', hint: 'Fail if final-mix.wav is missing'},
  {key: 'REQUIRE_OUTPUT_QA', label: 'Require output QA', hint: 'Fail on resolution/fps/duration/black-frame/clipping/trailing-silence issues'},
  {key: 'REQUIRE_RELEASE_EVIDENCE', label: 'Require release evidence', hint: 'Fail if the full evidence bundle is incomplete'},
];

const VOICE_ENGINES: Array<{id: 'chatterbox' | 'vibevoice'; label: string; hint: string}> = [
  {id: 'chatterbox', label: 'Chatterbox', hint: 'Voice cloning, the proven default'},
  {id: 'vibevoice', label: 'VibeVoice Hindi 7B', hint: 'Long-form, heavier — GPU-recommended (24GB VRAM, or Apple Silicon via MPS)'},
];

export default function ProductionTab({data, projectId, reload}: {data: ProjectFiles; projectId: string; reload: () => void}) {
  const [gates, setGates] = useState<Record<string, boolean>>(Object.fromEntries(GATES.map((g) => [g.key, false])));
  const [runState, setRunState] = useState<Record<string, unknown> | null>(null);
  const [log, setLog] = useState('');
  const [preflight, setPreflight] = useState<Record<string, unknown> | null>(null);
  const [preflightBusy, setPreflightBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const pollRef = useRef<number | null>(null);
  const voiceProvider = data.project.voice_provider ?? 'chatterbox';

  const setVoiceProvider = async (id: 'chatterbox' | 'vibevoice') => {
    if (id === voiceProvider || voiceBusy) return;
    setVoiceBusy(true);
    try {
      await api.writeFile(projectId, 'project.json', {...data.project, voice_provider: id});
      reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setVoiceBusy(false);
    }
  };

  const refreshRun = async () => {
    const state = await api.getRun(projectId);
    setRunState(state);
    const text = await api.getRunLog(projectId);
    setLog(text);
    return state;
  };

  useEffect(() => {
    refreshRun();
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (runState?.status === 'running' && !pollRef.current) {
      pollRef.current = window.setInterval(async () => {
        const state = await refreshRun();
        if (state.status !== 'running' && pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runState?.status]);

  const runPreflight = async () => {
    setPreflightBusy(true);
    try {
      const result = await api.preflight(projectId);
      setPreflight(result.report as Record<string, unknown> ?? {exitCode: result.exitCode, stdout: result.stdout});
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPreflightBusy(false);
    }
  };

  const runPipeline = async () => {
    const state = await api.startRun(projectId, gates);
    setRunState(state as Record<string, unknown>);
    if (!pollRef.current) {
      pollRef.current = window.setInterval(async () => {
        const s = await refreshRun();
        if (s.status !== 'running' && pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 1500);
    }
  };

  const status = (runState?.status as string) ?? 'idle';
  const outputPath = `projects/${projectId}/renders/${projectId}.mp4`;

  return (
    <div className="stack">
      <div className="card">
        <h3>Voice Engine</h3>
        <p className="hint">Which local Hindi TTS engine generates narration for this project. Flows straight into <code>manifest.json</code>'s <code>audio.provider</code> — the same field <code>generate-voice.ts</code> reads, so this is exactly what "Run Pipeline" below will actually use.</p>
        <div className="stack" style={{gap: 4}}>
          {VOICE_ENGINES.map((engine) => (
            <label key={engine.id} className="checkbox-row" style={{textTransform: 'none', fontWeight: 400}}>
              <input type="radio" name="voice-engine-production" checked={voiceProvider === engine.id} disabled={voiceBusy} onChange={() => setVoiceProvider(engine.id)} />
              <span><strong>{engine.label}</strong> — {engine.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Preflight (existing src/preflight.ts)</h3>
        <p className="hint">Checks node/ffmpeg/ffprobe and the configured image/TTS adapter commands — the same check the strict pipeline runs before producing.</p>
        <button className="btn" disabled={preflightBusy} onClick={runPreflight}>{preflightBusy ? 'Checking…' : 'Run Preflight'}</button>
        {preflight ? (
          <table className="kv-table" style={{marginTop: 10}}>
            <tbody>
              {Array.isArray((preflight as {checks?: unknown[]}).checks)
                ? ((preflight as {checks: Array<{name: string; ok: boolean; detail: string}>}).checks).map((c) => (
                  <tr key={c.name}><td>{c.name}</td><td>{c.ok ? '✓' : '✗'} {c.detail}</td></tr>
                ))
                : <tr><td colSpan={2}>{JSON.stringify(preflight)}</td></tr>}
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="card">
        <h3>Run pipeline (existing run.sh → src/produce.ts)</h3>
        <p className="hint">This calls the repo's own <code>run.sh</code> against <code>projects/{projectId}/manifest.json</code> — no separate renderer. Leave gates off for a quick unconfigured-adapter smoke run; turn them on for a real production run once FLUX/Chatterbox adapters are configured in <code>.env</code>.</p>
        <div className="stack" style={{gap: 4, marginBottom: 12}}>
          {GATES.map((g) => (
            <label key={g.key} className="checkbox-row" style={{textTransform: 'none', fontWeight: 400}}>
              <input type="checkbox" checked={gates[g.key]} onChange={(e) => setGates({...gates, [g.key]: e.target.checked})} />
              <span><strong>{g.label}</strong> — {g.hint}</span>
            </label>
          ))}
        </div>
        <div className="row">
          <button className="btn btn-primary" disabled={status === 'running'} onClick={runPipeline}>{status === 'running' ? 'Running…' : 'Run Pipeline'}</button>
          <span className={`badge badge-${status === 'passed' ? 'rendered' : status === 'failed' ? 'failed' : status === 'running' ? 'running' : 'draft'}`}>{status}</span>
        </div>
        <p className="hint" style={{marginTop: 10}}>Output path: <code>{outputPath}</code></p>
        {status === 'passed' ? <a className="link" href={api.fileUrl(projectId, `renders/${projectId}.mp4`)} target="_blank" rel="noreferrer">Open rendered video</a> : null}
      </div>

      <div className="card">
        <div className="row-between">
          <h3 style={{margin: 0}}>Logs</h3>
          <button className="btn btn-sm" onClick={refreshRun}>Refresh</button>
        </div>
        <div className="log-view">{log || 'No run yet.'}</div>
      </div>
    </div>
  );
}
