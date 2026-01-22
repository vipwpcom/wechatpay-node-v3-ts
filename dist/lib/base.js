"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base = void 0;
const superagent_1 = __importDefault(require("superagent"));
class Base {
    constructor() {
        this.userAgent = '127.0.0.1';
    }
    objectToQueryString(object, exclude = []) {
        let str = Object.keys(object)
            .filter(key => !exclude.includes(key))
            .map(key => {
            return encodeURIComponent(key) + '=' + encodeURIComponent(object[key]);
        })
            .join('&');
        if (str)
            str = '?' + str;
        return str || '';
    }
    getHeaders(authorization, headers = {}) {
        return {
            ...headers,
            Accept: 'application/json',
            'User-Agent': this.userAgent,
            Authorization: authorization,
            'Accept-Encoding': 'gzip',
        };
    }
    async postRequest(url, params, authorization) {
        try {
            const result = await superagent_1.default
                .post(url)
                .send(params)
                .set({
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': this.userAgent,
                Authorization: authorization,
                'Accept-Encoding': 'gzip',
            });
            return {
                status: result.status,
                ...result.body,
            };
        }
        catch (error) {
            const err = JSON.parse(JSON.stringify(error));
            return {
                status: err.status,
                errRaw: err,
                ...(err?.response?.text && JSON.parse(err?.response?.text)),
            };
        }
    }
    async postRequestV2(url, params, authorization, headers = {}) {
        try {
            const result = await superagent_1.default
                .post(url)
                .send(params)
                .set({
                ...headers,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': this.userAgent,
                Authorization: authorization,
                'Accept-Encoding': 'gzip',
            });
            return {
                status: result.status,
                data: result.body,
            };
        }
        catch (error) {
            const err = JSON.parse(JSON.stringify(error));
            return {
                status: err.status,
                errRaw: err,
                error: err?.response?.text,
            };
        }
    }
    async getRequest(url, authorization, query = {}) {
        try {
            const result = await superagent_1.default
                .get(url)
                .query(query)
                .set({
                Accept: 'application/json',
                'User-Agent': this.userAgent,
                Authorization: authorization,
                'Accept-Encoding': 'gzip',
            });
            let data = {};
            switch (result.type) {
                case 'application/json':
                    data = {
                        status: result.status,
                        ...result.body,
                    };
                    break;
                case 'text/plain':
                    data = {
                        status: result.status,
                        data: result.text,
                    };
                    break;
                case 'application/x-gzip':
                    data = {
                        status: result.status,
                        data: result.body,
                    };
                    break;
                default:
                    data = {
                        status: result.status,
                        ...result.body,
                    };
            }
            return data;
        }
        catch (error) {
            const err = JSON.parse(JSON.stringify(error));
            return {
                status: err.status,
                errRaw: err,
                ...(err?.response?.text && JSON.parse(err?.response?.text)),
            };
        }
    }
    async getRequestV2(url, authorization, query = {}) {
        try {
            const result = await superagent_1.default
                .get(url)
                .query(query)
                .set({
                Accept: 'application/json',
                'User-Agent': this.userAgent,
                Authorization: authorization,
                'Accept-Encoding': 'gzip',
            });
            let data = {};
            if (result.type === 'text/plain') {
                data = {
                    status: result.status,
                    data: result.text,
                };
            }
            else {
                data = {
                    status: result.status,
                    data: result.body,
                };
            }
            return data;
        }
        catch (error) {
            const err = JSON.parse(JSON.stringify(error));
            return {
                status: err.status,
                errRaw: err,
                error: err?.response?.text,
            };
        }
    }
}
exports.Base = Base;
//# sourceMappingURL=base.js.map