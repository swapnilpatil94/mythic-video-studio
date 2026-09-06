import {useState} from 'react';
import {api, type ProjectFiles, type Characters} from '../../api';

const TYPES = ['revered_mythological', 'historical', 'generic', 'creature', 'symbolic'] as const;

export default function CharactersTab({data, projectId}: {data: ProjectFiles; projectId: string; reload: () => void}) {
  const [chars, setChars] = useState<Characters>(data.characters);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (i: number, patch: Partial<Characters['characters'][number]>) => {
    setChars({...chars, characters: chars.characters.map((c, j) => j === i ? {...c, ...patch} : c)});
  };

  const addCharacter = () => {
    setChars({...chars, characters: [...chars.characters, {
      character_id: `character_${chars.characters.length + 1}`, name: '', type: 'generic',
      visual_rules: [], required_poses: [], generation_prompt: '',
    }]});
  };

  const removeCharacter = (i: number) => setChars({...chars, characters: chars.characters.filter((_, j) => j !== i)});

  const save = async () => {
    setSaving(true);
    try {
      await api.writeFile(projectId, 'characters.json', chars);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <div className="row-between">
        <h3 style={{margin: 0}}>Characters</h3>
        <button className="btn btn-sm" onClick={addCharacter}>+ Add character</button>
      </div>
      {chars.characters.map((c, i) => (
        <div key={i} className="card">
          <div className="row">
            <div className="field" style={{flex: 1}}>
              <label>Character ID (must match manifest asset_refs / characters[])</label>
              <input type="text" value={c.character_id} onChange={(e) => update(i, {character_id: e.target.value})} />
            </div>
            <div className="field" style={{flex: 1}}>
              <label>Display name</label>
              <input type="text" value={c.name} onChange={(e) => update(i, {name: e.target.value})} />
            </div>
            <div className="field" style={{width: 200}}>
              <label>Type</label>
              <select value={c.type} onChange={(e) => update(i, {type: e.target.value as typeof c.type})}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Generation prompt (used by the existing FLUX asset generator)</label>
            <textarea rows={3} value={c.generation_prompt} onChange={(e) => update(i, {generation_prompt: e.target.value})} />
          </div>
          <div className="row">
            <button className="btn btn-sm btn-danger" onClick={() => removeCharacter(i)}>Remove</button>
          </div>
        </div>
      ))}
      <div className="row">
        <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save characters.json'}</button>
      </div>
    </div>
  );
}
