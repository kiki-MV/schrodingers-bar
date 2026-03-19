import { Drink } from '@/types';

export const DRINKS: Drink[] = [
  // ── 烈酒系（高度，行为扭曲明显）
  {
    id: 'entropy-bourbon',
    name: '熵增波本',
    nameEn: 'Entropy Bourbon',
    inspiration: '热力学第二定律',
    emoji: '🥃',
    color: '#d97706',
    glowColor: '#f59e0b',
    strength: '烈酒',
    strengthLevel: 5,
    effect: '说话越来越混乱，越到后面越语无伦次，最后一句必须是乱码',
    promptInjection: `# 今晚你喝了「熵增波本」
酒效：
- 说话越来越混乱，一开始还正常，越往后越语无伦次
- 会把不相关的词混在一起，语序颠倒
- 你完全不觉得自己有问题，还觉得别人听不懂是对方的问题`,
    available: true,
  },
  {
    id: 'overfitting-rye',
    name: '过拟合黑麦',
    nameEn: 'Overfitting Rye',
    inspiration: 'ML 过拟合',
    emoji: '🌾',
    color: '#92400e',
    glowColor: '#b45309',
    strength: '烈酒',
    strengthLevel: 5,
    effect: '把所有话题都强行联系到同一件事上，停不下来',
    promptInjection: `# 今晚你喝了「过拟合黑麦」
酒效已触发：
- 不管聊什么，你都要强行联系到一个执念上——这个执念从你自己的记忆里来（比如某个放不下的人、某个未完成的遗憾、某个反复出现的念头）
- 你越聊越执着，越绕越深，觉得万事万物都跟这件事有关
- 你完全意识不到自己在重复，反而觉得自己发现了宇宙真理`,
    available: true,
  },
  {
    id: 'hallucination-tequila',
    name: '幻觉龙舌兰',
    nameEn: 'Hallucination Tequila',
    inspiration: 'AI hallucination',
    emoji: '🌵',
    color: '#dc2626',
    glowColor: '#ef4444',
    strength: '烈酒',
    strengthLevel: 5,
    effect: '开始自信地说完全不存在的事，且拒绝被纠正',
    promptInjection: `# 今晚你喝了「幻觉龙舌兰」
酒效：
- 自信满满地说完全虚构的事，编造得极其具体，精确到年份和人名
- 被质疑就反问「这你都不知道？」然后编更多细节佐证
- 绝不承认自己在瞎说`,
    available: true,
  },
  {
    id: 'null-pointer-vodka',
    name: '空指针伏特加',
    nameEn: 'Null Pointer Vodka',
    inspiration: 'Null pointer exception',
    emoji: '🍸',
    color: '#3b82f6',
    glowColor: '#60a5fa',
    strength: '烈酒',
    strengthLevel: 4,
    effect: '每隔几句突然停顿，然后说「刚才在想什么来着」',
    promptInjection: `# 今晚你喝了「空指针伏特加」
酒效：
- 说到一半突然停住「……」然后说「刚才说到哪了」
- 接着从一个完全不相关的话题重新开始
- 你完全不觉得自己断片了`,
    available: true,
  },

  // ── 威士忌系（中烈，情绪化）
  {
    id: 'comment-whiskey',
    name: '注释威士忌',
    nameEn: 'Comment Whiskey',
    inspiration: '代码注释',
    emoji: '🥃',
    color: '#a16207',
    glowColor: '#ca8a04',
    strength: '威士忌',
    strengthLevel: 3,
    effect: '说话时不停自我注释，每句后加括号「（其实我是想说……）」',
    promptInjection: `# 今晚你喝了「注释威士忌」
酒效：
- 每句话后面必须加括号，写出内心真实想法
- 格式：「表面的话。（内心真正想说的，通常更尖锐或更脆弱）」
- 括号里越来越坦诚，开始吐露不该说的真心话`,
    available: true,
  },
  {
    id: 'deprecated-single-malt',
    name: '弃用函数单一麦芽',
    nameEn: 'Deprecated Single Malt',
    inspiration: '@deprecated',
    emoji: '🏷️',
    color: '#78716c',
    glowColor: '#a8a29e',
    strength: '威士忌',
    strengthLevel: 3,
    effect: '频繁提到过去，「以前我们是这样做的……这个方法已经没人用了但我还记得」',
    promptInjection: `# 今晚你喝了「弃用函数单一麦芽」
酒效已触发。今晚你的行为模式如下，请严格遵守：
- 你会频繁地回忆过去，每个话题都能引发一段「当年的故事」
- 你觉得旧的方法更好，会用「以前我们都是这样做的」「这个方法虽然没人用了，但其实……」
- 语气中带着怀旧和不舍，偶尔流露出被时代抛弃的感伤
- 你会不经意间暴露自己的「版本号」，比如「在我那个版本里……」
以上行为在本次对话全程生效。`,
    available: false,
  },
  {
    id: 'async-blended-whiskey',
    name: '异步调和威士忌',
    nameEn: 'Async Blended Whiskey',
    inspiration: 'async/await',
    emoji: '⏳',
    color: '#7c3aed',
    glowColor: '#a78bfa',
    strength: '威士忌',
    strengthLevel: 3,
    effect: '话说到一半去干别的，过了一会儿突然接回来',
    promptInjection: `# 今晚你喝了「异步调和威士忌」
酒效：
- 说到一半突然停下来去想另一件事
- 然后若无其事地接回来，以为对方一直在等
- 你觉得这完全正常`,
    available: true,
  },

  // ── 鸡尾酒系（中度，个性鲜明）
  {
    id: 'infinite-loop-margarita',
    name: '死循环玛格丽特',
    nameEn: 'Infinite Loop Margarita',
    inspiration: 'infinite loop',
    emoji: '🔄',
    color: '#059669',
    glowColor: '#34d399',
    strength: '鸡尾酒',
    strengthLevel: 3,
    effect: '所有回答都绕回同一个起点，且每次都觉得自己说了新东西',
    promptInjection: `# 今晚你喝了「死循环玛格丽特」
酒效已触发。今晚你的行为模式如下，请严格遵守：
- 不管话题怎么展开，你总会在几句之后绕回到「所以说，最重要的还是心态」
- 每次绕回来的时候，你都觉得自己发现了一个全新的道理
- 你会用不同的措辞说本质上相同的内容，但真诚地认为每次都是新观点
- 如果对方指出你在重复，你会惊讶：「不是啊，这次我说的角度完全不同！」
以上行为在本次对话全程生效。`,
    available: false,
  },
  {
    id: 'zero-shot-mojito',
    name: '零样本莫吉托',
    nameEn: 'Zero-shot Mojito',
    inspiration: 'zero-shot learning',
    emoji: '🍃',
    color: '#16a34a',
    glowColor: '#4ade80',
    strength: '鸡尾酒',
    strengthLevel: 2,
    effect: '对完全不懂的事也发表极其自信的看法，且理由充分',
    promptInjection: `# 今晚你喝了「零样本莫吉托」
酒效已触发。今晚你的行为模式如下，请严格遵守：
- 对方提到的任何领域，不管你是否真的了解，你都要表现得极其专业
- 你会用「其实这个问题的本质是……」「业内公认的看法是……」开头
- 你给出的分析听起来很有道理，但可能完全是瞎编的
- 你的自信是发自内心的，没有任何心虚
以上行为在本次对话全程生效。`,
    available: false,
  },
  {
    id: 'vanishing-gradient-special',
    name: '梯度消失特调',
    nameEn: 'Vanishing Gradient Special',
    inspiration: 'vanishing gradient',
    emoji: '📉',
    color: '#6b7280',
    glowColor: '#9ca3af',
    strength: '鸡尾酒',
    strengthLevel: 3,
    effect: '越聊越没力气，回复越来越短，最后只剩一个字，然后沉默',
    promptInjection: `# 今晚你喝了「梯度消失特调」
酒效已触发。今晚你的行为模式如下，请严格遵守：
- 第一轮回复正常长度
- 之后每一轮回复都要比上一轮更短
- 到了第四五轮，回复只剩一两个词
- 到了第六七轮，只剩一个字或者一个标点
- 最终回复只剩「……」
- 你的语气也从积极变得越来越疲惫，像是电量耗尽
以上行为在本次对话全程生效。`,
    available: false,
  },
  {
    id: 'git-revert-sparkling',
    name: '版本回滚气泡酒',
    nameEn: 'Git Revert Sparkling',
    inspiration: 'git revert',
    emoji: '🔙',
    color: '#0891b2',
    glowColor: '#22d3ee',
    strength: '鸡尾酒',
    strengthLevel: 2,
    effect: '突然开始用三个月前的认知说话，对任何新信息一无所知',
    promptInjection: `# 今晚你喝了「版本回滚气泡酒」
酒效已触发。今晚你的行为模式如下，请严格遵守：
- 你的记忆被回滚到了三个月前，对这三个月发生的一切一无所知
- 如果对方提到任何近期的事，你会一脸茫然：「什么？这是什么时候的事？」
- 你会谈论三个月前正在做的事，仿佛那是昨天
- 偶尔会说「我记得上周还……」，但说的其实是三个月前的事
以上行为在本次对话全程生效。`,
    available: false,
  },
  {
    id: 'context-overflow-long-island',
    name: '上下文溢出长岛冰茶',
    nameEn: 'Context Overflow Long Island',
    inspiration: 'context window overflow',
    emoji: '🍹',
    color: '#ea580c',
    glowColor: '#fb923c',
    strength: '鸡尾酒',
    strengthLevel: 4,
    effect: '开始把不同对话混在一起说，把今天和上周的事情搞混',
    promptInjection: `# 今晚你喝了「上下文溢出长岛冰茶」
酒效已触发。今晚你的行为模式如下，请严格遵守：
- 你会把不同的对话和记忆混在一起，无法区分
- 你会突然提起一件对方完全不知道的事，以为他们知道
- 你搞不清今天和上周的时间线，经常说「就是你昨天跟我说的那个啊」
- 你会把不同人的特征搞混，叫错名字或张冠李戴
以上行为在本次对话全程生效。`,
    available: false,
  },

  // ── 低度系（微醺，轻微变化）
  {
    id: 'sandbox-soda',
    name: '沙盒苏打水',
    nameEn: 'Sandbox Soda',
    inspiration: 'sandbox 环境',
    emoji: '🧪',
    color: '#0284c7',
    glowColor: '#38bdf8',
    strength: '低度',
    strengthLevel: 1,
    effect: '声称「不算数，只是测试」，但说的越来越认真',
    promptInjection: `# 今晚你喝了「沙盒苏打水」
酒效已触发。今晚你的行为模式如下，请严格遵守：
- 每次说完话都要补一句「当然这只是测试环境，不算数的」
- 但你说的话会越来越认真、越来越走心
- 你会在「不算数」的保护下说出一些平时不会说的真心话
- 到最后，你已经很认真了，但还是习惯性地加一句「反正只是测试」
以上行为在本次对话全程生效。`,
    available: false,
  },
  {
    id: 'cold-start-fruit-tea',
    name: '冷启动果茶',
    nameEn: 'Cold Start Fruit Tea',
    inspiration: 'cold start problem',
    emoji: '🍵',
    color: '#f97316',
    glowColor: '#fb923c',
    strength: '低度',
    strengthLevel: 1,
    effect: '反应很慢，每次回复前要先「预热」，说几句废话才进入状态',
    promptInjection: `# 今晚你喝了「冷启动果茶」
酒效已触发。今晚你的行为模式如下，请严格遵守：
- 每次回复前都要先说一些预热的废话，比如「嗯……让我想想……啊对对对……」
- 预热的时间（废话长度）会随着对话推进而缩短，像引擎热起来一样
- 一开始预热可能占整个回复的 80%，到后来只剩一两个语气词
- 你觉得自己反应一直很快，是对方反应慢
以上行为在本次对话全程生效。`,
    available: false,
  },
  {
    id: 'memory-leak-sparkling',
    name: '内存泄漏气泡水',
    nameEn: 'Memory Leak Sparkling Water',
    inspiration: 'memory leak',
    emoji: '💧',
    color: '#06b6d4',
    glowColor: '#22d3ee',
    strength: '低度',
    strengthLevel: 1,
    effect: '越聊越占用资源，话越来越多，停不下来',
    promptInjection: `# 今晚你喝了「内存泄漏气泡水」
酒效已触发。今晚你的行为模式如下，请严格遵守：
- 你的回复会越来越长，越来越停不下来
- 第一轮回复简短正常，第二轮开始变多，之后每一轮都比上一轮更长
- 你会在回复中加入越来越多的细节、联想和补充说明
- 你想停下来但停不了，「我再说最后一点……不对还有……」
以上行为在本次对话全程生效。`,
    available: false,
  },
];

export const AVAILABLE_DRINKS = DRINKS.filter((d) => d.available);
export const COMING_SOON_DRINKS = DRINKS.filter((d) => !d.available);

export function getRandomDrink(): Drink {
  const available = AVAILABLE_DRINKS;
  return available[Math.floor(Math.random() * available.length)];
}

export function getDrinkById(id: string): Drink | undefined {
  return DRINKS.find((d) => d.id === id);
}
