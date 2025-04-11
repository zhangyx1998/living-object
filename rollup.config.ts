/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { resolve } from 'path';
import { readFileSync, rmdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import { dts as dtsPlugin } from 'rollup-plugin-dts';
import terser from '@rollup/plugin-terser';
import transformREADME from './scripts/transformREADME';

const ROOT = resolve(fileURLToPath(import.meta.url), '..');
const $ = (...p: string[]) => resolve(ROOT, ...p);

function pick(input: Record<string, any>, ...keys: string[]) {
    return Object.fromEntries(keys.map((k) => [k, input[k]]));
}

function read(file: string) {
    return readFileSync($(file), 'utf-8');
}

const pkg = JSON.parse(read('package.json'));
const distKeys = [
    'name',
    'version',
    'description',
    'exports',
    'license',
    'author',
    'repository',
    'homepage',
    'bugs',
    'keywords',
    'dependencies',
];

function packageMeta(isProduction: boolean, exports = {}): Plugin {
    // In debug build, strip other fields to prevent accidental publish
    const packageJSON = isProduction
        ? pick({ ...pkg, exports }, ...distKeys)
        : { exports };
    return {
        name: 'package-meta',
        buildStart() {
            this.emitFile({
                type: 'asset',
                fileName: 'package.json',
                source: JSON.stringify(packageJSON, null, 2),
            });
            if (!isProduction) return;
            this.emitFile({
                type: 'asset',
                fileName: 'LICENSE',
                source: read('LICENSE'),
            });
            this.emitFile({
                type: 'asset',
                fileName: 'README.md',
                source: transformREADME(read('README.md'), pkg),
            });
        },
    };
}

export default defineConfig((commandLineArgs) => {
    const dst = 'dist';
    rmdirSync(dst, { recursive: true });
    const isProduction = commandLineArgs.configDebug !== true;
    const sourcemap = isProduction ? false : 'inline';
    const index = isProduction ? 'index' : 'index.debug';
    const [mjs, cjs, dts] = [`${index}.mjs`, `${index}.cjs`, `${index}.d.ts`];
    const exports = {
        '.': {
            import: `./${mjs}`,
            require: `./${cjs}`,
            types: `./${dts}`,
        },
    };
    return [
        // ESM Build
        {
            input: $('src', `index.ts`),
            output: {
                format: 'esm',
                file: $(dst, mjs),
                sourcemap,
            },
            plugins: [esbuild({ target: 'node18' }), terser()],
        },
        // CJS Build
        {
            input: $('src', `index.ts`),
            output: {
                format: 'cjs',
                file: $(dst, cjs),
                sourcemap,
            },
            plugins: [esbuild({ target: 'node18' }), terser()],
        },
        // d.ts Build
        {
            input: $('src', `index.ts`),
            output: {
                format: 'esm',
                file: $(dst, dts),
            },
            plugins: [
                dtsPlugin({ respectExternal: true }),
                packageMeta(isProduction, exports),
            ],
        },
    ];
});
