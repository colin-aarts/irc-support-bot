util = require 'util'
fs   = require 'fs'

IRC  = require 'irc-js'
js   = require 'js-extensions'


bot =
	init: ->

		# Load factoids store
		@factoids = @load_factoids()

		# Set up the backlog
		@backlog = {}

		# Escape the bot triggers and turn them into a string suitable for use in a regexp
		@re_triggers = (@bot-options.triggers.map (trigger) -> js.re_escape trigger).join '|'

		# Set up the message callback registry
		@message_callbacks = []

		# Set up the special commands registry
		@special_commands = {}

		# Load plug-ins
		@plugins = @load_plugins()

		# Set up an IRC-js instance
		@irc = new IRC @irc-options

		# Lift-off
		@connect()


	connect: ->

		<~ @irc.connect

		# Log
		console.log "Connected to network (#{this.irc-options.server})."

		# Join channels
		for channel in @irc-options.channels
			@irc.join channel

		# Start listening for messages
		@irc.addListener 'privmsg', (event) ~>

			# event =
			#   person:
			#     nick: <nick>
			#     user: <user>
			#     host: <host>
			#   command: <command>
			#   params: [<recipient>, <message>]
			#   raw: <raw input>

			event.recipient = event.params[0]
			event.message   = event.params[1]

			# Add the message to the backlog
			# TODO: don't do this if user is ignored or if special command is used?
			if event.recipient[0] is '#' # Only if the recipient is a channel

				# Create an entry for the channel if necessary
				@backlog[event.recipient] or= []

				# Add the message
				@backlog[event.recipient].unshift event.message

				# Pop the stack if > 100
				# TODO: make this configurable?
				@backlog[event.recipient].pop() if @backlog[event.recipient].length > 100

			# See if we have a match for the bot
			input_match = event.message.match //
				^
				(#{@re_triggers})		# Bot triggers
				(.+?)					# Command or factoid name
				(						# Start intent group (optional)
					(\s+([@>%])\s+)		# 	@ > %
					(.*?)				# 	Target (nickname)
				)?
				(						# Start comment group (optional)
					(?:\s+\#\s*)		# 	Hashmark (#)
					(.*)				# 	Comment
				)?
				$
				//i
			return if not input_match

			# Arrange the data
			input_data =
				trigger: input_match[1]
				command: input_match[2]
				target_method: input_match[5]
				target: input_match[6]
				comment: input_match[8]
				is_special: false
				args: ''
				flags: []

			# Special command?
			do ~>
				command_match = input_data.command.match //
					^
					(\S+?)		# Command
					(/(\S+))?	# Flags (optional)
					(\s+(.+))?	# Args (optional)
					$
				//

				if command_match and command_match[1] of @special_commands
					input_data.is_special = true
					input_data.command = command_match[1]
					input_data.flags = command_match[3].split '' if command_match[3]
					input_data.args = command_match[5] or ''

			# Populate output data
			output_data = this.get_output_data event, input_data

			console.log "\n\n===== Command received (#{new Date!to-string!}) ====="
			console.log '\n----- Event data -----'
			console.log event
			console.log '\n----- Input data -----'
			console.log util.inspect input_data
			console.log '\n----- Output data -----'
			console.log util.inspect output_data

			# Excute incoming message callbacks
			callback_results = []
			for fn in this.message_callbacks
				callback_results.push fn event, input_data, output_data
			for result in callback_results
				# If any of the incoming message callback return values is `false`, we silently abort processing right here.
				return if result is false

			if input_data.is_special
				this.handle_command event, input_data, output_data
			else
				this.handle_factoid event, input_data, output_data


	load_factoids: ->

		factoids_json = fs.readFileSync "#{process.cwd()}/factoids.json", 'utf-8'
		return if not factoids_json # TODO: proper error handling / graceful exiting
		return JSON.parse factoids_json


	save_factoids: ->

		factoids_json = JSON.stringify @factoids
		fs.writeFile "#{process.cwd()}/factoids.json", factoids_json, 'utf-8'


	load_plugins: ->

		plugins = {}

		for plugin_name in @bot-options.plugins
			plugins[plugin_name] = (require plugin_name).call @

		return plugins


	send: (method, target, messages) ->

		messages = [messages] if not Array.isArray messages

		do iter = ~>
			if messages.length
				@irc[method] target, do messages.shift, true
				if messages.length
					set-timeout iter, 1000


	format_output: (message, input_data) ->

		# Only handle single messages, not arrays of messages:
		# It is assumed that arrays of messages are never sent to channels and as such no targeting is needed.
		return if Array.isArray message

		return "#{input_data.target}, #{message}" if input_data.target and input_data.target_method is '@'
		return message


	get_output_data: (event, input_data) ->

		output_data =
			recipient: undefined
			method: undefined
			is_admin: false

		# Determine recipient
		if input_data.target
			switch input_data.target_method
				when '>', '%' then output_data.recipient = input_data.target
				when '@'      then output_data.recipient = event.recipient

		else if event.recipient[0] is '#'
			output_data.recipient = event.recipient
		else
			output_data.recipient = event.person.nick

		# Determine IRC method
		if input_data.target_method is '%'
			output_data.method = 'notice'
		else
			output_data.method = 'privmsg'

		# See if the sender has admin priviledges
		output_data.is_admin = @user_match @bot-options.admins, { nick: event.person.nick, host: event.person.host }

		#
		return output_data


	handle_factoid: (event, input_data, output_data) ->

		factoid_name = input_data.command.toLowerCase()
		factoid_exists = factoid_name of @factoids

		if factoid_exists
			factoid_content = @factoids[factoid_name]

			# Alias?
			is_alias = /^alias:/.test factoid_content

			if is_alias
				alias_target = factoid_content.replace /^alias:/, ''
				alias_target_exists = alias_target of @factoids

				if not alias_target_exists
					message = "« #{factoid_name} » is an alias leading to a non-existent factoid « #{alias_target} »; please contact an administrator (see « #{input_data.trigger}admins ») so they can clean it up :)"
				else
					message = @factoids[alias_target]
			else
				message = factoid_content

			# Targeted?
			message = @format_output message, input_data

		else
			message = "#{event.person.nick}, no such command '#{factoid_name}'. Try #{input_data.trigger}search <query> to search for factoids or see #{input_data.trigger}commands"

		# Send
		@send output_data.method, output_data.recipient, message


	handle_command: (event, input_data, output_data) ->

		command = @special_commands[input_data.command]

		if (not command.admin_only) or (command.admin_only and output_data.is_admin)
			command.fn event, input_data, output_data
		else
			message = '''Sorry, you have to be an admin to use this command'''
			@send 'notice', event.person.nick, message



	#
	#	Utility
	#

	factoid_get_aliases: (needle) ->

		aliases = []

		for own factoid_name, factoid_content of @factoids
			aliases.push factoid_name if factoid_content is "alias:#{needle}"

		if aliases.length
			return aliases
		else
			return null


	user_match: (user_list, target_user) ->

		is_match = false

		for iterated_user in user_list
			# User is considered a match if one of the following conditions is met:
			# • nick matches registered nick, and no host is registered (null), -or-
			# • host matches registered host, and no nick is registered (null), -or-
			# • both match.
			# This means that if both nick and host are registered, both *must* match.
			# Note: registered host is compared to the end of the host string as sent by the server (i.e. /<host>$/).
			is_host_match = if iterated_user.host isnt null then (new RegExp "#{js.re_escape iterated_user.host}$", 'i').test target_user.host else false

			if (iterated_user.nick and iterated_user.nick is target_user.nick and not iterated_user.host) or
				(iterated_user.host and is_host_match and not iterated_user.nick) or
				(iterated_user.host and is_host_match and iterated_user.nick and iterated_user.nick is target_user.nick)
				is_match = true

		return is_match



	#
	#	The following functions are for plug-ins to use
	#

	register_special_command: (data) ->

		if not data or not data.name or not data.fn
			console.log "Could not load plug-in command '#{data.name}'"
			return

		if data.name of @special_commands
			console.log "Command '#{data.name} of plug-in #{data.plugin} already exists. Aborting."
			return

		this.special_commands[data.name] =
			name: data.name
			description: data.description
			admin_only: data.admin_only or false
			fn: data.fn


	register_message_callback: (fn) ->

		if not fn
			console.log "Could not register message callback"
			return

		@message_callbacks.push fn



#
#	Exports
#

module.exports = (irc-options, bot-options) ->

	a-bot = Object.create bot,
		irc-options: { value: irc-options, enumerable: true }
		bot-options: { value: bot-options, enumerable: true }

	do a-bot.init

	return a-bot
