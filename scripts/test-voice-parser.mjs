import { parseVoiceTransaction } from '../src/lib/voice/smartVoiceParser.ts';

const testCases = [
  'Ramesh se 5000 rupaye mile.',
  'Mohan ko 2000 diye.',
  'आज 1500 रुपये का पेट्रोल खर्च हुआ।',
  'Suresh se das hazaar lene hain.',
  'Paid 5000 to supplier Rajesh.',
  'Aaj 25000 ka maal kharida.',
  'Sharma Traders se 25000 ka maal kharida.',
  'Vikash se 15000 lene hain.',
  '1.5 lakh transfer kiya bank se Amit ko.',
  'Dhai hazaar cash diye petrol pump par',
];

console.log('--- TESTING VOICE PARSER ---');
testCases.forEach((tc) => {
  const res = parseVoiceTransaction(tc);
  console.log(`Input: "${tc}"`);
  console.log(`  -> Type: ${res.type} (${res.typeLabelEn})`);
  console.log(`  -> Party: ${res.partyName}`);
  console.log(`  -> Amount: ₹${res.amount}`);
  console.log(`  -> Mode: ${res.paymentMode}`);
  console.log(`  -> Category: ${res.category}`);
  console.log('---');
});
