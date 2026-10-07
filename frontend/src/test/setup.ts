import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL only auto-cleans when test globals are enabled; we keep globals off.
afterEach(() => cleanup());
