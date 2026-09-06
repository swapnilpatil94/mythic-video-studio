import {useEffect, useState} from 'react';
import {api} from '../../api';

const LABELS: Record<string, string> = {
  contact_sheet: 'Contact sheet',
  visual_qa_report: 'Visual QA report',
  output_qa_report: 'Output QA report (resolution/fps/duration/black-frame/clipping/trailing-silence)',
  release_evidence_report: 'Release evidence report',
  audio_report: 'Audio duration report',
  preflight_report: 'Preflight report',
};

export default function QaTab({projectId}: {projectId: string}) {
  const [qa, setQa] = useState<Record<string, {path: string; exists: boolean; content?: unknown}> | null>(null);

  useEffect(() => { api.getQa(projectId).then(setQa); }, [projectId]);

  if (!qa) return <div className="empty-state">Loading QA artifacts…</div>;

  return (
    <div className="stack">
      {qa.contact_sheet?.exists ? (
        <div className="card">
          <h3>{LABELS.contact_sheet}</h3>
          <img src={api.fileUrl(projectId, 'qa/contact-sheet.jpg')} alt="contact sheet" style={{width: '100%', borderRadius: 8, border: '1px solid var(--border)'}} />
        </div>
      ) : null}

      {Object.entries(qa).filter(([key]) => key !== 'contact_sheet').map(([key, entry]) => (
        <div key={key} className="card">
          <div className="row-between">
            <h3 style={{margin: 0}}>{LABELS[key] ?? key}</h3>
            <span className={`badge ${entry.exists ? 'badge-rendered' : 'badge-draft'}`}>{entry.exists ? 'available' : 'not yet generated'}</span>
          </div>
          {entry.exists && entry.content ? (
            <table className="kv-table" style={{marginTop: 8}}>
              <tbody>
                {Object.entries(entry.content as Record<string, unknown>).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{typeof v === 'object' ? <pre style={{margin: 0, whiteSpace: 'pre-wrap'}}>{JSON.stringify(v, null, 2)}</pre> : String(v)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ))}
    </div>
  );
}
