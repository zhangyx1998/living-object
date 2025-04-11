// All exported properties will be exposed to test scripts

import { stringify, parse } from 'living-object';
import { prettyPrint } from '@base2/pretty-print-object';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import c from 'chalk';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { format } from 'prettier';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function relative(path) {
    path = resolve(path);
    if (path.startsWith(ROOT)) return path.slice(ROOT.length);
    return path;
}

const isolated = 'ISOLATE' in process.env;

function keys(obj) {
    const keys = Object.keys(obj);
    return keys.concat(Object.getOwnPropertySymbols(obj));
}

function values(obj) {
    const values = Object.values(obj);
    return values.concat(Object.getOwnPropertySymbols(obj));
}

class Mismatch extends Error {
    constructor(reason, ...data) {
        super(reason);
        this.data = data;
        debugger;
    }

    *[Symbol.iterator]() {
        for (const [a, b, f] of this.data) {
            yield ['<', f('A'), '=', prettyPrint(a)].join(' ');
            yield ['>', f('B'), '=', prettyPrint(b)].join(' ');
        }
    }

    toString() {
        return [
            '####',
            this.message ?? 'Mismatch',
            '',
            '```diff',
            ...this,
            '```',
        ].join('\n');
    }
}

function checkInstance(a, b, proto, f) {
    if (a instanceof proto !== b instanceof proto) {
        throw new Mismatch(
            'Instance mismatch',
            [a, b, f],
            [
                a.constructor.name,
                b.constructor.name,
                (_) => `${f(_)}[[prototype]]`,
            ],
            f,
        );
    }
}

export async function equivalence(a, b, checked = new WeakMap(), f = (_) => _) {
    process.stdout.write(['>', f('A'), '<=>', f('B')].join(' ') + '\n');
    if (checked.has(a) && checked.get(a) === b) {
        return;
    }
    function $(a, b, _f = (_) => f(_) + '[?]') {
        if (typeof _f !== 'function') {
            const suffix = _f;
            _f = (_) => f(_) + suffix;
        }
        return equivalence(a, b, checked, _f);
    }
    if (typeof a !== typeof b) {
        throw new Mismatch(
            'Type mismatch',
            [a, b, f],
            [(typeof a, typeof b, (_) => `typeof ${f(_)}`)],
        );
    }
    const type = typeof a;
    if (
        (type !== 'object' && type !== 'function') ||
        a === null ||
        b === null
    ) {
        if (a !== b) {
            throw new Mismatch('Value mismatch', [a, b, f]);
        }
        return;
    }
    try {
        checked.set(a, b);
    } catch {}
    [Array, Map, Set, Function, Promise, Date].map((p) =>
        checkInstance(a, b, p, f),
    );
    if (a instanceof Promise) {
        await $(await a, await b, (_) => `(await ${f(_)})`);
    } else if (a instanceof Array) {
        await $(a.length, b.length, '.length');
        await Promise.all(a.map((v, i) => $(v, b[i], `[${i}]`)));
    } else if (a instanceof Map) {
        await $(a.keys(), b.keys(), '.keys()');
        await $(a.values(), b.values(), '.values()');
    } else if (a instanceof Set) {
        await $(a.values(), b.values(), '.values()');
    } else if (type === 'object' || type === 'function') {
        if (type === 'function') {
            await $(a(), b(), '()');
            await $(a.name, b.name, '.name');
            await $(a.length, b.length, '.length');
        }
        for (const k of new Set([...keys(a), ...keys(b)]).values()) {
            await $(k in a, k in b, (_) => `${prettyPrint(k)} in ${f(_)}`);
            await $(
                a[k],
                b[k],
                typeof k === 'string' ? `.${k}` : `[${prettyPrint(k)}]`,
            );
        }
    }
}

export function banner(description) {
    const line = '='.repeat(description.length);
    process.stdout.write(`${line}\n${description}\n${line}\n\n`);
}

export function code(description, code, type = 'js') {
    process.stdout.write(
        [`#### ${description}\n`, '```' + type, code, '```', '', ''].join('\n'),
    );
}

let testCount = 0;

/**
 * @param {string} description
 */
function descriptionToFileName(description) {
    const prefix = (testCount++).toString().padStart(2, '0');
    return (
        prefix +
        '.' +
        description
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/_$/, '')
            .replace(/^_/, '')
    );
}

const outDir =
    (process.argv[1]?.replace(/\.test\.js$/, '') ?? '') + '.test.log';
await mkdir(outDir, { recursive: true });

function stackOrigin(stack, pos = 1) {
    let loc = stack.split('\n')[pos + 1].trim();
    while (loc.startsWith('at ')) loc = loc.slice(2).trim();
    while (loc.startsWith('file://')) loc = loc.slice(7).trim();
    return relative(loc);
}

export async function session(description, callback, _origin) {
    const origin = _origin ?? stackOrigin(new Error().stack);
    const outFile = descriptionToFileName(description) + '.md';
    const outPath = `${outDir}/${outFile}`;
    const logStream = createWriteStream(outPath, { flags: 'w' });
    const [out, err] = [process.stdout.write, process.stderr.write];
    const color = process.env.FORCE_COLOR;
    let flag_failed = false;
    try {
        process.stdout.write = logStream.write.bind(logStream);
        process.stderr.write = logStream.write.bind(logStream);
        process.env.FORCE_COLOR = '0';
        banner(description);
        await callback();
    } catch (e) {
        process.exitCode = 1;
        flag_failed = true;
        banner('TEST FAILED');
        if (e instanceof Mismatch) {
            console.log(e.toString());
        } else {
            console.error(e);
            debugger;
        }
    }
    process.stdout.write = out;
    process.stderr.write = err;
    process.env.FORCE_COLOR = color;
    logStream.end();
    if (flag_failed) {
        console.log(c.redBright('✘'), description);
        console.log(c.redBright('├'), c.dim('src:'), c.dim.underline(origin));
        console.log(
            c.redBright('└'),
            c.dim('log:'),
            c.dim.underline(relative(outPath)),
        );
    } else {
        console.log(c.greenBright('✔'), description);
    }
}

export function assert(cond, message) {
    if (!cond) {
        const title = 'Assertion failed';
        const err = new Error(message ? `${title}: ${message}` : title);
        Error.captureStackTrace(err, assert);
        throw err;
    }
}

/**
 * @param {string} description
 * @param {() => any | Promise<any>} input
 * @param {boolean} execute
 * @param {...(function({context: any, original: any, inflated: any}): Promise<void>)} additionalTests
 */
export async function test(description, input, ...additionalTests) {
    await session(
        description,
        async () => {
            const context = {};

            const producer = await format(input.toString(), {
                parser: 'babel',
            });
            code('producer', producer.trim());

            const original = await input(context);
            code('original', prettyPrint(original));

            const deflated = stringify(original, { pretty: true }, context);
            code(
                'deflated',
                (
                    await format(deflated, { parser: 'babel' }).catch(
                        () => deflated,
                    )
                ).trim(),
            );

            const inflated = await parse(deflated, {}, isolated);
            code('inflated', prettyPrint(inflated));

            await equivalence(original, inflated);

            for (const test of additionalTests) {
                await test({ context, original, inflated });
            }
        },
        stackOrigin(new Error().stack),
    );
}
