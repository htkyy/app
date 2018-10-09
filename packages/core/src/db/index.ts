import { createConnection as connect, ConnectionOptions } from 'typeorm';
import { resolve } from 'path';
import makeDebug from 'debug';
import { requireAll } from '../requireAll';

const debug = makeDebug('r6db:core:db');

function getExport(module) {
    return Object.keys(module)
        .filter(x => x !== 'default')
        .reduce((_, key) => module[key], null);
}

export async function createConnection(path) {
    debug('create connection to', path);
    const entityRequire = requireAll(resolve(__dirname, './entities'));
    const entities = Object.keys(entityRequire)
        .sort()
        .reduce((acc, key) => {
            const e = getExport(entityRequire[key]);
            debug('loading entity', e.name);
            return acc.concat(e);
        }, []);

    const migrationRequire = requireAll(resolve(__dirname, './migrations'));
    const migrations = Object.keys(migrationRequire)
        .sort()
        .reduce((acc, key) => {
            const e = getExport(migrationRequire[key]);
            debug('loading migration', e.name);
            return acc.concat(e);
        }, []);

    const config: ConnectionOptions = {
        type: 'sqlite',
        migrations,
        entities,
        logger: 'debug',
        logging: 'query',
        database: path,
    } as any;

    const conn = await connect(config);
    debug('running pending migrations');
    await conn.runMigrations({
        transaction: true,
    });
    return conn;
}
