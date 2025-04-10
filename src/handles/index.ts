/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { iter, concat } from "../util";

export declare namespace Hooks {
    type Ref = (target: Object | Function, immediate?: boolean) => string;
    type Inline = (val: any, immediate?: boolean) => string | undefined;
    type Defer = (
        resolve: (hooks: StatementHooks) => string | Iterable<string>,
        placeholder?: string
    ) => string;
    interface StatementHooks {
        ref: (target: Object | Function) => string;
        inline: (val: any) => string;
    }
}

export interface SerializeContext {
    /**
     * Reference the name of an object.
     * This will force the target object NOT to be inlined.
     *
     * ---
     *
     * **[NOTE]**
     * At serialization time, referenced name may not be instantiated.
     *
     * For example, the following code will **NOT** work:
     * ```js
     * serialize(obj, { ref }) {
     *   return `[ ${ref(obj)} ]`;
     * }
     * ```
     *
     * Above code produces: (assuming `obj` is assigned name "a")
     * ```js
     * // ReferenceError: Cannot access 'a' before initialization
     * const a = [ a ];
     * ```
     *
     * ---
     *
     * To ensure the target object can be referenced immediately, set
     * `immediate` to true.
     */
    ref: Hooks.Ref;
    /**
     * Get a valid JS expression or name for the object.
     * Returns undefined if the object cannot be inlined.
     */
    inline: Hooks.Inline;
    /**
     * Defer apply statements after instantiation of all objects.
     * It's callback provides a new inline function with access to wider scope.
     * The inline function always returns a valid JS expression.
     *
     * **[NOTE]**
     * The defer hook is executed immediately upon defer call.
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
                iterSelf
            ) as ArrayIterator<TypeHandle>;
        }
        return iterSelf;
    }
}

export { default as builtins } from "./builtins";

import builtins from "./builtins";

export const builtinTypeHandles = Object.freeze(
    new TypeHandles(...Object.values(builtins))
);
