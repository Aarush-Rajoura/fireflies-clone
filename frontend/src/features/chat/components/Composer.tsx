"use client";

import { ArrowUp, Check, ChevronDown, Layers, Mic, Plus, Video } from "lucide-react";
import { useId, useRef } from "react";

import {
  Button,
  Chip,
  IconButton,
  Menu,
  OptionList,
  Textarea,
  optionId,
  type Option,
} from "@/components/ui";
import { useComingSoon } from "@/features/shell";
import type { ChatMessageCreate } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { useComposer, type MeetingContext, type MenuOption } from "../hooks/useComposer";
import { skillGlyph } from "../lib/skill-icons";

export type ComposerProps = {
  /** Returns whether the message was accepted; a refused send keeps the draft. */
  onSubmit: (body: ChatMessageCreate) => boolean;
  pending?: boolean;
  /** Where the @/skill menu opens: below on the home screen, above when docked at the bottom. */
  menuPlacement?: "above" | "below";
  autoFocus?: boolean;
  /** The @meeting chip to start with, e.g. a reopened thread's meeting. */
  initialMeeting?: MeetingContext | null;
};

function toOption(option: MenuOption): Option {
  if (option.kind === "meeting") {
    return {
      id: `m${option.meeting.id}`,
      label: option.meeting.title,
      description: option.upcoming ? `Upcoming · ${option.when}` : option.when,
      icon: <Video strokeWidth={1.75} />,
    };
  }
  return {
    id: option.skill.id,
    label: option.skill.label,
    description: `${option.skill.command} · ${option.skill.description}`,
    icon: skillGlyph(option.skill.icon),
  };
}

/** "Ask anything": the text box, @meeting and /skill chips, and the send row. */
export function Composer({
  onSubmit,
  pending = false,
  menuPlacement = "below",
  autoFocus = false,
  initialMeeting = null,
}: ComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const c = useComposer(onSubmit, inputRef, initialMeeting);
  const listId = useId();
  const soon = useComingSoon();
  const { menu } = c;
  const menuLabel = menu.kind === "mention" ? "Meetings" : "Skills";
  const empty = menu.kind === "mention" ? "No meetings match" : "No skills match";

  return (
    <div className="relative">
      <div className="flex flex-col gap-2 rounded-card border border-accent-border bg-surface-1 px-4 pb-3 pt-4 transition-colors duration-fast focus-within:shadow-focus">
        {(c.meeting || c.skill) && (
          <div className="flex flex-wrap gap-2">
            {c.meeting && (
              <Chip
                icon={<Video strokeWidth={1.75} />}
                onRemove={() => c.setMeeting(null)}
                className="h-btn-sm max-w-full"
              >
                <span className="max-w-[280px] truncate">{c.meeting.title}</span>
              </Chip>
            )}
            {c.skill && (
              <Chip
                selected
                icon={skillGlyph(c.skill.icon)}
                onRemove={() => c.setSkill(null)}
                className="h-btn-sm"
              >
                {c.skill.label}
              </Chip>
            )}
          </div>
        )}
        <Textarea
          ref={inputRef}
          bare
          rows={2}
          maxLength={2000}
          autoFocus={autoFocus}
          aria-label="Ask AskFred"
          placeholder="Ask anything, @ for context and / for skills"
          value={c.draft}
          role="combobox"
          aria-expanded={menu.open}
          aria-controls={menu.open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            menu.open && menu.options.length > 0 ? optionId(listId, menu.active) : undefined
          }
          onChange={(e) => c.update(e.target.value, e.target.selectionStart)}
          onSelect={(e) => c.setCaret(e.currentTarget.selectionStart)}
          onKeyDown={c.onKeyDown}
          className="max-h-48 text-transcript"
        />
        <div className="flex items-center gap-1">
          <IconButton
            label="Add meeting context (@)"
            icon={<Plus strokeWidth={1.75} />}
            size="sm"
            onClick={() => c.insert("@")}
          />
          <IconButton
            label="Skills (/)"
            icon={<Layers strokeWidth={1.75} />}
            size="sm"
            onClick={() => c.insert("/")}
          />
          <div className="ml-auto flex items-center gap-1">
            <Menu
              trigger={
                <Button variant="ghost" size="sm" trailingIcon={<ChevronDown strokeWidth={1.75} />}>
                  Auto
                </Button>
              }
              items={[
                { type: "label", label: "Model" },
                { label: "Auto", icon: <Check strokeWidth={1.75} />, onSelect: () => undefined },
                {
                  label: "Choose a model",
                  disabled: true,
                  trailing: "Soon",
                  onSelect: () => undefined,
                },
              ]}
            />
            <IconButton
              label="Voice input"
              icon={<Mic strokeWidth={1.75} />}
              size="sm"
              onClick={() =>
                soon.show({
                  title: "Voice input",
                  message: "Asking AskFred out loud is coming soon. Type your question for now.",
                })
              }
            />
            <IconButton
              label="Send"
              variant="primary"
              size="sm"
              tooltip={false}
              loading={pending}
              disabled={!c.canSend || pending}
              icon={<ArrowUp strokeWidth={1.75} />}
              onClick={c.submit}
            />
          </div>
        </div>
      </div>
      {menu.open && (
        <OptionList
          id={listId}
          label={menuLabel}
          options={menu.options.map(toOption)}
          activeIndex={menu.active}
          onActiveChange={menu.setActive}
          onSelect={menu.choose}
          status={menu.loading ? "Loading…" : empty}
          className={cn(
            "absolute inset-x-0 z-popover",
            menuPlacement === "below" ? "top-full mt-2" : "bottom-full mb-2",
          )}
        />
      )}
      {soon.dialog}
    </div>
  );
}
