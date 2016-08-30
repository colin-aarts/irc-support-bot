bot = require 'irc-support-bot'

irc-options =
	server: 'some.irc.server.net'
	nick: 'my_bot'
	channels: <[ #my_bot #something_else ]>
	encoding: 'utf-8'
	pass: 'my_password'
	user:
		username: 'johndoe'
		hostname: 'intertubes'
		realname: 'johndoe'
	log: yes

bot-options =
	admins:
		* nick: 'moi',          host: 'pdpc/supporter/active/moi'
		* nick: 'someone_else', host: 'foo.bar.com'

	triggers: <[ ` . ]>

	plugins:
		'irc-support-bot-admin'
		'irc-support-bot-util'
		'irc-support-bot-url_shortener'
		'irc-support-bot-search'
		'irc-support-bot-currency_conversion'
		'irc-support-bot-validate'
		'irc-support-bot-webcompat'

	plugin-options:
		'irc-support-bot-url_shortener':
			api-key: 'your-api-key-here'

		'irc-support-bot-webcompat':
			browsers: '> 5%, last 1 Firefox version' # Poor Firefox is < 5% apparently :(

		# Et cetera.

my_bot = bot irc-options, bot-options
