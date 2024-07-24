// ## minimum
// `"minimum"`: Minimum checks will be performed that are required for the parser to work as expected.
// Does not test anything on prefix.
// To pass tests the option-prefix has to follow these rules:
// 1. Does not start with `"` or `'`. (e.g. `"'foo"` is not valid, `"foo"` is)
// 2. Does not contain spaces. (e.g. `"opt "` is not valid, `"opt="` is)
// 3. Does at least have 1 character. (e.g. `""` is not valid, `"!"` is)
// ## twitch
// `"twitch"`: Extra checks for Twitch-IRC, mostly centered around Twitch-IRC not allowing for double spaces or messages starting with a space.
// This also performs the checks of `"minimum"`.
// In addition to the requirements of `"minimum"` the prefix must follow the following rules:
// 1. Does not start with `space`. (e.g. `" do "` is not valid, `"do "` is)
// 2. Does not contain 2 consecutive spaces. (e.g. `"do[space][space]"` is not valid, `"do[space]"` is valid)
export type SettingsChecks = "minimum" | "twitch";

export interface ParserSettings {
    // Prefix of a command.
    // String has to start with this string to count as a command.
    prefix: string;
    // Prefix for options and parameters.
    optionPrefix: string;
    // Defines the type of checks.
    // This setting enables or disables certain checks.
    // For more information see documentation of the `SettingsChecks`.
    //
    // If not provided validations will use `"minimum"` by default.
    checks?: SettingsChecks;
    // If enabled forces the parser to parse, even if prefixes could result in unpredicted results.
    // Only enable if you know what you are doing.
    // If disabled or not defined parsing will throw a `ValidationError` if settings aren't valid.
    forceParse?: boolean;
}

const anyOptionPrefixValidation = new RegExp("(^\"|\')|(^$)|( )");

const twitchPrefixValidation = new RegExp("(^ )|( {2})");
const twitchOptionPrefixValidation = new RegExp("(^\"|\')|(^$)|( )");

// Returns true if settings are valid.
export function validSettings(settings: ParserSettings): boolean {
    let checks: SettingsChecks = settings.checks ? settings.checks : "minimum";

    switch (checks) {
        case "twitch": {
            if (settings.prefix.match(twitchPrefixValidation)) {
                return false;
            }

            if (settings.optionPrefix.match(twitchOptionPrefixValidation)) {
                return false;
            }
            break;
        }
        default: {
            // No need to check for normal prefix here.
            if (settings.optionPrefix.match(anyOptionPrefixValidation)) {
                return false;
            }
            break;
        }
    }

    return true;
}