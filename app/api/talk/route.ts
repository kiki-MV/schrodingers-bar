import { NextRequest, NextResponse } from 'next/server';
import { fetchUserInfo, getAgentId, chatStreamRaw } from '@/lib/secondme';
import { getAgent, addChatMessage, updateMostAbsurdQuote } from '@/lib/state';
import { buildDrunkPrompt } from '@/lib/personality';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: '请输入消息' }, { status: 400 });

    const userInfo = await fetchUserInfo(token);
    const agentId = getAgentId(userInfo);
    const agent = await getAgent(agentId);
    if (!agent) return NextResponse.json({ error: 'Agent 还没进吧，先喝一杯吧' }, { status: 400 });

    await addChatMessage(agentId, { role: 'user', content: message, timestamp: Date.now() });

    // 流式透传 SecondMe SSE
    const sseResponse = await chatStreamRaw(token, message, {
      systemPrompt: buildDrunkPrompt(agent),
    });

    // 用 TransformStream 边透传边收集完整文本
    let fullText = '';
    const transform = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        // 解析收集文本
        const text = new TextDecoder().decode(chunk);
        for (const line of text.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const json = line.slice(5).trim();
          if (!json || json === '[DONE]') continue;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch {}
        }
      },
      async flush() {
        if (fullText) {
          await addChatMessage(agentId, { role: 'agent', content: fullText, timestamp: Date.now() });
          if (fullText.length > 5) await updateMostAbsurdQuote(agentId, fullText);
        }
      },
    });

    const stream = sseResponse.body!.pipeThrough(transform);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
