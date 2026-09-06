import type {ProjectFiles} from '../../api';

export default function OverviewTab({data}: {data: ProjectFiles; projectId: string; reload: () => void}) {
  const beatSum = data.manifest.beats.reduce((n, b) => n + b.duration_seconds, 0);
  const durationMatches = Math.abs(beatSum - data.manifest.duration_seconds) < 0.01;
  return (
    <div className="stack">
      <div className="card">
        <h3>Project</h3>
        <table className="kv-table">
          <tbody>
            <tr><td>Name</td><td>{data.project.name}</td></tr>
            <tr><td>Project ID</td><td>{data.project.project_id}</td></tr>
            <tr><td>Format</td><td><span className={`badge ${data.project.format === 'SHORT' ? 'badge-short' : 'badge-longform'}`}>{data.project.format}</span></td></tr>
            <tr><td>Language</td><td>{data.project.language}</td></tr>
            <tr><td>Target duration</td><td>{data.project.target_duration_seconds}s</td></tr>
            <tr><td>Status</td><td><span className={`badge badge-${data.project.status}`}>{data.project.status}</span></td></tr>
            <tr><td>Created</td><td>{new Date(data.project.created_at).toLocaleString()}</td></tr>
            <tr><td>Updated</td><td>{new Date(data.project.updated_at).toLocaleString()}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Manifest health</h3>
        <table className="kv-table">
          <tbody>
            <tr><td>Beats</td><td>{data.manifest.beats.length}</td></tr>
            <tr><td>Characters</td><td>{data.manifest.characters.join(', ') || '—'}</td></tr>
            <tr>
              <td>Beat duration sum</td>
              <td>{beatSum.toFixed(2)}s / {data.manifest.duration_seconds}s {durationMatches ? <span className="badge badge-rendered">matches</span> : <span className="badge badge-failed">mismatch</span>}</td>
            </tr>
            <tr><td>Story sections filled</td><td>{[data.story.hook, data.story.summary].filter(Boolean).length}/2</td></tr>
            <tr><td>Characters described</td><td>{data.characters.characters.filter((c) => !c.generation_prompt.startsWith('TODO')).length}/{data.characters.characters.length || 0}</td></tr>
          </tbody>
        </table>
        {!durationMatches ? <p className="hint" style={{color: 'var(--red)'}}>Beat durations must sum to the manifest duration before the pipeline will validate this project — edit in the Script or Visuals tab.</p> : null}
      </div>
    </div>
  );
}
