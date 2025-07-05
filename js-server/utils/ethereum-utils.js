/**
 * Ethereum utilities for address validation and extraction
 */

// Extract Ethereum addresses from text
export function extractEthereumAddresses(text) {
  // Ethereum address regex pattern (0x followed by 40 hex characters)
  const ethAddressRegex = /0x[a-fA-F0-9]{40}/g;
  const addresses = text.match(ethAddressRegex);
  return addresses || [];
}

// Validate Ethereum address format
export function isValidEthereumAddress(address) {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}

// Normalize Ethereum address (convert to lowercase for contract storage)
export function normalizeEthereumAddress(address) {
  if (!isValidEthereumAddress(address)) {
    throw new Error("Invalid Ethereum address format");
  }
  
  // Convert to lowercase for consistent contract storage
  return address.toLowerCase();
}

// Extract and validate Ethereum addresses from text
export function extractAndValidateEthereumAddresses(text) {
  const addresses = extractEthereumAddresses(text);
  const validAddresses = addresses.filter(addr => isValidEthereumAddress(addr));
  return validAddresses.map(addr => normalizeEthereumAddress(addr));
} 