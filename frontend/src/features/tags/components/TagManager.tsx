"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ConfirmDialog, EmptyState, IconButton, Input, Skeleton, StateView } from "@/components/ui";
import { ApiError, type Tag } from "@/lib/api";

import { useDeleteTag, useTags, useUpdateTag } from "../hooks/useTags";
import { TagChip } from "./TagChip";

/** Settings → Tags: rename or delete the workspace's tags. */
export function TagManager() {
  const tags = useTags();
  const remove = useDeleteTag();
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-subtle bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-body-strong text-primary">Tags</p>
        <p className="text-meta text-muted">
          Tags are added from a meeting&apos;s header. Renaming updates every meeting; deleting
          removes the tag from all of them.
        </p>
      </div>
      <StateView
        query={tags}
        isEmpty={(list) => list.length === 0}
        errorMessage="Your tags couldn't be loaded."
        loading={<Skeleton className="h-10 w-full" />}
        empty={
          <EmptyState
            title="No tags yet"
            description="Open a meeting and use “+ Tag” to create your first one."
          />
        }
      >
        {(list) => (
          <ul aria-label="Tags" className="flex flex-col divide-y divide-subtle">
            {list.map((tag) => (
              <TagRow key={tag.id} tag={tag} onDelete={() => setPendingDelete(tag)} />
            ))}
          </ul>
        )}
      </StateView>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete “${pendingDelete?.name ?? ""}”?`}
        description="It will be removed from every meeting. This can't be undone."
        confirmLabel="Delete tag"
        danger
        loading={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          remove.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
        }}
      />
    </div>
  );
}

function TagRow({ tag, onDelete }: { tag: Tag; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="flex min-h-12 items-center gap-3 py-2">
      {editing ? (
        <RenameForm tag={tag} onDone={() => setEditing(false)} />
      ) : (
        <>
          <span className="min-w-0 flex-1">
            <TagChip tag={tag} />
          </span>
          <IconButton
            size="sm"
            label={`Rename ${tag.name}`}
            icon={<Pencil strokeWidth={1.75} />}
            onClick={() => setEditing(true)}
          />
          <IconButton
            size="sm"
            label={`Delete ${tag.name}`}
            icon={<Trash2 strokeWidth={1.75} />}
            onClick={onDelete}
            className="hover:text-danger-strong"
          />
        </>
      )}
    </li>
  );
}

function RenameForm({ tag, onDone }: { tag: Tag; onDone: () => void }) {
  const update = useUpdateTag();
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = name.trim();
    if (!next) return setError("A tag needs a name.");
    if (next === tag.name) return onDone();
    update.mutate(
      { id: tag.id, patch: { name: next } },
      {
        onSuccess: onDone,
        onError: (err) =>
          setError(
            err instanceof ApiError && err.code === "TAG_EXISTS"
              ? "A tag with that name already exists."
              : err.message || "Couldn't rename the tag.",
          ),
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          autoFocus
          aria-label={`New name for ${tag.name}`}
          value={name}
          maxLength={50}
          invalid={error !== null}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Escape" && onDone()}
          className="h-btn-sm"
        />
        <IconButton
          type="submit"
          size="sm"
          variant="primary"
          label="Save"
          loading={update.isPending}
          icon={<Check strokeWidth={1.75} />}
        />
        <IconButton size="sm" label="Cancel" icon={<X strokeWidth={1.75} />} onClick={onDone} />
      </div>
      {error && (
        <p role="alert" className="text-caption text-danger-strong">
          {error}
        </p>
      )}
    </form>
  );
}
