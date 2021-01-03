"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Felt = void 0;
var tslib_1 = require("tslib");
var datascript = tslib_1.__importStar(require("datascript"));
var _ = tslib_1.__importStar(require("lodash"));
var utils = tslib_1.__importStar(require("./utils"));
var Felt = (function () {
    function Felt() {
        this.queryRules = '';
        this.queryRuleNames = [];
        this.siftingPatternLibrary = new Map();
        this.actionLibrary = new Map();
        this.effectHandlers = new Map();
    }
    Felt.prototype.allActions = function () {
        var e_1, _a;
        var actions = [];
        try {
            for (var _b = tslib_1.__values(this.actionLibrary.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var value = _c.value;
                actions.push(value);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return actions;
    };
    Felt.prototype.setQueryRules = function (rules) {
        this.queryRules = rules;
        var matches = rules.match(/^\[\([a-zA-Z0-9_]*/gm);
        if (matches) {
            var ruleNameMatches = matches.map(function (rn) { return rn.substring(2); });
            this.queryRuleNames = ruleNameMatches;
        }
        else {
            console.error('No query rules found');
        }
    };
    Felt.prototype.findLvars = function (s) {
        var matches = s.match(/\?[a-zA-Z_][a-zA-Z0-9_]*/g);
        if (matches) {
            return matches.map(function (lvar) { return lvar.substring(1); });
        }
        return [];
    };
    Felt.prototype.quotewrapIfNeeded = function (part) {
        if (part[0] === '?')
            return part;
        if (['true', 'false', 'nil'].indexOf(part) > -1)
            return part;
        if (!Number.isNaN(parseFloat(part)))
            return part;
        if (part.length >= 2 && part[0] === '"' && part[part.length - 1] === '"')
            return part;
        return '"' + part + '"';
    };
    Felt.prototype.parseSiftingPatternClause = function (line) {
        line = line.trim();
        var lvars = utils.distinct(this.findLvars(line));
        var parts = line.split(/\s+/);
        var clauseStr = line;
        if (line[0] === '(') {
            var clauseHead = parts[0].substring(1);
            if (['or', 'not', 'not-join'].indexOf(clauseHead) > -1) {
                lvars = [];
            }
            else if (this.queryRuleNames.indexOf(clauseHead) > -1) {
            }
            else {
                clauseStr = '[' + line + ']';
            }
        }
        else {
            if (parts.length < 1 || parts.length > 3) {
                console.warn('Invalid query line: ' + line);
            }
            clauseStr = '[' + parts.map(this.quotewrapIfNeeded).join(' ') + ']';
        }
        return { clauseStr: clauseStr, lvars: lvars, original: line };
    };
    Felt.prototype.parseSiftingPattern = function (lines, name) {
        var e_2, _a;
        if (name === void 0) { name = ''; }
        var clauses = lines.map(this.parseSiftingPatternClause);
        var lvars = [];
        try {
            for (var clauses_1 = tslib_1.__values(clauses), clauses_1_1 = clauses_1.next(); !clauses_1_1.done; clauses_1_1 = clauses_1.next()) {
                var clause = clauses_1_1.value;
                lvars = lvars.concat(clause.lvars);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (clauses_1_1 && !clauses_1_1.done && (_a = clauses_1.return)) _a.call(clauses_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        lvars = _.uniq(lvars);
        var findPart = lvars.map(function (lvar) { return '?' + lvar; }).join(' ');
        var wherePart = clauses.map(function (clause) { return clause.clauseStr; }).join();
        var query = "[:find " + findPart + " :in $ % :where " + wherePart + "]";
        return {
            name: name,
            lvars: lvars,
            clauses: clauses,
            query: query,
            findPart: findPart,
            wherePart: wherePart
        };
    };
    Felt.prototype.registerSiftingPattern = function (name, patternLines) {
        if (this.siftingPatternLibrary.has(name)) {
            throw Error('A sifting pattern named ' + name + ' has already been registered!');
        }
        var pattern = this.parseSiftingPattern(patternLines, name);
        this.siftingPatternLibrary.set(name, pattern);
    };
    Felt.prototype.runSiftingPattern = function (db, pattern) {
        if (!pattern.query || !pattern.lvars) {
            throw Error("Invalid sifting pattern!, " + pattern);
        }
        var results = datascript.q(pattern.query, db);
        var nuggets = results.map(function (result) {
            var vars = new Map();
            for (var i = 0; i < pattern.lvars.length; i++) {
                vars.set(pattern.lvars[i], result[i]);
            }
            return { pattern: pattern, vars: vars };
        });
        return nuggets;
    };
    Felt.prototype.runSiftingPatternByName = function (db, patternName) {
        var pattern = this.siftingPatternLibrary.get(patternName);
        if (pattern) {
            return this.runSiftingPattern(db, pattern);
        }
        else {
            throw Error("There isn't a registered sifting pattern named " + patternName + "!");
        }
    };
    Felt.prototype.runSiftingPatterns = function (db) {
        var e_3, _a;
        var allNuggets = [];
        try {
            for (var _b = tslib_1.__values(this.siftingPatternLibrary.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var pattern = _c.value;
                var nuggets = this.runSiftingPattern(db, pattern);
                allNuggets = allNuggets.concat(nuggets);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return allNuggets;
    };
    Felt.prototype.registerAction = function (name, action) {
        if (this.actionLibrary.has(name)) {
            throw Error('An action named ' + name + ' has already been registered!');
        }
        this.actionLibrary.set(name, action);
        action.name = name;
        action.lvars = [];
        if (!action.where)
            return;
        var pattern = this.parseSiftingPattern(action.where);
        action.pattern = pattern;
        action.wherePart = pattern.wherePart;
        if (action.find) {
            action.lvars = action.find.trim().split(/\s+/).map(function (s) { return s.substring(1); });
            action.query = "[:find " + action.find + " :in $ % :where " + pattern.wherePart + "]";
            action.findPart = action.find;
        }
        else {
            action.lvars = pattern.lvars;
            action.query = pattern.query;
            action.findPart = pattern.findPart;
        }
    };
    Felt.prototype.registerEffectHandler = function (name, handler) {
        if (this.effectHandlers.has(name)) {
            throw Error('An effect handler named ' + name + ' has already been registered!');
        }
        this.effectHandlers.set(name, handler);
    };
    Felt.prototype.checkEffectKeys = function (effect, requiredKeys, optionalKeys) {
        requiredKeys = requiredKeys.concat(['type', 'cause']);
        var actualKeys = Object.keys(effect);
        var missingKeys = requiredKeys.filter(function (key) { return actualKeys.indexOf(key) === -1; });
        var requiredAndOptionalKeys = optionalKeys ? requiredKeys.concat(optionalKeys) : requiredKeys;
        var extraKeys = actualKeys.filter(function (key) { return requiredAndOptionalKeys.indexOf(key) === -1; });
        if (missingKeys.length > 0) {
            var msg = 'Incorrect keys for ' + effect.type + ' effect\n' +
                '  Expected keys: ' + requiredKeys.join(', ') + '\n' +
                '  Actual keys: ' + actualKeys.join(', ') + '\n' +
                '  Missing keys: ' + missingKeys.join(', ');
            var err = Error(msg);
            throw err;
        }
        if (extraKeys.length > 0) {
            console.warn("Warning: The effect " + effect.type + " doesn't expect keys: " + extraKeys.join(', '));
        }
    };
    Felt.prototype.processEffect = function (db, effect) {
        var handler = this.effectHandlers.get(effect.type);
        if (handler) {
            db = handler(db, effect);
        }
        else {
            console.error('Unrecognized effect type: ' + effect.type);
        }
        return db;
    };
    Felt.prototype.addEvent = function (db, event) {
        var e_4, _a, e_5, _b, e_6, _c;
        var eventEntity = { ':db/id': -1 };
        try {
            for (var _d = tslib_1.__values(Object.keys(event)), _e = _d.next(); !_e.done; _e = _d.next()) {
                var prop = _e.value;
                if (['effects', 'tags'].indexOf(prop) !== -1)
                    continue;
                eventEntity[prop] = event[prop];
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_4) throw e_4.error; }
        }
        db = datascript.db_with(db, [eventEntity]);
        var eventID = utils.newestEID(db);
        try {
            for (var _f = tslib_1.__values(event.effects || []), _g = _f.next(); !_g.done; _g = _f.next()) {
                var effect = _g.value;
                effect.cause = eventID;
                db = this.processEffect(db, effect);
                db = utils.updateProperty(db, eventID, 'tag', effect.type);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_5) throw e_5.error; }
        }
        try {
            for (var _h = tslib_1.__values(event.tags || []), _j = _h.next(); !_j.done; _j = _h.next()) {
                var tag = _j.value;
                db = utils.updateProperty(db, eventID, 'tag', tag);
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return db;
    };
    Felt.prototype.realizeEvent = function (action, bindings) {
        var event = action.event(bindings);
        event.type = 'event';
        event.eventType = action.name;
        return event;
    };
    Felt.prototype.possibleActions = function (db, allActions) {
        var e_7, _a, e_8, _b;
        var possible = [];
        try {
            for (var allActions_1 = tslib_1.__values(allActions), allActions_1_1 = allActions_1.next(); !allActions_1_1.done; allActions_1_1 = allActions_1.next()) {
                var action = allActions_1_1.value;
                if (action.query) {
                    var allBindings = datascript.q(action.query, db);
                    try {
                        for (var allBindings_1 = (e_8 = void 0, tslib_1.__values(allBindings)), allBindings_1_1 = allBindings_1.next(); !allBindings_1_1.done; allBindings_1_1 = allBindings_1.next()) {
                            var bindings = allBindings_1_1.value;
                            for (var i = 0; i < action.lvars.length; i++) {
                            }
                            possible.push({ action: action, bindings: bindings });
                        }
                    }
                    catch (e_8_1) { e_8 = { error: e_8_1 }; }
                    finally {
                        try {
                            if (allBindings_1_1 && !allBindings_1_1.done && (_b = allBindings_1.return)) _b.call(allBindings_1);
                        }
                        finally { if (e_8) throw e_8.error; }
                    }
                }
                else {
                    possible.push({ action: action, bindings: [] });
                }
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (allActions_1_1 && !allActions_1_1.done && (_a = allActions_1.return)) _a.call(allActions_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        return possible;
    };
    Felt.prototype.possibleActionsByType = function (db, allActions) {
        var e_9, _a, e_10, _b;
        var possibleByType = {};
        try {
            for (var allActions_2 = tslib_1.__values(allActions), allActions_2_1 = allActions_2.next(); !allActions_2_1.done; allActions_2_1 = allActions_2.next()) {
                var action = allActions_2_1.value;
                if (action.query) {
                    var allBindings = datascript.q(action.query, db);
                    if (allBindings.length === 0)
                        continue;
                    possibleByType[action.name] = [];
                    try {
                        for (var allBindings_2 = (e_10 = void 0, tslib_1.__values(allBindings)), allBindings_2_1 = allBindings_2.next(); !allBindings_2_1.done; allBindings_2_1 = allBindings_2.next()) {
                            var bindings = allBindings_2_1.value;
                            possibleByType[action.name].push({ action: action, bindings: bindings });
                        }
                    }
                    catch (e_10_1) { e_10 = { error: e_10_1 }; }
                    finally {
                        try {
                            if (allBindings_2_1 && !allBindings_2_1.done && (_b = allBindings_2.return)) _b.call(allBindings_2);
                        }
                        finally { if (e_10) throw e_10.error; }
                    }
                }
                else {
                    possibleByType[action.name] = [{ action: action, bindings: [] }];
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (allActions_2_1 && !allActions_2_1.done && (_a = allActions_2.return)) _a.call(allActions_2);
            }
            finally { if (e_9) throw e_9.error; }
        }
        return possibleByType;
    };
    return Felt;
}());
exports.Felt = Felt;
//# sourceMappingURL=felt.js.map