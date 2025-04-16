/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

// Obtain the native code placeholder for the current execution environment.
// Typically this looks like `{ [native code] }`
// The braces are included to rule out false positives
const NATIVE_CODE = Array.toString().replace(/^function\s\w*\(\)\s*/g, '');

function isNativeCode(body: string) {
    return body.endsWith(NATIVE_CODE);
}

function isConciseMethod(f: string, name: string) {
    if (name.length === 0 || name === 'function') return false;
    f = f.trimStart();
    if (!f.startsWith(name)) return false;
    f = f.slice(name.length).trimStart();
    return f.startsWith('(');
}

export default function serializeFunction(target: Function) {
    const raw = target.toString();
    // Check if the function is native code
    if (isNativeCode(raw)) {
        console.error(raw);
        throw new Error('Native code cannot be serialized.');
    }
    // Strip async prefix
    const prefix = raw.match(/^\s*async\s+/)?.[0] ?? '';
    const stripped = raw.slice(prefix.length);
    // Special case:
    // fn() {} (needs fix => function fn() {})
    // mutations:
    // fn \s* () \s* {}
    // Not to be confused with:
    // () => {}
    // function () {}
    // function function() {}
    if (isConciseMethod(stripped, target.name))
        return [prefix.trim(), 'function', stripped].join(' ');
    else return raw;
}
