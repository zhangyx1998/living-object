/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

declare module '@globals' {
    export const universal: typeof globalThis;
    export const nodejs: typeof globalThis;
}

declare module '@keywords' {
    export const keywords: string[];
}
