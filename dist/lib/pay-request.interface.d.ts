import { Output } from './interface-v2';
export interface IPayRequest {
    post(url: string, params: Record<string, any>, headers: Record<string, any>): Promise<Output>;
    upload(url: string, params: Record<string, any>, headers: Record<string, any>): Promise<Output>;
    get(url: string, headers: Record<string, any>): Promise<Output>;
}
