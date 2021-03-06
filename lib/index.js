// Generated by LiveScript 1.5.0
(function(){
  var util, fs, IRC, js, bot;
  util = require('util');
  fs = require('fs');
  IRC = require('irc-js');
  js = require('js-extensions');
  bot = {
    init: function(){
      this.factoids = this.load_factoids();
      this.backlog = {};
      this.re_triggers = this.botOptions.triggers.map(function(trigger){
        return js.re_escape(trigger);
      }).join('|');
      this.message_callbacks = [];
      this.special_commands = {};
      this.plugins = this.load_plugins();
      this.irc = new IRC(this.ircOptions);
      return this.connect();
    },
    connect: function(){
      var this$ = this;
      return this.irc.connect(function(){
        var i$, ref$, len$, channel;
        console.log("Connected to network (" + this$.ircOptions.server + ").");
        for (i$ = 0, len$ = (ref$ = this$.ircOptions.channels).length; i$ < len$; ++i$) {
          channel = ref$[i$];
          this$.irc.join(channel);
        }
        return this$.irc.addListener('privmsg', function(event){
          var ref$, key$, input_match, input_data, output_data, callback_results, i$, len$, fn, result;
          event.recipient = event.params[0];
          event.message = event.params[1];
          if (event.recipient[0] === '#') {
            (ref$ = this$.backlog)[key$ = event.recipient] || (ref$[key$] = []);
            this$.backlog[event.recipient].unshift(event.message);
            if (this$.backlog[event.recipient].length > 100) {
              this$.backlog[event.recipient].pop();
            }
          }
          input_match = event.message.match(RegExp('^(' + this$.re_triggers + ')(.+?)((\\s+([@>%])\\s+)(.*?))?((?:\\s+\\#\\s*)(.*))?$', 'i'));
          if (!input_match) {
            return;
          }
          input_data = {
            trigger: input_match[1],
            command: input_match[2],
            target_method: input_match[5],
            target: input_match[6],
            comment: input_match[8],
            is_special: false,
            args: '',
            flags: []
          };
          (function(){
            var command_match;
            command_match = input_data.command.match(/^(\S+?)(\/(\S+))?(\s+(.+))?$/);
            if (command_match && command_match[1] in this$.special_commands) {
              input_data.is_special = true;
              input_data.command = command_match[1];
              if (command_match[3]) {
                input_data.flags = command_match[3].split('');
              }
              return input_data.args = command_match[5] || '';
            }
          })();
          output_data = this$.get_output_data(event, input_data);
          console.log("\n\n===== Command received (" + new Date().toString() + ") =====");
          console.log('\n----- Event data -----');
          console.log(event);
          console.log('\n----- Input data -----');
          console.log(util.inspect(input_data));
          console.log('\n----- Output data -----');
          console.log(util.inspect(output_data));
          callback_results = [];
          for (i$ = 0, len$ = (ref$ = this$.message_callbacks).length; i$ < len$; ++i$) {
            fn = ref$[i$];
            callback_results.push(fn(event, input_data, output_data));
          }
          for (i$ = 0, len$ = callback_results.length; i$ < len$; ++i$) {
            result = callback_results[i$];
            if (result === false) {
              return;
            }
          }
          if (input_data.is_special) {
            return this$.handle_command(event, input_data, output_data);
          } else {
            return this$.handle_factoid(event, input_data, output_data);
          }
        });
      });
    },
    load_factoids: function(){
      var factoids_json;
      factoids_json = fs.readFileSync(process.cwd() + "/factoids.json", 'utf-8');
      if (!factoids_json) {
        return;
      }
      return JSON.parse(factoids_json);
    },
    save_factoids: function(){
      var factoids_json;
      factoids_json = JSON.stringify(this.factoids);
      return fs.writeFile(process.cwd() + "/factoids.json", factoids_json, 'utf-8');
    },
    load_plugins: function(){
      var plugins, i$, ref$, len$, plugin_name;
      plugins = {};
      for (i$ = 0, len$ = (ref$ = this.botOptions.plugins).length; i$ < len$; ++i$) {
        plugin_name = ref$[i$];
        plugins[plugin_name] = require(plugin_name).call(this);
      }
      return plugins;
    },
    send: function(method, target, messages){
      var iter, this$ = this;
      if (!Array.isArray(messages)) {
        messages = [messages];
      }
      return (iter = function(){
        if (messages.length) {
          this$.irc[method](target, messages.shift(), true);
          if (messages.length) {
            return setTimeout(iter, 1000);
          }
        }
      })();
    },
    format_output: function(message, input_data){
      if (Array.isArray(message)) {
        return;
      }
      if (input_data.target && input_data.target_method === '@') {
        return input_data.target + ", " + message;
      }
      return message;
    },
    get_output_data: function(event, input_data){
      var output_data;
      output_data = {
        recipient: undefined,
        method: undefined,
        is_admin: false
      };
      if (input_data.target) {
        switch (input_data.target_method) {
        case '>':
        case '%':
          output_data.recipient = input_data.target;
          break;
        case '@':
          output_data.recipient = event.recipient;
        }
      } else if (event.recipient[0] === '#') {
        output_data.recipient = event.recipient;
      } else {
        output_data.recipient = event.person.nick;
      }
      if (input_data.target_method === '%') {
        output_data.method = 'notice';
      } else {
        output_data.method = 'privmsg';
      }
      output_data.is_admin = this.user_match(this.botOptions.admins, {
        nick: event.person.nick,
        host: event.person.host
      });
      return output_data;
    },
    handle_factoid: function(event, input_data, output_data){
      var factoid_name, factoid_exists, factoid_content, is_alias, alias_target, alias_target_exists, message;
      factoid_name = input_data.command.toLowerCase();
      factoid_exists = factoid_name in this.factoids;
      if (factoid_exists) {
        factoid_content = this.factoids[factoid_name];
        is_alias = /^alias:/.test(factoid_content);
        if (is_alias) {
          alias_target = factoid_content.replace(/^alias:/, '');
          alias_target_exists = alias_target in this.factoids;
          if (!alias_target_exists) {
            message = "« " + factoid_name + " » is an alias leading to a non-existent factoid « " + alias_target + " »; please contact an administrator (see « " + input_data.trigger + "admins ») so they can clean it up :)";
          } else {
            message = this.factoids[alias_target];
          }
        } else {
          message = factoid_content;
        }
        message = this.format_output(message, input_data);
      } else {
        message = event.person.nick + ", no such command '" + factoid_name + "'. Try " + input_data.trigger + "search <query> to search for factoids or see " + input_data.trigger + "commands";
      }
      return this.send(output_data.method, output_data.recipient, message);
    },
    handle_command: function(event, input_data, output_data){
      var command, message;
      command = this.special_commands[input_data.command];
      if (!command.admin_only || (command.admin_only && output_data.is_admin)) {
        return command.fn(event, input_data, output_data);
      } else {
        message = 'Sorry, you have to be an admin to use this command';
        return this.send('notice', event.person.nick, message);
      }
    },
    factoid_get_aliases: function(needle){
      var aliases, factoid_name, ref$, factoid_content, own$ = {}.hasOwnProperty;
      aliases = [];
      for (factoid_name in ref$ = this.factoids) if (own$.call(ref$, factoid_name)) {
        factoid_content = ref$[factoid_name];
        if (factoid_content === "alias:" + needle) {
          aliases.push(factoid_name);
        }
      }
      if (aliases.length) {
        return aliases;
      } else {
        return null;
      }
    },
    user_match: function(user_list, target_user){
      var is_match, i$, len$, iterated_user, is_host_match;
      is_match = false;
      for (i$ = 0, len$ = user_list.length; i$ < len$; ++i$) {
        iterated_user = user_list[i$];
        is_host_match = iterated_user.host !== null ? new RegExp(js.re_escape(iterated_user.host) + "$", 'i').test(target_user.host) : false;
        if ((iterated_user.nick && iterated_user.nick === target_user.nick && !iterated_user.host) || (iterated_user.host && is_host_match && !iterated_user.nick) || (iterated_user.host && is_host_match && iterated_user.nick && iterated_user.nick === target_user.nick)) {
          is_match = true;
        }
      }
      return is_match;
    },
    register_special_command: function(data){
      if (!data || !data.name || !data.fn) {
        console.log("Could not load plug-in command '" + data.name + "'");
        return;
      }
      if (data.name in this.special_commands) {
        console.log("Command '" + data.name + " of plug-in " + data.plugin + " already exists. Aborting.");
        return;
      }
      return this.special_commands[data.name] = {
        name: data.name,
        description: data.description,
        admin_only: data.admin_only || false,
        fn: data.fn
      };
    },
    register_message_callback: function(fn){
      if (!fn) {
        console.log("Could not register message callback");
        return;
      }
      return this.message_callbacks.push(fn);
    }
  };
  module.exports = function(ircOptions, botOptions){
    var aBot;
    aBot = Object.create(bot, {
      ircOptions: {
        value: ircOptions,
        enumerable: true
      },
      botOptions: {
        value: botOptions,
        enumerable: true
      }
    });
    aBot.init();
    return aBot;
  };
}).call(this);
