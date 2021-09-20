/**
 * VECTOR :: COMMAND MANAGER
 */

const fs = require(`fs`);
const Command = require(`../classes/command.js`);
const memory = require(`../core/shard_memory.js`);
const log = require(`../util/logger.js`).write;

module.exports = class CommandManager {
  constructor() {
    throw new Error(`Why are you doing this? (Cannot instantiate this class.)`);
  }

  static async loadCommands() {
    memory.assets.commands = [];

    for (const file of fs.readdirSync(`./vmodules/commands/`, { withFileTypes: true })) {
      try {
        if (file == null || !file.isFile() || !file.name.endsWith(`.js`)) continue;
        const cmd = require(`../commands/${file.name}`);

        if (cmd.constructor !== Command) continue;

        let add = true;

        for (const ecmd in memory.assets.commands) {
          if (cmd.name === ecmd.name) {
            add = false;
            log(`Could not load command "${cmd.name}" (Name taken)`, `error`);
          }
        }

        if (!add) continue;

        memory.assets.commands.push(cmd);
        log(`Loaded command "${cmd.name}" from ${file.name}`);
      }
      catch (err) {
        log(`Could not load command from "${file.name}" \n${err.stack}`, `error`);
      }
    }

    log(`Successfully loaded ${memory.assets.commands.length} command(s)!`, `info`);

    return memory.assets.commands;
  }
};