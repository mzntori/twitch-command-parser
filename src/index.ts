import {ParserSettings, SettingsChecks, validSettings} from "./settings";
import {ParseError, ValidationError} from "./error";

// Contains information about a command.
// Any examples in the documentation use `"!"` as a prefix and `"-"` as an option-prefix.
//
// -_`parserSettings`_: Settings this command was parsed with.
// -_`name`_: Name of the command.
// This is the first string after the prefix.
// e.g. `!ping` means the name is `"ping"`.
// -_`arguments`_: Array of arguments passed.
// e.g. `!ping foo -option "long bar"` has the arguments `["foo", "long bar"]`.
// -_`options`_: Set of options passed.
// Are prefixed with the option-prefix.
// e.g. `!ping -foo -foo -bar` has the options `["foo", "bar"]`
// -_`parameters`_: Map of parameters accessible by keys.
// Are prefixed with the option-prefix.
// e.g. `!ping -foo:value -foo:"long value" -bar:value` has the parameters `{"foo" => "long value", "bar" => "value"}`
// -_`source`_: String the command was parsed from.
// -_`passedChecks`_: Whether the parser Settings passed validation checks.
export interface Command {
    parserSettings: ParserSettings;
    name: string;
    arguments: Array<string>;
    options: Set<string>;
    parameters: Map<string, string>;
    source: string;
    passedChecks: boolean;
}

enum State {
    Prefix,
    Name,
    Default,
    OptionPrefix,
    Option,
    ParamConnector,
    Param,
    LongParam,
    EscapeLongParam,
    Argument,
    LongArgument,
    EscapeLongArgument
}

const re_backslash = new RegExp(/\\\\/, "g");
const re_tick = new RegExp(/\\'/, "g");
const re_doubletick = new RegExp(/\\"/, "g");

export class CommandParser {
    // Settings to use for parsing.
    settings: ParserSettings;

    constructor(settings: ParserSettings) {
        this.settings = settings;
    }

    // Sets the prefix that has to be parsed to the given string.
    setPrefix(prefix: string): void {
        this.settings.prefix = prefix;
    }

    // Sets the option prefix that has to be parsed to the given string.
    setOptionPrefix(optionPrefix: string): void {
        this.settings.optionPrefix = optionPrefix;
    }

    // Sets the platform this parser parses messages from.
    // This is not needed for parsing itself, but for validating if prefixes will work on the given platform.
    setChecks(checks: SettingsChecks): void {
        this.settings.checks = checks;
    }

    // Returns true if the settings of the parser are valid and allow for save parsing.
    validSettings(): boolean {
        return validSettings(this.settings);
    }

    // Parses a command from a string.
    // Uses the parsers settings by default but other settings can be provided.
    parse(source: string, settings?: ParserSettings): Command {
        settings = settings ? settings : this.settings;
        let settingsValidation = validSettings(settings);

        if (!settingsValidation && !settings.forceParse) {
            throw new ValidationError("error: validation failed");
        }

        let command: Command = {
            parserSettings: settings,
            name: "",
            arguments: [],
            options: new Set(),
            parameters: new Map(),
            source: source,
            passedChecks: settingsValidation,
        }

        // Make sure that if command ends on short arg, option or short param it still get pushed.
        source += " ";

        let bufferStartIndex: number = 0;
        let keyBuffer: string = "";
        let longType: "\"" | "\'" = "\"";

        let state = State.Prefix;

        for (let i = 0; i < source.length; i++) {
            const c = source[i];
            const bufferIdx = i - bufferStartIndex;

            switch (state) {
                case State.Prefix: {
                    if (c === settings.prefix[bufferIdx]) {
                        break;
                    } else if (bufferIdx < settings.prefix.length) {
                        throw new ParseError(i, `expected '${settings.prefix[bufferIdx]}'`);
                    } else if (c === " ") {
                        throw new ParseError(i, "can't have space after prefix");
                    } else {
                        bufferStartIndex = i;
                        state = State.Name;
                    }

                    break;
                }
                case State.Name: {
                    if (c === " ") {
                        command.name = source.substring(bufferStartIndex, i);
                        bufferStartIndex = i;
                        state = State.Default;
                    }

                    break;
                }
                case State.Default: {
                    if (c === " ") {
                        break;
                    } else if (c === settings.optionPrefix[0]) {
                        bufferStartIndex = i;
                        state = State.OptionPrefix;
                    } else if (c === "\"" || c === "\'") {
                        longType = c;
                        bufferStartIndex = i + 1;
                        state = State.LongArgument;
                    } else {
                        bufferStartIndex = i;
                        state = State.Argument;
                    }

                    break;
                }
                case State.OptionPrefix: {
                    if (c === settings.optionPrefix[bufferIdx]) {
                        break;
                    } else if (bufferIdx < settings.optionPrefix.length) {
                        state = State.Argument;
                    } else if (c === " ") {
                        throw new ParseError(i, "expected option, options can't be empty");
                    } else {
                        bufferStartIndex = i;
                        state = State.Option;
                    }

                    break;
                }
                case State.Option: {
                    if (c === " ") {
                        command.options.add(source.substring(bufferStartIndex, i));
                        bufferStartIndex = i;
                        state = State.Default;
                    } else if (c === ":") {
                        keyBuffer = source.substring(bufferStartIndex, i);
                        bufferStartIndex = i;
                        state = State.ParamConnector;
                    }

                    break;
                }
                case State.ParamConnector: {
                    if (c === " ") {
                        throw new ParseError(i, "parameter value can't be empty (use \"\" instead)");
                    } else if (c === "\"" || c === "\'") {
                        longType = c;
                        bufferStartIndex = i + 1;
                        state = State.LongParam;
                    } else {
                        bufferStartIndex = i;
                        state = State.Param;
                    }

                    break;
                }
                case State.Param: {
                    if (c === " ") {
                        command.parameters.set(keyBuffer, source.substring(bufferStartIndex, i));
                        bufferStartIndex = i;
                        state = State.Default;
                    }

                    break;
                }
                case State.LongParam: {
                    if (c === longType) {
                        command.parameters.set(keyBuffer, source
                            .substring(bufferStartIndex, i)
                            .replace(longType === "\"" ? re_doubletick : re_tick, longType)
                            .replace(re_backslash, "\\")
                        );
                        bufferStartIndex = i;
                        state = State.Default;
                    } else if (c === "\\") {
                        state = State.EscapeLongParam;
                    }

                    break;
                }
                case State.EscapeLongParam: {
                    if (c === "\\" || c === longType) {
                        state = State.LongParam;
                    } else {
                        throw new ParseError(i, `couldn't escape with character '${c}'`)
                    }

                    break;
                }
                case State.Argument: {
                    if (c === " ") {
                        command.arguments.push(source.substring(bufferStartIndex, i));
                        bufferStartIndex = i;
                        state = State.Default;
                    }

                    break;
                }
                case State.LongArgument: {
                    if (c === longType) {
                        command.arguments.push(source
                            .substring(bufferStartIndex, i)
                            .replace(longType === "\"" ? re_doubletick : re_tick, longType)
                            .replace(re_backslash, "\\")
                        );
                        bufferStartIndex = i;
                        state = State.Default;
                    } else if (c === "\\") {
                        state = State.EscapeLongArgument;
                    }

                    break;
                }
                case State.EscapeLongArgument: {
                    if (c === "\\" || c === longType) {
                        state = State.LongArgument;
                    } else {
                        throw new ParseError(i, `couldn't escape with character '${c}'`)
                    }

                    break;
                }
            }
        }

        return command;
    }
}