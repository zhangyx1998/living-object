import { stringify, parse } from "living-object";

// Global symbol should work
const g = Symbol.for("test symbol (global)");

// Symbol as value
{
  const deflated = stringify(g);
  console.log(deflated);

  const inflated = parse(deflated);
  console.log(inflated);

  console.assert(inflated === g, "symbol mismatch");
}

// Symbol as key
{
  const deflated = stringify({ [g]: 'hello' });
  console.log(deflated);

  const inflated = parse(deflated);
  console.log(inflated);

  console.assert(inflated[g] === 'hello', "key mismatch");
}

// Private symbol should cause an error
const p = Symbol("test symbol (private)");

// Symbol as value
try {
  stringify(p);
  console.error("stringify should have thrown an error");
} catch (e) {
  console.log("as expected:", e);
}

// Symbol as key
try {
  stringify({ [p]: 'hello' });
  console.error("stringify should have thrown an error");
} catch (e) {
  console.log("as expected:", e);
}
