/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import terser from '@rollup/plugin-terser';
import { readFileSync, rmdirSync } from 'fs';
import { resolve } from 'path';
import { defineConfig, type Plugin } from 'rollup';
import { dts as dtsPlugin } from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import { fileURLToPath } from 'url';
import transformREADME from './scripts/transformREADME';
import { handleAuthToken } from './scripts/handleAuthToken';
import { globalsLoader } from './scripts/globals-loader';
import { keywordsLoader } from './scripts/keywords-loader';

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
    'engines',
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
            handleAuthToken.call(this);
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
    const plugins = [
        globalsLoader(),
        keywordsLoader(),
        esbuild({ target: 'node18' }),
    ];
    if (isProduction) {
        plugins.push(terser());
    }
    return [
        // ESM Build
        {
            input: $('src', `index.ts`),
            output: {
                format: 'esm',
                file: $(dst, mjs),
                sourcemap,
                exports: 'named',
            },
            external: ['node:vm'],
            plugins,
        },
        // CJS Build
        {
            input: $('src', `index.ts`),
            output: {
                format: 'cjs',
                file: $(dst, cjs),
                sourcemap,
                exports: 'named',
            },
            external: ['node:vm'],
            plugins,
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
