/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { FormatOptions } from './shared';
import { NameGenerator } from './name-gen';

export class CodeBlock extends Array<string> {
    toString(): string {
        throw new Error('Method not implemented.');
    }
}

export class Declaration extends CodeBlock {
    readonly type!: string;
    constructor(name: string, expr: string) {
        super([name, expr].join('='));
    }
    toString() {
        return [this.type, this.join(',')].join(' ');
    }
    static var(name: string, type: string) {
        return new Var(name, type);
    }
    static let(name: string, type: string) {
        return new Let(name, type);
    }
    static const(name: string, type: string) {
        return new Const(name, type);
    }
}

class Var extends Declaration {
    readonly type = 'var';
}
class Let extends Declaration {
    readonly type = 'let';
}
class Const extends Declaration {
    readonly type = 'const';
}

export class Statement extends CodeBlock {
    toString() {
        return this.join(';');
    }
}

export interface RegisterOptions {
    /**
     * Override name for the target object
     */
    name?: string;
    /**
     * The declaration type of the target object
     * @default "const"
     */
    type?: 'var' | 'let' | 'const';
}

export default class Code extends Array<CodeBlock> {
    public root!: string;
    private readonly nameGen!: NameGenerator;
    constructor(...reservedNames: string[]) {
        super();
        this.nameGen = new NameGenerator(reservedNames);
    }

    /**
     * #### Named objects (object => name)
     * Note: named objects may not be instantiated in the code.
     * i.e. `named` is a **superset` of `context`
     */
    readonly named = new Map<any, string>();
    /**
     * #### Declaration type for objects (object => type)
     * This map should always match the keys of `named`
     */
    readonly typed = new Map<any, 'var' | 'let' | 'const'>();

    /**
     * #### Instantiated named objects (object => name)
     * i.e. object has been declared with a name in the code.
     */
    readonly context = new Map<any, string>();

    register(obj: any, { name, type }: RegisterOptions = {}) {
        if (this.named.has(obj)) {
            if (name !== undefined && this.named.get(obj) !== name)
                throw new Error('Object already has a different name');
            if (type !== undefined && this.typed.get(obj) !== type)
                throw new Error(
                    'Object already has a different declaration type',
                );
        } else {
            this.named.set(obj, name ?? this.nameGen.next());
            this.typed.set(obj, type ?? 'const');
        }
        return {
            name: this.named.get(obj)!,
            type: this.typed.get(obj)!,
        };
    }

    instantiate(target: any, expr: string) {
        if (this.context.has(target))
            throw new Error('Object already instantiated');
        const { name, type } = this.register(target);
        this.context.set(target, name);
        this.push(Declaration[type](name, expr));
        return name;
    }

    statements = new Statement();
    /**
     * Statements are deferred after all declarations.
     */
    addStatement(...statements: string[]) {
        this.statements.push(...statements);
    }

    push(...items: CodeBlock[]) {
        for (const item of items) {
            const current = this.at(-1);
            // Check if constructor is the same
            if (current instanceof item.constructor) {
                current.push(...item);
            }
            // Otherwise, push the item
            else {
                super.push(item);
            }
        }
        return this.length;
    }

    toString(opt?: FormatOptions): string {
        const code = [...this, this.statements]
            .filter((block) => block.length > 0)
            .map((block) => block.toString())
            .join(';');
        if (opt?.useStrict ?? true) return `"use strict";\n${code};`;
        else return code + ';';
    }

    complete(statement?: (ret: string) => string, opt?: FormatOptions) {
        return [this.toString(opt), statement ? statement(this.root) + ';' : '']
            .filter(Boolean)
            .join('');
    }

    toModule(opt?: FormatOptions) {
        return this.complete((ret) => `export default ${ret}`, opt);
    }

    toFunctionBody(opt?: FormatOptions) {
        return this.complete((ret) => `return ${ret}`, opt);
    }
}
