// Node 18+ has built-in fetch — no import needed
const CF_SANDBOX = 'https://sandbox.cashfree.com/pg';
const CF_PROD    = 'https://api.cashfree.com/pg';
const CF_VERSION = '2023-08-01';

function cfBase(): string {
  return process.env.CASHFREE_ENV === 'PRODUCTION' ? CF_PROD : CF_SANDBOX;
}

function cfHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-client-id':     process.env.CASHFREE_APP_ID!,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
    'x-api-version':   CF_VERSION,
  };
}

export interface CfOrderInput {
  cfOrderId: string;      // our own order UUID — used as cashfree order_id
  amount:    number;
  currency:  string;
  customerId:    string;
  customerName:  string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
}

export interface CfOrderResult {
  paymentSessionId: string;
  cfOrderId:        string;
}

export async function createCashfreeOrder(input: CfOrderInput): Promise<CfOrderResult> {
  const body = {
    order_id:       input.cfOrderId,
    order_amount:   input.amount,
    order_currency: input.currency,
    customer_details: {
      customer_id:    input.customerId,
      customer_name:  input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
    },
    order_meta: {
      return_url: input.returnUrl,
    },
  };

  const res = await fetch(`${cfBase()}/orders`, {
    method:  'POST',
    headers: cfHeaders(),
    body:    JSON.stringify(body),
  });

  const data: any = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || `Cashfree createOrder failed: ${res.status}`);
  }

  return {
    paymentSessionId: data.payment_session_id as string,
    cfOrderId:        data.order_id            as string,
  };
}

export interface CfPayment {
  payment_status: string;   // 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED'
  cf_payment_id:  string;
}

export async function fetchCashfreePayments(cfOrderId: string): Promise<CfPayment[]> {
  const res = await fetch(`${cfBase()}/orders/${cfOrderId}/payments`, {
    method:  'GET',
    headers: cfHeaders(),
  });

  const data: any = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || `Cashfree fetchPayments failed: ${res.status}`);
  }

  return data as CfPayment[];
}
