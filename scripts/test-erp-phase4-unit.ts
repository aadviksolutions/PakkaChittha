import assert from 'node:assert/strict';
import {
  buildEwayBillPayload,
  buildNicEinvoicePayload,
  computeGstItcOffset,
} from '../src/lib/gst/complianceSuite';
import { calculateTdsTcsDeduction } from '../src/lib/gst/tdsTcsEngine';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS: ${name}`);
}

console.log('=== Pakka Chittha ERP Phase 4 Unit Tests ===');

runTest(
  'computeGstItcOffset follows Rule 88A hierarchy without CGST<->SGST cross-offset',
  () => {
    // Output: IGST 1000, CGST 2000, SGST 2000
    // ITC: IGST 3000 (1000 covers Out IGST -> 2000 covers Out CGST), CGST 500 (-> 0 CGST left, so 500 stays CGST CF!), SGST 1500 (-> covers Out SGST 1500)
    // Net Cash Payable: IGST 0, CGST 0, SGST 500; Carry Forward: CGST 500
    const res = computeGstItcOffset({
      outputIgst: 1000,
      outputCgst: 2000,
      outputSgst: 2000,
      itcIgst: 3000,
      itcCgst: 500,
      itcSgst: 1500,
    });

    assert.equal(res.utilization.igstFromIgst, '1000.00');
    assert.equal(res.utilization.cgstFromIgst, '2000.00');
    assert.equal(res.utilization.sgstFromSgst, '1500.00');
    assert.equal(res.netCashPayable.igst, '0.00');
    assert.equal(res.netCashPayable.cgst, '0.00');
    assert.equal(res.netCashPayable.sgst, '500.00');
    assert.equal(res.netCashPayable.total, '500.00');
    // CGST credit MUST NOT offset SGST liability under Rule 88A
    assert.equal(res.closingItcCarryForward.cgst, '500.00');
    assert.equal(res.closingItcCarryForward.total, '500.00');
  }
);

runTest(
  'buildNicEinvoicePayload and buildEwayBillPayload enforce strict schema validation and never fabricate IRNs or EWB numbers',
  () => {
    const invalidRes = buildNicEinvoicePayload({
      invoiceNumber: 'INV-1001',
      invoiceDate: '2026-10-15',
      isGstInvoice: true,
      gstType: 'CGST_SGST',
      subtotal: 60000,
      cgstTotal: 5400,
      sgstTotal: 5400,
      igstTotal: 0,
      discountTotal: 0,
      rounding: 0,
      total: 70800,
      supplier: {
        name: 'Bharat Traders',
        gstin: 'BADGSTIN',
        address: '10 MG Road',
        pincode: '400001',
        state: 'Maharashtra',
      },
      buyer: {
        name: 'Unregistered Party',
        gstin: null,
        billingAddress: 'Pune',
        state: 'Maharashtra',
      },
      items: [
        {
          description: 'Laptop Stand',
          hsnCode: '73',
          quantity: 10,
          unit: 'NOS',
          rate: 6000,
          discount: 0,
          taxRate: 18,
          cgstAmount: 5400,
          sgstAmount: 5400,
          igstAmount: 0,
          lineTotal: 70800,
        },
      ],
    });

    assert.equal(invalidRes.valid, false);
    assert.equal(invalidRes.portalStatus, 'VALIDATION_FAILED');
    assert.equal(invalidRes.payload, null);
    assert.ok(invalidRes.validationErrors.length >= 3);

    const validInput = {
      invoiceNumber: 'INV-1002',
      invoiceDate: '2026-10-15',
      isGstInvoice: true,
      gstType: 'CGST_SGST',
      subtotal: 60000,
      cgstTotal: 5400,
      sgstTotal: 5400,
      igstTotal: 0,
      discountTotal: 0,
      rounding: 0,
      total: 70800,
      supplier: {
        legalName: 'Bharat Traders Pvt Ltd',
        name: 'Bharat Traders',
        gstin: '27AABCU9603R1ZM',
        address: '10 MG Road, Fort',
        city: 'Mumbai',
        pincode: '400001',
        state: 'Maharashtra',
      },
      buyer: {
        name: 'Deccan Distributors',
        gstin: '27AAACR5055K1Z7',
        billingAddress: 'Plot 5, Chakan MIDC, Pune 410501',
        state: 'Maharashtra',
        pincode: '410501',
      },
      items: [
        {
          description: 'Steel Rack',
          hsnCode: '940320',
          quantity: 10,
          unit: 'NOS',
          rate: 6000,
          discount: 0,
          taxRate: 18,
          cgstAmount: 5400,
          sgstAmount: 5400,
          igstAmount: 0,
          lineTotal: 70800,
        },
      ],
    };

    const eInv = buildNicEinvoicePayload(validInput);
    assert.equal(eInv.valid, true);
    assert.equal(eInv.portalStatus, 'READY_FOR_IRP_UPLOAD');
    assert.equal(eInv.payload?.Version, '1.1');
    assert.equal(eInv.payload?.SellerDtls.Stcd, '27');
    assert.equal(eInv.payload?.BuyerDtls.Pin, 410501);
    assert.equal('Irn' in (eInv.payload as Record<string, unknown>), false);

    const ewb = buildEwayBillPayload(validInput, { transDistanceKm: 145 });
    assert.equal(ewb.valid, true);
    assert.equal(ewb.thresholdExceeded, true);
    assert.equal(ewb.portalStatus, 'READY_FOR_EWB_PORTAL');
    assert.equal('ewbNo' in (ewb.payload as Record<string, unknown>), false);
  }
);

runTest(
  'calculateTdsTcsDeduction enforces thresholds, 194Q excess-only base, and 206AA 20% missing-PAN rate',
  () => {
    const below194C = calculateTdsTcsDeduction({
      sectionCode: '194C_OTH',
      transactionAmount: 25000,
      cumulativeFyAmount: 0,
    });
    assert.equal(below194C.thresholdTriggered, false);
    assert.equal(below194C.taxAmount, '0.00');

    const triggered194J = calculateTdsTcsDeduction({
      sectionCode: '194J_PROF',
      transactionAmount: 50000,
      cumulativeFyAmount: 0,
      hasPan: true,
    });
    assert.equal(triggered194J.thresholdTriggered, true);
    assert.equal(triggered194J.taxAmount, '5000.00');
    assert.equal(triggered194J.netPayableAfterTds, '45000.00');

    // 194Q applies 0.1% ONLY on excess above ₹50,00,000
    const excess194Q = calculateTdsTcsDeduction({
      sectionCode: '194Q',
      transactionAmount: 1000000,
      cumulativeFyAmount: 4500000,
      hasPan: true,
    });
    assert.equal(excess194Q.thresholdTriggered, true);
    assert.equal(excess194Q.taxableBase, '500000.00');
    assert.equal(excess194Q.taxAmount, '500.00');

    // Missing PAN escalates to 20% u/s 206AA
    const noPan = calculateTdsTcsDeduction({
      sectionCode: '194J_PROF',
      transactionAmount: 50000,
      hasPan: false,
    });
    assert.equal(noPan.effectiveRatePercent, 20);
    assert.equal(noPan.taxAmount, '10000.00');
  }
);
