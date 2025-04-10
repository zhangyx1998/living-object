import { test, code, session } from './framework/runtime.js';
import { stringify } from 'living-object';

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

await test('Demo: Function Mode', () => object);

await session('Demo: Module Mode', () => {
    code('output', stringify(object, { target: 'module' }));
});
