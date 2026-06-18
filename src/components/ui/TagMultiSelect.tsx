'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TransactionTag } from '@/types';
import { formInput, formLabel } from '@/lib/ui';

interface TagMultiSelectProps {
  tags: TransactionTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateTag: (name: string) => Promise<TransactionTag | null>;
  label?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  allowCreate?: boolean;
}

export default function TagMultiSelect({
  tags,
  selectedIds,
  onChange,
  onCreateTag,
  label,
  placeholder = 'Search or create tags...',
  className = '',
  compact = false,
  allowCreate = true,
}: TagMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTags = useMemo(
    () => selectedIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as TransactionTag[],
    [selectedIds, tags],
  );

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...tags].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(t => t.name.toLowerCase().includes(q));
  }, [tags, search]);

  const hasExactMatch = filteredTags.some(t => t.name.toLowerCase() === search.trim().toLowerCase());

  const toggleTag = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleCreate = async () => {
    const name = search.trim();
    if (!name || creating) return;
    setCreating(true);
    const created = await onCreateTag(name);
    setCreating(false);
    if (created) {
      if (!selectedIds.includes(created.id)) {
        onChange([...selectedIds, created.id]);
      }
      setSearch('');
    }
  };

  const triggerLabel =
    selectedTags.length === 0
      ? placeholder
      : compact
        ? `${selectedTags.length} tag${selectedTags.length === 1 ? '' : 's'}`
        : selectedTags.map(t => t.name).join(', ');

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && <label className={formLabel}>{label}</label>}

      {selectedTags.length > 0 && !compact && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
            >
              {tag.name}
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                onClick={() => onChange(selectedIds.filter(id => id !== tag.id))}
                aria-label={`Remove ${tag.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        className={`${formInput} !py-2 !pr-8 cursor-pointer flex items-center justify-between text-sm bg-white select-none ${compact ? '!text-xs' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch('');
        }}
      >
        <span className={`truncate ${selectedTags.length === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
          {triggerLabel}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 flex flex-col overflow-hidden animate-[fade-in-up_0.15s_ease-out_both]">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="Search tags..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto p-1 scrollbar-thin flex-1">
            {filteredTags.length === 0 && !search.trim() && (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">No tags yet</div>
            )}
            {filteredTags.map(tag => {
              const checked = selectedIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                    checked ? 'bg-accent/10 text-accent font-medium' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => toggleTag(tag.id)}
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      checked ? 'border-accent bg-accent text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  {tag.name}
                </button>
              );
            })}
            {allowCreate && search.trim() && !hasExactMatch && (
              <button
                type="button"
                disabled={creating}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg text-accent hover:bg-accent/5 font-medium border-t border-slate-100 mt-1"
                onClick={handleCreate}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {creating ? 'Creating...' : `Create "${search.trim()}"`}
              </button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="border-t border-slate-100 p-2 flex justify-end">
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
                onClick={() => onChange([])}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
