# Command Parser

Simple package used for parsing commands for chatbots on twitch or similar platform.


# Command Syntax

In any examples in this documentation `!` will be used as a prefix and `-` will be used as a option prefix.

A command that this can parse could look like this:

`!foo arg1 "long arg 2" -opt -opt -key1:val1 -key2:'long val2'`

A command consists of 4 different parts:
- _name_: The name of the command is the first word after the prefix.
  In the example above that's `foo`.
- _arguments_: Arguments are simple strings passed to the command.
  They are either single words or strings with spaces enclosed by `"` or `'`.
  In the example the two arguments are `arg1` and `long arg 2`.
- _options_: Options are a set of words.
  They are prefixed with the `option_prefix`.
  The only option in the example is `opt`.
- _parameters_: Parameters are key-value pairs.
  They are prefixed with the `option_prefix` and seperated by `:`.
  The value part of the pair can be a word or a string enclosed by `"` or `'`.
  In the example above `key1`s value is `val1` and `key2`s value is `long val2`.

# Escaping

Since `"` and `'` are used to mark the borders of long arguments and values, it's not normally possible
to include them in the string of the argument.

You can escape a long argument or value using \:
- `\"`: produces " (if `"` is used to encapsulate)
- `\'`: produces ' (if `'` is used to encapsulate)
- `\\`: produces \

# Examples

## Parsing

```ts
let settings: ParserSettings = {
    prefix: "!",
    optionPrefix: "-",
    checks: "twitch"
};

let parser = new CommandParser(settings);

let cmd: Command = parser.parse(`!ping "a long arg \\\\\\\" and \\"" -some-option -some-option 'buh \\'' -key:'value'`);
console.log(cmd);

// {
//   parserSettings: { prefix: '!', optionPrefix: '-', checks: 'twitch' },
//   name: 'ping',
//   arguments: [ 'a long arg \\" and "', "buh '" ],
//   options: Set(1) { 'some-option' },
//   parameters: Map(1) { 'key' => 'value' },
//   source: `!ping "a long arg \\\\\\" and \\"" -some-option -some-option 'buh \\'' -key:'value'`,
//   passedChecks: true
// }
```

## Checks

Since some prefixes might lead to misleading parse results, that can also depend on the platform messages are parsed from,
this package also provides checks to see if certain rules are followed.

```ts
let settings: ParserSettings = {
  prefix: "!",
  optionPrefix: "-",
  checks: "twitch"    // Checks are made for messages from twitch IRC.
};
expect(validSettings(settings)).toStrictEqual(true);

settings.optionPrefix = "opt ";
expect(validSettings(settings)).toStrictEqual(false);

// Can also easily check a parsers settings.
let parser = new CommandParser(settings);
expect(parser.validSettings()).toStrictEqual(false);

// If a parser has invalid settings parsing will throw a ValidationError.
try {
  parser.parse("!ping")
} catch (err) {
  expect(err instanceof ValidationError).toBeTruthy();
}
// If you want to avoid that even if you are aware that the settings are not valid, enable forceParse.
// forceParse is false by default if not defined.
settings.forceParse = true;
let _ = parser.parse("!ping");
```