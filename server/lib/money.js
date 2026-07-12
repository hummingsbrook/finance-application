function roundMoney(value) {
  // Use string-based rounding to avoid floating point issues
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
}

function addMoney(a, b) {
  return roundMoney(Number(a) + Number(b));
}
module.exports = { roundMoney, addMoney };