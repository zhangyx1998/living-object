# Living Object

Living Object serializes JS Objects into executable JS code. It preserves circular references and strict object equality.

Unlike other solutions that embeds custom protocols into JSON files, **_Living Object_ directly generates executable JavaScript code**. Therefore, it's result can be **directly imported as ES Module** or **evaluated in a wrapper function**, achieving **minimal performance overhead** on the consumer side.

## Currently Supported

- [x] Circular Reference & Strict Object Equality 🔥
- [x] Pure Functions (preserving attributes) 🔥
- [x] `undefined`, `null`
- [x] Global Symbols
- [x] Map
- [x] Set
- [x] Date
- [x] RegExp

## Additional Data Types (WIP)

- [ ] Error
- [ ] Buffer
- [ ] Buffer

## Usage

```js
import { stringify, parse } from "living-object";

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

console.log(stringify())
```

**Output** (`type = 'function'`)

>
> ```js
> "use strict";
> const
> i = new RegExp(/^hello-world$/gi),
> h = new Date(1744017092158),
> g = new Map,
> f = new Set,
> e = [undefined,null],
> d = Object.assign(function () { return "Happy coding!" }, {
> 	hello: "world"
> }),
> c = function foo() {
>         return "bar";
>     },
> b = {};
> g.set("foo", "bar").set(b, "circular").set("circular", b);
> f.add("a").add("b").add("c");
> b.loop = b;
> return {
> 	circular: b,
> 	foo: c,
> 	bar: d,
> 	a: e,
> 	b: undefined,
> 	c: null,
> 	s: f,
> 	m: g,
> 	time: h,
> 	regex: i
> };
> ```

**Output** (`type = 'module'`)

>
> ```diff
> ...
> - return {
> + export default {
>   	circular: b,
>   	foo: c,
>   	bar: d,
>   	a: e,
>   	b: undefined,
>   	c: null,
>   	s: f,
>   	m: g,
>   	time: h,
>   	regex: i
>   };
> ```

## Advanced: Custom Object Reviving Rules

> Work in progress

## Advanced: Context Injection

> Documentation WIP
