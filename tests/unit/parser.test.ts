import { describe, test, expect } from "bun:test";
import {
  parseArgs,
  getStringOption,
  getNumberOption,
  getBooleanOption,
} from "../../src/cli/parser";
import { CommandError } from "../../src/utils/errors";

describe("parseArgs", () => {
  test("returns help command when no arguments", () => {
    const result = parseArgs([]);
    expect(result.command).toBe("help");
    expect(result.args).toEqual([]);
    expect(result.options).toEqual({});
  });

  test("parses --version flag", () => {
    const result = parseArgs(["--version"]);
    expect(result.command).toBe("version");
  });

  test("parses -v flag", () => {
    const result = parseArgs(["-v"]);
    expect(result.command).toBe("version");
  });

  test("parses --help flag", () => {
    const result = parseArgs(["--help"]);
    expect(result.command).toBe("help");
  });

  test("parses -h flag", () => {
    const result = parseArgs(["-h"]);
    expect(result.command).toBe("help");
  });

  test("parses command with no additional args", () => {
    const result = parseArgs(["status"]);
    expect(result.command).toBe("status");
    expect(result.args).toEqual([]);
  });

  test("parses command with positional args", () => {
    const result = parseArgs(["start", "api", "worker"]);
    expect(result.command).toBe("start");
    expect(result.args).toEqual(["api", "worker"]);
  });

  test("parses --key=value format", () => {
    const result = parseArgs(["logs", "--lines=100"]);
    expect(result.options["lines"]).toBe("100");
  });

  test("parses --key value format", () => {
    const result = parseArgs(["logs", "--lines", "100"]);
    expect(result.options["lines"]).toBe("100");
  });

  test("parses boolean flags without value", () => {
    const result = parseArgs(["logs", "--follow"]);
    expect(result.options["follow"]).toBe(true);
  });

  test("parses short flags with value", () => {
    const result = parseArgs(["logs", "-n", "50"]);
    expect(result.options["n"]).toBe("50");
  });

  test("parses short boolean flags", () => {
    const result = parseArgs(["logs", "-f"]);
    expect(result.options["f"]).toBe(true);
  });

  test("throws CommandError on unknown command", () => {
    expect(() => parseArgs(["unknown"])).toThrow(CommandError);
  });

  test("handles mixed positional args and options", () => {
    // Note: --dry-run takes "worker" as its value (parser behavior)
    const result = parseArgs(["start", "api", "--dry-run", "worker"]);
    expect(result.command).toBe("start");
    expect(result.args).toEqual(["api"]);
    expect(result.options["dry-run"]).toBe("worker");
  });

  test("handles boolean flags at end of command", () => {
    const result = parseArgs(["start", "api", "worker", "--dry-run"]);
    expect(result.command).toBe("start");
    expect(result.args).toEqual(["api", "worker"]);
    expect(result.options["dry-run"]).toBe(true);
  });

  test("parses all valid commands", () => {
    const commands = [
      "init", "start", "stop", "restart", "logs",
      "status", "remove", "doctor", "help", "version",
      "startall", "stopall", "restartall"
    ];

    for (const cmd of commands) {
      const result = parseArgs([cmd]);
      expect(result.command).toBe(cmd);
    }
  });

  test("parses multiple options", () => {
    const result = parseArgs(["logs", "--follow", "--lines=50", "-n", "100"]);
    expect(result.options["follow"]).toBe(true);
    expect(result.options["lines"]).toBe("50");
    expect(result.options["n"]).toBe("100");
  });
});

describe("getStringOption", () => {
  test("returns string value for long option", () => {
    const options = { name: "test" };
    expect(getStringOption(options, "name")).toBe("test");
  });

  test("returns string value for short option", () => {
    const options = { n: "test" };
    expect(getStringOption(options, "name", "n")).toBe("test");
  });

  test("prefers long option over short option", () => {
    const options = { name: "long", n: "short" };
    expect(getStringOption(options, "name", "n")).toBe("long");
  });

  test("returns undefined when not present", () => {
    const options = {};
    expect(getStringOption(options, "name")).toBeUndefined();
  });

  test("returns default when not present", () => {
    const options = {};
    expect(getStringOption(options, "name", undefined, "default")).toBe("default");
  });

  test("returns default when value is boolean", () => {
    const options = { name: true };
    expect(getStringOption(options, "name", undefined, "default")).toBe("default");
  });

  test("returns undefined when value is boolean and no default", () => {
    const options = { name: true };
    expect(getStringOption(options, "name")).toBeUndefined();
  });
});

describe("getNumberOption", () => {
  test("parses valid integer", () => {
    const options = { lines: "100" };
    expect(getNumberOption(options, "lines")).toBe(100);
  });

  test("parses zero", () => {
    const options = { lines: "0" };
    expect(getNumberOption(options, "lines")).toBe(0);
  });

  test("parses negative numbers", () => {
    const options = { offset: "-10" };
    expect(getNumberOption(options, "offset")).toBe(-10);
  });

  test("throws CommandError on non-numeric string", () => {
    const options = { lines: "abc" };
    expect(() => getNumberOption(options, "lines")).toThrow(CommandError);
  });

  test("throws CommandError on empty string", () => {
    const options = { lines: "" };
    expect(() => getNumberOption(options, "lines")).toThrow(CommandError);
  });

  test("returns undefined when not present", () => {
    const options = {};
    expect(getNumberOption(options, "lines")).toBeUndefined();
  });

  test("returns default when not present", () => {
    const options = {};
    expect(getNumberOption(options, "lines", undefined, 50)).toBe(50);
  });

  test("uses short option when long not present", () => {
    const options = { n: "25" };
    expect(getNumberOption(options, "lines", "n")).toBe(25);
  });
});

describe("getBooleanOption", () => {
  test("returns true for boolean true", () => {
    const options = { force: true };
    expect(getBooleanOption(options, "force")).toBe(true);
  });

  test("returns false for boolean false", () => {
    const options = { force: false };
    expect(getBooleanOption(options, "force")).toBe(false);
  });

  test("returns true for string 'true'", () => {
    const options = { force: "true" };
    expect(getBooleanOption(options, "force")).toBe(true);
  });

  test("returns true for string 'TRUE'", () => {
    const options = { force: "TRUE" };
    expect(getBooleanOption(options, "force")).toBe(true);
  });

  test("returns true for string 'yes'", () => {
    const options = { force: "yes" };
    expect(getBooleanOption(options, "force")).toBe(true);
  });

  test("returns true for string '1'", () => {
    const options = { force: "1" };
    expect(getBooleanOption(options, "force")).toBe(true);
  });

  test("returns false for string 'false'", () => {
    const options = { force: "false" };
    expect(getBooleanOption(options, "force")).toBe(false);
  });

  test("returns false for string 'no'", () => {
    const options = { force: "no" };
    expect(getBooleanOption(options, "force")).toBe(false);
  });

  test("returns false for string '0'", () => {
    const options = { force: "0" };
    expect(getBooleanOption(options, "force")).toBe(false);
  });

  test("returns default when not present", () => {
    const options = {};
    expect(getBooleanOption(options, "force")).toBe(false);
    expect(getBooleanOption(options, "force", undefined, true)).toBe(true);
  });

  test("uses short option when long not present", () => {
    const options = { f: true };
    expect(getBooleanOption(options, "force", "f")).toBe(true);
  });
});
