import { describe, expect, it } from "vitest";

import { PACKAGE_NAME } from "./index.js";

describe("@harbor/providers", () => {
  it("exports PACKAGE_NAME", () => {
    expect(PACKAGE_NAME).toBe("@harbor/providers");
  });
});
