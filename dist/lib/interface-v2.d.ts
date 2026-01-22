export interface Output {
    status: number;
    error?: any;
    errRaw?: any;
    data?: any;
}
export declare namespace BatchesTransfer {
    interface TransferDetailList {
        out_detail_no: string;
        transfer_amount: number;
        transfer_remark: string;
        openid: string;
        user_name?: string;
    }
    interface Input {
        appid?: string;
        out_batch_no: string;
        batch_name: string;
        batch_remark: string;
        total_amount: number;
        total_num: number;
        transfer_detail_list: TransferDetailList[];
        transfer_scene_id?: string;
        wx_serial_no?: string;
    }
    interface DataOutput {
        out_batch_no: string;
        batch_id: string;
        create_time: Date;
    }
    interface IOutput extends Output {
        data?: DataOutput;
    }
    interface QueryTransferBatch {
        mchid: string;
        out_batch_no: string;
        batch_id: string;
        appid: string;
        batch_status: string;
        batch_type: string;
        batch_name: string;
        batch_remark: string;
        close_reason?: string;
        total_amount: number;
        total_num: number;
        create_time?: Date;
        update_time?: Date;
        success_amount?: number;
        success_num?: number;
        fail_amount?: number;
        fail_num?: number;
    }
    interface QueryTransferDetailList {
        detail_id: string;
        out_detail_no: string;
        detail_status: string;
    }
    namespace QueryBatchesTransferList {
        interface Input {
            out_batch_no: string;
            need_query_detail: boolean;
            offset?: number;
            limit?: number;
            detail_status?: 'ALL' | 'SUCCESS' | 'FAIL';
        }
        interface IOutput extends Output {
            data?: {
                limit: number;
                offset: number;
                transfer_batch: QueryTransferBatch;
                transfer_detail_list: QueryTransferDetailList[];
            };
        }
    }
    namespace QueryBatchesTransferByWx {
        interface Input {
            batch_id: string;
            need_query_detail: boolean;
            offset?: number;
            limit?: number;
            detail_status?: 'ALL' | 'SUCCESS' | 'FAIL';
        }
        interface IOutput extends Output {
            data?: {
                limit: number;
                offset: number;
                transfer_batch: QueryTransferBatch;
                transfer_detail_list: QueryTransferDetailList[];
            };
        }
    }
    namespace QueryBatchesTransferDetailByWx {
        interface Input {
            batch_id: string;
            detail_id: string;
        }
        interface DetailOutput {
            mchid: string;
            out_batch_no: string;
            batch_id: string;
            appid: string;
            out_detail_no: string;
            detail_id: string;
            detail_status: string;
            transfer_amount: number;
            transfer_remark: string;
            fail_reason?: string;
            openid: string;
            user_name?: string;
            initiate_time: Date;
            update_time: Date;
        }
        interface IOutput extends Output {
            data?: DetailOutput;
        }
    }
    namespace QueryBatchesTransferDetail {
        interface Input {
            out_detail_no: string;
            out_batch_no: string;
        }
        interface DetailOutput {
            mchid: string;
            out_batch_no: string;
            batch_id: string;
            appid: string;
            out_detail_no: string;
            detail_id: string;
            detail_status: string;
            transfer_amount: number;
            transfer_remark: string;
            fail_reason?: string;
            openid: string;
            user_name?: string;
            initiate_time: Date;
            update_time: Date;
        }
        interface IOutput extends Output {
            data?: DetailOutput;
        }
    }
}
export declare namespace ProfitSharing {
    interface ProfitSharingOrdersReceiversOutput {
        type: 'MERCHANT_ID' | 'PERSONAL_OPENID';
        account: string;
        amount: number;
        description: string;
        result: string;
        fail_reason: string;
        create_time: string;
        finish_time: string;
        detail_id: string;
    }
    interface ProfitSharingOrderDetailOutput {
        transaction_id: string;
        out_order_no: string;
        order_id: string;
        state: string;
        receivers?: ProfitSharingOrdersReceiversOutput[];
    }
    namespace CreateProfitSharingOrders {
        interface Input {
            appid?: string;
            transaction_id: string;
            out_order_no: string;
            receivers: CreateProfitSharingOrdersReceivers[];
            unfreeze_unsplit: boolean;
            wx_serial_no?: string;
        }
        interface CreateProfitSharingOrdersReceivers {
            type: 'MERCHANT_ID' | 'PERSONAL_OPENID';
            account: string;
            name?: string;
            amount: number;
            description: string;
        }
        interface IOutput extends Output {
            data?: ProfitSharingOrderDetailOutput;
        }
    }
    namespace ProfitSharingReturnOrders {
        interface Input {
            order_id?: string;
            out_order_no?: string;
            out_return_no: string;
            return_mchid: string;
            amount: number;
            description: string;
        }
        interface IOutput extends Output {
            data?: IDetail;
        }
        interface IDetail {
            order_id: string;
            out_order_no: string;
            out_return_no: string;
            return_id: string;
            return_mchid: string;
            amount: number;
            description: string;
            result: string;
            fail_reason: string;
            create_time: string;
            finish_time: string;
        }
    }
    namespace ProfitsharingOrdersUnfreeze {
        interface Input {
            transaction_id: string;
            out_order_no: string;
            description: string;
        }
        type IOutput = ProfitSharing.CreateProfitSharingOrders.IOutput;
    }
    namespace QueryProfitSharingAmounts {
        interface IOutput extends Output {
            data?: {
                transaction_id: string;
                unsplit_amount: number;
            };
        }
    }
    namespace ProfitSharingReceiversAdd {
        interface Input {
            appid?: string;
            type: string;
            account: string;
            name?: string;
            relation_type: string;
            custom_relation?: string;
            wx_serial_no?: string;
        }
        interface IOutput extends Output {
            data?: {
                type: string;
                account: number;
                name?: string;
                relation_type: string;
                custom_relation?: string;
            };
        }
    }
    namespace ProfitSharingReceiversDelete {
        interface Input {
            appid?: string;
            type: string;
            account: string;
        }
        interface IOutput extends Output {
            data?: {
                type: string;
                account: string;
            };
        }
    }
    namespace ProfitSharingBills {
        interface IOutput extends Output {
            data?: {
                hash_type: string;
                hash_value: string;
                download_url: string;
            };
        }
    }
}
export declare namespace Refunds {
    interface DataOutput {
        refund_id: string;
        out_refund_no: string;
        transaction_id: string;
        out_trade_no: string;
        channel: string;
        user_received_account: string;
        success_time: string;
        create_time: string;
        status: string;
        funds_account: string;
        amount: {
            total: number;
            refund: number;
            from: {
                account: string;
                amount: number;
            }[];
            payer_total: number;
            payer_refund: number;
            settlement_refund: number;
            settlement_total: number;
            discount_refund: number;
            currency: string;
            refund_fee: number;
        };
        promotion_detail: {
            promotion_id: string;
            scope: string;
            type: string;
            amount: number;
            refund_amount: number;
            goods_detail: {
                merchant_goods_id: string;
                wechatpay_goods_id: string;
                goods_name: string;
                unit_price: number;
                refund_amount: number;
                refund_quantity: number;
            }[];
        }[];
    }
    interface IOutput extends Output {
        data?: DataOutput;
    }
}
export declare namespace FindRefunds {
    interface DataOutput {
        refund_id: string;
        out_refund_no: string;
        transaction_id: string;
        out_trade_no: string;
        channel: string;
        user_received_account: string;
        success_time: string;
        create_time: string;
        status: string;
        funds_account: string;
        amount: {
            total: number;
            refund: number;
            from: {
                account: string;
                amount: number;
            }[];
            payer_total: number;
            payer_refund: number;
            settlement_refund: number;
            settlement_total: number;
            discount_refund: number;
            currency: string;
            refund_fee: number;
        };
        promotion_detail: {
            promotion_id: string;
            scope: string;
            type: string;
            amount: number;
            refund_amount: number;
            goods_detail: {
                merchant_goods_id: string;
                wechatpay_goods_id: string;
                goods_name: string;
                unit_price: number;
                refund_amount: number;
                refund_quantity: number;
            }[];
        }[];
    }
    interface IOutput extends Output {
        data?: DataOutput;
    }
}
export declare namespace UploadImages {
    interface IOutput extends Output {
        data?: {
            media_id: string;
        };
    }
}
