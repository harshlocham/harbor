import { describe, expect, it } from "vitest";

import { PACKAGE_NAME } from "./index.js";

describe("@harbor/utils", () => {
  it("exports PACKAGE_NAME", () => {
    expect(PACKAGE_NAME).toBe("@harbor/utils");
  });
});
