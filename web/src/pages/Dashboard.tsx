import {useEffect, useState} from 'react';
import {api, type ProjectSummary} from '../api';

export default function Dashboard({onOpen}: {onOpen: (id: string) => void}) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    api.listProjects().then(setProjects).catch((e) => setError(String(e.message ?? e)));
  };
  useEffect(load, []);

  const onDuplicate = async (id: string) => {
    setBusyId(id);
    try {
      await api.duplicateProject(id);
      load();
    } catch (e) {
      alert(`Duplicate failed: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm(`Delete project "${id}"? This removes all its files, assets and renders on disk.`)) return;
    setBusyId(id);
    try {
      await api.deleteProject(id);
      load();
    } catch (e) {
      alert(`Delete failed: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <div className="card">Failed to load projects: {error}</div>;
  if (!projects) return <div className="empty-state">Loading projects…</div>;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Projects</h1>
          <p className="hint">{projects.length} project{projects.length === 1 ? '' : 's'} in <code>projects/</code></p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state card">No projects yet. Click <strong>+ New Project</strong> to start one.</div>
      ) : (
        <div className="grid-cards">
          {projects.map((p) => (
            <div key={p.project_id} className="card card-clickable" onClick={() => onOpen(p.project_id)}>
              <div className="row-between" style={{marginBottom: 8}}>
                <span className={`badge ${p.format === 'SHORT' ? 'badge-short' : 'badge-longform'}`}>{p.format}</span>
                <span className={`badge badge-${p.status}`}>{p.status}</span>
              </div>
              <div style={{fontWeight: 700, fontSize: 15, marginBottom: 6, lineHeight: 1.3}}>{p.name}</div>
              <div className="hint" style={{marginBottom: 10}}>{p.project_id}</div>
              <table className="kv-table">
                <tbody>
                  <tr><td>Duration</td><td>{p.duration_seconds}s</td></tr>
                  <tr><td>Latest render</td><td>{p.latest_render?.exists ? 'Available' : 'Not rendered yet'}</td></tr>
                  <tr><td>Updated</td><td>{p.updated_at ? new Date(p.updated_at).toLocaleString() : '—'}</td></tr>
                </tbody>
              </table>
              <div className="row" style={{marginTop: 12}} onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-sm" disabled={busyId === p.project_id} onClick={() => onDuplicate(p.project_id)}>Duplicate</button>
                <button className="btn btn-sm btn-danger" disabled={busyId === p.project_id} onClick={() => onDelete(p.project_id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
