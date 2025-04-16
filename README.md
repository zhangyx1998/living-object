# Living Object

[![CI Tests](https://github.com/zhangyx1998/living-object/actions/workflows/test.yaml/badge.svg)](https://github.com/zhangyx1998/living-object/actions/workflows/test.yaml) [![npm version](https://img.shields.io/npm/v/living-object.svg?maxAge=600)](https://npmjs.com/package/living-object)

Living Object serializes JS Objects into executable JS code. It preserves circular references and strict object equality.

Unlike other solutions that embeds custom protocols into JSON files, **_Living Object_ directly generates executable JavaScript code**. Therefore, it's result can be **directly imported as ES Module** or **evaluated in a wrapper function**, achieving **minimal performance overhead** on the consumer side.

<!-- LINK TO DOCUMENTATION -->

## Supported Data Types

- ✅ Circular Reference & Strict Object Equality 🔥
- ✅ Pure Functions (preserving attributes) 🔥
- ✅ Custom Object API 🔥
- ✅ `undefined` / `null`
- ✅ Global Symbols
- ✅ Array / Sparse Array
- ✅ Map / Set
- ✅ Date
- ✅ RegExp
- ✅ Error
- ✅ ArrayBuffer / TypedArray / DataView

## Usage

**👋 Try it out at _[Stackblitz Playground](https://stackblitz.com/edit/living-object?file=demo.js)_ !**

#### 1. Let's construct a really challenging input

```js
// Create circular reference
const circular = {};
circular.loop = circular;

// Create a function with attributes
function bar() {
    return 'I have attributes!';
}
bar.hello = 'world';
bar.loop = bar;

const object = {
    // circular reference
    circular,
    // pure JS function
    foo() {
        return 'bar';
    },
    // function with attributes
    bar,
    // Singleton values
    singletons: [undefined, null, Infinity, NaN],
    // Builtin Functions
    Number,
    String,
    Boolean,
    // Well-known function that contains native code
    arrayPrototypePush: [].push,
    // Set and Map
    set: new Set(['a', 'b', 'c']),
    map: new Map([
        ['foo', 'bar'],
        [circular, 'circular'],
        ['circular', circular],
    ]),
    // Date object
    time: new Date('2025-12-31T12:00:00Z'),
    // RegExp
    regex: /^hello-world$/gi,
    // Binary data types
    typedArray: new Uint8Array([1, 2, 3]),
    arrayBuffer: new Uint16Array([4, 5, 6]).buffer,
    dataView: new DataView(new Uint32Array([7, 8, 9]).buffer),
};
```

#### 2. Serialize it with _Living Object_

```js
import { stringify } from 'living-object';

console.log(stringify(object, { type: 'function' }));
```

**Output `{ type: 'function' }`**

Generate code with a `return` statement:

```js
// Formatted by prettier
'use strict';
const A = { loop: 0 },
    B = Object.assign(
        function bar() {
            return 'I have attributes!';
        },
        { hello: 'world', loop: 0 },
    );
A.loop = A;
B.loop = B;
return {
    circular: A,
    foo: function foo() {
        return 'bar';
    },
    bar: B,
    singletons: [undefined, null, Infinity, NaN],
    Number,
    String,
    Boolean,
    arrayPrototypePush: Array.prototype.push,
    set: new Set(['a', 'b', 'c']),
    map: new Map([
        ['foo', 'bar'],
        [A, 'circular'],
        ['circular', A],
    ]),
    time: new Date(1767182400000),
    regex: /^hello-world$/gi,
    typedArray: new Uint8Array([1, 2, 3]),
    arrayBuffer: Uint8Array.from([4, 0, 5, 0, 6, 0]).buffer,
    dataView: new DataView(
        Uint8Array.from([7, 0, 0, 0, 8, 0, 0, 0, 9, 0, 0, 0]).buffer,
        0,
        12,
    ),
};
```

**Output `{ type: 'function' }`**

Generate code with an `export default` statement:

```diff
  "use strict";
  ...
  A.loop = A;
  B.loop = B;
- return {
+ export default {
    ...
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
