import { readdir } from "fs/promises";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import c from "chalk";

const TESTS = new URL("../", import.meta.url);

async function dump(pipe) {
  let result = "";
  for await (const chunk of pipe) {
    result += chunk;
  }
  return result;
}

/**
 * @param {string} entry
 */
async function runTest(entry) {
  const path = fileURLToPath(new URL(entry, TESTS));
  const test = spawn("node", [path], {
    stdio: ["overlapped", "pipe", "pipe"],
    cwd: TESTS,
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  const timeStart = await new Promise((res) =>
    test.on("spawn", () => res(performance.now())),
  );
  const { stdout, stderr } = test;
  const exit = new Promise((res) =>
    test.on("exit", (code) => res([code, performance.now()])),
  );
  const out = (await dump(stdout)).trim();
  const err = (await dump(stderr)).trim();
  const [code, timeEnd] = await exit;
  const duration = (timeEnd - timeStart).toFixed(4) + " ms";
  return { entry, duration, out, err, code };
}

const entries = (await readdir(TESTS)).filter((e) => e.endsWith(".test.js"));
const align = Math.max(...entries.map((e) => e.length));

function logWithPrefix(prefix, text) {
  for (const line of text.split("\n")) {
    console.log(prefix, line);
  }
}

for (const entry of entries) {
  const { duration, out, err, code } = await runTest(entry);
  if (code === 0)
    console.log(
      c.greenBright("✔"),
      c.underline(entry) + " ".repeat(align - entry.length),
      c.green.dim(duration),
    );
  else {
    console.log(
      c.redBright("✘"),
      c.underline(entry) + " ".repeat(align - entry.length),
      c.red.dim(duration),
    );
    if (out.trim().length > 0)
      logWithPrefix(c.dim("|"), out);
    process.exitCode = 1;
  }
  if (err) logWithPrefix(c.red(">"), err);
  if (code !== 0) {
    c.yellow("⚠️", "exit code", c.underline(code));
  }
}

if (!process.exitCode)
  console.log("\n" + "🎉", c.greenBright("All tests passed!") + "\n");
else console.error("\n" + "🔥", c.redBright("Some tests failed!") + "\n");

process.exit();
