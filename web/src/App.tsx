import {useEffect, useState} from 'react';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import NewProjectModal from './pages/NewProjectModal';

type Route = {page: 'dashboard'} | {page: 'project'; id: string; tab?: string};

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'project' && parts[1]) return {page: 'project', id: decodeURIComponent(parts[1]), tab: parts[2]};
  return {page: 'dashboard'};
}

export function navigate(hash: string) {
  window.location.hash = hash;
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash());
  const [showNewProject, setShowNewProject] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand" onClick={() => navigate('/')}>
          <div className="brand-name">KATHAAYA</div>
          <div className="brand-tagline">Ancient stories. Reimagined through ink.</div>
        </div>
        <div className="row">
          {route.page === 'project' ? <a className="link" onClick={() => navigate('/')}>&larr; All projects</a> : null}
          <button className="btn btn-gold" onClick={() => setShowNewProject(true)}>+ New Project</button>
        </div>
      </div>
      <div className="main">
        {route.page === 'dashboard'
          ? <Dashboard key={refreshKey} onOpen={(id) => navigate(`/project/${id}`)} />
          : <ProjectView projectId={route.id} initialTab={route.tab} />}
      </div>
      {showNewProject ? (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(id) => { setShowNewProject(false); setRefreshKey((k) => k + 1); navigate(`/project/${id}`); }}
        />
      ) : null}
    </div>
  );
}
