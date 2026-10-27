const sample = [
  'POST https://sendflow.africa/v2/payin/initiate',
  'Content-Type: application/json',
  '',
  '{',
  '  "amount": 5000,',
  '  "currency": "XOF",',
  '  "country_code": "CI",',
  '  "operator": "orange",',
  '  "phone": "+2250700000000",',
  '  "order_id": "ORDER-20260711-001",',
  '  "operator_otp": "123456",',
  '  "webhook_url": "https://yourapp.com/webhooks/sendflow"',
  '}',
].join('\n');

export const developerApiExample = {
  fr: sample,
  en: sample,
};
