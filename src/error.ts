export class ParseError extends Error {
    constructor(index: number, message: string) {
        super(`parsing error: at index ${index} - ${message}`);
        this.name = "ParseError";
    }
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}