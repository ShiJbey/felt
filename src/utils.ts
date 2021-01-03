// Utility Functions
import * as datascript from 'datascript';

export interface PropertyMap {
    [key: string]: any;
}

/** Return a random integer between min (inclusive) and max (inclusive). */
export function randInt(min: number, max: number): number {
    const range = max - min;
    const rand = Math.floor(Math.random() * (range + 1));
    return min + rand;
}

/** Return random value from array */
export function randNth<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

/** Return the array with duplicates removed */
export function distinct<T = any>(arr: T[]): T[] {
    return [...new Set(arr)];
}

/** Return a shuffled copy of a list, leaving the original list unmodified. */
export function shuffle<T>(items: T[]): T[] {
    const newItems: T[] = [...items];
    for (let i = newItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
    }
    return newItems;
}

// Given the DB, return the EID of the most recently added entity.
export function newestEID(db: datascript.Database): number {
    // FIXME there is probably a better way to do this
    let allDatoms = datascript.datoms(db, ':eavt');
    return allDatoms[allDatoms.length - 1].e;
}

// Given the DB and an EID, retrieve the corresponding entity as an object.
// This is what `datascript.entity(db, eid)` SHOULD do, but for some reason doesn't.
export function getEntity(db: datascript.Database, eid: number): any {
    let propValuePairs = datascript.q('[:find ?prop ?val :where [' + eid + ' ?prop ?val]]', db);
    if (propValuePairs.length === 0) return null;
    let entity: any = { ':db/id': eid };
    for (let [prop, val] of propValuePairs) {
        entity[prop] = val;
    }
    return entity;
}

// Given the DB and an entity, return an updated DB with the entity added.
export function createEntity(db: datascript.Database, entity: any): datascript.Database {
    // TODO assert entity is an object with only valid DB values
    entity[':db/id'] = -1;
    return datascript.db_with(db, [entity]);
}

// Given the DB, an EID, a property to update, and a value, return an updated DB
// with the property set to the given value in the specified entity.
export function updateProperty(db: datascript.Database, eid: number, prop: string, val: string | number): datascript.Database {
    // TODO assert eid is a valid EID, prop is a string, val is a valid DB value
    return datascript.db_with(db, [[':db/add', eid, prop, val]]);
}

// Given the DB, an EID, and an object of properties to update, return an updated DB
// with the properties set to the given values in the specified entity.
export function updateProperties(db: datascript.Database, eid: number, props: PropertyMap): datascript.Database {
    for (let prop of Object.keys(props)) {
        db = updateProperty(db, eid, prop, props[prop]);
    }
    return db;
}

// Given the DB, an EID, a property to update, and a value, return an updated DB
// without the specified property.
export function deleteProperty(db: datascript.Database, eid: number, prop: PropertyMap, val: number | string): datascript.Database {
    // TODO assert eid is a valid EID, prop is a string, val is a valid DB value
    return datascript.db_with(db, [[':db/retract', eid, prop, val]]);
}

// Given the DB and an EID, return an updated DB with the specified entity removed.
export function deleteEntity(db: datascript.Database, eid: datascript.EntityID) {
    return datascript.db_with(db, [[':db/retractEntity', eid]]);
}
