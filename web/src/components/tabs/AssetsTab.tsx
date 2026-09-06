import {useEffect, useState} from 'react';
import {api} from '../../api';

export default function AssetsTab({projectId}: {projectId: string}) {
  const [assets, setAssets] = useState<Awaited<ReturnType<typeof api.getAssets>>['assets'] | null>(null);

  useEffect(() => { api.getAssets(projectId).then((r) => setAssets(r.assets)); }, [projectId]);

  if (!assets) return <div className="empty-state">Loading assets…</div>;
  if (assets.length === 0) return <div className="card empty-state">No assets registered yet — run the pipeline (Production tab) to generate master assets via the existing FLUX adapter.</div>;

  return (
    <div className="grid-cards">
      {assets.map((a) => (
        <div key={a.id} className="card">
          <div className="row-between" style={{marginBottom: 8}}>
            <strong>{a.id}</strong>
            <span className={`badge ${a.status === 'ready' ? 'badge-rendered' : a.status === 'failed' ? 'badge-failed' : 'badge-draft'}`}>{a.status}</span>
          </div>
          {a.exists && a.status === 'ready' ? (
            <img src={api.fileUrl(projectId, a.relPath)} alt={a.id} style={{width: '100%', borderRadius: 6, border: '1px solid var(--border)'}} />
          ) : (
            <div className="hint">Not generated yet ({a.relPath})</div>
          )}
          <table className="kv-table" style={{marginTop: 8}}>
            <tbody>
              <tr><td>Kind</td><td>{a.kind}</td></tr>
              {a.width ? <tr><td>Dimensions</td><td>{a.width}×{a.height}</td></tr> : null}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
