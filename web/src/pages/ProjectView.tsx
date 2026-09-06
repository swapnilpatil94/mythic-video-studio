import {useEffect, useState} from 'react';
import {api, type ProjectFiles} from '../api';
import {navigate} from '../App';
import OverviewTab from '../components/tabs/OverviewTab';
import StoryTab from '../components/tabs/StoryTab';
import ScriptTab from '../components/tabs/ScriptTab';
import VisualsTab from '../components/tabs/VisualsTab';
import CharactersTab from '../components/tabs/CharactersTab';
import AssetsTab from '../components/tabs/AssetsTab';
import AudioTab from '../components/tabs/AudioTab';
import MetadataTab from '../components/tabs/MetadataTab';
import ProductionTab from '../components/tabs/ProductionTab';
import QaTab from '../components/tabs/QaTab';

const TABS = [
  {key: 'overview', label: 'Overview'},
  {key: 'story', label: 'Story'},
  {key: 'script', label: 'Script'},
  {key: 'visuals', label: 'Visuals'},
  {key: 'characters', label: 'Characters'},
  {key: 'assets', label: 'Assets'},
  {key: 'audio', label: 'Audio'},
  {key: 'metadata', label: 'Metadata'},
  {key: 'production', label: 'Production'},
  {key: 'qa', label: 'QA'},
] as const;

export default function ProjectView({projectId, initialTab}: {projectId: string; initialTab?: string}) {
  const [data, setData] = useState<ProjectFiles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(initialTab && TABS.some((t) => t.key === initialTab) ? initialTab : 'overview');

  const load = () => {
    api.getProject(projectId).then(setData).catch((e) => setError(String(e.message ?? e)));
  };
  useEffect(load, [projectId]);

  // Keep the active tab in sync with the URL hash even when it changes externally (browser
  // back/forward, a pasted/bookmarked #/project/<id>/<tab> link) — this component instance
  // persists across those navigations (same projectId), so `tab` can't only be set once on mount.
  useEffect(() => {
    if (initialTab && TABS.some((t) => t.key === initialTab)) setTab(initialTab);
  }, [initialTab]);

  const selectTab = (key: string) => {
    setTab(key);
    navigate(`/project/${projectId}/${key}`);
  };

  if (error) return <div className="card">Failed to load project: {error}</div>;
  if (!data) return <div className="empty-state">Loading project…</div>;

  return (
    <div>
      <div style={{marginBottom: 4}}>
        <h1>{data.project.name}</h1>
        <p className="hint">{data.project.project_id} · {data.project.format} · {data.manifest.duration_seconds}s</p>
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => selectTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' ? <OverviewTab data={data} projectId={projectId} reload={load} /> : null}
      {tab === 'story' ? <StoryTab data={data} projectId={projectId} reload={load} /> : null}
      {tab === 'script' ? <ScriptTab data={data} projectId={projectId} reload={load} /> : null}
      {tab === 'visuals' ? <VisualsTab data={data} projectId={projectId} reload={load} /> : null}
      {tab === 'characters' ? <CharactersTab data={data} projectId={projectId} reload={load} /> : null}
      {tab === 'assets' ? <AssetsTab projectId={projectId} /> : null}
      {tab === 'audio' ? <AudioTab projectId={projectId} /> : null}
      {tab === 'metadata' ? <MetadataTab data={data} projectId={projectId} reload={load} /> : null}
      {tab === 'production' ? <ProductionTab data={data} projectId={projectId} reload={load} /> : null}
      {tab === 'qa' ? <QaTab projectId={projectId} /> : null}
    </div>
  );
}
