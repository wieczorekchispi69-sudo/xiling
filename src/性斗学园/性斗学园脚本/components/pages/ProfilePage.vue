<template>
  <div class="profile-page">
    <!-- 问号按钮 -->
    <div class="help-button" @click="showFormulaModal = true">
      <i class="fas fa-question"></i>
    </div>

    <!-- 角色头像 -->
    <div class="profile-header">
      <div class="profile-avatar" @click="handleAvatarClick">
        <div class="avatar-inner">
          <img v-if="avatarUrl" :src="avatarUrl" alt="头像" class="avatar-image" @error="handleImageError" />
          <i v-else class="fas fa-user"></i>
        </div>
        <div class="avatar-upload-hint">
          <i class="fas fa-camera"></i>
        </div>
      </div>
      <input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="handleAvatarChange" />
      <h2 class="profile-name">学员档案</h2>
      <div class="profile-level">
        <span class="level-badge">Lv.{{ characterData.角色基础?._等级 || 1 }}</span>
        <span class="potential-badge">潜力 {{ (characterData.核心状态?._潜力 || 5.0).toFixed(1) }}</span>
      </div>
    </div>

    <!-- 可用点数显示 -->
    <div class="points-section">
      <div class="points-card attribute-points">
        <i class="fas fa-star"></i>
        <div class="points-info">
          <span class="points-label">属性点</span>
          <span class="points-value">{{ characterData.核心状态?.$属性点 || 0 }}</span>
        </div>
      </div>
      <div class="points-card skill-points">
        <i class="fas fa-book-sparkles"></i>
        <div class="points-info">
          <span class="points-label">技能点</span>
          <span class="points-value">{{ characterData.核心状态?.$技能点 || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 可加点属性 -->
    <div class="detail-card" v-if="availablePoints > 0">
      <h3 class="detail-title">
        <i class="fas fa-plus-circle"></i> 属性加点
        <span class="points-remaining">(剩余 {{ availablePoints }} 点)</span>
      </h3>
      <div class="attribute-upgrade-grid">
        <div class="upgrade-item" v-for="attr in upgradeableAttributes" :key="attr.key">
          <div class="upgrade-info">
            <i :class="['fas', attr.icon]"></i>
            <span class="upgrade-label">{{ attr.label }}</span>
            <span class="upgrade-value">{{ getAttributeValue(attr.key) }}</span>
          </div>
          <button
            class="upgrade-btn"
            @click="upgradeAttribute(attr.key, attr.increment)"
            :disabled="availablePoints <= 0"
          >
            <i class="fas fa-plus"></i>
            <span>+{{ attr.increment }}{{ attr.isPercent ? '%' : '' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 核心属性卡片 -->
    <div class="stats-grid">
      <div class="stat-card charm">
        <div class="stat-icon"><i class="fas fa-heart"></i></div>
        <div class="stat-info">
          <div class="stat-label">魅力</div>
          <div class="stat-value">{{ characterData.核心状态?._魅力 || 10 }}</div>
        </div>
      </div>
      <div class="stat-card luck">
        <div class="stat-icon"><i class="fas fa-clover"></i></div>
        <div class="stat-info">
          <div class="stat-label">幸运</div>
          <div class="stat-value">{{ characterData.核心状态?._幸运 || 10 }}</div>
        </div>
      </div>
      <div class="stat-card combat">
        <div class="stat-icon"><i class="fas fa-fire"></i></div>
        <div class="stat-info">
          <div class="stat-label">性斗力</div>
          <div class="stat-value">{{ characterData.性斗系统?.实时性斗力 || 0 }}</div>
        </div>
      </div>
      <div class="stat-card endurance">
        <div class="stat-icon"><i class="fas fa-shield-halved"></i></div>
        <div class="stat-info">
          <div class="stat-label">忍耐力</div>
          <div class="stat-value">{{ characterData.性斗系统?.实时忍耐力 || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- 核心状态 -->
    <div class="detail-card">
      <h3 class="detail-title"><i class="fas fa-chart-line"></i> 核心状态</h3>
      <div class="detail-list">
        <div class="progress-item">
          <div class="progress-header">
            <span><i class="fas fa-bolt"></i> 耐力</span>
            <span class="progress-value">
              {{ characterData.核心状态?.$耐力 || 100 }} / {{ characterData.核心状态?.$最大耐力 || 100 }}
            </span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill stamina"
              :style="{
                width: `${getPercentage(characterData.核心状态?.$耐力 || 100, characterData.核心状态?.$最大耐力 || 100)}%`,
              }"
            ></div>
          </div>
        </div>

        <div class="progress-item">
          <div class="progress-header">
            <span><i class="fas fa-heart-pulse"></i> 快感</span>
            <span class="progress-value">
              {{ characterData.核心状态?.$快感 || 0 }} / {{ characterData.核心状态?.$最大快感 || 100 }}
            </span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill lust"
              :style="{
                width: `${getPercentage(characterData.核心状态?.$快感 || 0, characterData.核心状态?.$最大快感 || 100)}%`,
              }"
            ></div>
          </div>
        </div>

        <div class="progress-item">
          <div class="progress-header">
            <span><i class="fas fa-brain"></i> 意志力</span>
            <span class="progress-value">{{ characterData.核心状态?.意志力 || 100 }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill willpower" :style="{ width: `${characterData.核心状态?.意志力 || 100}%` }"></div>
          </div>
        </div>

        <div class="progress-item">
          <div class="progress-header">
            <span><i class="fas fa-star"></i> 经验值</span>
            <span class="progress-value"> {{ characterData.角色基础?.经验值 || 0 }} / 100 </span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill exp"
              :style="{ width: `${getExpPercentage(characterData.角色基础?.经验值 || 0)}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 战斗属性 -->
    <div class="detail-card">
      <h3 class="detail-title"><i class="fas fa-swords"></i> 战斗属性</h3>
      <div class="attribute-grid">
        <div class="attribute-item">
          <span class="attribute-label">闪避率</span>
          <span class="attribute-value dodge">{{ characterData.核心状态?._闪避率 || 0 }}%</span>
        </div>
        <div class="attribute-item">
          <span class="attribute-label">暴击率</span>
          <span class="attribute-value crit">{{ characterData.核心状态?._暴击率 || 0 }}%</span>
        </div>
        <div class="attribute-item">
          <span class="attribute-label">堕落度</span>
          <span class="attribute-value corruption">{{ characterData.核心状态?.堕落度 || 0 }}%</span>
        </div>
        <div class="attribute-item">
          <span class="attribute-label">段位</span>
          <span class="attribute-value rank">{{ characterData.角色基础?._段位 || '无段位' }}</span>
        </div>
      </div>
    </div>

    <!-- 永久状态 -->
    <div class="detail-card" v-if="permanentStates && permanentStates.length > 0">
      <h3 class="detail-title"><i class="fas fa-gem"></i> 永久状态</h3>
      <div class="states-list">
        <span v-for="(state, index) in permanentStates" :key="index" class="state-tag permanent">
          <i class="fas fa-sparkles"></i> {{ state }}
        </span>
      </div>
      <!-- 加成统计 -->
      <div v-if="hasPermanentBonuses" class="bonus-section">
        <div class="bonus-header">加成效果</div>
        <div class="bonus-grid">
          <div v-for="(value, key) in permanentBonuses" :key="key" class="bonus-item" v-show="value !== 0">
            <span class="bonus-label">{{ formatBonusLabel(key) }}</span>
            <span class="bonus-value" :class="getBonusClass(value)">
              {{ formatBonusValue(value) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 临时状态 -->
    <div class="detail-card" v-if="hasTempStates">
      <h3 class="detail-title"><i class="fas fa-clock"></i> 临时状态</h3>
      <div class="states-list">
        <span v-for="(turns, state) in tempStates" :key="state" class="state-tag temp">
          <i class="fas fa-hourglass-half"></i> {{ state }}
          <span class="turns-badge">{{ turns }}回合</span>
        </span>
      </div>
      <!-- 临时加成统计 -->
      <div v-if="hasTempBonuses" class="bonus-section">
        <div class="bonus-header">临时加成</div>
        <div class="bonus-grid">
          <div v-for="(value, key) in tempBonuses" :key="key" class="bonus-item" v-show="value !== 0">
            <span class="bonus-label">{{ formatBonusLabel(key) }}</span>
            <span class="bonus-value" :class="getBonusClass(value)">
              {{ formatBonusValue(value) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 公式弹窗 -->
    <div v-if="showFormulaModal" class="formula-modal" @click.self="showFormulaModal = false">
      <div class="formula-content">
        <div class="formula-header">
          <h3><i class="fas fa-calculator"></i> 伤害计算公式</h3>
          <button class="close-btn" @click="showFormulaModal = false">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="formula-body">
          <div class="formula-section">
            <h4><i class="fas fa-level-up-alt"></i> 升级与点数获取</h4>
            <div class="formula-item">
              <div class="formula-title">升级所需经验</div>
              <div class="formula-text">
                所需经验 = 当前等级 × 100<br />
                例如: 5级升6级需要 5 × 100 = 500 经验
              </div>
            </div>
            <div class="formula-item">
              <div class="formula-title">升级点数获取</div>
              <div class="formula-text">
                每级获得点数 = floor(潜力 ÷ 2)<br />
                属性点 = 每级获得点数<br />
                技能点 = 每级获得点数<br /><br />
                示例:<br />
                • 潜力6.0: 每级获得3点属性点和3点技能点<br />
                • 潜力7.5: 每级获得3点属性点和3点技能点<br />
                • 潜力10.0: 每级获得5点属性点和5点技能点
              </div>
            </div>
          </div>

          <div class="formula-section">
            <h4><i class="fas fa-calculator"></i> 核心属性计算</h4>
            <div class="formula-item">
              <div class="formula-title">性斗力计算</div>
              <div class="formula-text">
                基础性斗力 = 等级 × 潜力<br />
                最终性斗力 = (基础性斗力 + 所有加成) × (1 + 总成算 ÷ 100)<br /><br />
                加成来源:<br />
                • 永久状态加成<br />
                • 装备加成<br />
                • 临时状态加成<br /><br />
                特殊状态:<br />
                • 贤者时间: 性斗力 × 0.8 (减少20%)
              </div>
            </div>
            <div class="formula-item">
              <div class="formula-title">忍耐力计算</div>
              <div class="formula-text">
                基础忍耐力 = 等级 × (最终意志力 ÷ 10)<br />
                最终忍耐力 = (基础忍耐力 + 所有加成) × (1 + 总成算 ÷ 100)<br /><br />
                特殊状态:<br />
                • 贤者时间: 忍耐力 × 1.1 (增加10%)<br />
                • 虚脱状态: 忍耐力 × 0.7 (减少30%)
              </div>
            </div>
            <div class="formula-item">
              <div class="formula-title">最终属性计算</div>
              <div class="formula-text">
                最终值 = 基础值 + 永久状态加成 + 装备加成 + 临时状态加成<br /><br />
                适用于:<br />
                • 魅力 = 基础魅力 + 所有魅力加成<br />
                • 幸运 = 基础幸运 + 所有幸运加成<br />
                • 闪避率 = 基础闪避率 + 所有闪避加成 (上限60%)<br />
                • 暴击率 = 基础暴击率 + 所有暴击加成 (上限100%)<br />
                • 意志力 = 基础意志力 + 所有意志加成 (上限100%)
              </div>
            </div>
          </div>

          <div class="formula-section">
            <h4><i class="fas fa-sword"></i> 伤害计算流程</h4>
            <div class="formula-item">
              <div class="formula-title">步骤1: 基础伤害</div>
              <div class="formula-text">
                组件伤害 = 来源值 × 系数 + 基础值<br />
                总基础伤害 = Σ(所有组件伤害)<br /><br />
                伤害来源映射:<br />
                • 性斗力 → attacker.stats.sexPower<br />
                • 魅力 → attacker.stats.charm<br />
                • 幸运 → attacker.stats.luck<br />
                • 意志力 → attacker.stats.willpower
              </div>
            </div>
            <div class="formula-item">
              <div class="formula-title">步骤2: 命中与暴击判定</div>
              <div class="formula-text">
                闪避判定:<br />
                最终命中率 = 技能命中率 - 闪避率 + (幸运 ÷ 10)<br />
                命中率限制 = clamp(10%, 95%)<br />
                闪避成功 = 随机数(0-100) ≥ 命中率<br /><br />
                暴击判定:<br />
                最终暴击率 = 暴击率 + (幸运 ÷ 10) + 技能修正<br />
                暴击伤害 = 基础伤害 × 1.5
              </div>
            </div>
            <div class="formula-item">
              <div class="formula-title">步骤3: 防御减伤</div>
              <div class="formula-text">
                非线性减伤公式:<br />
                最终伤害 = 基础伤害 × 40 ÷ (忍耐力 + 100)<br /><br />
                减伤效果示例:<br />
                • 忍耐力0: 减伤60% (伤害×0.4)<br />
                • 忍耐力50: 减伤73% (伤害×0.267)<br />
                • 忍耐力100: 减伤80% (伤害×0.2)<br />
                • 忍耐力200: 减伤87% (伤害×0.133)<br />
                • 忍耐力越高，减伤越多，但永远不会为0
              </div>
            </div>
            <div class="formula-item">
              <div class="formula-title">步骤4: Buff修正</div>
              <div class="formula-text">
                伤害修正 = 1.0<br /><br />
                攻击方Buff:<br />
                • 攻击提升: 修正 += buff值 ÷ 100<br />
                • 攻击下降: 修正 -= buff值 ÷ 100<br /><br />
                防御方Buff:<br />
                • 防御提升: 修正 -= buff值 ÷ 100<br />
                • 防御下降: 修正 += buff值 ÷ 100<br />
                • 敏感: 修正 += buff值 ÷ 100<br /><br />
                最终伤害 = max(1, floor(伤害 × 修正))
              </div>
            </div>
          </div>

          <div class="formula-section">
            <h4><i class="fas fa-star"></i> 属性作用总览</h4>
            <div class="attribute-summary">
              <div class="attr-item">
                <span class="attr-name">性斗力</span>
                <span class="attr-desc">主要伤害来源</span>
              </div>
              <div class="attr-item">
                <span class="attr-name">忍耐力</span>
                <span class="attr-desc">防御减伤核心</span>
              </div>
              <div class="attr-item">
                <span class="attr-name">魅力</span>
                <span class="attr-desc">某些技能伤害来源</span>
              </div>
              <div class="attr-item">
                <span class="attr-name">幸运</span>
                <span class="attr-desc">命中+暴击 (÷10)</span>
              </div>
              <div class="attr-item">
                <span class="attr-name">闪避率</span>
                <span class="attr-desc">减少被命中率</span>
              </div>
              <div class="attr-item">
                <span class="attr-name">暴击率</span>
                <span class="attr-desc">增加暴击概率</span>
              </div>
              <div class="attr-item">
                <span class="attr-name">意志力</span>
                <span class="attr-desc">影响忍耐力计算</span>
              </div>
              <div class="attr-item">
                <span class="attr-name">潜力</span>
                <span class="attr-desc">影响升级点数获取</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
  characterData: any;
  combatData: any;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const avatarUrl = ref<string>('');
const showFormulaModal = ref<boolean>(false);

// 可用属性点
const availablePoints = computed(() => {
  return props.characterData.核心状态?.$属性点 || 0;
});

// 可加点的属性列表（修改 $基础xxx 值，最终值 _xxx 会自动计算）
const upgradeableAttributes = [
  { key: '核心状态.$基础魅力', label: '魅力', icon: 'fa-heart', increment: 2, isPercent: false },
  { key: '核心状态.$基础幸运', label: '幸运', icon: 'fa-clover', increment: 2, isPercent: false },
  { key: '核心状态.$基础闪避率', label: '闪避率', icon: 'fa-running', increment: 2, isPercent: true },
  { key: '核心状态.$基础暴击率', label: '暴击率', icon: 'fa-crosshairs', increment: 2, isPercent: true },
  { key: '核心状态.$最大耐力', label: '最大耐力', icon: 'fa-bolt', increment: 10, isPercent: false },
  { key: '核心状态.$最大快感', label: '最大快感', icon: 'fa-heart-pulse', increment: 10, isPercent: false },
];

// 获取属性值
function getAttributeValue(key: string): number {
  const parts = key.split('.');
  let value: any = props.characterData;
  for (const part of parts) {
    value = value?.[part];
  }
  return value || 0;
}

// 升级属性
async function upgradeAttribute(key: string, increment: number) {
  if (availablePoints.value <= 0) return;

  try {
    const globalAny = window as any;
    if (!globalAny.Mvu) return;

    const mvuData = globalAny.Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    if (!mvuData || !mvuData.stat_data) return;

    // 获取当前值
    const parts = key.split('.');
    let currentValue = mvuData.stat_data;
    for (const part of parts.slice(0, -1)) {
      if (!currentValue[part]) currentValue[part] = {};
      currentValue = currentValue[part];
    }
    const lastKey = parts[parts.length - 1];
    const oldValue = currentValue[lastKey] || 0;

    // 更新属性值
    currentValue[lastKey] = oldValue + increment;

    // 减少属性点
    if (!mvuData.stat_data.核心状态) mvuData.stat_data.核心状态 = {};
    mvuData.stat_data.核心状态.$属性点 = (mvuData.stat_data.核心状态.$属性点 || 0) - 1;

    // 写回MVU
    await globalAny.Mvu.replaceMvuData(mvuData, { type: 'message', message_id: 'latest' });

    // 显示成功提示
    if (typeof toastr !== 'undefined') {
      toastr.success(`属性提升成功！`, '成功', { timeOut: 1500 });
    }
  } catch (error) {
    console.error('[档案] 属性升级失败:', error);
    if (typeof toastr !== 'undefined') {
      toastr.error('属性升级失败', '错误', { timeOut: 2000 });
    }
  }
}

// 永久状态
const permanentStates = computed(() => {
  return props.characterData.永久状态?.状态列表 || [];
});

const permanentBonuses = computed(() => {
  return props.characterData.永久状态?.加成统计 || {};
});

const hasPermanentBonuses = computed(() => {
  const bonuses = permanentBonuses.value;
  return Object.values(bonuses).some((v: any) => v !== 0);
});

// 临时状态
const tempStates = computed(() => {
  return props.characterData.临时状态?.状态列表 || {};
});

const hasTempStates = computed(() => {
  return Object.keys(tempStates.value).length > 0;
});

const tempBonuses = computed(() => {
  return props.characterData.临时状态?.加成统计 || {};
});

const hasTempBonuses = computed(() => {
  const bonuses = tempBonuses.value;
  return Object.values(bonuses).some((v: any) => v !== 0);
});

// 从 MVU 变量加载头像
function loadAvatarUrl() {
  try {
    const globalAny = window as any;

    // 从MVU变量读取
    if (globalAny.Mvu) {
      const mvuData = globalAny.Mvu.getMvuData({ type: 'message', message_id: 'latest' });
      const saved = mvuData?.stat_data?.角色基础?.$头像URL;
      if (saved && typeof saved === 'string' && saved.trim()) {
        avatarUrl.value = saved;
        return;
      }
    }
  } catch (err) {
    console.warn('[状态栏] 读取头像失败:', err);
  }
  avatarUrl.value = '';
}

// 保存头像URL到MVU变量
async function saveAvatarUrl(url: string) {
  try {
    const globalAny = window as any;

    if (globalAny.Mvu) {
      const mvuData = globalAny.Mvu.getMvuData({ type: 'message', message_id: 'latest' });
      if (mvuData && mvuData.stat_data) {
        if (!mvuData.stat_data.角色基础) {
          mvuData.stat_data.角色基础 = {};
        }
        mvuData.stat_data.角色基础.$头像URL = url;
        await globalAny.Mvu.replaceMvuData(mvuData, { type: 'message', message_id: 'latest' });
      }
    }

    avatarUrl.value = url;
    toastr.success('头像上传成功', '成功', { timeOut: 2000 });
  } catch (err) {
    console.error('[状态栏] 保存头像失败:', err);
    toastr.error('头像保存失败', '错误', { timeOut: 3000 });
  }
}

function handleAvatarClick() {
  fileInputRef.value?.click();
}

function handleAvatarChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    toastr.error('请选择图片文件', '错误', { timeOut: 3000 });
    return;
  }

  // 检查文件大小（限制为5MB）
  if (file.size > 5 * 1024 * 1024) {
    toastr.error('图片大小不能超过5MB', '错误', { timeOut: 3000 });
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      saveAvatarUrl(reader.result);
    }
  };
  reader.readAsDataURL(file);

  // 清空input，允许重复选择同一文件
  target.value = '';
}

function handleImageError() {
  avatarUrl.value = '';
}

// 格式化加成标签
function formatBonusLabel(key: string | number): string {
  const keyStr = String(key);
  const labelMap: Record<string, string> = {
    魅力加成: '魅力',
    幸运加成: '幸运',
    基础性斗力加成: '性斗力+',
    基础性斗力成算: '性斗力%',
    基础忍耐力加成: '忍耐力+',
    基础忍耐力成算: '忍耐力%',
    闪避率加成: '闪避率',
    暴击率加成: '暴击率',
    意志力加成: '意志力',
  };
  return labelMap[keyStr] || keyStr;
}

// 格式化加成值
function formatBonusValue(value: number): string {
  if (value === 0) return '0';
  if (value > 0) return `+${value}`;
  return `${value}`;
}

// 获取加成值的样式类
function getBonusClass(value: number): string {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function getPercentage(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
}

function getExpPercentage(exp: number): number {
  // 经验值上限固定为100
  return getPercentage(exp % 100, 100);
}

onMounted(() => {
  loadAvatarUrl();

  // 监听MVU变量更新，同步头像
  const globalAny = window as any;
  if (globalAny.eventOn && globalAny.Mvu) {
    globalAny.eventOn(globalAny.Mvu.events.VARIABLE_UPDATE_ENDED, () => {
      loadAvatarUrl();
    });
  }
});
</script>

<style scoped lang="scss">
.profile-page {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
  margin-bottom: 24px;
}

.profile-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 3px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5);

    .avatar-upload-hint {
      opacity: 1;
    }
  }

  .avatar-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #1a1f35;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  i {
    font-size: 36px;
    color: rgba(255, 255, 255, 0.6);
  }

  .avatar-upload-hint {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    border: 2px solid #1a1f35;
    z-index: 10;

    i {
      font-size: 12px;
      color: white;
    }
  }
}

.profile-name {
  margin-top: 12px;
  font-size: 18px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
}

.profile-level {
  display: flex;
  gap: 8px;
  margin-top: 8px;

  .level-badge,
  .potential-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .level-badge {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
  }

  .potential-badge {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
}

.points-section {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.points-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  backdrop-filter: blur(10px);

  i {
    font-size: 20px;
  }

  &.attribute-points {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.05));
    border: 1px solid rgba(251, 191, 36, 0.3);

    i {
      color: #fbbf24;
    }
    .points-value {
      color: #fcd34d;
    }
  }

  &.skill-points {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.05));
    border: 1px solid rgba(139, 92, 246, 0.3);

    i {
      color: #8b5cf6;
    }
    .points-value {
      color: #a78bfa;
    }
  }

  .points-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .points-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .points-value {
    font-size: 20px;
    font-weight: 700;
  }
}

