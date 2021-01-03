//  ES6 Module version of the Felt library by: Max Kreminski
import * as datascript from 'datascript';
import * as _ from 'lodash';
import * as utils from './utils';



type EffectCallback = (db: datascript.Database, effect: any) => datascript.Database;

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

export class Felt {

    private queryRules: string;
    private queryRuleNames: any[];
    private siftingPatternLibrary: Map<string, SiftingPattern>;
    private actionLibrary: Map<string, Action>;
    private effectHandlers: Map<string, EffectCallback>;

    constructor() {
        this.queryRules = '';
        this.queryRuleNames = [];
        this.siftingPatternLibrary = new Map<string, SiftingPattern>();
        this.actionLibrary = new Map<string, Action>();
        this.effectHandlers = new Map<string, EffectCallback>();
    }

    /** Get all actions from action library */
    allActions(): Action[] {
        let actions: Action[] = [];
        for (const value of this.actionLibrary.values()) {
            actions.push(value);
        }
        return actions;
    }

    /// REGISTER QUERY RULES

    /**
     * Given a string specifying a set of DataScript query rules,
     * pre-process these rules and make them available to sifting patterns.
     */
    setQueryRules(rules: string): void {
        this.queryRules = rules;
        // Parse out the names of individual rules, so we can check whether a given complex clause
        // is referencing a rule or not when we parse sifting patterns.
        // FIXME This is super fragile right now, because it assumes a very particular indentation style
        // in the string used to specify the query rules, so we should definitely improve this.
        let matches = rules.match(/^\[\([a-zA-Z0-9_]*/gm);
        if (matches) {
            const ruleNameMatches = matches.map(rn => rn.substring(2));
            this.queryRuleNames = ruleNameMatches;
        } else {
            console.error('No query rules found');
        }
    }

    /// PARSE SIFTING PATTERNS

    findLvars(s: string): string[] {
        let matches = s.match(/\?[a-zA-Z_][a-zA-Z0-9_]*/g);
        if (matches) {
            return matches.map(lvar => lvar.substring(1));
        }
        return [];
    }

    // Given part of a sifting pattern, return it, wrapping it in quotes if necessary.
    quotewrapIfNeeded(part: string): string {
        if (part[0] === '?') return part;
        if (['true', 'false', 'nil'].indexOf(part) > -1) return part;
        if (!Number.isNaN(parseFloat(part))) return part;
        if (part.length >= 2 && part[0] === '"' && part[part.length - 1] === '"') return part;
        return '"' + part + '"';
    }

    parseSiftingPatternClause(line: string) {
        line = line.trim();
        // Remove duplicate lvars
        let lvars = utils.distinct(this.findLvars(line));
        let parts = line.split(/\s+/);
        let clauseStr = line;
        if (line[0] === '(') {
            // handle complex clause
            // can be `(or ...)`, `(not ...)`, `(not-join ...)`, `(pred arg*)`, `(rule arg*)`, `(function arg*) result`
            const clauseHead = parts[0].substring(1);
            if (['or', 'not', 'not-join'].indexOf(clauseHead) > -1) {
                // don't export lvars from `or`, `not`, `not-join` clauses
                lvars = [];
            } else if (this.queryRuleNames.indexOf(clauseHead) > -1) {
                // don't wrap in square brackets
            } else {
                clauseStr = '[' + line + ']';
            }
        } else {
            // handle simple clause: `eid attr? value?`
            if (parts.length < 1 || parts.length > 3) {
                console.warn('Invalid query line: ' + line);
            }
            clauseStr = '[' + parts.map(this.quotewrapIfNeeded).join(' ') + ']';
        }
        return { clauseStr: clauseStr, lvars: lvars, original: line };
    }

    parseSiftingPattern(lines: string[], name: string = ''): SiftingPattern {
        let clauses = lines.map(this.parseSiftingPatternClause);
        let lvars: string[] = [];
        for (let clause of clauses) {
            lvars = lvars.concat(clause.lvars);
        }
        lvars = _.uniq(lvars);
        let findPart = lvars.map(lvar => '?' + lvar).join(' ');
        let wherePart = clauses.map(clause => clause.clauseStr).join();
        let query = `[:find ${findPart} :in $ % :where ${wherePart}]`;
        return {
            name: name,
            lvars: lvars,
            clauses: clauses,
            query: query,
            findPart: findPart,
            wherePart: wherePart
        };
    }

    /// REGISTER SIFTING PATTERNS

    registerSiftingPattern(name: string, patternLines: string[]): void {
        if (this.siftingPatternLibrary.has(name)) {
            throw Error('A sifting pattern named ' + name + ' has already been registered!');
        }
        let pattern = this.parseSiftingPattern(patternLines, name);
        this.siftingPatternLibrary.set(name, pattern);
    }

    /// RUN SIFTING PATTERNS

    runSiftingPattern(db: datascript.Database, pattern: SiftingPattern): any[] {
        if (!pattern.query || !pattern.lvars) {
            throw Error(`Invalid sifting pattern!, ${pattern}`);
        }
        const results = datascript.q(pattern.query, db);
        const nuggets = results.map(function (result) {
            let vars = new Map<string, any>();
            for (let i = 0; i < pattern.lvars.length; i++) {
                vars.set(pattern.lvars[i], result[i]);
            }
            return { pattern, vars };
        });
        return nuggets;
    }

    runSiftingPatternByName(db: datascript.Database, patternName: string) {
        const pattern = this.siftingPatternLibrary.get(patternName);

        if (pattern) {
            return this.runSiftingPattern(db, pattern);
        } else {
            throw Error(`There isn't a registered sifting pattern named ${patternName}!`);
        }
    }

    runSiftingPatterns(db: datascript.Database) {
        let allNuggets: any[] = [];
        for (let pattern of this.siftingPatternLibrary.values()) {
            const nuggets = this.runSiftingPattern(db, pattern);
            allNuggets = allNuggets.concat(nuggets);
        }
        return allNuggets;
    }

    /// REGISTER ACTIONS

    registerAction(name: string, action: Action): void {
        if (this.actionLibrary.has(name)) {
            throw Error('An action named ' + name + ' has already been registered!');
        }
        this.actionLibrary.set(name, action);
        action.name = name;
        action.lvars = [];
        if (!action.where) return; // don't need to do the rest for unconditional actions
        let pattern = this.parseSiftingPattern(action.where);
        action.pattern = pattern;
        action.wherePart = pattern.wherePart;
        if (action.find) {
            action.lvars = action.find.trim().split(/\s+/).map(s => s.substring(1));
            action.query = `[:find ${action.find} :in $ % :where ${pattern.wherePart}]`;
            action.findPart = action.find;
        } else {
            action.lvars = pattern.lvars;
            action.query = pattern.query;
            action.findPart = pattern.findPart;
        }
    }

    /// REGISTER EFFECT HANDLERS

    registerEffectHandler(name: string, handler: EffectCallback) {
        if (this.effectHandlers.has(name)) {
            throw Error('An effect handler named ' + name + ' has already been registered!');
        }
        this.effectHandlers.set(name, handler);
    }

    /// COMMIT EVENTS TO DB

    // Throw an error if `effect` doesn't contain at least the keys in `requiredKeys`.
    // Or, if it contains more, throw a warning if they aren't in the optional `optionalKeys` list.
    checkEffectKeys(effect: any, requiredKeys: string[], optionalKeys: string[]) {
        requiredKeys = requiredKeys.concat(['type', 'cause']);
        let actualKeys = Object.keys(effect);
        let missingKeys = requiredKeys.filter(key => actualKeys.indexOf(key) === -1);
        const requiredAndOptionalKeys = optionalKeys ? requiredKeys.concat(optionalKeys) : requiredKeys;
        let extraKeys = actualKeys.filter(key => requiredAndOptionalKeys.indexOf(key) === -1);
        if (missingKeys.length > 0) {
            let msg = 'Incorrect keys for ' + effect.type + ' effect\n' +
                '  Expected keys: ' + requiredKeys.join(', ') + '\n' +
                '  Actual keys: ' + actualKeys.join(', ') + '\n' +
                '  Missing keys: ' + missingKeys.join(', ');
            let err = Error(msg);
            throw err;
        }
        if (extraKeys.length > 0) {
            console.warn(`Warning: The effect ${effect.type} doesn't expect keys: ${extraKeys.join(', ')}`);
        }
    }

    // Given the DB and an effect, perform the effect and return an updated DB.
    processEffect(db: datascript.Database, effect: Effect) {
        let handler = this.effectHandlers.get(effect.type);
        if (handler) {
            db = handler(db, effect);
        } else {
            console.error('Unrecognized effect type: ' + effect.type);
        }
        return db;
    }

    // Add an event to the DB, run all its effects, and return an updated DB.
    addEvent(db: datascript.Database, event: any) {
        // add the actual event to the DB as an entity
        let eventEntity: utils.PropertyMap = { ':db/id': -1 };
        for (let prop of Object.keys(event)) {
            // add all properties of event (except effects and tags) to DB
            if (['effects', 'tags'].indexOf(prop) !== -1) continue;
            eventEntity[prop] = event[prop];
        }
        db = datascript.db_with(db, [eventEntity]);
        let eventID = utils.newestEID(db);
        // process the event's effects
        for (let effect of event.effects || []) {
            effect.cause = eventID;
            db = this.processEffect(db, effect);
            db = utils.updateProperty(db, eventID, 'tag', effect.type); // automatically add an event tag for each effect
        }
        // add the event's tags to the DB
        for (let tag of event.tags || []) {
            db = utils.updateProperty(db, eventID, 'tag', tag);
        }
        return db;
    }

    // Given an action spec and a set of lvar bindings, return a concrete event object
    // representing a performance of the specified action with the specified bindings.
    realizeEvent(action: Action, bindings: any) {
        let event = action.event(bindings);
        event.type = 'event';
        event.eventType = action.name;
        return event;
    }

    /// RETRIEVE POSSIBLE ACTIONS

    // Given the DB and a list of action specs, return a list of "possible action" objects,
    // each of which contains an action spec and a set of possible lvar bindings for that action.
    possibleActions(db: datascript.Database, allActions: Action[]) {
        let possible = [];
        for (let action of allActions) {
            if (action.query) {
                let allBindings = datascript.q(action.query, db);
                for (let bindings of allBindings) {
                    // make bound lvars accessible by name
                    for (let i = 0; i < action.lvars.length; i++) {
                        // bindings[action.lvars[i]] = bindings[i];
                    }
                    possible.push({ action: action, bindings: bindings });
                }
            } else {
                possible.push({ action: action, bindings: [] });
            }
        }
        return possible;
    }

    // Same as possibleActions, but returns an object grouping the "possible action" objects
    // by action type.
    possibleActionsByType(db: datascript.Database, allActions: Action[]) {
        let possibleByType: utils.PropertyMap = {};
        for (let action of allActions) {
            if (action.query) {
                let allBindings = datascript.q(action.query, db);
                if (allBindings.length === 0) continue; // skip actions for which there's no valid bindings
                possibleByType[action.name] = [];
                for (let bindings of allBindings) {
                    possibleByType[action.name].push({ action: action, bindings: bindings });
                }
            } else {
                possibleByType[action.name] = [{ action: action, bindings: [] }];
            }
        }
        return possibleByType;
    }
}
