/**
 * VECTOR :: INITIALIZATION AND SHARD MANAGEMENT
 */

import * as fs from 'fs';
// import * as util from 'util';
import { ShardingManager } from 'discord.js';
import * as pkg from '../package.json';
import * as cfg from '../config/bot.json';
import isInterface from './util/isInterface';
import Logger, { LoggingLevel } from './util/logger';
import keys from '../config/keys.json';

process.title = `Vector Bot ${pkg.version}`;

const debugMode = process.argv.includes(`--debug`) || process.argv.includes(`-d`);
let logins = 1;

const logger = new Logger();

// create directories that may or may not exist because Git(TM)
const mkdirs = [
  `./.local`,
  `./data/archive`,
  `./logs/crash`,
  `./logs/archive`,
  `./logs/all`
];

for (const item of mkdirs) {
  if (!fs.existsSync(item)) {
    fs.mkdirSync(item, { recursive: true });
  }
}

// check login count, to prevent API spam in the case of a boot loop
interface ErrorWithCode extends Error {
  code?: string
}

try {
  // try making file if it does not exist
  const data = {
    logins: 1,
    time: new Date().getTime()
  };

  fs.writeFileSync(`./data/resets`, JSON.stringify(data), { encoding: `utf8`, flag: `ax` });
} catch (e: unknown) {

  if (isInterface<ErrorWithCode>(e, `code`)) {
    if (e.code !== `EEXIST`) {
      throw e;
    }
  }

  const oldData = fs.readFileSync(`./data/resets`, { encoding: `utf8` });

  let json = {
    logins: 0,
    time: 0
  };

  try {
    // attempt to parse as JSON.
    // if the data is corrupt or otherwise invalid, we'll simply overwrite it with some default values.
    json = JSON.parse(oldData);

    logger.verbose(`filedata successful read`);
  }
  catch (je) { 
    logger.warn(`JSON data was invalid or corrupted. Overwriting with default values...`);
  }

  // if it's been more than an hour, reset the login count
  const now = new Date().getTime();
  if (now - json.time > (1000 * 60 * 60)) {
    json.logins = 0;
    json.time = now;
  }

  json.logins++;
  
  logins = json.logins;

  logger.verbose(`login count: ${json.logins}`);

  fs.writeFileSync(`./data/resets`, JSON.stringify(json), { encoding: `utf8` });
}

// check login count before proceeding
if (debugMode) {
  if (logins === cfg.loginLimit.absolute) {
    logger.fatal(`error: too many resets`);
    process.exit(1);
  }
} else {
  if (logins > cfg.loginLimit.warning) {
    logger.warn(`warning: lots of resets`);
  }
  
  if (logins > cfg.loginLimit.shutdown) {
    logger.fatal(`error: too many resets`);
    process.exit(1);
  }
}

// we did it reddit
logger.verbose(`:)`);
  
interface ShardMessage {
  type: LoggingLevel,
  content: string
};

const options = {
  token: keys.discord,
  shardArgs: [ debugMode.toString() ]
};

const shardManager = new ShardingManager(`./build/src/shard.js`, options);

shardingManager.on(`shardCreate`, shard => {
  logger.log(`Launched shard ${shard.id}`);

  const shardID = shard.id + 1;

  shard.on(`message`, (message: ShardMessage) => {
    switch (message.type) {
      case `log`: {
        logger.log(`[${shardID}] ${message.content}`);
        break;
      }
      case `warn`: {
        logger.warn(`[${shardID}] ${message.content}`);
        break;
      }
      case `error`: {
        logger.error(`[${shardID}] ${message.content}`);
        break;
      }
      case `fatal`: {
        logger.fatal(`[${shardID}] ${message.content}`);
        break;
      }
      case `verbose`: {
        logger.verbose(`[${shardID}] ${message.content}`);
        break;
      }
      default: {
        logger.warn(`[Master] Unexpected message from shard ${shardID}: ${message}`);
        break;
      }
    }
  });
});

shardManager.spawn();
