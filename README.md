# Living Object

Living Object serializes JS Objects into executable JS code. It preserves circular references and strict object equality.

Unlike other solutions that embeds custom protocols into JSON files, **_Living Object_ directly generates executable JavaScript code**. Therefore, it's result can be **directly imported as ES Module** or **evaluated in a wrapper function**, achieving **minimal performance overhead** on the consumer side.

## Supported Data Types

- ✅ Circular Reference & Strict Object Equality 🔥
- ✅ Pure Functions (preserving attributes) 🔥
- ✅ Custom Object Interface (API) 🔥
- ✅ `undefined`, `null`
- ✅ Global Symbols
- ✅ Map
- ✅ Set
- ✅ Date
- ✅ RegExp
- ✅ Error

## Additional Data Types (Work in progress)

- ⏳ Buffer
- ⏳ BufferView

## Usage

```js
import { stringify, parse } from 'living-object';

// Create circular reference
const circular = {};
circular.loop = circular;

const object = {
    // circular reference
    circular,
    // pure function
    foo() {
        return 'bar';
    },
    // function with attributes
    bar: Object.assign(
        function () {
            return 'Happy coding!';
        },
        { hello: 'world' },
    ),
    // undefined and null
    a: [undefined, null],
    b: undefined,
    c: null,
    // Set and Map
    s: new Set(['a', 'b', 'c']),
    m: new Map([
        ['foo', 'bar'],
        [circular, 'circular'],
        ['circular', circular],
    ]),
    // Date object
    time: new Date(),
    // RegExp
    regex: /^hello-world$/gi,
};

console.log(stringify());
```

**Output** (`type = 'function'`)

> ```js
> 'use strict';
> const a = { loop: 0 };
> a.loop = a;
> return {
>     circular: a,
>     foo: function foo() {
>         return 'bar';
>     },
>     bar: Object.assign(
>         function () {
>             return 'Happy coding!';
>         },
>         { hello: 'world' },
>     ),
>     a: [undefined, null],
>     b: undefined,
>     c: null,
>     s: new Set(['a', 'b', 'c']),
>     m: new Map([
>         ['foo', 'bar'],
>         [a, 'circular'],
>         ['circular', a],
>     ]),
>     time: new Date(1744286161914),
>     regex: new RegExp('^hello-world$'),
> };
> ```

**Output** (`type = 'module'`)

> ```diff
>   ...
> - return {
> + export default {
>     ... // unchanged lines omitted
>   };
> ```

## Advanced: Custom Object API

> Documentation Coming Soon
>
> Please refer to [builtins.ts](src/handles/builtins.ts) for examples.

## Advanced: Context Injection

> Documentation Coming Soon
>
> Please refer to [context.test.js](tests/07.context.test.js) for examples.
