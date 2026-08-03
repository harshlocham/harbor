import { describe, expect, it } from "vitest";

import { PACKAGE_NAME } from "./index.js";

describe("@harborts/utils", () => {
  it("exports PACKAGE_NAME", () => {
    expect(PACKAGE_NAME).toBe("@harborts/utils");
  });
});
