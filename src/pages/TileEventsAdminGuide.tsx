/**
 * =============================================================================
 * TILE EVENTS ADMIN GUIDE
 * =============================================================================
 * 
 * Documentation page for tile event administrators.
 * Loads markdown content from /docs/tile-events-admin-guide.md
 * 
 * Access Control:
 * - Requires view_events_admin_guide permission
 * 
 * @module TileEventsAdminGuide
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TileEventsAdminGuide() {
  const { loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permission
  const canAccess = hasPermission('view_events_admin_guide');

  // Redirect if no permission
  useEffect(() => {
    if (!authLoading && !canAccess) {
      navigate('/');
    }
  }, [authLoading, canAccess, navigate]);

  // Fetch markdown content
  useEffect(() => {
    if (!canAccess) return;
    
    setLoading(true);
    fetch('/docs/tile-events-admin-guide.md')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load guide');
        return res.text();
      })
      .then(text => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [canAccess]);

  // Loading state
  if (authLoading || !canAccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-yume-accent">⚙️</span> Admin Guide
          </h1>
          <p className="text-gray-400">Learn how to manage tile events</p>
        </div>
        <Link 
          to="/admin"
          className="px-4 py-2 rounded-xl bg-yume-card border border-yume-border text-gray-300 hover:text-white hover:border-yume-accent transition-colors"
        >
          ← Back to Admin Panel
        </Link>
      </div>

      {/* Content */}
      <div className="bg-yume-card rounded-2xl border border-yume-border p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-yume-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">😵</div>
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <article className="prose prose-invert prose-lg max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-h1:text-3xl prose-h1:mb-6 prose-h1:pb-4 prose-h1:border-b prose-h1:border-yume-border
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-yume-accent
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-gray-300 prose-p:leading-relaxed
            prose-a:text-yume-accent prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white
            prose-code:text-amber-400 prose-code:bg-yume-bg prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-yume-bg prose-pre:border prose-pre:border-yume-border prose-pre:rounded-xl
            prose-blockquote:border-yume-accent prose-blockquote:bg-yume-bg/50 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:text-gray-300 prose-blockquote:not-italic
            prose-table:border-collapse
            prose-th:bg-yume-bg prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:border prose-th:border-yume-border prose-th:text-white
            prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-yume-border prose-td:text-gray-300
            prose-li:text-gray-300 prose-li:marker:text-yume-accent
            prose-hr:border-yume-border
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}

