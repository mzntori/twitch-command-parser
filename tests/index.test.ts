import {Command, CommandParser} from "../src";
import {ParserSettings, validSettings} from "../src/settings";
import {ValidationError} from "../src/error";

describe('testing command parser', () => {
    test("constructor", () => {
        let parser = new CommandParser({prefix: "!", optionPrefix: "-"});

        expect(parser.settings).toStrictEqual({prefix: "!", optionPrefix: "-"});
    });

    test("parse prefix and name", () => {
        const test1: string = "!foo arg1 \"long arg 2\" -opt -opt -key1:val1 -key2:\"long val2\"";
        const test3: string = `do ping "a long arg \\\\\\\" and \\"" opt:some-option opt:some-option option-arg org 'buh \\'' opt:key:'value'`;

        let parser1 = new CommandParser({prefix: "!", optionPrefix: "-"});

        let res1 = parser1.parse(test1);
        console.log(res1);

        let parser2 = new CommandParser({
            prefix: "do ",
            optionPrefix: "opt: ",
            forceParse: true,
        });

        console.log(parser2.parse(test3));
    })

    test("example parsing", () => {
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
    })

    test("example checks", () => {
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
    })
});