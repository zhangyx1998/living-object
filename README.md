# Living Object

[![CI Tests](https://github.com/zhangyx1998/living-object/actions/workflows/test.yaml/badge.svg)](https://github.com/zhangyx1998/living-object/actions/workflows/test.yaml) [![npm version](https://img.shields.io/npm/v/living-object.svg?maxAge=3600)](https://npmjs.com/package/living-object)

Living Object serializes JS Objects into executable JS code. It preserves circular references and strict object equality.

Unlike other solutions that embeds custom protocols into JSON files, **_Living Object_ directly generates executable JavaScript code**. Therefore, it's result can be **directly imported as ES Module** or **evaluated in a wrapper function**, achieving **minimal performance overhead** on the consumer side.

<!-- LINK TO DOCUMENTATION -->

## Supported Data Types

- ✅ Circular Reference & Strict Object Equality 🔥
- ✅ Pure Functions (preserving attributes) 🔥
- ✅ Custom Object API 🔥
- ✅ `undefined`, `null`
- ✅ Global Symbols
- ✅ Sparse Array
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

console.log(stringify(object));
```

**Output** (`type = 'function'`)

```js
// Formatted by prettier
'use strict';
const A = { loop: 0 };
A.loop = A;
return {
    circular: A,
    foo: function foo() {
        return 'bar';
    },
    bar: Object.assign(
        function () {
            return 'Happy coding!';
        },
        { hello: 'world' },
    ),
    a: [undefined, null],
    b: undefined,
    c: null,
    s: new Set(['a', 'b', 'c']),
    m: new Map([
        ['foo', 'bar'],
        [A, 'circular'],
        ['circular', A],
    ]),
    time: new Date(1744754605416),
    regex: /^hello-world$/gi,
};
```

**Output** (`type = 'module'`)

```diff
  "use strict";
  const A = { loop: 0 };
  A.loop = A;
- return {
+ export default {
    ... // unchanged lines omitted
  };
```

## Advanced: Custom Object API

> 📄 Documentation Coming Soon

Please refer to [builtins.ts](./src/handles/builtins.ts) for examples.

## Advanced: Context Injection

> 📄 Documentation Coming Soon

Please refer to [context.test.js](./tests/07.context.test.js) for examples.

## Continuous Integration

_Living Object_ is tested against the following environments before each release:

- **Host OS**: _Ubuntu_@latest, _Windows_@latest
- **Node.js**: _`@latest`_, `22`, `20`, `18`, `16`
