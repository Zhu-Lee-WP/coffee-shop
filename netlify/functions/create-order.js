// netlify/functions/create-order.js
const ecpay = require('ecpay_aio_nodejs');   // ← 新版 SDK

exports.handler = async (event) => {
  try {
    /* 1. 解析前端送來的 JSON ----------------------------------- */
    const { items, total, email } = JSON.parse(event.body);

    /* 2. 準備 SDK 需要的 options ------------------------------- */
    // SITE：在 Netlify 線上跑時會帶到 https://xxx.netlify.app；本地 dev 就用 http://localhost:8888
    const SITE = process.env.URL || 'http://localhost:8888';

    const options = {
      /* 一定要包在 MercProfile 裡！沒包就會報 Please specify the MercProfile */
      MercProfile: {
        MerchantID: process.env.ECPAY_MERCHANT_ID,
        HashKey:    process.env.ECPAY_HASH_KEY,
        HashIV:     process.env.ECPAY_HASH_IV,
      },

      /* Env：測試環境寫 'Stage'（正式站部署時改 'Production'） */
      Env: 'Stage',

      /* 綠界刷完卡要回呼的網址 */
      ReturnURL:      `${SITE}/.netlify/functions/ecpay-callback`,
      /* 刷完會導回你網站讓使用者看到「交易完成」頁 */
      OrderResultURL: `${SITE}/success.html`,
    };

    /* 診斷用：確保關鍵欄位都有值 ------------------------------ */
    console.log('ECPAY OPTIONS ▶', options);

    /* 3. 初始化 SDK ------------------------------------------- */
    const ecpaySdk = new ecpay(options);

    /* 4. 組訂單資料 ------------------------------------------ */
    const tradeNo   = 'ORDER' + Date.now();  // 記得 ≤20 字元
    const tradeDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const itemNames = items.map(i => `${i.name} x ${i.quantity}`).join('#');

    const formHtml = ecpaySdk.payment_client.aio_check_out_credit_onetime({
      MerchantTradeNo:  tradeNo,
      MerchantTradeDate: tradeDate,
      TotalAmount:      String(total),         // 必須字串，且為整數
      TradeDesc:        encodeURIComponent('Coffee Order'),
      ItemName:         itemNames,
      Email:            email || ''
    });

    /* 5. 把整段 <form> 回給前端並自動 submit ------------------- */
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: formHtml
    };
  } catch (err) {
    console.error('ECPAY ERROR ▶', err);      // 若還有錯這裡會印詳細原因
    return { statusCode: 500, body: 'Server Error' };
  }
};
