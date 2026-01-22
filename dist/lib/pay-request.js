"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayRequest = void 0;
const superagent_1 = __importDefault(require("superagent"));
class PayRequest {
    async upload(url, params, headers) {
        try {
            const result = await superagent_1.default
                .post(url)
                .send(params)
                .attach('file', params.pic_buffer, {
                filename: '72fe0092be0cf9dd8420579cc954fb4e.jpg',
                contentType: 'image/jpg',
            })
                .field('meta', JSON.stringify(params.fileinfo));
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
    async post(url, params, headers) {
        try {
            const result = await superagent_1.default
                .post(url)
                .send(params)
                .set(headers);
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
    async get(url, headers) {
        try {
            const result = await superagent_1.default.get(url).set(headers);
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
exports.PayRequest = PayRequest;
//# sourceMappingURL=pay-request.js.map