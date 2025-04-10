import { readdir } from "fs/promises";
const write = process.stderr.write;

// Write to stderr traps execution
process.stderr.write = function (...args) {
    write.apply(process.stderr, ...args);
    debugger;
}

const TESTS = new URL("../", import.meta.url);
const entries = (await readdir(TESTS)).filter((e) => e.endsWith(".test.js"))
for (const entry of entries)
    await import(`../${entry}`);
