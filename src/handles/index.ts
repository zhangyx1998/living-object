/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { iter, concat } from '../util';

export declare namespace Hooks {
    type Ref = (target: Object | Function) => string;

    type Inline<Immediate extends boolean> = (
        val: any,
    ) => Immediate extends true ? string : string | undefined;

    type Defer = (
        resolve: (hooks: StatementHooks) => string | Iterable<string>,
        placeholder?: string,
    ) => string;

    interface StatementHooks {
        ref: Ref;
        inline: Inline<true>;
    }
}

export interface SerializeContext {
    /**
     * Reference the name of an object.
     * This will force the target object NOT to be inlined.
     */
    ref: Hooks.Ref & {
        /**
         * Allow reference to objects that have not been instantiated yet.
         */
        async: Hooks.Ref;
    };
    /**
     * Get a valid JS expression or name for the object.
     * Returns undefined if the object cannot be inlined.
     */
    inline: Hooks.Inline<false> & {
        /*
         * Allow reference to objects that have not been instantiated yet.
         */
        async: Hooks.Inline<false>;
        /**
         * Force synchronous inline expression, throws error on failure.
         */
        force: Hooks.Inline<true>;
    };
    /**
     * Defer statement(s) after all objects have been instantiated.
     * It's callback provides a new context, i.e. `ref` and `inline` with wider
     * scope of access.
     *
     * **[NOTE]**
     * Do not reuse `inline` or `ref` provided by `serialize` in defer callback.
     *
     * @argument {Defer.DeferCallback} resolve -- The callback to resolve the
     * deferred statement.
     * @argument {string} placeholder -- Optional placeholder expression to be
     * returned as-is. Default placeholder is literal `0`.
     */
    defer: Hooks.Defer;
}

export interface AccessContext<T> extends Hooks.StatementHooks {
    src: T;
    dst: any;
    hint: any;
}

export interface TypeHandle<T = any> {
    /**
     * Return true if current type handle could handle the object
     */
    match(obj: any): boolean;
    /**
     * Enumerate the direct children of an object
     */
    traverse?(obj: T): Iterable<any> | undefined;
    /**
     * Return a valid JS expression to serialize the object,
     * the serialized object may not be fully initialized.
     * Additional properties may be added later by the defer callback.
     */
    serialize(obj: T, context: SerializeContext): string;

    /**
     * @experimental Under development, currently ignored
     * Optional handle to access child properties
     * @returns {string | undefined} -- The expression to access a child object
     */
    access?(name: string, context: AccessContext<T>): string | undefined;
}

export class TypeHandles extends Array<TypeHandle> {
    extends?: TypeHandles;

    constructor(...handles: TypeHandle[]) {
        super(...handles);
    }

    resolve(obj: any): TypeHandle {
        for (const handle of this) {
            if (handle.match(obj)) {
                return handle;
            }
        }
        throw new Error(`No handle registered for ${obj}`);
    }

    extend(...handles: TypeHandle[]) {
        return new TypeHandles(...handles, ...this);
    }

    [Symbol.iterator](): ArrayIterator<TypeHandle> {
        const iterSelf = super[Symbol.iterator]();
        if (this.extends) {
            return concat(
                iter(this.extends),
                iterSelf,
            ) as ArrayIterator<TypeHandle>;
        }
        return iterSelf;
    }
}

export { default as builtins } from './builtins';

import builtins from './builtins';

export const builtinTypeHandles = Object.freeze(
    new TypeHandles(...Object.values(builtins)),
);
