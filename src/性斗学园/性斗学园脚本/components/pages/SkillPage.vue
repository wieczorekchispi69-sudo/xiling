<template>
  <div class="skill-page">
    <!-- 技能点显示 -->
    <div class="skill-header">
      <div class="skill-points-card">
        <i class="fas fa-book-sparkles"></i>
        <div class="points-info">
          <span class="points-label">可用技能点</span>
          <span class="points-value">{{ skillPoints }}</span>
        </div>
      </div>
    </div>

    <!-- 技能列表 -->
    <div class="skills-section">
      <h3 class="section-title">
        <i class="fas fa-hand-fist"></i>
        主动技能
        <span class="skill-count">({{ skillCount }} 个)</span>
      </h3>

      <div v-if="skillCount === 0" class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>暂无已学习的技能</p>
        <span class="empty-hint">在开局时选择技能或通过游戏获得</span>
      </div>

      <div v-else class="skill-list">
        <div
          v-for="(skill, skillId) in activeSkills"
          :key="skillId"
          class="skill-card"
          :class="getRarityClass(skill.基本信息?.稀有度)"
        >
          <!-- 技能头部 -->
          <div class="skill-header-row">
            <div class="skill-name-area">
              <span class="skill-name">{{ skill.基本信息?.技能名称 || '未知技能' }}</span>
              <span class="skill-rarity" :class="getRarityClass(skill.基本信息?.稀有度)">
                {{ skill.基本信息?.稀有度 || 'C' }}
              </span>
            </div>
            <div class="skill-level">Lv.{{ skill.基本信息?.技能等级 || 1 }}</div>
          </div>

          <!-- 技能描述 -->
          <p class="skill-description">{{ skill.基本信息?.技能描述 || '暂无描述' }}</p>

          <!-- 技能属性 -->
          <div class="skill-stats">
            <div class="stat-item cost">
              <i class="fas fa-bolt-lightning"></i>
              <span>{{ skill.冷却与消耗?.耐力消耗 || 0 }} 耐力</span>
            </div>
            <div class="stat-item cooldown" v-if="skill.冷却与消耗?.冷却回合数 > 0">
              <i class="fas fa-clock"></i>
              <span>{{ skill.冷却与消耗?.冷却回合数 || 0 }} 回合</span>
            </div>
            <div class="stat-item accuracy">
              <i class="fas fa-crosshairs"></i>
              <span>{{ skill.伤害与效果?.基础命中率 || 100 }}%</span>
            </div>
          </div>

          <!-- 伤害信息 -->
          <div class="skill-damage">
            <span class="damage-label">伤害来源:</span>
            <span class="damage-source">{{ skill.伤害与效果?.伤害来源 || '性斗力' }}</span>
            <span class="damage-value">×{{ skill.伤害与效果?.系数 || 100 }}%</span>
          </div>

          <!-- 特殊机制 -->
          <div class="skill-mechanics">
            <span v-if="skill.特殊机制?.是否忽视防御" class="mechanic-tag ignore-def">
              <i class="fas fa-shield-slash"></i> 无视防御
            </span>
            <span v-if="!skill.特殊机制?.是否可被闪避" class="mechanic-tag no-dodge">
              <i class="fas fa-bullseye"></i> 必中
            </span>
          </div>

          <!-- 升级按钮 -->
          <div class="skill-upgrade" v-if="canUpgrade(skill)">
            <button
              class="upgrade-btn"
              @click="upgradeSkill(skillId, skill)"
              :disabled="skillPoints < getUpgradeCost(skill)"
            >
              <i class="fas fa-arrow-up"></i>
              升级 ({{ getUpgradeCost(skill) }} 点)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 效果说明 -->
    <div class="skill-effects-section" v-if="hasAnyEffects">
      <h3 class="section-title">
        <i class="fas fa-sparkles"></i>
        技能效果汇总
      </h3>
      <div class="effects-grid">
        <div v-for="(skill, skillId) in activeSkills" :key="skillId" v-show="hasEffects(skill)" class="effect-card">
          <div class="effect-header">{{ skill.基本信息?.技能名称 }}</div>
          <div class="effect-list">
            <div v-for="(effect, effectName) in skill.伤害与效果?.效果列表" :key="effectName" class="effect-item">
              <span class="effect-type">{{ effect.效果类型 }}</span>
              <span class="effect-value" :class="effect.效果值 > 0 ? 'positive' : 'negative'">
                {{ effect.效果值 > 0 ? '+' : '' }}{{ effect.效果值 }}{{ effect.是否为百分比 ? '%' : '' }}
              </span>
              <span class="effect-duration" v-if="effect.持续回合数 > 0"> ({{ effect.持续回合数 }}回合) </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  characterData: any;
}>();

