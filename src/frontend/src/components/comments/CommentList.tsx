'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

interface CommentAuthor {
  authorName: string;
  authorAvatarUrl: string | null;
}

interface CommentItem extends CommentAuthor {
  id: string;
  userId: string;
  body: string;
  createdAt: string | Date;
}

interface CommentListProps {
  comments: CommentItem[];
  currentUserId: string | undefined;
  isAdmin: boolean;
  onDelete: (id: string) => Promise<void>;
}

export function CommentList({ comments, currentUserId, isAdmin, onDelete }: CommentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (comments.length === 0) {
    return <p className="text-sm text-gray-400 italic">Ingen kommentarer endnu.</p>;
  }

  return (
    <ul className="space-y-4">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-3">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700">
            {c.authorName[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-900">{c.authorName}</span>
              <span className="text-xs text-gray-400">
                {format(new Date(c.createdAt), 'd. MMM yyyy HH:mm', { locale: da })}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
          </div>
          {(c.userId === currentUserId || isAdmin) && (
            <button
              onClick={() => handleDelete(c.id)}
              disabled={deletingId === c.id}
              className="text-xs text-gray-400 hover:text-red-500 self-start mt-1 disabled:opacity-50"
            >
              Slet
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
