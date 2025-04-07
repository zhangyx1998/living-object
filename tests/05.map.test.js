import { test } from "./util.js";

await test("empty map", new Map());

await test("map with string keys", new Map([["a", 1], ["b", 2], ["c", 3]]));

await test("map with number keys", new Map([[1, "a"], [2, "b"], [3, "c"]]));

await test("map with boolean keys", new Map([[true, "a"], [false, "b"]]));

await test("map with undefined keys", new Map([[undefined, "a"], [undefined, "b"]]));

await test("map with null keys", new Map([[null, "a"], [null, "b"]]));

await test("map with object keys", new Map([[{}, "a"], [{}, "b"]]));

await test("map with function keys", new Map([[function () { }, "a"], [function () { }, "b"]]));

await test("map with mixed keys", new Map([[1, "a"], ["b", 2], [true, "c"], [undefined, "d"], [null, "e"], [{}, "f"], [function () { }, "g"]]));

await test("map with nested maps", new Map([[1, new Map([["a", 1], ["b", 2]])], [2, new Map([["c", 3], ["d", 4]])]]));

await test("map with nested arrays", new Map([[1, [1, 2, 3]], [2, [4, 5, 6]]]));

await test("map with mixed values", new Map([[1, "a"], ["b", 2], [true, "c"], [undefined, "d"], [null, "e"], [{}, "f"], [function () { }, "g"], [new Map([["h", 8], ["i", 9]])]]));

await test("map with circular references", (() => {
    const map = new Map();
    const obj = {};
    map.set(obj, "a");
    obj.map = map;
    return map;
})());

await test("map with large number of entries", (() => {
    const map = new Map();
    for (let i = 0; i < 100; i++) {
        map.set(i, i);
    }
    return map;
})());

await test("map with large number of nested maps", (() => {
    const map = new Map();
    for (let i = 0; i < 100; i++) {
        const nestedMap = new Map();
        for (let j = 0; j < 100; j++) {
            nestedMap.set(j, j);
        }
        map.set(i, nestedMap);
    }
    return map;
})());

await test("map with large number of nested arrays", (() => {
    const map = new Map();
    for (let i = 0; i < 100; i++) {
        const nestedArray = [];
        for (let j = 0; j < 100; j++) {
            nestedArray.push(j);
        }
        map.set(i, nestedArray);
    }
    return map;
})());

await test("map with large number of mixed values", (() => {
    const map = new Map();
    for (let i = 0; i < 100; i++) {
        map.set(i, i);
    }
    map.set("string", "hello");
    map.set(true, "world");
    map.set(undefined, "foo");
    map.set(null, "bar");
    map.set({}, "baz");
    map.set(function () { }, "qux");
    return map;
})());
