import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCompanyById,
  resolveCompanyAssetCode,
  syncInvestmentAssetCodes,
} from "./companies";

describe("resolveCompanyAssetCode", () => {
  it("returns SEEKAU for company-13", () => {
    assert.equal(resolveCompanyAssetCode("company-13", "SEEK"), "SEEKAU");
  });

  it("falls back to stored code for unknown company", () => {
    assert.equal(resolveCompanyAssetCode("unknown", "LEGACY"), "LEGACY");
  });
});

describe("syncInvestmentAssetCodes", () => {
  it("migrates legacy SEEK to SEEKAU for company-13", () => {
    const investments = [
      { companyId: "company-13", assetCode: "SEEK" },
      { companyId: "company-14", assetCode: "COSTCO" },
    ];
    const changed = syncInvestmentAssetCodes(investments);
    assert.equal(changed, true);
    assert.equal(investments[0].assetCode, "SEEKAU");
    assert.equal(investments[1].assetCode, "COSTCO");
  });

  it("returns false when already in sync", () => {
    const investments = [{ companyId: "company-13", assetCode: "SEEKAU" }];
    assert.equal(syncInvestmentAssetCodes(investments), false);
  });
});

describe("getCompanyById", () => {
  it("registers SEEK with on-chain code SEEKAU", () => {
    const seek = getCompanyById("company-13");
    assert.ok(seek);
    assert.equal(seek.name, "SEEK");
    assert.equal(seek.assetCode, "SEEKAU");
  });
});
