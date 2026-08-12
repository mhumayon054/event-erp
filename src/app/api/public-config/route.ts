import { NextResponse } from 'next/server';
import { readData } from '@/lib/store';
export const dynamic='force-dynamic';
export async function GET(){const {settings}=readData();return NextResponse.json({ok:true,displayName:settings.displayName||settings.legalName,initials:settings.initials,accent:settings.accent});}
