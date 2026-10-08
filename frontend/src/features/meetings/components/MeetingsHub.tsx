"use client";

import { useRouter } from "next/navigation";

import { Pagination, SkeletonRow, StateView } from "@/components/ui";
import { ChannelSidebar, useChannels } from "@/features/channels";
import { cn } from "@/lib/utils/cn";

import { useClampPage } from "../hooks/useClampPage";
import { useDeleteMeeting } from "../hooks/useDeleteMeeting";
import { useMeetings } from "../hooks/useMeetings";
import { useMeetingsParams } from "../hooks/useMeetingsParams";
import { useMoveMeeting } from "../hooks/useMoveMeeting";
import { emptyCopy } from "../lib/empty-copy";
import { PAGE_SIZE, isNarrowed } from "../lib/params";

import { AskFredPanel } from "./AskFredPanel";
import { MeetingGroupList } from "./MeetingGroupList";
import { MeetingsEmpty } from "./MeetingsEmpty";
import { MeetingsToolbar } from "./MeetingsToolbar";

const SCOPE_LABELS: Record<string, string> = {
  hosted: "My Meetings",
  shared: "Shared with me",
  uploads: "Uploads",
  all: "All Meetings",
};

/** The Meetings library: channel sidebar | toolbar + date-grouped list | Ask Fred. Wiring only. */
export function MeetingsHub() {
  const router = useRouter();
  const url = useMeetingsParams();
  const { params } = url;
  const meetings = useMeetings(url.query);
  const channels = useChannels();
  const remove = useDeleteMeeting();
  const move = useMoveMeeting();
  useClampPage(meetings.data, meetings.isPlaceholderData, url.setPage);

  const channelOptions = (channels.data ?? []).map((c) => ({ id: c.id, name: c.name }));
  const activeChannel = channelOptions.find((c) => c.id === params.channel);
  const contextLabel = activeChannel
    ? `#${activeChannel.name}`
    : (SCOPE_LABELS[params.scope] ?? "");
  // A narrowed view asks over what is listed; plain "All Meetings" asks over every meeting,
  // not just this page of it.
  const viewIsAll = params.scope === "all" && params.channel === undefined && !isNarrowed(params);
  const askMeetingIds = viewIsAll ? undefined : (meetings.data?.items.map((m) => m.id) ?? []);

  return (
    <div className="flex h-full min-h-0">
      <ChannelSidebar
        activeScope={params.scope}
        activeChannelId={params.channel}
        onSelectScope={(scope) => url.selectView({ scope })}
        onSelectChannel={(channel) => url.selectView({ channel })}
        onChannelDeleted={(id) => {
          if (params.channel === id) url.selectView({ scope: "all" });
        }}
      />

      <section aria-label="Meetings" className="flex min-w-0 flex-1 flex-col">
        <MeetingsToolbar
          params={params}
          activeFilterCount={url.activeFilterCount}
          onScopeChange={(scope) => url.update({ scope })}
          onFiltersChange={(filters) => url.update(filters)}
          onSearch={url.setSearch}
          onSortChange={(sort) => url.update({ sort })}
        />

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-2 py-3 transition-opacity duration-fast",
            meetings.isPlaceholderData && "opacity-60",
          )}
          aria-busy={meetings.isFetching || undefined}
        >
          <StateView
            query={meetings}
            // By total, not items: an empty page past the end is clamped, not "no meetings".
            isEmpty={(page) => page.total === 0}
            errorMessage="Your meetings couldn't be loaded. Check your connection and try again."
            loading={Array.from({ length: 6 }, (_, i) => (
              <SkeletonRow key={i} className="h-[82px] px-4" />
            ))}
            empty={
              <MeetingsEmpty
                copy={emptyCopy(params, activeChannel?.name)}
                onClearFilters={url.clearFilters}
              />
            }
          >
            {(page) => (
              <MeetingGroupList
                meetings={page.items}
                channels={channelOptions}
                onOpen={(id) => router.push(`/meetings/${id}`)}
                // The meeting page opens its edit dialog from this param.
                onEdit={(id) => router.push(`/meetings/${id}?edit=1`)}
                onDelete={(id) => remove.mutate(id)}
                onMove={(id, channel) =>
                  move.mutate({ id, channelId: channel?.id ?? null, channelName: channel?.name })
                }
              />
            )}
          </StateView>
        </div>

        {meetings.data && (
          <Pagination
            page={meetings.data.page}
            pageSize={meetings.data.page_size || PAGE_SIZE}
            itemCount={meetings.data.items.length}
            total={meetings.data.total}
            totalPages={meetings.data.total_pages}
            onPageChange={(page) => url.setPage(page)}
          />
        )}
      </section>

      <AskFredPanel contextLabel={contextLabel} meetingIds={askMeetingIds} />
    </div>
  );
}
