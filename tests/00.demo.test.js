import { test } from "./util.js";
import { stringify } from "living-object";

// Create circular reference
const circular = {}
circular.loop = circular

const object = {
    // circular reference
    circular,
    // pure function
    foo() {
        return "bar";
    },
    // function with attributes
    bar: Object.assign(
        function () { return "Happy coding!" },
        { hello: "world" }
    ),
    // undefined and null
    a: [undefined, null],
    b: undefined,
    c: null,
    // Set and Map
    s: new Set(['a', 'b', 'c']),
    m: new Map([['foo', 'bar'], [circular, 'circular'], ['circular', circular]]),
    // Date object
    time: new Date(),
    // RegExp
    regex: /^hello-world$/gi
}

test("demo", object)

console.log("module mode")
console.log(stringify(object, "module"))
