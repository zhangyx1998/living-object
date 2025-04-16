/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { indexable, lazy } from './util';

function* entries(context: object) {
    for (const k of Reflect.ownKeys(context)) {
        if (typeof k !== 'string') continue;
        const desc = Reflect.getOwnPropertyDescriptor(context, k)!;
        if (!Reflect.has(desc, 'value')) continue;
        const { value } = desc;
        if (!indexable(value)) continue;
        yield [desc.value, k] as [object, string];
    }
}

class Globals extends WeakMap<object, string> {
    readonly keys = new Set<string>('globalThis');
    constructor(defaults: Record<string, any>) {
        super(entries({ globalThis }));
        this.register(defaults);
    }
    register(additional: Record<string, any>, accessor: string = '') {
        for (const [v, k] of entries(additional)) {
            if (this.has(v)) continue;
            const name = accessor.length === 0 ? k : `${accessor}.${k}`;
            if (accessor.length === 0) this.keys.add(k);
            this.set(v, name);
            this.register(v, name);
        }
    }
}

export default lazy(() => new Globals(globalThis));