.attribute-upgrade-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upgrade-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.upgrade-info {
  display: flex;
  align-items: center;
  gap: 10px;

  i {
    font-size: 14px;
    color: #667eea;
    width: 20px;
    text-align: center;
  }

  .upgrade-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
  }

  .upgrade-value {
    font-size: 14px;
    font-weight: 600;
    color: white;
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 8px;
    border-radius: 6px;
  }
}

.upgrade-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
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
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.points-remaining {
  font-size: 12px;
  font-weight: normal;
  color: #fbbf24;
  margin-left: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  &.charm {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(236, 72, 153, 0.05));
    .stat-icon {
      color: #ec4899;
    }
    .stat-value {
      color: #f472b6;
    }
  }

  &.luck {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.05));
    .stat-icon {
      color: #fbbf24;
    }
    .stat-value {
      color: #fcd34d;
    }
  }

  &.combat {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05));
    .stat-icon {
      color: #ef4444;
    }
    .stat-value {
      color: #f87171;
    }
  }

  &.endurance {
    background: linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(52, 211, 153, 0.05));
    .stat-icon {
      color: #34d399;
    }
    .stat-value {
      color: #6ee7b7;
    }
  }

  .stat-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info {
    flex: 1;
  }

  .stat-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
  }
}

.detail-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.detail-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    font-size: 14px;
    color: #667eea;
  }
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: white;

  span:first-child {
    display: flex;
    align-items: center;
    gap: 6px;

    i {
      font-size: 12px;
      opacity: 0.7;
    }
  }

  .progress-value {
    color: rgba(255, 255, 255, 0.5);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;

  &.stamina {
    background: linear-gradient(90deg, #34d399, #10b981);
  }

  &.lust {
    background: linear-gradient(90deg, #f472b6, #ec4899);
  }

  &.willpower {
    background: linear-gradient(90deg, #60a5fa, #3b82f6);
  }

  &.exp {
    background: linear-gradient(90deg, #fbbf24, #f59e0b);
  }
}

.attribute-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.attribute-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.attribute-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.attribute-value {
  font-size: 14px;
  font-weight: 600;

  &.dodge {
    color: #60a5fa;
  }
  &.crit {
    color: #f87171;
  }
  &.corruption {
    color: #a78bfa;
  }
  &.rank {
    color: #fbbf24;
  }
}

.states-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.state-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;

  i {
    font-size: 10px;
  }

  &.permanent {
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.3), rgba(139, 92, 246, 0.1));
    color: #c4b5fd;
    border: 1px solid rgba(167, 139, 250, 0.3);
  }

  &.temp {
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(59, 130, 246, 0.1));
    color: #93c5fd;
    border: 1px solid rgba(96, 165, 250, 0.3);
  }

  .turns-badge {
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    margin-left: 4px;
  }
}

