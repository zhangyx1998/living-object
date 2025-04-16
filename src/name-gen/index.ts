/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import globals from '../globals';
import { keywords } from '@keywords';

function* range(s: number, e: number) {
    for (let i = s; i < e; i++) {
        yield i;
    }
}

function str(codes: Iterable<number>) {
    return String.fromCharCode(...codes);
}

// 0-9: 48-57
// A-Z: 65-90
// a-z: 97-122
const A_Z = str(range(65, 90 + 1));
const a_z = str(range(97, 122 + 1));
const digits = str(range(48, 57 + 1));

export class NameGenerator {
    /**
     * Letters used for name composition
     */
    static readonly lead = A_Z + a_z;
    static readonly rest = A_Z + a_z + digits;
    static convert(n: number): string {
        const { lead, rest } = NameGenerator;
        let result = '';
        while (n >= lead.length) {
            result = rest[n % rest.length] + result;
            n = Math.floor(n / rest.length);
        }
        return lead[n] + result;
    }

    public readonly excludes: Set<string>;

    constructor(excludes: Iterable<string> = []) {
        this.excludes = new Set<string>([
            ...keywords,
            ...globals().keys,
            ...excludes,
        ]);
    }

    /**
     * Already calculated but not yet used by next()
     */
    private cached: string | undefined;
    /**
     * Peek the next generated name without consuming it.
     */
    get peek() {
        if (this.cached === undefined) {
            this.cached = this.next();
        }
        return this.cached;
    }

    private counter = 0;

    next(): string {
        if (this.cached !== undefined) {
            const next = this.cached;
            this.cached = undefined;
            return next;
        }
        while (true) {
            const next = NameGenerator.convert(this.counter++);
            if (!this.excludes.has(next)) return next;
        }
    }
}
