import {useState} from 'react';
import {api, type ProjectFiles, type Characters} from '../../api';

const IMPORTANCE = ['primary', 'secondary', 'minor'] as const;

function Tags({values, onChange}: {values: string[]; onChange: (next: string[]) => void}) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <div className="row" style={{flexWrap: 'wrap', marginBottom: 4}}>
        {values.map((v, i) => <span key={i} className="badge" style={{cursor: 'pointer'}} onClick={() => onChange(values.filter((_, j) => j !== i))}>{v} ×</span>)}
      </div>
      <input type="text" value={draft} placeholder="Add and press Enter" onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { onChange([...values, draft.trim()]); setDraft(''); } }} />
    </div>
  );
}

export default function CharactersTab({data, projectId}: {data: ProjectFiles; projectId: string; reload: () => void}) {
  const [state, setState] = useState<Characters>(data.characters);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.writeFile(projectId, 'characters.json', state);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateChar = (i: number, patch: Partial<Characters['characters'][number]>) =>
    setState({...state, characters: state.characters.map((c, j) => j === i ? {...c, ...patch} : c)});
  const addChar = () => setState({...state, characters: [...state.characters, {
    id: `character_${state.characters.length + 1}`, name: '', role: '', importance: 'secondary',
    visual_direction: '', required_views: [], required_actions: [], sacred_or_respected: false,
  }]});
  const removeChar = (i: number) => setState({...state, characters: state.characters.filter((_, j) => j !== i)});

  const updateEnv = (i: number, patch: Partial<Characters['environments'][number]>) =>
    setState({...state, environments: state.environments.map((e, j) => j === i ? {...e, ...patch} : e)});
  const addEnv = () => setState({...state, environments: [...state.environments, {id: `environment_${state.environments.length + 1}`, name: '', visual_direction: '', important_layers: []}]});
  const removeEnv = (i: number) => setState({...state, environments: state.environments.filter((_, j) => j !== i)});

  const updateProp = (i: number, patch: Partial<Characters['props'][number]>) =>
    setState({...state, props: state.props.map((p, j) => j === i ? {...p, ...patch} : p)});
  const addProp = () => setState({...state, props: [...state.props, {id: `prop_${state.props.length + 1}`, name: '', required_views: [], required_actions: []}]});
  const removeProp = (i: number) => setState({...state, props: state.props.filter((_, j) => j !== i)});

  return (
    <div className="stack">
      <div className="row-between">
        <h3 style={{margin: 0}}>Characters</h3>
        <button className="btn btn-sm" onClick={addChar}>+ Add character</button>
      </div>
      {state.characters.map((c, i) => (
        <div key={i} className="card">
          <div className="row">
            <div className="field" style={{flex: 1}}>
              <label>ID (must match visual_manifest/manifest asset_refs)</label>
              <input type="text" value={c.id} onChange={(e) => updateChar(i, {id: e.target.value})} />
            </div>
            <div className="field" style={{flex: 1}}>
              <label>Name</label>
              <input type="text" value={c.name} onChange={(e) => updateChar(i, {name: e.target.value})} />
            </div>
            <div className="field" style={{flex: 1}}>
              <label>Role</label>
              <input type="text" value={c.role} placeholder="protagonist / deity / mentor…" onChange={(e) => updateChar(i, {role: e.target.value})} />
            </div>
            <div className="field" style={{width: 160}}>
              <label>Importance</label>
              <select value={c.importance} onChange={(e) => updateChar(i, {importance: e.target.value as typeof c.importance})}>
                {IMPORTANCE.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Visual direction</label>
            <textarea rows={2} value={c.visual_direction} onChange={(e) => updateChar(i, {visual_direction: e.target.value})} />
          </div>
          <div className="row">
            <div className="field" style={{flex: 1}}>
              <label>Required views</label>
              <Tags values={c.required_views} onChange={(v) => updateChar(i, {required_views: v})} />
            </div>
            <div className="field" style={{flex: 1}}>
              <label>Required actions</label>
              <Tags values={c.required_actions} onChange={(v) => updateChar(i, {required_actions: v})} />
            </div>
          </div>
          <label className="checkbox-row" style={{textTransform: 'none', fontWeight: 400}}>
            <input type="checkbox" checked={c.sacred_or_respected} onChange={(e) => updateChar(i, {sacred_or_respected: e.target.checked})} />
            <span>Sacred / revered figure — dignified, non-comedic treatment required</span>
          </label>
          <div className="row" style={{marginTop: 8}}>
            <button className="btn btn-sm btn-danger" onClick={() => removeChar(i)}>Remove</button>
          </div>
        </div>
      ))}

      <div className="row-between" style={{marginTop: 10}}>
        <h3 style={{margin: 0}}>Environments</h3>
        <button className="btn btn-sm" onClick={addEnv}>+ Add environment</button>
      </div>
      {state.environments.map((env, i) => (
        <div key={i} className="card">
          <div className="row">
            <div className="field" style={{flex: 1}}>
              <label>ID</label>
              <input type="text" value={env.id} onChange={(e) => updateEnv(i, {id: e.target.value})} />
            </div>
            <div className="field" style={{flex: 1}}>
              <label>Name</label>
              <input type="text" value={env.name} onChange={(e) => updateEnv(i, {name: e.target.value})} />
            </div>
          </div>
          <div className="field">
            <label>Visual direction</label>
            <textarea rows={2} value={env.visual_direction} onChange={(e) => updateEnv(i, {visual_direction: e.target.value})} />
          </div>
          <div className="field">
            <label>Important layers</label>
            <Tags values={env.important_layers} onChange={(v) => updateEnv(i, {important_layers: v})} />
          </div>
          <div className="row"><button className="btn btn-sm btn-danger" onClick={() => removeEnv(i)}>Remove</button></div>
        </div>
      ))}

      <div className="row-between" style={{marginTop: 10}}>
        <h3 style={{margin: 0}}>Props</h3>
        <button className="btn btn-sm" onClick={addProp}>+ Add prop</button>
      </div>
      {state.props.map((p, i) => (
        <div key={i} className="card">
          <div className="row">
            <div className="field" style={{flex: 1}}>
              <label>ID</label>
              <input type="text" value={p.id} onChange={(e) => updateProp(i, {id: e.target.value})} />
            </div>
            <div className="field" style={{flex: 1}}>
              <label>Name</label>
              <input type="text" value={p.name} onChange={(e) => updateProp(i, {name: e.target.value})} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{flex: 1}}>
              <label>Required views</label>
              <Tags values={p.required_views} onChange={(v) => updateProp(i, {required_views: v})} />
            </div>
            <div className="field" style={{flex: 1}}>
              <label>Required actions</label>
              <Tags values={p.required_actions} onChange={(v) => updateProp(i, {required_actions: v})} />
            </div>
          </div>
          <div className="row"><button className="btn btn-sm btn-danger" onClick={() => removeProp(i)}>Remove</button></div>
        </div>
      ))}

      <div className="row">
        <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save characters.json'}</button>
      </div>
    </div>
  );
}