// 技能点
const skillPoints = computed(() => {
  return props.characterData.核心状态?.$技能点 || 0;
});

// 主动技能
const activeSkills = computed(() => {
  return props.characterData.技能系统?.主动技能 || {};
});

// 技能数量
const skillCount = computed(() => {
  return Object.keys(activeSkills.value).length;
});

// 是否有任何效果
const hasAnyEffects = computed(() => {
  for (const skill of Object.values(activeSkills.value)) {
    if (hasEffects(skill as any)) return true;
  }
  return false;
});

// 检查技能是否有效果
function hasEffects(skill: any): boolean {
  const effects = skill?.伤害与效果?.效果列表;
  return effects && Object.keys(effects).length > 0;
}

// 获取稀有度样式类
function getRarityClass(rarity: string): string {
  const rarityMap: Record<string, string> = {
    C: 'rarity-c',
    B: 'rarity-b',
    A: 'rarity-a',
    S: 'rarity-s',
    SS: 'rarity-ss',
  };
  return rarityMap[rarity] || 'rarity-c';
}

// 是否可以升级
function canUpgrade(skill: any): boolean {
  const level = skill?.基本信息?.技能等级 || 1;
  return level < 5;
}

// 获取升级所需点数
function getUpgradeCost(skill: any): number {
  const level = skill?.基本信息?.技能等级 || 1;
  // 升级费用：等级 + 1
  return level + 1;
}

// 生成技能描述（根据当前技能数据）
function generateSkillDescription(skill: any): string {
  const damageInfo = skill.伤害与效果 || {};
  const source = damageInfo.伤害来源 || '性斗力';
  const coefficient = damageInfo.系数 || 100;

  // 构建伤害描述
  let desc = `造成${coefficient}%${source}伤害`;

  // 添加效果列表信息
  const effects = damageInfo.效果列表 || {};
  if (Object.keys(effects).length > 0) {
    const effectTexts: string[] = [];
    for (const effect of Object.values(effects) as any[]) {
      const value = effect.是否为百分比 ? `${effect.效果值}%` : effect.效果值;
      const sign = effect.效果值 > 0 ? '' : '';
      effectTexts.push(`${effect.效果类型}${sign}${value}`);
    }
    if (effectTexts.length > 0) {
      desc += `，${effectTexts.join('、')}`;
    }
  }

  return desc;
}

// 升级技能
async function upgradeSkill(skillId: string, skill: any) {
  const cost = getUpgradeCost(skill);
  if (skillPoints.value < cost) return;

  try {
    const globalAny = window as any;
    if (!globalAny.Mvu) return;

    const mvuData = globalAny.Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    if (!mvuData || !mvuData.stat_data) return;

    // 确保路径存在
    if (!mvuData.stat_data.技能系统) mvuData.stat_data.技能系统 = {};
    if (!mvuData.stat_data.技能系统.主动技能) mvuData.stat_data.技能系统.主动技能 = {};
    if (!mvuData.stat_data.技能系统.主动技能[skillId]) {
      mvuData.stat_data.技能系统.主动技能[skillId] = JSON.parse(JSON.stringify(skill));
    }

    const skillData = mvuData.stat_data.技能系统.主动技能[skillId];

    // 确保基本信息存在
    if (!skillData.基本信息) skillData.基本信息 = {};

    // 提升等级
    const currentLevel = skillData.基本信息.技能等级 || 1;
    skillData.基本信息.技能等级 = Math.min(5, currentLevel + 1);

    // 根据等级调整属性
    if (!skillData.冷却与消耗) skillData.冷却与消耗 = {};
    if (!skillData.伤害与效果) skillData.伤害与效果 = {};

    // 每级增加系数 10%
    skillData.伤害与效果.系数 = (skillData.伤害与效果.系数 || 100) + 10;

    // 每2级减少消耗1点
    if (currentLevel % 2 === 0) {
      skillData.冷却与消耗.耐力消耗 = Math.max(0, (skillData.冷却与消耗.耐力消耗 || 0) - 1);
    }

    // 更新技能描述（根据新的系数和效果）
    skillData.基本信息.技能描述 = generateSkillDescription(skillData);

    // 减少技能点
    if (!mvuData.stat_data.核心状态) mvuData.stat_data.核心状态 = {};
    mvuData.stat_data.核心状态.$技能点 = (mvuData.stat_data.核心状态.$技能点 || 0) - cost;

    // 写回MVU
    await globalAny.Mvu.replaceMvuData(mvuData, { type: 'message', message_id: 'latest' });

    // 显示成功提示
    if (typeof toastr !== 'undefined') {
      toastr.success(`技能升级成功！等级 ${currentLevel + 1}`, '成功', { timeOut: 1500 });
    }
  } catch (error) {
    console.error('[技能] 升级失败:', error);
    if (typeof toastr !== 'undefined') {
      toastr.error('技能升级失败', '错误', { timeOut: 2000 });
    }
  }
}
</script>

