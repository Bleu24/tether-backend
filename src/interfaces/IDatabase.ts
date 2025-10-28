export interface QueryResult<T = any> {
    rows: T[];
}

export interface IDatabase {
    query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
    execute(sql: string, params?: any[]): Promise<void>;
    end(): Promise<void>;
}
