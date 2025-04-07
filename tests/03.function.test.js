import { stringify, parse } from "living-object";

async function testFunctionResults(description, obj) {
  console.log("\n=====", description, "=====\n");
  const deflated = stringify(obj);
  console.log(deflated);
  const inflated = parse(deflated);
  console.log(inflated);
  for (const key of Object.keys(obj)) {
    console.assert(await inflated[key]() === await obj[key](), `[${description}] function ${key} failed`);
  }
}

testFunctionResults("Concise functions", {
  foo() { return 'hello from foo (concise function)' },
  async bar() { return 'hello from bar (concise function)' },
})

testFunctionResults("Unnamed functions", {
  foo: function () { return "hello from foo (unnamed function)" },
  bar: async function () { return "hello from bar (unnamed function)" },
})

testFunctionResults("Named functions", {
  foo: function foo() { return "hello from foo (named function)" },
  bar: async function bar() { return "hello from bar (named function)" },
})

testFunctionResults("Arrow functions", {
  foo: () => "hello from foo (arrow function)",
  bar: async () => "hello from bar (arrow function)",
})

testFunctionResults("Concise function with weird names", {
  function() { return "hello from foo (concise function)" },
  async() { return "hello from async (concise function)" },
})

{
  console.log("\n=====", "Function with attributes", "=====\n");
  function fn() { return "hello from fn (function with attributes)" }
  fn.a = 1;
  fn.b = true;
  fn.c = "hello";
  fn.d = Symbol.for("test");
  fn.e = undefined;
  fn.f = null;
  fn.g = BigInt(1234567890123456789012345678901234567890);
  fn.h = [1, 2, 3];
  fn.i = { a: 1, b: 2, c: 3 };
  fn.j = () => "hello from fn (arrow function)";
  fn.k = async () => "hello from fn (async arrow function)";
  fn.l = function () { return "hello from fn (function with no name)" };
  fn.m = async function () { return "hello from fn (async function with no name)" };

  const deflated = stringify(fn);
  console.log(deflated);

  const inflated = parse(deflated);
  console.log(inflated);

  for (const key of Object.keys(fn)) {
    switch (typeof fn[key]) {
      case "function":
        console.assert(await inflated[key]() === await fn[key](), `function ${key} return value mismatch`);
        break;
      case "bigint":
        console.assert(typeof inflated[key] === "bigint", `attribute ${key} type mismatch`);
        console.assert(inflated[key] == fn[key], `attribute ${key} value mismatch`);
        break;
      case "object":
        console.assert(JSON.stringify(inflated[key]) === JSON.stringify(fn[key]), `attribute ${key} value mismatch`);
        break;
      default:
        console.assert(typeof inflated[key] === typeof fn[key], `attribute ${key} type mismatch`);
        break;
    }
  }
}
