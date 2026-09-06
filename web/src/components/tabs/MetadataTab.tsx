import {useState} from 'react';
import {api, type ProjectFiles, type Metadata} from '../../api';

export default function MetadataTab({data, projectId}: {data: ProjectFiles; projectId: string; reload: () => void}) {
  const [meta, setMeta] = useState<Metadata>(data.metadata);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.writeFile(projectId, 'metadata.json', meta);
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
      <div className="card">
        <h3>YouTube Shorts</h3>
        <div className="field">
          <label>Title</label>
          <input type="text" value={meta.youtube_shorts.title ?? ''} onChange={(e) => setMeta({...meta, youtube_shorts: {...meta.youtube_shorts, title: e.target.value}})} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={3} value={meta.youtube_shorts.description ?? ''} onChange={(e) => setMeta({...meta, youtube_shorts: {...meta.youtube_shorts, description: e.target.value}})} />
        </div>
        <div className="field">
          <label>Tags (comma-separated)</label>
          <input type="text" value={(meta.youtube_shorts.tags ?? []).join(', ')}
            onChange={(e) => setMeta({...meta, youtube_shorts: {...meta.youtube_shorts, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)}})} />
        </div>
      </div>

      <div className="card">
        <h3>Instagram Reels</h3>
        <div className="field">
          <label>Caption</label>
          <textarea rows={3} value={meta.instagram_reels.caption ?? ''} onChange={(e) => setMeta({...meta, instagram_reels: {...meta.instagram_reels, caption: e.target.value}})} />
        </div>
        <div className="field">
          <label>Hashtags (comma-separated)</label>
          <input type="text" value={(meta.instagram_reels.hashtags ?? []).join(', ')}
            onChange={(e) => setMeta({...meta, instagram_reels: {...meta.instagram_reels, hashtags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)}})} />
        </div>
      </div>

      <div className="card">
        <h3>Thumbnail concept</h3>
        <textarea rows={2} value={meta.thumbnail_concept} onChange={(e) => setMeta({...meta, thumbnail_concept: e.target.value})} />
      </div>

      <div className="card">
        <h3>SEO keywords (comma-separated)</h3>
        <input type="text" value={meta.seo_keywords.join(', ')}
          onChange={(e) => setMeta({...meta, seo_keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)})} />
      </div>

      <div className="row">
        <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save metadata.json'}</button>
      </div>
    </div>
  );
}
