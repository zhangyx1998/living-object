import { stringify, parse } from "living-object";
import { readFileSync } from "fs";

function ensureMatch(name, input) {
  console.log("=====", name, "=====");
  const deflated = stringify(input);
  console.log(deflated);
  const inflated = parse(deflated);
  console.log(inflated);
  console.assert(JSON.stringify(inflated) === JSON.stringify(input), "object mismatch");
}

// Basic types
ensureMatch("Basic types: string", "hello world");
ensureMatch("Basic types: number", 123);
ensureMatch("Basic types: number", 123.456);
ensureMatch("Basic types: boolean", true);
ensureMatch("Basic types: boolean", false);
ensureMatch("Basic types: undefined", undefined);
ensureMatch("Basic types: null", null);

// Empty object
ensureMatch("Empty object", {});

// Large JSON object
ensureMatch("Large object", JSON.parse(readFileSync("01.basic.test.json", "utf8")));

// Empty array
ensureMatch("Empty object", []);

// Array as root object
ensureMatch("Array as root value", [1, 2.345, true, false, "hello", null, undefined]);

// BigInt Constructor
{
  const hugeDec = BigInt("9007199254740991");
  const hugeHex = BigInt("0x1fffffffffffff");
  const hugeOct = BigInt("0o377777777777777777");
  const deflated = stringify({ hugeDec, hugeHex, hugeOct });
  console.log(deflated);
  const inflated = parse(deflated);
  console.log(inflated);
  console.assert(inflated.hugeDec === hugeDec, "hugeDec mismatch");
  console.assert(inflated.hugeHex === hugeHex, "hugeHex mismatch");
  console.assert(inflated.hugeOct === hugeOct, "hugeOct mismatch");
}

// BigInt Literal
{
  const hugeDec = 9007199254740991n;
  const hugeHex = 0x1fffffffffffffn;
  const hugeOct = 0o377777777777777777n;
  const deflated = stringify({ hugeDec, hugeHex, hugeOct });
  console.log(deflated);
  const inflated = parse(deflated);
  console.log(inflated);
  console.assert(inflated.hugeDec === hugeDec, "hugeDec mismatch");
  console.assert(inflated.hugeHex === hugeHex, "hugeHex mismatch");
  console.assert(inflated.hugeOct === hugeOct, "hugeOct mismatch");
}
