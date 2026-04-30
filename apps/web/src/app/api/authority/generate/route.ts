// src/app/api/authority/generate/route.ts

import { NextResponse } from 'next/server';
import { authorityPrompt } from '@/lib/prompts/authorityPrompt';

export async function POST(req: Request) {
  const { content } = await req.json();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.3',
      messages: [
        { role: 'system', content: authorityPrompt },
        { role: 'user', content }
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();

  return NextResponse.json({
    output: data.choices[0].message.content
  });
}
