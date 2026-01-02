import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { COLORS, colorize, supportsColor, color } from "../../src/utils/colors";

describe("COLORS", () => {
  test("has reset code", () => {
    expect(COLORS.reset).toBe("\x1b[0m");
  });

  test("has bold and dim codes", () => {
    expect(COLORS.bold).toBe("\x1b[1m");
    expect(COLORS.dim).toBe("\x1b[2m");
  });

  test("has foreground colors", () => {
    expect(COLORS.red).toBe("\x1b[31m");
    expect(COLORS.green).toBe("\x1b[32m");
    expect(COLORS.yellow).toBe("\x1b[33m");
    expect(COLORS.blue).toBe("\x1b[34m");
    expect(COLORS.magenta).toBe("\x1b[35m");
    expect(COLORS.cyan).toBe("\x1b[36m");
    expect(COLORS.white).toBe("\x1b[37m");
    expect(COLORS.gray).toBe("\x1b[90m");
  });

  test("has background colors", () => {
    expect(COLORS.bgRed).toBe("\x1b[41m");
    expect(COLORS.bgGreen).toBe("\x1b[42m");
    expect(COLORS.bgYellow).toBe("\x1b[43m");
    expect(COLORS.bgBlue).toBe("\x1b[44m");
  });
});

describe("supportsColor", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    delete process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
  });

  test("returns false when NO_COLOR is set", () => {
    process.env["NO_COLOR"] = "1";
    delete process.env["FORCE_COLOR"];
    expect(supportsColor()).toBe(false);
  });

  test("returns false when NO_COLOR is empty string", () => {
    process.env["NO_COLOR"] = "";
    delete process.env["FORCE_COLOR"];
    expect(supportsColor()).toBe(false);
  });

  test("returns true when FORCE_COLOR is set", () => {
    delete process.env["NO_COLOR"];
    process.env["FORCE_COLOR"] = "1";
    expect(supportsColor()).toBe(true);
  });

  test("NO_COLOR takes precedence over FORCE_COLOR", () => {
    process.env["NO_COLOR"] = "1";
    process.env["FORCE_COLOR"] = "1";
    expect(supportsColor()).toBe(false);
  });
});

describe("colorize", () => {
  afterEach(() => {
    delete process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
  });

  test("returns plain text when colors disabled", () => {
    process.env["NO_COLOR"] = "1";
    const result = colorize("test", COLORS.red);
    expect(result).toBe("test");
  });

  test("wraps text with color codes when enabled", () => {
    delete process.env["NO_COLOR"];
    process.env["FORCE_COLOR"] = "1";
    const result = colorize("test", COLORS.red);
    expect(result).toBe(`${COLORS.red}test${COLORS.reset}`);
  });

  test("combines multiple codes", () => {
    delete process.env["NO_COLOR"];
    process.env["FORCE_COLOR"] = "1";
    const result = colorize("test", COLORS.bold, COLORS.red);
    expect(result).toBe(`${COLORS.bold}${COLORS.red}test${COLORS.reset}`);
  });

  test("handles empty text", () => {
    delete process.env["NO_COLOR"];
    process.env["FORCE_COLOR"] = "1";
    const result = colorize("", COLORS.red);
    expect(result).toBe(`${COLORS.red}${COLORS.reset}`);
  });
});

describe("color helpers", () => {
  beforeEach(() => {
    delete process.env["NO_COLOR"];
    process.env["FORCE_COLOR"] = "1";
  });

  afterEach(() => {
    delete process.env["FORCE_COLOR"];
  });

  test("color.red wraps in red", () => {
    const result = color.red("error");
    expect(result).toContain(COLORS.red);
    expect(result).toContain("error");
    expect(result).toContain(COLORS.reset);
  });

  test("color.green wraps in green", () => {
    const result = color.green("success");
    expect(result).toContain(COLORS.green);
    expect(result).toContain("success");
  });

  test("color.yellow wraps in yellow", () => {
    const result = color.yellow("warning");
    expect(result).toContain(COLORS.yellow);
    expect(result).toContain("warning");
  });

  test("color.blue wraps in blue", () => {
    const result = color.blue("info");
    expect(result).toContain(COLORS.blue);
    expect(result).toContain("info");
  });

  test("color.magenta wraps in magenta", () => {
    const result = color.magenta("special");
    expect(result).toContain(COLORS.magenta);
    expect(result).toContain("special");
  });

  test("color.cyan wraps in cyan", () => {
    const result = color.cyan("step");
    expect(result).toContain(COLORS.cyan);
    expect(result).toContain("step");
  });

  test("color.gray wraps in gray", () => {
    const result = color.gray("dimmed");
    expect(result).toContain(COLORS.gray);
    expect(result).toContain("dimmed");
  });

  test("color.bold wraps in bold", () => {
    const result = color.bold("important");
    expect(result).toContain(COLORS.bold);
    expect(result).toContain("important");
  });

  test("color.dim wraps in dim", () => {
    const result = color.dim("secondary");
    expect(result).toContain(COLORS.dim);
    expect(result).toContain("secondary");
  });

  test("color helpers return plain text when colors disabled", () => {
    process.env["NO_COLOR"] = "1";
    expect(color.red("test")).toBe("test");
    expect(color.green("test")).toBe("test");
    expect(color.bold("test")).toBe("test");
  });
});
