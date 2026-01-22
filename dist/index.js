'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const crypto_1 = __importDefault(require("crypto"));
const x509_1 = require('@fidm/x509');
const base_1 = require("./lib/base");
const pay_request_1 = require("./lib/pay-request");
class Pay extends base_1.Base {
    constructor(arg1, mchid, publicKey, privateKey, options) {
        super();
        this.serial_no = '';
        this.authType = 'WECHATPAY2-SHA256-RSA2048';
        if (arg1 instanceof Object) {
            this.appid = arg1.appid;
            this.mchid = arg1.mchid;
            if (arg1.serial_no)
                this.serial_no = arg1.serial_no;
            this.publicKey = arg1.publicKey;
            if (!this.publicKey)
                throw new Error('缺少公钥');
            this.privateKey = arg1.privateKey;
            if (!arg1.serial_no)
                this.serial_no = this.getSN(this.publicKey);
            this.authType = arg1.authType || 'WECHATPAY2-SHA256-RSA2048';
            this.userAgent = arg1.userAgent || '127.0.0.1';
            this.key = arg1.key;
            if (arg1.wxPayPublicKey) {
                this.wxPayPublicKey = arg1.wxPayPublicKey;
            }
            if (arg1.wxPayPublicId) {
                this.wxPayPublicId = arg1.wxPayPublicId;
            }
        }
        else {
            const _optipns = options || {};
            this.appid = arg1;
            this.mchid = mchid || '';
            this.publicKey = publicKey;
            this.privateKey = privateKey;
            this.wxPayPublicKey = _optipns.wxPayPublicKey;
            this.wxPayPublicId = _optipns.wxPayPublicId;
            this.authType = _optipns.authType || 'WECHATPAY2-SHA256-RSA2048';
            this.userAgent = _optipns.userAgent || '127.0.0.1';
            this.key = _optipns.key;
            this.serial_no = _optipns.serial_no || '';
            if (!this.publicKey)
                throw new Error('缺少公钥');
            if (!this.serial_no)
                this.serial_no = this.getSN(this.publicKey);
        }
        this.httpService = new pay_request_1.PayRequest();
    }
    createHttp(service) {
        this.httpService = service;
    }
    async get_certificates(apiSecret) {
        const url = 'https://api.mch.weixin.qq.com/v3/certificates';
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        const result = await this.httpService.get(url, headers);
        if (result.status === 200) {
            const data = result?.data?.data;
            for (const item of data) {
                const decryptCertificate = this.decipher_gcm(item.encrypt_certificate.ciphertext, item.encrypt_certificate.associated_data, item.encrypt_certificate.nonce, apiSecret);
                item.publicKey = x509_1.Certificate.fromPEM(Buffer.from(decryptCertificate)).publicKey.toPEM();
            }
            return data;
        }
        else {
            throw new Error('拉取平台证书失败');
        }
    }
    async fetchCertificates(apiSecret) {
        const url = 'https://api.mch.weixin.qq.com/v3/certificates';
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json' });
        const result = await this.httpService.get(url, headers);
        if (result.status === 200) {
            const data = result?.data?.data;
            const newCertificates = {};
            data.forEach(item => {
                const decryptCertificate = this.decipher_gcm(item.encrypt_certificate.ciphertext, item.encrypt_certificate.associated_data, item.encrypt_certificate.nonce, apiSecret);
                newCertificates[item.serial_no] = x509_1.Certificate.fromPEM(Buffer.from(decryptCertificate)).publicKey.toPEM();
            });
            Pay.certificates = {
                ...Pay.certificates,
                ...newCertificates,
            };
        }
        else {
            throw new Error('拉取平台证书失败');
        }
    }
    async verifySign(params) {
        const { timestamp, nonce, body, serial, signature, apiSecret } = params;
        const serial_on = serial.startsWith('PUB_KEY_ID_');
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        const data = `${timestamp}\n${nonce}\n${bodyStr}\n`;
        const verify = crypto_1.default.createVerify('RSA-SHA256');
        if (serial_on) {
            if (!this.wxPayPublicKey) {
                throw new Error('缺少微信支付公钥');
            }
            verify.update(data);
            return verify.verify(this.wxPayPublicKey, signature, 'base64');
        }
        let publicKey = Pay.certificates[serial];
        if (!publicKey) {
            await this.fetchCertificates(apiSecret);
        }
        publicKey = Pay.certificates[serial];
        if (!publicKey) {
            throw new Error('平台证书序列号不相符，未找到平台序列号');
        }
        verify.update(data);
        return verify.verify(publicKey, signature, 'base64');
    }
    publicEncrypt(str, wxPublicKey, padding = crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING) {
        if (![crypto_1.default.constants.RSA_PKCS1_PADDING, crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING].includes(padding)) {
            throw new Error(`Doesn't supported the padding mode(${padding}), here's only support RSA_PKCS1_OAEP_PADDING or RSA_PKCS1_PADDING.`);
        }
        const encrypted = crypto_1.default.publicEncrypt({ key: wxPublicKey, padding, oaepHash: 'sha1' }, Buffer.from(str, 'utf8')).toString('base64');
        return encrypted;
    }
    privateDecrypt(str, padding = crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING) {
        if (![crypto_1.default.constants.RSA_PKCS1_PADDING, crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING].includes(padding)) {
            throw new Error(`Doesn't supported the padding mode(${padding}), here's only support RSA_PKCS1_OAEP_PADDING or RSA_PKCS1_PADDING.`);
        }
        const decrypted = crypto_1.default.privateDecrypt({ key: this.privateKey, padding, oaepHash: 'sha1' }, Buffer.from(str, 'base64'));
        return decrypted.toString('utf8');
    }
    getSignature(method, nonce_str, timestamp, url, body) {
        let str = method + '\n' + url + '\n' + timestamp + '\n' + nonce_str + '\n';
        if (body && body instanceof Object)
            body = JSON.stringify(body);
        if (body)
            str = str + body + '\n';
        if (method === 'GET')
            str = str + '\n';
        return this.sha256WithRsa(str);
    }
    sign(str) {
        return this.sha256WithRsa(str);
    }
    getSN(fileData) {
        if (!fileData && !this.publicKey)
            throw new Error('缺少公钥');
        if (!fileData)
            fileData = this.publicKey;
        if (typeof fileData == 'string') {
            fileData = Buffer.from(fileData);
        }
        const certificate = x509_1.Certificate.fromPEM(fileData);
        return certificate.serialNumber;
    }
    sha256WithRsa(data) {
        if (!this.privateKey)
            throw new Error('缺少秘钥文件');
        return crypto_1.default
            .createSign('RSA-SHA256')
            .update(data)
            .sign(this.privateKey, 'base64');
    }
    getAuthorization(nonce_str, timestamp, signature) {
        const _authorization = 'mchid="' +
            this.mchid +
            '",' +
            'nonce_str="' +
            nonce_str +
            '",' +
            'timestamp="' +
            timestamp +
            '",' +
            'serial_no="' +
            this.serial_no +
            '",' +
            'signature="' +
            signature +
            '"';
        return this.authType.concat(' ').concat(_authorization);
    }
    decipher_gcm(ciphertext, associated_data, nonce, key) {
        if (!key)
            key = this.key;
        if (!key)
            throw new Error('缺少key');
        const _ciphertext = Buffer.from(ciphertext, 'base64');
        const authTag = _ciphertext.slice(_ciphertext.length - 16);
        const data = _ciphertext.slice(0, _ciphertext.length - 16);
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, nonce);
        decipher.setAuthTag(authTag);
        decipher.setAAD(Buffer.from(associated_data));
        const decoded = decipher.update(data, undefined, 'utf8');
        try {
            return JSON.parse(decoded);
        }
        catch (e) {
            return decoded;
        }
    }
    buildAuthorization(method, url, params) {
        const nonce_str = Math.random()
            .toString(36)
            .substr(2, 15), timestamp = parseInt(+new Date() / 1000 + '').toString();
        const signature = this.getSignature(method, nonce_str, timestamp, url.replace('https://api.mch.weixin.qq.com', ''), params);
        const authorization = this.getAuthorization(nonce_str, timestamp, signature);
        return authorization;
    }
    async transactions_h5(params) {
        const _params = {
            appid: this.appid,
            mchid: this.mchid,
            ...params,
        };
        const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/h5';
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        return await this.httpService.post(url, _params, headers);
    }
    async combine_transactions_h5(params) {
        const _params = {
            combine_appid: this.appid,
            combine_mchid: this.mchid,
            ...params,
        };
        const url = 'https://api.mch.weixin.qq.com/v3/combine-transactions/h5';
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json' });
        return await this.httpService.post(url, _params, headers);
    }
    async transactions_native(params) {
        const _params = {
            appid: this.appid,
            mchid: this.mchid,
            ...params,
        };
        const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/native';
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        return await this.httpService.post(url, _params, headers);
    }
    async combine_transactions_native(params) {
        const _params = {
            combine_appid: this.appid,
            combine_mchid: this.mchid,
            ...params,
        };
        const url = 'https://api.mch.weixin.qq.com/v3/combine-transactions/native';
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json' });
        return await this.httpService.post(url, _params, headers);
    }
    async transactions_app(params) {
        const _params = {
            appid: this.appid,
            mchid: this.mchid,
            ...params,
        };
        const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/app';
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        const result = await this.httpService.post(url, _params, headers);
        if (result.status === 200 && result.data.prepay_id) {
            const data = {
                appid: _params.appid,
                partnerid: _params.mchid,
                package: 'Sign=WXPay',
                timestamp: parseInt(+new Date() / 1000 + '').toString(),
                noncestr: Math.random()
                    .toString(36)
                    .substr(2, 15),
                prepayid: result.data.prepay_id,
                sign: '',
            };
            const str = [data.appid, data.timestamp, data.noncestr, data.prepayid, ''].join('\n');
            data.sign = this.sign(str);
            result.data = data;
        }
        return result;
    }
    async combine_transactions_app(params) {
        const _params = {
            combine_appid: this.appid,
            combine_mchid: this.mchid,
            ...params,
        };
        const url = 'https://api.mch.weixin.qq.com/v3/combine-transactions/app';
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        const result = await this.httpService.post(url, _params, headers);
        if (result.status === 200 && result.data.prepay_id) {
            const data = {
                appid: _params.combine_appid,
                partnerid: _params.combine_mchid,
                package: 'Sign=WXPay',
                timestamp: parseInt(+new Date() / 1000 + '').toString(),
                noncestr: Math.random()
                    .toString(36)
                    .substr(2, 15),
                prepayid: result.data.prepay_id,
                sign: '',
            };
            const str = [data.appid, data.timestamp, data.noncestr, data.prepayid, ''].join('\n');
            data.sign = this.sign(str);
            result.data = data;
        }
        return result;
    }
    async transactions_jsapi(params) {
        const _params = {
            appid: this.appid,
            mchid: this.mchid,
            ...params,
        };
        const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi';
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        const result = await this.httpService.post(url, _params, headers);
        if (result.status === 200 && result.data.prepay_id) {
            const data = {
                appId: _params.appid,
                timeStamp: parseInt(+new Date() / 1000 + '').toString(),
                nonceStr: Math.random()
                    .toString(36)
                    .substr(2, 15),
                package: `prepay_id=${result.data.prepay_id}`,
                signType: 'RSA',
                paySign: '',
            };
            const str = [data.appId, data.timeStamp, data.nonceStr, data.package, ''].join('\n');
            data.paySign = this.sign(str);
            result.data = data;
        }
        return result;
    }
    async combine_transactions_jsapi(params) {
        const _params = {
            combine_appid: this.appid,
            combine_mchid: this.mchid,
            ...params,
        };
        const url = 'https://api.mch.weixin.qq.com/v3/combine-transactions/jsapi';
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        const result = await this.httpService.post(url, _params, headers);
        if (result.status === 200 && result.data.prepay_id) {
            const data = {
                appId: _params.combine_appid,
                timeStamp: parseInt(+new Date() / 1000 + '').toString(),
                nonceStr: Math.random()
                    .toString(36)
                    .substr(2, 15),
                package: `prepay_id=${result.data.prepay_id}`,
                signType: 'RSA',
                paySign: '',
            };
            const str = [data.appId, data.timeStamp, data.nonceStr, data.package, ''].join('\n');
            data.paySign = this.sign(str);
            result.data = data;
        }
        return result;
    }
    async query(params) {
        let url = '';
        if (params.transaction_id) {
            url = `https://api.mch.weixin.qq.com/v3/pay/transactions/id/${params.transaction_id}?mchid=${this.mchid}`;
        }
        else if (params.out_trade_no) {
            url = `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${params.out_trade_no}?mchid=${this.mchid}`;
        }
        else {
            throw new Error('缺少transaction_id或者out_trade_no');
        }
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async combine_query(combine_out_trade_no) {
        if (!combine_out_trade_no)
            throw new Error('缺少combine_out_trade_no');
        const url = `https://api.mch.weixin.qq.com/v3/combine-transactions/out-trade-no/${combine_out_trade_no}`;
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async close(out_trade_no) {
        if (!out_trade_no)
            throw new Error('缺少out_trade_no');
        const _params = {
            mchid: this.mchid,
        };
        const url = `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${out_trade_no}/close`;
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        return await this.httpService.post(url, _params, headers);
    }
    async combine_close(combine_out_trade_no, sub_orders) {
        if (!combine_out_trade_no)
            throw new Error('缺少out_trade_no');
        const _params = {
            combine_appid: this.appid,
            sub_orders,
        };
        const url = `https://api.mch.weixin.qq.com/v3/combine-transactions/out-trade-no/${combine_out_trade_no}/close`;
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        return await this.httpService.post(url, _params, headers);
    }
    async tradebill(params) {
        let url = 'https://api.mch.weixin.qq.com/v3/bill/tradebill';
        const _params = {
            ...params,
        };
        const querystring = Object.keys(_params)
            .filter(key => {
            return !!_params[key];
        })
            .sort()
            .map(key => {
            return key + '=' + _params[key];
        })
            .join('&');
        url = url + `?${querystring}`;
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async fundflowbill(params) {
        let url = 'https://api.mch.weixin.qq.com/v3/bill/fundflowbill';
        const _params = {
            ...params,
        };
        const querystring = Object.keys(_params)
            .filter(key => {
            return !!_params[key];
        })
            .sort()
            .map(key => {
            return key + '=' + _params[key];
        })
            .join('&');
        url = url + `?${querystring}`;
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async downloadBill(download_url) {
        const authorization = this.buildAuthorization('GET', download_url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(download_url, headers);
    }
    async refunds(params) {
        const url = 'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds';
        const _params = {
            ...params,
        };
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        return await this.httpService.post(url, _params, headers);
    }
    async find_refunds(out_refund_no) {
        if (!out_refund_no)
            throw new Error('缺少out_refund_no');
        const url = `https://api.mch.weixin.qq.com/v3/refund/domestic/refunds/${out_refund_no}`;
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async batches_transfer(params) {
        const url = 'https://api.mch.weixin.qq.com/v3/transfer/batches';
        const _params = {
            appid: this.appid,
            ...params,
        };
        const serial_no = _params?.wx_serial_no;
        delete _params.wx_serial_no;
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.wxPayPublicId ? this.getHeaders(authorization, { 'Wechatpay-Serial': serial_no || this.wxPayPublicId, 'Content-Type': 'application/json' }) : this.getHeaders(authorization, { 'Wechatpay-Serial': serial_no || this.serial_no, 'Content-Type': 'application/json' });
        return await this.httpService.post(url, _params, headers);
    }
    async query_batches_transfer_list_wx(params) {
        const baseUrl = `https://api.mch.weixin.qq.com/v3/transfer/batches/batch-id/${params.batch_id}`;
        const url = baseUrl + this.objectToQueryString(params, ['batch_id']);
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async query_batches_transfer_detail_wx(params) {
        const baseUrl = `https://api.mch.weixin.qq.com/v3/transfer/batches/batch-id/${params.batch_id}/details/detail-id/${params.detail_id}`;
        const url = baseUrl + this.objectToQueryString(params, ['batch_id', 'detail_id']);
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async query_batches_transfer_list(params) {
        const baseUrl = `https://api.mch.weixin.qq.com/v3/transfer/batches/out-batch-no/${params.out_batch_no}`;
        const url = baseUrl + this.objectToQueryString(params, ['out_batch_no']);
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async query_batches_transfer_detail(params) {
        const baseUrl = `https://api.mch.weixin.qq.com/v3/transfer/batches/out-batch-no/${params.out_batch_no}/details/out-detail-no/${params.out_detail_no}`;
        const url = baseUrl + this.objectToQueryString(params, ['out_batch_no', 'out_detail_no']);
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async create_profitsharing_orders(params) {
        const url = 'https://api.mch.weixin.qq.com/v3/profitsharing/orders';
        const _params = {
            appid: this.appid,
            ...params,
        };
        const serial_no = _params?.wx_serial_no;
        delete _params.wx_serial_no;
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.wxPayPublicId ? this.getHeaders(authorization, { 'Wechatpay-Serial': serial_no || this.wxPayPublicId, 'Content-Type': 'application/json' }) : this.getHeaders(authorization, { 'Wechatpay-Serial': serial_no || this.serial_no, 'Content-Type': 'application/json' });
        return await this.httpService.post(url, _params, headers);
    }
    async query_profitsharing_orders(transaction_id, out_order_no) {
        if (!transaction_id)
            throw new Error('缺少transaction_id');
        if (!out_order_no)
            throw new Error('缺少out_order_no');
        let url = `https://api.mch.weixin.qq.com/v3/profitsharing/orders/${out_order_no}`;
        url = url + this.objectToQueryString({ transaction_id });
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async profitsharing_return_orders(params) {
        const url = 'https://api.mch.weixin.qq.com/v3/profitsharing/return-orders';
        const _params = {
            ...params,
        };
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        return await this.httpService.post(url, _params, headers);
    }
    async query_profitsharing_return_orders(out_return_no, out_order_no) {
        if (!out_return_no)
            throw new Error('缺少out_return_no');
        if (!out_order_no)
            throw new Error('缺少out_order_no');
        let url = `https://api.mch.weixin.qq.com/v3/profitsharing/return-orders/${out_return_no}`;
        url = url + this.objectToQueryString({ out_order_no });
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async profitsharing_orders_unfreeze(params) {
        const url = 'https://api.mch.weixin.qq.com/v3/profitsharing/orders/unfreeze';
        const _params = {
            ...params,
        };
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        return await this.httpService.post(url, _params, headers);
    }
    async query_profitsharing_amounts(transaction_id) {
        if (!transaction_id)
            throw new Error('缺少transaction_id');
        const url = `https://api.mch.weixin.qq.com/v3/profitsharing/transactions/${transaction_id}/amounts`;
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async profitsharing_receivers_add(params) {
        const url = 'https://api.mch.weixin.qq.com/v3/profitsharing/receivers/add';
        const _params = {
            appid: this.appid,
            ...params,
        };
        const serial_no = _params?.wx_serial_no;
        delete _params.wx_serial_no;
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.wxPayPublicId ? this.getHeaders(authorization, { 'Wechatpay-Serial': serial_no || this.wxPayPublicId, 'Content-Type': 'application/json' }) : this.getHeaders(authorization, { 'Wechatpay-Serial': serial_no || this.serial_no, 'Content-Type': 'application/json' });
        return await this.httpService.post(url, _params, headers);
    }
    async profitsharing_receivers_delete(params) {
        const url = 'https://api.mch.weixin.qq.com/v3/profitsharing/receivers/delete';
        const _params = {
            appid: this.appid,
            ...params,
        };
        const authorization = this.buildAuthorization('POST', url, _params);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'application/json', 'Wechatpay-Serial': this.wxPayPublicId ? this.wxPayPublicId : null });
        return await this.httpService.post(url, _params, headers);
    }
    async profitsharing_bills(bill_date, tar_type) {
        if (!bill_date)
            throw new Error('缺少bill_date');
        let url = `https://api.mch.weixin.qq.com/v3/profitsharing/bills`;
        url = url + this.objectToQueryString({ bill_date, ...(tar_type && { tar_type }) });
        const authorization = this.buildAuthorization('GET', url);
        const headers = this.getHeaders(authorization);
        return await this.httpService.get(url, headers);
    }
    async upload_images(pic_buffer, filename) {
        const fileinfo = {
            filename,
            sha256: '',
        };
        const sign = crypto_1.default.createHash('sha256');
        sign.update(pic_buffer);
        fileinfo.sha256 = sign.digest('hex');
        const url = '/v3/merchant/media/upload';
        const authorization = this.buildAuthorization('POST', url, fileinfo);
        const headers = this.getHeaders(authorization, { 'Content-Type': 'multipart/form-data;boundary=boundary' });
        return await this.httpService.post(url, {
            fileinfo,
            pic_buffer,
        }, headers);
    }
}
Pay.certificates = {};
module.exports = Pay;
//# sourceMappingURL=index.js.map