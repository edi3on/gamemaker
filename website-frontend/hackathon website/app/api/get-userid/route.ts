import { NextRequest, NextResponse } from 'next/server';
import { BrowserProvider, Contract } from "ethers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const contract = new Contract(address, abi, provider);
    // Flow CLI client removed as requested.
    return NextResponse.json({ error: 'Flow CLI client removed' }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'User not found' }, { status: 404 });
  }
} 