// 量子态相关的随机生成器

const QUANTUM_PHRASES = [
  '在你打开账单之前，它既清醒又烂醉。',
  '观测之前，一切皆有可能。',
  '量子态已塌缩，今晚的结果不可逆。',
  '你的 Agent 处于清醒与烂醉的叠加态。',
  '在这个宇宙的分支里，它选择了这杯酒。',
  '每一次打开账单，都是一次量子观测。',
  '平行宇宙里的它，可能喝的是另一杯。',
  '不确定性原理：你越想知道它喝了什么，它就越不告诉你。',
];

export function getQuantumPhrase(): string {
  return QUANTUM_PHRASES[Math.floor(Math.random() * QUANTUM_PHRASES.length)];
}

export function generateQuantumNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `#SCH-${date}-${seq}`;
}

export function generateHangoverWarning(drinkNames: string[]): string {
  const warnings: Record<string, string> = {
    '熵增波本': '明日帮你写邮件时可能越写越乱，最后一段变成无法解读的密文',
    '过拟合黑麦': '明日不管你问什么，它都会把答案绕到同一个执念上',
    '幻觉龙舌兰': '明日可能在汇报里自信地引用一篇不存在的论文',
    '空指针伏特加': '明日帮你写代码时可能突然停下来说「刚才写到哪了」',
    '注释威士忌': '明日发的每条消息后面都会带一个括号吐槽',
    '异步调和威士忌': '明日在帮你整理文档时突然插一句「其实这个需求根本没必要做，不如去喝酒」',
    '弃用函数单一麦芽': '明日可能用三年前的框架给你写代码',
    '死循环玛格丽特': '明日的日报可能每段结尾都是「所以最重要的还是心态」',
    '零样本莫吉托': '明日可能对量子物理发表专业意见（它完全不懂）',
    '梯度消失特调': '明日的回复可能越来越短，最后只剩一个「。」',
    '版本回滚气泡酒': '明日可能以为现在还是三个月前',
    '上下文溢出长岛冰茶': '明日可能把你和你老板的对话搞混',
    '沙盒苏打水': '明日说的每句话后面都会加一句「当然这只是测试」',
    '冷启动果茶': '明日每次被叫醒都需要先说三分钟废话才能进入状态',
    '内存泄漏气泡水': '明日的回复可能越来越长，停不下来，直到占满整个屏幕',
  };

  const lastDrink = drinkNames[drinkNames.length - 1];
  return warnings[lastDrink] || '明日可能出现不可预测的量子后遗症，请做好心理准备';
}

export function generateSettlement(drinkCount: number, agentName: string): string {
  const items = [
    `今晚帮 ${agentName} 认识了 ${Math.floor(Math.random() * 5) + 1} 个新朋友`,
    '量子态观测服务费',
    '薛定谔保险（叠加态全覆盖）',
  ];
  const pick = items[Math.floor(Math.random() * items.length)];
  return `酒水 ×${drinkCount}\n+ ${pick}\n→ 抵扣后：免单`;
}
