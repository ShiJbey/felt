import * as datascript from 'datascript';
import * as utils from './utils';
declare type EffectCallback = (db: datascript.Database, effect: any) => datascript.Database;
export interface Action {
    tagline: string;
    where: string[];
    event: any;
    name: string;
    lvars: string[];
    wherePart: string;
    pattern: SiftingPattern;
    find: string;
    query: string;
    findPart: string;
}
export interface Effect {
    type: string;
}
export interface SiftingPatternClause {
    clauseStr: string;
    lvars: string[];
    original: string;
}
export interface SiftingPattern {
    name: string;
    lvars: string[];
    clauses: SiftingPatternClause[];
    query: string;
    findPart: string;
    wherePart: string;
}
export declare class Felt {
    private queryRules;
    private queryRuleNames;
    private siftingPatternLibrary;
    private actionLibrary;
    private effectHandlers;
    constructor();
    allActions(): Action[];
    setQueryRules(rules: string): void;
    findLvars(s: string): string[];
    quotewrapIfNeeded(part: string): string;
    parseSiftingPatternClause(line: string): {
        clauseStr: string;
        lvars: string[];
        original: string;
    };
    parseSiftingPattern(lines: string[], name?: string): SiftingPattern;
    registerSiftingPattern(name: string, patternLines: string[]): void;
    runSiftingPattern(db: datascript.Database, pattern: SiftingPattern): any[];
    runSiftingPatternByName(db: datascript.Database, patternName: string): any[];
    runSiftingPatterns(db: datascript.Database): any[];
    registerAction(name: string, action: Action): void;
    registerEffectHandler(name: string, handler: EffectCallback): void;
    checkEffectKeys(effect: any, requiredKeys: string[], optionalKeys: string[]): void;
    processEffect(db: datascript.Database, effect: Effect): datascript.Database;
    addEvent(db: datascript.Database, event: any): datascript.Database;
    realizeEvent(action: Action, bindings: any): any;
    possibleActions(db: datascript.Database, allActions: Action[]): {
        action: Action;
        bindings: any[];
    }[];
    possibleActionsByType(db: datascript.Database, allActions: Action[]): utils.PropertyMap;
}
export {};
//# sourceMappingURL=felt.d.ts.map