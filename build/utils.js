"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEntity = exports.deleteProperty = exports.updateProperties = exports.updateProperty = exports.createEntity = exports.getEntity = exports.newestEID = exports.shuffle = exports.distinct = exports.randNth = exports.randInt = void 0;
var tslib_1 = require("tslib");
var datascript = tslib_1.__importStar(require("datascript"));
function randInt(min, max) {
    var range = max - min;
    var rand = Math.floor(Math.random() * (range + 1));
    return min + rand;
}
exports.randInt = randInt;
function randNth(items) {
    return items[Math.floor(Math.random() * items.length)];
}
exports.randNth = randNth;
function distinct(arr) {
    return tslib_1.__spread(new Set(arr));
}
exports.distinct = distinct;
function shuffle(items) {
    var _a;
    var newItems = tslib_1.__spread(items);
    for (var i = newItems.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = tslib_1.__read([newItems[j], newItems[i]], 2), newItems[i] = _a[0], newItems[j] = _a[1];
    }
    return newItems;
}
exports.shuffle = shuffle;
function newestEID(db) {
    var allDatoms = datascript.datoms(db, ':eavt');
    return allDatoms[allDatoms.length - 1].e;
}
exports.newestEID = newestEID;
function getEntity(db, eid) {
    var e_1, _a;
    var propValuePairs = datascript.q('[:find ?prop ?val :where [' + eid + ' ?prop ?val]]', db);
    if (propValuePairs.length === 0)
        return null;
    var entity = { ':db/id': eid };
    try {
        for (var propValuePairs_1 = tslib_1.__values(propValuePairs), propValuePairs_1_1 = propValuePairs_1.next(); !propValuePairs_1_1.done; propValuePairs_1_1 = propValuePairs_1.next()) {
            var _b = tslib_1.__read(propValuePairs_1_1.value, 2), prop = _b[0], val = _b[1];
            entity[prop] = val;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (propValuePairs_1_1 && !propValuePairs_1_1.done && (_a = propValuePairs_1.return)) _a.call(propValuePairs_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return entity;
}
exports.getEntity = getEntity;
function createEntity(db, entity) {
    entity[':db/id'] = -1;
    return datascript.db_with(db, [entity]);
}
exports.createEntity = createEntity;
function updateProperty(db, eid, prop, val) {
    return datascript.db_with(db, [[':db/add', eid, prop, val]]);
}
exports.updateProperty = updateProperty;
function updateProperties(db, eid, props) {
    var e_2, _a;
    try {
        for (var _b = tslib_1.__values(Object.keys(props)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var prop = _c.value;
            db = updateProperty(db, eid, prop, props[prop]);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return db;
}
exports.updateProperties = updateProperties;
function deleteProperty(db, eid, prop, val) {
    return datascript.db_with(db, [[':db/retract', eid, prop, val]]);
}
exports.deleteProperty = deleteProperty;
function deleteEntity(db, eid) {
    return datascript.db_with(db, [[':db/retractEntity', eid]]);
}
exports.deleteEntity = deleteEntity;
//# sourceMappingURL=utils.js.map