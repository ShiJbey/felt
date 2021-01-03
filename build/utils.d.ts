import * as datascript from 'datascript';
export interface PropertyMap {
    [key: string]: any;
}
export declare function randInt(min: number, max: number): number;
export declare function randNth<T>(items: T[]): T;
export declare function distinct<T = any>(arr: T[]): T[];
export declare function shuffle<T>(items: T[]): T[];
export declare function newestEID(db: datascript.Database): number;
export declare function getEntity(db: datascript.Database, eid: number): any;
export declare function createEntity(db: datascript.Database, entity: any): datascript.Database;
export declare function updateProperty(db: datascript.Database, eid: number, prop: string, val: string | number): datascript.Database;
export declare function updateProperties(db: datascript.Database, eid: number, props: PropertyMap): datascript.Database;
export declare function deleteProperty(db: datascript.Database, eid: number, prop: PropertyMap, val: number | string): datascript.Database;
export declare function deleteEntity(db: datascript.Database, eid: datascript.EntityID): datascript.Database;
//# sourceMappingURL=utils.d.ts.map