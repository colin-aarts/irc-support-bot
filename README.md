# irc-support-bot

A simple IRC bot implemented on top of [IRC-js](https://github.com/gf3/IRC-js), with support for plug-ins.

## Installation

	npm install irc-support-bot

## In the wild

The main support bot in the [#html](irc://irc.freenode.net/html) channel on [Freenode IRC](http://freenode.net) uses **irc-support-bot**. He listens to the name **rivvles** and his triggers are **`** and **]**. He also has his own channel, [#rivvles](irc://irc.freenode.net/rivvles), which can be used to discuss **irc-support-bot** as well.

## Running a bot

See the [examples](examples).

## Configuration

See the [examples](examples). Better docs later. Maybe.

## Features

### Factoid syntax

`<trigger><factoid-name>`, e.g. `!hello world`

### Command syntax

`<trigger><command-name>[/<flags>][ <arguments>]`, e.g. `!search/n foo bar baz`.

### Intents

```
!foo @ johndoe
!foo > johndoe
!foo % johndoe
```

`@` addresses `johndoe` in the channel or query of origin; `>` sends the message by query; `%` sends the message by notice.

### Comments

```
!foo # this is just a comment
!foo @ johndoe # this is just a comment
```

## Plug-ins

### API

A plug-in is a Node.js module. Assign a function to the `module.exports` object; the function is called with `this` set to the bot instance. A plug-in has full and unlimited access to the bot instance; no hand-holding for now.

Register a special command by calling `this.register_special_command` with a configuration object as its sole argument; see any of the [official plug-ins](wiki/Plugins) for examples.

You can also register an incoming message callback by calling `this.register_message_callback` with a function as its sole argument. See the [irc-support-bot-admin official plug-in](...) for an example. You can use this to audit incoming messages. Return `false` to silently stop processing immediately. This is used in the admin plug-in to ignore users that are on the ignore list.

### Official plug-ins

**irc-support-bot** has several official plug-ins available for your convenience. The 'admin' module is probably essential, but for modularity's sake, it is still provided as an optional plug-in. There's a [list](../../wiki/Plugins) on the wiki.

## Todo

This is a rewrite in LiveScript (from CoffeeScript), but the plug-in API methods still use snake-case. I'll probably want to change this to kebab-case at some point, like other identifiers.

## License

[UNLICENSE](UNLICENSE) yo.
