import { useEffect, useState } from 'react';
import api from '../api/axios';
import PublicPageShell from '../components/PublicPageShell';
import { PageLoader } from '../components/Spinner';

export default function StoryPage() {
  const [post, setPost] = useState(null);

  useEffect(() => {
    document.title = 'In Focus · NEMSUonePortal';
    api.get('/enrollment/public/site-content/')
      .then(r => setPost(r.data?.in_focus ?? {}))
      .catch(() => setPost({}));
  }, []);

  const dateLabel = post?.date || post?.createdAt || '';

  return (
    <PublicPageShell eyebrow="In focus" title="Featured story">
      <style>{CSS}</style>
      {post === null ? (
        <PageLoader label="Loading story…" />
      ) : !post.title ? (
        <div className="pp-empty">No featured story right now.</div>
      ) : (
        <article className="st">
          {post.imageUrl && <div className="st-img"><img src={post.imageUrl} alt={post.title} /></div>}
          {post.category && <div className="st-cat">{post.category}</div>}
          <h2>{post.title}</h2>
          {(post.byline || dateLabel) && (
            <div className="st-byline">{post.byline}{post.byline && dateLabel ? ' · ' : ''}{dateLabel}</div>
          )}
          {post.body && <p>{post.body}</p>}
        </article>
      )}
    </PublicPageShell>
  );
}

const CSS = `
  .st{max-width:760px;}
  .st-img{aspect-ratio:16/9;overflow:hidden;background:#eef1f7;border:1px solid #e5e7eb;margin-bottom:1.5rem;}
  .st-img img{width:100%;height:100%;object-fit:cover;display:block;}
  .st-cat{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#b89043;font-weight:600;margin-bottom:.75rem;}
  .st h2{font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-.01em;color:#0a1628;margin-bottom:.5rem;}
  .st-byline{font-size:13px;color:#8a93a3;margin-bottom:1.5rem;}
  .st p{font-size:16px;line-height:1.8;color:#3a4658;}
`;
