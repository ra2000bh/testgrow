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
}) {
  const sourceKeypair = Keypair.fromSecret(params.distributorSecret);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  const fee = await server.fetchBaseFee();
  const asset = new Asset(params.assetCode, params.issuerPublicKey);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: fee.toString(),
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(
      Operation.payment({
        destination: params.destinationPublicKey,
        asset,
        amount: params.amount,
      }),
    )
    .addMemo(Memo.text("StellarGrow reward"))
    .setTimeout(60)
    .build();

  tx.sign(sourceKeypair);
  return server.submitTransaction(tx);
}