<style scoped lang="scss">
.skill-page {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.skill-header {
  margin-bottom: 20px;
}

.skill-points-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 16px;
  backdrop-filter: blur(10px);

  > i {
    font-size: 28px;
    color: #a78bfa;
  }

  .points-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .points-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .points-value {
    font-size: 28px;
    font-weight: 700;
    color: #c4b5fd;
  }
}

.skills-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 16px;

  i {
    color: #667eea;
  }

  .skill-count {
    font-size: 12px;
    font-weight: normal;
    color: rgba(255, 255, 255, 0.4);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);

  i {
    font-size: 36px;
    color: rgba(255, 255, 255, 0.2);
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }

  .empty-hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.25);
    margin-top: 6px;
  }
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skill-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  &.rarity-c {
    border-left: 3px solid #9ca3af;
  }
  &.rarity-b {
    border-left: 3px solid #60a5fa;
  }
  &.rarity-a {
    border-left: 3px solid #a78bfa;
  }
  &.rarity-s {
    border-left: 3px solid #fbbf24;
  }
  &.rarity-ss {
    border-left: 3px solid #f472b6;
  }
}

.skill-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.skill-name-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-name {
  font-size: 16px;
  font-weight: 700;
  color: white;
}

.skill-rarity {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;

  &.rarity-c {
    background: rgba(156, 163, 175, 0.3);
    color: #d1d5db;
  }
  &.rarity-b {
    background: rgba(96, 165, 250, 0.3);
    color: #93c5fd;
  }
  &.rarity-a {
    background: rgba(167, 139, 250, 0.3);
    color: #c4b5fd;
  }
  &.rarity-s {
    background: rgba(251, 191, 36, 0.3);
    color: #fcd34d;
  }
  &.rarity-ss {
    background: rgba(244, 114, 182, 0.3);
    color: #f9a8d4;
  }
}

.skill-level {
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
  background: rgba(102, 126, 234, 0.2);
  padding: 4px 10px;
  border-radius: 8px;
}

.skill-description {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.skill-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;

  i {
    font-size: 10px;
  }

  &.cost {
    background: rgba(52, 211, 153, 0.2);
    color: #6ee7b7;
    border: 1px solid rgba(52, 211, 153, 0.3);
  }

  &.cooldown {
    background: rgba(96, 165, 250, 0.2);
    color: #93c5fd;
    border: 1px solid rgba(96, 165, 250, 0.3);
  }

  &.accuracy {
    background: rgba(251, 191, 36, 0.2);
    color: #fcd34d;
    border: 1px solid rgba(251, 191, 36, 0.3);
  }
}

.skill-damage {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 10px;
  padding: 8px 10px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;

  .damage-label {
    color: rgba(255, 255, 255, 0.5);
  }

  .damage-source {
    color: #f87171;
    font-weight: 500;
  }

  .damage-value {
    color: #fcd34d;
    font-weight: 600;
  }
}

.skill-mechanics {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.mechanic-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;

  i {
    font-size: 9px;
  }

  &.ignore-def {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  &.no-dodge {
    background: rgba(167, 139, 250, 0.2);
    color: #c4b5fd;
    border: 1px solid rgba(167, 139, 250, 0.3);
  }
}

.skill-upgrade {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.upgrade-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.skill-effects-section {
  margin-top: 20px;
}

.effects-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.effect-card {
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.effect-header {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 8px;
}

.effect-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.effect-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;

  .effect-type {
    color: rgba(255, 255, 255, 0.6);
  }

  .effect-value {
    font-weight: 600;

    &.positive {
      color: #34d399;
    }
    &.negative {
      color: #f87171;
    }
  }

  .effect-duration {
    color: rgba(255, 255, 255, 0.4);
  }
}
</style>
