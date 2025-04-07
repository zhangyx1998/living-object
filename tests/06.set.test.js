import { test } from "./util.js";

await test("empty set", new Set());

await test("set with string values", new Set(["a", "b", "c"]));

await test("set with number values", new Set([1, 2, 3]));

await test("set with boolean values", new Set([true, false]));

await test("set with undefined values", new Set([undefined, undefined]));

await test("set with null values", new Set([null, null]));

await test("set with object values", new Set([{}, {}]));

await test("set with function values", new Set([function () { }, function () { }]));

await test("set with mixed values", new Set([1, "b", true, undefined, null, {}, function () { }]));

await test("set with nested sets", new Set([1, new Set(["a", "b"]), 2, new Set(["c", "d"])]));

await test("set with nested arrays", new Set([1, [1, 2, 3], 2, [4, 5, 6]]));

await test("set with mixed values and nested sets", new Set([1, "b", true, undefined, null, {}, function () { }, new Set([1, 2, 3])]));

await test("set with circular references", (() => {
    const set = new Set();
    const obj = {};
    set.add(obj);
    obj.set = set;
    return set;
})());

await test("set with large number of entries", (() => {
    const set = new Set();
    for (let i = 0; i < 100; i++) {
        set.add(i);
    }
    return set;
})());
