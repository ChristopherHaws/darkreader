// @ts-check
import * as rollup from 'rollup';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
/** @type {any} */
import rollupPluginReplace from '@rollup/plugin-replace';
/** @type {any} */
import rollupPluginTypescript from '@rollup/plugin-typescript';
import typescript from 'typescript';
import fs from 'fs';
import os from 'os';
import {createTask} from './task.js';
import paths from './paths.js';
const {rootDir, rootPath} = paths;

async function getVersion() {
    const file = await fs.promises.readFile(new URL('../package.json', import.meta.url));
    const p = JSON.parse(file);
    return p.version;
}

let watchFiles = [];

async function bundleAPI({debug, watch}) {
    const src = rootPath('src/ddg/prepare-fixes.ts');
    const dest = 'ddg/prepare-fixes.js';
    const bundle = await rollup.rollup({
        input: src,
        plugins: [
            rollupPluginNodeResolve(),
            rollupPluginTypescript({
                rootDir,
                typescript,
                tsconfig: rootPath('src/ddg/tsconfig.json'),
                noImplicitAny: debug ? false : true,
                removeComments: debug ? false : true,
                sourceMap: debug ? true : false,
                inlineSources: debug ? true : false,
                noEmitOnError: watch ? false : true,
                cacheDir: debug ? `${fs.realpathSync(os.tmpdir())}/darkreader_api_typescript_cache` : undefined,
            }),
            rollupPluginReplace({
                preventAssignment: true,
                __DEBUG__: false,
                __CHROMIUM_MV2__: false,
                __CHROMIUM_MV3__: false,
                __FIREFOX__: false,
                __THUNDERBIRD__: false,
                __TEST__: false,
            }),
        ].filter((x) => x)
    });
    watchFiles = bundle.watchFiles;
    await bundle.write({
        banner: `/**\n * Dark Reader v${await getVersion()}\n * https://darkreader.org/\n */\n`,
        file: dest,
        strict: true,
        format: 'umd',
        name: 'DarkReader',
        sourcemap: debug ? 'inline' : false,
    });
}

const bundleAPITask = createTask(
    'bundle-ddg',
    bundleAPI,
).addWatcher(
    () => {
        return watchFiles;
    },
    async (changedFiles, watcher) => {
        const oldWatchFiles = watchFiles;
        await bundleAPI({debug: true, watch: true});

        watcher.unwatch(
            oldWatchFiles.filter((oldFile) => !watchFiles.includes(oldFile))
        );
        watcher.add(
            watchFiles.filter((newFile) => oldWatchFiles.includes(newFile))
        );
    },
);

export default bundleAPITask;