.bonus-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.bonus-header {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.bonus-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.bonus-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  font-size: 12px;
}

.bonus-label {
  color: rgba(255, 255, 255, 0.6);
}

.bonus-value {
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;

  &.positive {
    color: #34d399;
  }

  &.negative {
    color: #f87171;
  }

  &.neutral {
    color: rgba(255, 255, 255, 0.4);
  }
}

// 问号按钮样式
.help-button {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.8), rgba(118, 75, 162, 0.8));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9));
  }

  &:active {
    transform: scale(0.95);
  }

  i {
    font-size: 16px;
    color: white;
    font-weight: 600;
  }
}

// 公式弹窗样式
.formula-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.formula-content {
  background: linear-gradient(135deg, #1a1f35, #2d1b69);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 400px;
  width: 100%;
  height: 70vh;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.formula-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: white;

    i {
      color: #667eea;
    }
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    i {
      font-size: 14px;
    }
  }
}

.formula-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.formula-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }

  h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #667eea;

    i {
      font-size: 12px;
    }
  }
}

.formula-item {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.formula-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.formula-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  br {
    line-height: 1.6;
  }
}

.attribute-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.attr-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 11px;
}

.attr-name {
  font-weight: 600;
  color: #667eea;
}

.attr-desc {
  color: rgba(255, 255, 255, 0.6);
}

// 移动端适配
@media (max-width: 480px) {
  .formula-modal {
    padding: 0 20px; /* 左右各20px边距，总共40px */
    align-items: center;
  }

  .formula-content {
    max-width: calc(100vw - 40px); /* 屏幕宽度减去左右边距 */
    width: calc(100vw - 40px);
    height: 75vh;
    margin: 0;
    border-radius: 16px;
  }

  .formula-header {
    padding: 16px;

    h3 {
      font-size: 14px;
    }
  }

  .formula-body {
    padding: 16px;
  }

  .formula-section h4 {
    font-size: 13px;
  }

  .formula-title {
    font-size: 13px;
  }

  .formula-text {
    font-size: 12px;
    padding: 8px 10px;
  }

  .attribute-summary {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .attr-item {
    padding: 6px 8px;
    font-size: 10px;
  }

  .help-button {
    width: 32px;
    height: 32px;
    top: 12px;
    right: 12px;

    i {
      font-size: 14px;
    }
  }
}
</style>
