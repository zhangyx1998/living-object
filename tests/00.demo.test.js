import { test, code, session } from './framework/runtime.js';
import { stringify } from 'living-object';

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
};

await test('Demo: Function Mode', () => object);

await session('Demo: Module Mode', () => {
    code('output', stringify(object, { target: 'module' }));
});
