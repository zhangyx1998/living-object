import { test } from "./framework/runtime.js";

await test("circular reference object", () => {
    const loop = {};
    loop.loop = loop;
    return loop;
});

await test("circular reference array", () => {
    const loop = [];
    loop.push(loop);
    return loop;
});

await test("circular reference (long chain nested array)", () => {
    const a = ["A"];
    const b = ["B"];
    const c = ["C"];
    a.push(b);
    b.push(c);
    c.push(a);
    return a;
});

await test("circular reference (long chain)", () => {
    const a = { A: "A" };
    const b = { B: "A" };
    const c = { C: "C" };
    a.b = b;
    b.c = c;
    c.a = a;
    return a;
});

await test("circular reference (cross chain)", () => {
    const x = {};
    const y = {};
    x.x = x;
    x.y = y;
    y.x = x;
    y.y = y;
    return x;
});

await test("circular reference (dup ref array)", () => {
    const x = [];
    const y = [];
    x.push(y, y);
    y.push(x, x);
    return x;
});


await test("circular reference (dup ref object)", () => {
    const x = {};
    const y = {};
    x.y1 = y;
    x.y2 = y;
    y.x1 = x;
    y.x2 = x;
    return x;
});
