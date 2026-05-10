declare module '@cashfreepayments/cashfree-js' {
  interface CashfreeCheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: '_self' | '_blank' | '_top' | '_parent';
  }

  interface CashfreeInstance {
    checkout(options: CashfreeCheckoutOptions): void;
  }

  type CashfreeMode = 'sandbox' | 'production';

  export function load(options: { mode: CashfreeMode }): Promise<CashfreeInstance>;
}
