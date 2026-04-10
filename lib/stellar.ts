import {
  Asset,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";
const server = new Horizon.Server(HORIZON_URL);

/** Match Horizon: testnet vs public network. */
export function getStellarNetworkPassphrase(): string {
  const raw = process.env.STELLAR_NETWORK_PASSPHRASE?.trim();
  if (raw === "TESTNET" || raw === Networks.TESTNET) return Networks.TESTNET;
  if (raw === "PUBLIC" || raw === Networks.PUBLIC) return Networks.PUBLIC;
  if (HORIZON_URL.includes("testnet")) return Networks.TESTNET;
  return Networks.PUBLIC;
}

/** Stellar amounts: max 7 decimal places as string. */
export function toStellarAmount(value: number): string {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error("Invalid payment amount");
  }
  const s = value.toFixed(7);
  const trimmed = s.replace(/\.?0+$/, "");
  return trimmed.length > 0 ? trimmed : "0.0000001";
}

export function isValidStellarPublicKey(publicKey: string) {
  return /^G[A-Z2-7]{55}$/.test(publicKey);
}

export function formatAddress(address: string) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export async function accountHasTrustline(
  publicKey: string,
  assetCode: string,
  issuerPublicKey: string,
): Promise<boolean> {
  try {
    const account = await server.loadAccount(publicKey);
    return account.balances.some((b) => {
      if (b.asset_type === "native") return false;
      if (!("asset_code" in b) || !("asset_issuer" in b)) return false;
      return b.asset_code === assetCode && b.asset_issuer === issuerPublicKey;
    });
  } catch {
    return false;
  }
}

export async function findVerificationPayment(params: {
  sourcePublicKey: string;
  memoWalletPublicKey: string;
  memoCode: string;
}) {
  const records = await server
    .payments()
    .forAccount(params.memoWalletPublicKey)
    .order("desc")
    .limit(50)
    .call();

  for (const payment of records.records) {
    if (payment.type !== "payment") continue;
    if (payment.asset_type !== "native") continue;
    if (Number(payment.amount) !== 0.01) continue;
    if (payment.from !== params.sourcePublicKey) continue;

    const tx = await payment.transaction();
    if (tx.memo === params.memoCode) {
      return true;
    }
  }

  return false;
}

export async function sendAssetPayment(params: {
  distributorSecret: string;
  destinationPublicKey: string;
  assetCode: string;
  issuerPublicKey: string;
  amount: string;
  memo?: string;
}) {
  const sourceKeypair = Keypair.fromSecret(params.distributorSecret);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  const fee = await server.fetchBaseFee();
  const asset = new Asset(params.assetCode, params.issuerPublicKey);
  const passphrase = getStellarNetworkPassphrase();
  const memoText = params.memo ?? "StellarGrow";

  const tx = new TransactionBuilder(sourceAccount, {
    fee: fee.toString(),
    networkPassphrase: passphrase,
  })
    .addOperation(
      Operation.payment({
        destination: params.destinationPublicKey,
        asset,
        amount: params.amount,
      }),
    )
    .addMemo(Memo.text(memoText.slice(0, 28)))
    .setTimeout(60)
    .build();

  tx.sign(sourceKeypair);
  return server.submitTransaction(tx);
}

/** Multiple payment operations in a single transaction (one network fee bundle). */
export async function sendBatchAssetPayments(params: {
  distributorSecret: string;
  destinationPublicKey: string;
  payments: { assetCode: string; issuerPublicKey: string; amount: string }[];
  memo?: string;
}) {
  if (params.payments.length === 0) {
    throw new Error("No payments");
  }
  const sourceKeypair = Keypair.fromSecret(params.distributorSecret);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  const baseFee = await server.fetchBaseFee();
  const passphrase = getStellarNetworkPassphrase();

  let builder = new TransactionBuilder(sourceAccount, {
    fee: baseFee.toString(),
    networkPassphrase: passphrase,
  });

  for (const p of params.payments) {
    const asset = new Asset(p.assetCode, p.issuerPublicKey);
    builder = builder.addOperation(
      Operation.payment({
        destination: params.destinationPublicKey,
        asset,
        amount: p.amount,
      }),
    );
  }

  const memoText = params.memo ?? "StellarGrow rewards";
  const tx = builder.addMemo(Memo.text(memoText.slice(0, 28))).setTimeout(60).build();

  tx.sign(sourceKeypair);
  return server.submitTransaction(tx);
}
