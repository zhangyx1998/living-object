/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { type Plugin } from 'rollup';
import vm from 'node:vm';

interface Globals {
    universal: string[];
    nodejs: string[];
}

const getGlobals = () => {
    // Node.js specific keys should be excluded
    const universal: string[] = [];
    const nodejs: string[] = [
        'global',
        'process',
        'require',
        'module',
        'exports',
        'Buffer',
        'setImmediate',
        'clearImmediate',
    ];
    for (const key of Reflect.ownKeys(globalThis)) {
        if (typeof key !== 'string') continue;
        const value = globalThis[key];
        if (value === globalThis) continue; // globalThis is handled differently
        if (value === null) continue;
        if (typeof value !== 'function' && typeof value !== 'object') continue;
        if (nodejs.includes(key)) continue;
        universal.push(key);
    }
    return { universal, nodejs } as Globals;
};

/**
 * Dummy function to be included in generated code.
 */
function decodeGlobals(keys: string) {
    return Object.fromEntries(
        keys
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
            .filter((k) => k in globalThis)
            .map((k) => [k, globalThis[k]]),
    );
}

export function globalsLoader(): Plugin {
    return {
        name: 'globals-loader',
        resolveId(id) {
            if (id === '@globals') return '@globals';
        },
        load(id) {
            if (id === '@globals') {
                const ctx = vm.createContext({});
                const script = new vm.Script(`(${getGlobals.toString()})()`);
                const { universal, nodejs }: Globals = script.runInContext(ctx);
                function code(data: string[]) {
                    return `decodeGlobals(${JSON.stringify(data.join(','))})`;
                }
                return [
                    decodeGlobals.toString(),
                    'export const universal = ' + code(universal),
                    'export const nodejs = ' + code(nodejs),
                ].join('\n');
            }
        },
    };
}
