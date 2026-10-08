import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseMeetingsParams, serializeMeetingsParams, toListQuery } from "../lib/params";

import { useMeetingsParams } from "./useMeetingsParams";

// A fake router whose push/replace rewrite the URL that useSearchParams reads.
const nav = vi.hoisted(() => ({ search: "", push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/meetings",
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
}));

const follow = (url: string) => {
  nav.search = url.split("?")[1] ?? "";
};

beforeEach(() => {
  nav.search = "";
  nav.push.mockReset().mockImplementation(follow);
  nav.replace.mockReset().mockImplementation(follow);
});

describe("parse/serialize", () => {
  it("round-trips every parameter", () => {
    const url =
      "channel=3&date_from=2026-10-01&date_to=2026-10-08&page=2&participant=ada&q=roadmap&scope=hosted&sort=title";
    const params = parseMeetingsParams(new URLSearchParams(url));
    expect(params).toEqual({
      channel: 3,
      date_from: "2026-10-01",
      date_to: "2026-10-08",
      page: 2,
      participant: "ada",
      q: "roadmap",
      scope: "hosted",
      sort: "title",
    });
    expect(serializeMeetingsParams(params)).toBe(url);
  });

  it("leaves defaults out of the URL and ignores junk", () => {
    const params = parseMeetingsParams(
      new URLSearchParams("scope=bogus&sort=nope&page=-2&channel=x&date_from=yesterday&q=%20%20"),
    );
    expect(params).toEqual({
      q: undefined,
      participant: undefined,
      date_from: undefined,
      date_to: undefined,
      channel: undefined,
      scope: "all",
      sort: "-started_at",
      page: 1,
    });
    expect(serializeMeetingsParams(params)).toBe("");
    expect(toListQuery(params)).toMatchObject({ scope: "all", page: 1, page_size: 20 });
  });
});

describe("useMeetingsParams", () => {
  it("pushes discrete changes, resets the page, and reads them back", () => {
    nav.search = "page=3&q=sync";
    const { result, rerender } = renderHook(() => useMeetingsParams());
    expect(result.current.params.page).toBe(3);

    act(() => result.current.update({ scope: "shared", participant: "Grace" }));
    expect(nav.push).toHaveBeenCalledWith("/meetings?participant=Grace&q=sync&scope=shared", {
      scroll: false,
    });
    rerender();
    expect(result.current.params).toMatchObject({
      scope: "shared",
      participant: "Grace",
      q: "sync",
      page: 1,
    });
    expect(result.current.activeFilterCount).toBe(1);
  });

  it("pushes when a search starts, then replaces while it is refined", () => {
    const { result, rerender } = renderHook(() => useMeetingsParams());
    act(() => result.current.setSearch("  road "));
    expect(nav.push).toHaveBeenCalledWith("/meetings?q=road", { scroll: false });
    rerender();
    act(() => result.current.setSearch("roadmap"));
    expect(nav.replace).toHaveBeenCalledWith("/meetings?q=roadmap", { scroll: false });
    expect(nav.push).toHaveBeenCalledTimes(1);
  });

  it("can correct the page without a history entry", () => {
    nav.search = "page=9";
    const { result } = renderHook(() => useMeetingsParams());
    act(() => result.current.setPage(2, "replace"));
    expect(nav.replace).toHaveBeenCalledWith("/meetings?page=2", { scroll: false });
  });

  it("selects a channel or a scope as mutually exclusive views", () => {
    nav.search = "scope=hosted";
    const { result, rerender } = renderHook(() => useMeetingsParams());
    act(() => result.current.selectView({ channel: 4 }));
    expect(nav.search).toBe("channel=4");
    rerender();
    act(() => result.current.selectView({ scope: "uploads" }));
    expect(nav.search).toBe("scope=uploads");
  });

  it("keeps filters when paging, and drops page 1 from the URL", () => {
    nav.search = "q=a";
    const { result, rerender } = renderHook(() => useMeetingsParams());
    act(() => result.current.setPage(2));
    expect(nav.search).toBe("page=2&q=a");
    rerender();
    act(() => result.current.setPage(1));
    expect(nav.search).toBe("q=a");
  });
});
