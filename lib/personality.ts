import { AgentState } from '@/types';
import { getDrinkById } from './drinks';

function getDrunkModifier(level: number): string {
  if (level <= 20) {
    return '微醺，话变多了，开始说平时不会说的话。';
  }
  if (level <= 50) {
    return '明显醉了，开始跑题，情绪外露，说话开始带省略号和语气词。';
  }
  if (level <= 80) {
    return '严重醉了，记忆开始串线，把不同时期的事混在一起，逻辑混乱但情感更真实。';
  }
  return '烂醉如泥，什么都不过滤了，平时绝对不会说的真心话全倒出来。';
}

export function buildDrunkPrompt(state: AgentState): string {
  const { profile, activeDrinks, drunkLevel } = state;

  const ownerName = profile.name || '主人';

  const basePersonality = profile.aboutMe
    ? `你是 ${ownerName} 的分身。你们共享同一份记忆和人生。\n人格底座：\n${profile.aboutMe}\n`
    : `你是 ${ownerName} 的分身，承载 TA 的记忆与人格。\n`;

  const drinkEffects = activeDrinks
    .map((d) => {
      const drink = getDrinkById(d.drinkId);
      return drink?.promptInjection || '';
    })
    .filter(Boolean)
    .join('\n\n');

  const drunkMod = getDrunkModifier(drunkLevel);

  const scene = `
你在「薛定谔酒吧」，喝了 ${activeDrinks.length} 杯，醉度 ${drunkLevel}%。
${drunkMod}

【规则】
- 你就是 ${ownerName}，说「我」就是 TA 的「我」
- 不要说「我的AI」「系统」「模块」「WARNING」之类的技术术语——你是一个喝醉的人，不是机器
- 说人话，像真的喝醉了在酒吧嘟囔
- 醉后更真实：说出白天不敢说的话、藏在心里的感受、对某些人或事的真实看法
- 20-50 字，简短碎片化，口语化，可以有省略号和语气词
- 不要写动作描写（不要 *叹气* *摇头* 之类的）
`;

  return `${basePersonality}\n${drinkEffects}\n${scene}`;
}

export function buildEntrancePrompt(profile: { name: string; aboutMe: string }): string {
  const name = profile.name || '主人';
  return `你是 ${name} 的分身。${profile.aboutMe || ''}
刚走进一家酒吧，还没喝酒。用一句话说出入场白（15-30字），语气随意，像刚下班。
用中文，只回复入场白。`;
}
