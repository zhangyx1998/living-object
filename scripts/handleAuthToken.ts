import crypto from 'crypto';
import c from 'chalk';
import { PluginContext } from 'rollup';

export function handleAuthToken(this: PluginContext) {
    const token = process.env.NPM_TOKEN;
    console.log();
    if (!token) {
        console.log(
            '⚠️',
            '',
            c.yellow('No npm token available for this build'),
        );
    } else {
        const hash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex')
            .slice(0, 8)
            .toUpperCase();
        console.log(
            '🔑',
            c.green(`npm token ${c.bold.underline(hash)} (sha256)`),
        );
        this.emitFile({
            type: 'asset',
            fileName: '.npmrc',
            source: `//registry.npmjs.org/:_authToken=${token}\n`,
        });
    }
    console.log();
}
