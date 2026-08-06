import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received Telegram Payload:", body);

    return NextResponse.json({
      status: "success",
      reply: "Message received successfully",
      received: body
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Invalid JSON"
    }, { status: 400 });
  }
}
