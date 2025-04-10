import { test } from "./framework/runtime.js";
import { readFile } from "fs/promises";

await test("Basic types: string", () => "hello world");
await test("Basic types: number", () => 123);
await test("Basic types: number", () => 123.456);
await test("Basic types: boolean", () => true);
await test("Basic types: boolean", () => false);
await test("Basic types: undefined", () => undefined);
await test("Basic types: null", () => null);

await test("Empty object", () => ({}));

await test("Large object", async () => {
  return JSON.parse(await readFile("01.basic.test.json"));
});

await test("Empty object", () => []);

await test("Array as root object", () => [
  1,
  2.345,
  true,
  false,
  "hello",
  null,
  undefined,
  {},
  [],
]);

await test("BigInt Constructor", () => ({
  hugeDec: BigInt("9007199254740991"),
  hugeHex: BigInt("0x1fffffffffffff"),
  hugeOct: BigInt("0o377777777777777777"),
}));

await test("BigInt Constructor", () => ({
  hugeDec: 9007199254740991n,
  hugeHex: 0x1fffffffffffffn,
  hugeOct: 0o377777777777777777n,
}));
