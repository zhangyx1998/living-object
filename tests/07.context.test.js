import { test, assert } from './framework/runtime.js';

await test('Basic Context', (context) => {
    const my_array = [1, 2, 3];
    Object.assign(context, { my_array });
    return function () {
        my_array.push(my_array);
        return my_array;
    };
});

await test('Self reference', (context) => {
    function self() {
        return self;
    }
    Object.assign(context, { self });
    return self;
});

await test('Readonly Context', (context) => {
    const my_array = [1, 2, 3];
    Object.defineProperty(context, 'my_array', {
        value: my_array,
        writable: false,
    });
    return function mutate() {
        // Should throw an error
        class RealError extends Error {}
        try {
            my_array = undefined;
            throw new RealError('should have thrown an error');
        } catch (e) {
            if (e instanceof RealError) {
                throw e;
            } else {
                // Expected error
                console.log('Error thrown as expected:', e);
            }
        }
    };
});

await test(
    'Shared Context',
    (context) => {
        let local = {
            value: 1,
            get() {
                return local.value;
            },
            set(value) {
                return (local.value = value);
            },
        };
        Object.assign(context, { local });
        return local;
    },
    ({ inflated }) => {
        for (const i of [1, 2, 3, 4, 5]) {
            assert(
                inflated.set(i) === inflated.get(),
                'mutation should be propagated',
            );
        }
    },
);
