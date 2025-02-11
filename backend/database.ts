import Database from 'better-sqlite3';
const path = require('path');
const fs = require('fs');

const appdataPath: string = require('electron').app.getPath('userData');
const dbFilePath: string = path.join(appdataPath, 'data.db');
const database: Database.Database = new Database(dbFilePath);


function prepareQueryValue(value: any): string {
    if (typeof value === "string") return `'${value}'`; 
    return String(value);
}

export enum Tables {
    audiobooks="audiobooks", 
    tracks="tracks", 
    bookmarks="bookmarks"
}


export function initializeDatabase(): void {
    try {
        const dbInitContent = fs.readFileSync('dbinit.sql', 'utf8');
        database.exec(dbInitContent);
        console.log("Initialized db at: ", dbFilePath);
    } catch (err) { console.error('Failed to initialize the database:', err); }
}


// SELECT FROM ... query builders.
export interface ISelectQuery {
    table: Tables;
    whereStmt?: string;
    cols?: string;
    distinct?: boolean;
    orderById?: string;
    orederByDirection?: 'ASC'| 'DESC';
}

export function querySingle(query: ISelectQuery): any | false {
    const cols = query.cols || "*";
    const distinct = query.distinct || false;
    
    let sqlQuery: string = `SELECT ${distinct ? 'DISTINCT' : ''} ${cols} FROM ${query.table}`;
    if (query.whereStmt) sqlQuery += ` WHERE ${query.whereStmt}`;
    if (query.orderById) sqlQuery += ` ORDER BY ${query.orderById}`;
    if (query.orederByDirection) sqlQuery += ` ${query.orederByDirection}`;

    try {
        return database.prepare(sqlQuery).get() || false;
    } catch (error: any) {
        console.error(`Database querySingle error: ${error}\nERROR QUERY: ${sqlQuery}`);
        return false;
    }
}

export function queryAll(query: ISelectQuery): any[] {
    const cols = query.cols || "*";
    const distinct = query.distinct || false;
    
    let sqlQuery: string = `SELECT ${distinct ? 'DISTINCT' : ''} ${cols} FROM ${query.table}`;
    if (query.whereStmt) sqlQuery += ` WHERE ${query.whereStmt}`;
    if (query.orderById) sqlQuery += ` ORDER BY ${query.orderById}`;
    if (query.orederByDirection) sqlQuery += ` ${query.orederByDirection}`;

    try {
        return database.prepare(sqlQuery).all();
    } catch (error: any) {
        console.error(`Database queryAll error: ${error}\nERROR QUERY: ${sqlQuery}`);
        return [];
    }
}


// INSERT INTO ... query builder.
export const INSERT_ERROR: number = -1;

export function insertInto(table: Tables, colsValues: object): number | bigint {
    if (Object.keys(colsValues).length == 0) {
        console.error(`Called insertInto: ${table} method with blank contents.`);
        return INSERT_ERROR;
    }

    const columns: string = String(Object.keys(colsValues));
    let values: string[] = [];

    for (const value of Object.values(colsValues)) {
        values.push(prepareQueryValue(value));
    }

    const sqlQuery: string = `INSERT INTO ${table} (${columns}) VALUES (${values.join(',')})`;
    try {
        return database.prepare(sqlQuery).run().lastInsertRowid;
    } catch (error: any) {
        console.error(`Database inertInto error: ${error}\nERROR QUERY: ${sqlQuery}`);
        return INSERT_ERROR;
    }
}


// DELETE FROM ... query builder.
export function deleteFrom(table: Tables, whereStmt: string): void {
    const sqlQuery = `DELETE FROM ${table} WHERE ${whereStmt}`;
    try {
        database.exec(sqlQuery);
    } catch (error: any) {
        console.error(`Database deleteFrom error: ${error}\nERROR QUERY: ${sqlQuery}`);
    }
}


// UPDATE SET ... query builder.
export function updateSet(table: Tables, colsValues: object, rowId: number): void {
    if (Object.keys(colsValues).length == 0) {
        return console.error(`Called updateSet: ${table} method with blank contents.`);
    }

    const entries: string[] = [];
    for (const [column, value] of Object.entries(colsValues)) {
        entries.push(`${column}=${prepareQueryValue(value)}`);
    }

    const sqlQuery: string = `UPDATE ${table} SET ${entries.join(',')} WHERE id=${rowId}`;
    try {
        database.exec(sqlQuery);
    } catch (error: any) {
        console.error(`Database updateSet error: ${error}\nERROR QUERY: ${sqlQuery}`);
    }
}

export function updateSetWhere(table: Tables, colsValues: object, whereStmt: string): void {
    if (Object.keys(colsValues).length == 0) {
        return console.error(`Called updateSetWhere: ${table} method with blank contents.`);
    }

    const entries: string[] = [];
    for (const [column, value] of Object.entries(colsValues)) {
        entries.push(`${column}=${prepareQueryValue(value)}`);
    }

    const sqlQuery: string = `UPDATE ${table} SET ${entries.join(',')} WHERE ${whereStmt}`;
    try {
        database.exec(sqlQuery);
    } catch (error: any) {
        console.error(`Database updateSetWhere error: ${error}\nERROR QUERY: ${sqlQuery}`);
    }
}
