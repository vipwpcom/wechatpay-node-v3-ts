import { Output } from './interface-v2';
export declare class Base {
    protected userAgent: string;
    protected objectToQueryString(object: Record<string, any>, exclude?: string[]): string;
    protected getHeaders(authorization: string, headers?: {}): {
        Accept: string;
        'User-Agent': string;
        Authorization: string;
        'Accept-Encoding': string;
    };
    protected postRequest(url: string, params: Record<string, any>, authorization: string): Promise<Record<string, any>>;
    protected postRequestV2(url: string, params: Record<string, any>, authorization: string, headers?: {}): Promise<Output>;
    protected getRequest(url: string, authorization: string, query?: Record<string, any>): Promise<Record<string, any>>;
    protected getRequestV2(url: string, authorization: string, query?: Record<string, any>): Promise<Output>;
}
