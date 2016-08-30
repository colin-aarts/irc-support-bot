// Generated by LiveScript 1.5.0
(function(){
  var bot, ircOptions, botOptions, my_bot;
  bot = require('irc-support-bot');
  ircOptions = {
    server: 'some.irc.server.net',
    nick: 'my_bot',
    channels: ['#my_bot', '#something_else'],
    encoding: 'utf-8',
    pass: 'my_password',
    user: {
      username: 'johndoe',
      hostname: 'intertubes',
      realname: 'johndoe'
    },
    log: true
  };
  botOptions = {
    admins: [
      {
        nick: 'moi',
        host: 'pdpc/supporter/active/moi'
      }, {
        nick: 'someone_else',
        host: 'foo.bar.com'
      }
    ],
    triggers: ['`', '.'],
    plugins: ['irc-support-bot-admin', 'irc-support-bot-util', 'irc-support-bot-url_shortener', 'irc-support-bot-search', 'irc-support-bot-currency_conversion', 'irc-support-bot-validate', 'irc-support-bot-webcompat'],
    pluginOptions: {
      'irc-support-bot-url_shortener': {
        apiKey: 'your-api-key-here'
      },
      'irc-support-bot-webcompat': {
        browsers: '> 5%, last 1 Firefox version'
      }
    }
  };
  my_bot = bot(ircOptions, botOptions);
}).call(this);