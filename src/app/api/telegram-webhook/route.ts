import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      status: "success",
      reply: "Message received successfully",
      received: body
    });
  } catch (error) {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }
}
