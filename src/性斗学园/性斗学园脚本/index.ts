/**
 * 性斗学园数值计算脚本
 * 实时更新所有依赖变量的计算值
 *
 * 监听 MVU 变量变化，当基础变量改变时，自动更新依赖的变量：
 * - 魅力、幸运、闪避率、暴击率、意志力：基础值 + 永久状态加成 + 装备加成 + 临时状态加成
 * - 性斗力：((等级 x 潜力) + 装备加成 + 状态加成) x (1 + 成算/100)
 * - 忍耐力：((等级 x 意志力/10) + 装备加成 + 状态加成) x (1 + 成算/100)
 *
 * 计算顺序：先计算意志力等基础属性 → 再计算性斗力和忍耐力
 */

import { createScriptIdDiv, destroyScriptIdDiv, deteleportStyle, teleportStyle } from '@/util/script';
import { canLevelUp, EXP_PER_LEVEL, shouldTriggerOrgasm } from '../开局/utils/combat-calculator';
import StatusBarWrapper from './components/StatusBarWrapper.vue';

// 等待 MVU 初始化
await waitGlobalInitialized('Mvu');

// 防止重复更新的标志
let isUpdating = false;

// 状态栏相关
let statusBarApp: any = null;
let statusBarContainer: JQuery<HTMLDivElement> | null = null;
let statusBarVisible = false;

/**
 * 从 MVU 数据中获取变量值（安全获取）
 */
function getValue(data: any, path: string, defaultValue: number = 0): number {
  return _.get(data, `stat_data.${path}`, defaultValue);
}

/**
 * 根据等级计算段位
 * - 无段位: 0-9
 * - D段: 10-19
 * - C段: 20-29
 * - B段: 30-39
 * - A段: 40-59
 * - S段: 60-79
 * - SS段: 80-99
 * - SSS段: 100
 */
function calculateRank(level: number): string {
  if (level >= 100) return 'SSS';
  if (level >= 80) return 'SS';
  if (level >= 60) return 'S';
  if (level >= 40) return 'A';
  if (level >= 30) return 'B';
  if (level >= 20) return 'C';
  if (level >= 10) return 'D';
  return '无段位';
}

/**
 * 独立更新段位（确保段位始终与等级匹配）
 */
async function updateRank() {
  try {
    const mvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    if (!mvuData || !mvuData.stat_data) {
      console.warn('[性斗学园脚本] 无法获取 MVU 数据，跳过段位更新');
      return;
    }

    const level = getValue(mvuData, '角色基础._等级', 1);
    const expectedRank = calculateRank(level);
    const currentRank = _.get(mvuData.stat_data, '角色基础._段位', '无段位');

    if (expectedRank !== currentRank) {
      _.set(mvuData.stat_data, '角色基础._段位', expectedRank);
      await Mvu.replaceMvuData(mvuData, { type: 'message', message_id: 'latest' });
      console.info(
        `[性斗学园脚本] [独立段位更新] 等级 ${level} → ${expectedRank}段 (从 "${currentRank}" 更新为 "${expectedRank}")`,
      );
    }
  } catch (error) {
    console.error('[性斗学园脚本] 独立段位更新时出错:', error);
  }
}

/**
 * 计算并更新所有依赖变量
 *
 * 计算顺序很重要：
 * 1. 先计算基础属性最终值（魅力、幸运、闪避、暴击、意志力）
 * 2. 再计算性斗力（依赖等级和潜力）
 * 3. 最后计算忍耐力（依赖等级和最终意志力）
 */
async function updateDependentVariables() {
  // 防止重复更新
  if (isUpdating) {
    return;
  }

  try {
    isUpdating = true;

    // 获取当前消息楼层的 MVU 数据
    const mvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    if (!mvuData || !mvuData.stat_data) {
      console.warn('[性斗学园脚本] 无法获取 MVU 数据，跳过更新');
      return;
    }

    console.info('[性斗学园脚本] 开始计算依赖变量');

    const statData = mvuData.stat_data;
    const updates: Record<string, any> = {};
    let hasUpdates = false;

    // ==================== 步骤1: 获取所有加成源 ====================

    // 永久状态加成
    const permanentBonuses = statData.永久状态?.加成统计 || {};

    // 装备加成
    const equipmentBonuses = statData.物品系统?.装备总加成 || {};

    // 临时状态加成
    const tempBonuses = statData.临时状态?.加成统计 || {};

    // ==================== 步骤2: 计算基础属性最终值 ====================
    // 公式: 最终值 = 基础值 + 永久状态加成 + 装备加成 + 临时状态加成

    // 获取基础值
    const baseCharm = getValue(mvuData, '核心状态.$基础魅力', 10);
    const baseLuck = getValue(mvuData, '核心状态.$基础幸运', 10);
    const baseDodge = getValue(mvuData, '核心状态.$基础闪避率', 0);
    const baseCrit = getValue(mvuData, '核心状态.$基础暴击率', 0);
    const baseWillpower = getValue(mvuData, '核心状态.$基础意志力', 100);

    // 获取各项加成（根据 initvar.yaml，加成统计内的键名无前缀）
    const charmBonus =
      (permanentBonuses.魅力加成 || 0) + (equipmentBonuses.魅力加成 || 0) + (tempBonuses.魅力加成 || 0);
    const luckBonus = (permanentBonuses.幸运加成 || 0) + (equipmentBonuses.幸运加成 || 0) + (tempBonuses.幸运加成 || 0);
    const dodgeBonus =
      (permanentBonuses.闪避率加成 || 0) + (equipmentBonuses.闪避率加成 || 0) + (tempBonuses.闪避率加成 || 0);
    const critBonus =
      (permanentBonuses.暴击率加成 || 0) + (equipmentBonuses.暴击率加成 || 0) + (tempBonuses.暴击率加成 || 0);
    const willpowerBonus =
      (permanentBonuses.意志力加成 || 0) + (equipmentBonuses.意志力加成 || 0) + (tempBonuses.意志力加成 || 0);

    // 计算最终值（带上下限限制）
    const finalCharm = Math.max(0, baseCharm + charmBonus);
    const finalLuck = Math.max(0, baseLuck + luckBonus);
    const finalDodge = Math.min(60, Math.max(0, baseDodge + dodgeBonus)); // 闪避率上限60%
    const finalCrit = Math.min(100, Math.max(0, baseCrit + critBonus)); // 暴击率上限100%
    const finalWillpower = Math.min(100, Math.max(0, baseWillpower + willpowerBonus)); // 意志力上限100%

    // 更新最终值到核心状态（如果发生变化）
    const currentFinalCharm = getValue(mvuData, '核心状态._魅力', 10);
    const currentFinalLuck = getValue(mvuData, '核心状态._幸运', 10);
    const currentFinalDodge = getValue(mvuData, '核心状态._闪避率', 0);
    const currentFinalCrit = getValue(mvuData, '核心状态._暴击率', 0);
    const currentFinalWillpower = getValue(mvuData, '核心状态.意志力', 100);

    if (finalCharm !== currentFinalCharm) {
      updates['核心状态._魅力'] = finalCharm;
      hasUpdates = true;
      console.info(`[性斗学园脚本] 魅力: ${baseCharm}(基础) + ${charmBonus}(加成) = ${finalCharm}`);
    }
    if (finalLuck !== currentFinalLuck) {
      updates['核心状态._幸运'] = finalLuck;
      hasUpdates = true;
      console.info(`[性斗学园脚本] 幸运: ${baseLuck}(基础) + ${luckBonus}(加成) = ${finalLuck}`);
    }
    if (finalDodge !== currentFinalDodge) {
      updates['核心状态._闪避率'] = finalDodge;
      hasUpdates = true;
      console.info(`[性斗学园脚本] 闪避率: ${baseDodge}(基础) + ${dodgeBonus}(加成) = ${finalDodge}%`);
    }
    if (finalCrit !== currentFinalCrit) {
      updates['核心状态._暴击率'] = finalCrit;
      hasUpdates = true;
      console.info(`[性斗学园脚本] 暴击率: ${baseCrit}(基础) + ${critBonus}(加成) = ${finalCrit}%`);
    }
    if (finalWillpower !== currentFinalWillpower) {
      updates['核心状态.意志力'] = finalWillpower;
      hasUpdates = true;
      console.info(`[性斗学园脚本] 意志力: ${baseWillpower}(基础) + ${willpowerBonus}(加成) = ${finalWillpower}`);
    }

    // 先应用意志力更新（因为忍耐力依赖意志力）
    if (updates['核心状态.意志力'] !== undefined) {
      _.set(mvuData.stat_data, '核心状态.意志力', finalWillpower);
    }

    // ==================== 步骤3: 计算性斗力 ====================
    // 公式: ((等级 x 潜力) + 装备加成 + 状态加成) x (1 + 成算/100)

    const level = getValue(mvuData, '角色基础._等级', 1);
    const potential = getValue(mvuData, '核心状态._潜力', 5.0);

    // 检查是否处于贤者时间
    const tempStates = statData.临时状态?.状态列表 || {};
    const isPostOrgasm = '贤者时间' in tempStates;

    // 性斗力加成和成算
    const sexPowerBonus =
      (permanentBonuses.基础性斗力加成 || 0) +
      (equipmentBonuses.基础性斗力加成 || 0) +
      (tempBonuses.基础性斗力加成 || 0);
    const sexPowerMulti =
      (permanentBonuses.基础性斗力成算 || 0) +
      (equipmentBonuses.基础性斗力成算 || 0) +
      (tempBonuses.基础性斗力成算 || 0);

    // 计算性斗力
    const baseSexPower = level * potential;
    let sexPower = (baseSexPower + sexPowerBonus) * (1 + sexPowerMulti / 100);

    // 贤者时间减益 -20%
    if (isPostOrgasm) {
      sexPower *= 0.8;
    }

    sexPower = Math.max(0, Math.floor(sexPower));

    const currentSexPower = getValue(mvuData, '性斗系统.实时性斗力', 0);

    if (sexPower !== currentSexPower) {
      updates['性斗系统.实时性斗力'] = sexPower;
      hasUpdates = true;
      console.info(
        `[性斗学园脚本] 性斗力: (${level}x${potential} + ${sexPowerBonus}) x (1 + ${sexPowerMulti}/100) = ${sexPower}`,
      );
    }

    // ==================== 步骤4: 计算忍耐力 ====================
    // 公式: ((等级 x 意志力/10) + 装备加成 + 状态加成) x (1 + 成算/100)
    // 注意：这里使用已计算好的最终意志力

    // 忍耐力加成和成算
    const enduranceBonus =
      (permanentBonuses.基础忍耐力加成 || 0) +
      (equipmentBonuses.基础忍耐力加成 || 0) +
      (tempBonuses.基础忍耐力加成 || 0);
    const enduranceMulti =
      (permanentBonuses.基础忍耐力成算 || 0) +
      (equipmentBonuses.基础忍耐力成算 || 0) +
      (tempBonuses.基础忍耐力成算 || 0);

    // 检查是否虚脱
    const orgasmCount = getValue(mvuData, '性斗系统.高潮次数', 0);
    const maxOrgasmCount = getValue(mvuData, '性斗系统.胜负规则.高潮次数上限', 0);
    const isExhausted = maxOrgasmCount > 0 && orgasmCount >= maxOrgasmCount;

    // 计算忍耐力（使用最终意志力）
    const baseEndurance = level * (finalWillpower / 10);
    let endurance = (baseEndurance + enduranceBonus) * (1 + enduranceMulti / 100);

    // 贤者时间增益 +10%
    if (isPostOrgasm) {
      endurance *= 1.1;
    }

    // 虚脱减益 -30%
    if (isExhausted) {
      endurance *= 0.7;
    }

    endurance = Math.max(0, Math.floor(endurance));

    const currentEndurance = getValue(mvuData, '性斗系统.实时忍耐力', 0);

    if (endurance !== currentEndurance) {
      updates['性斗系统.实时忍耐力'] = endurance;
      hasUpdates = true;
      console.info(
        `[性斗学园脚本] 忍耐力: (${level}x${finalWillpower}/10 + ${enduranceBonus}) x (1 + ${enduranceMulti}/100) = ${endurance}`,
      );
    }

    // ==================== 步骤5: 检查快感是否达到上限（触发高潮）====================
    const currentLust = getValue(mvuData, '核心状态.$快感', 0);
    const maxLust = getValue(mvuData, '核心状态.$最大快感', 100);

    if (shouldTriggerOrgasm(currentLust, maxLust)) {
      // 清空快感值
      updates['核心状态.$快感'] = 0;

      // 添加贤者时间状态
      const currentTempStates = statData.临时状态?.状态列表 || {};
      const currentTempBonuses = statData.临时状态?.加成统计 || {};

      updates['临时状态.状态列表'] = {
        ...currentTempStates,
        贤者时间: 3, // 持续3回合
      };

      updates['临时状态.加成统计'] = {
        ...currentTempBonuses,
        基础性斗力成算: (currentTempBonuses.基础性斗力成算 || 0) - 20,
        基础忍耐力成算: (currentTempBonuses.基础忍耐力成算 || 0) + 10,
      };

      // 增加高潮次数
      updates['性斗系统.高潮次数'] = orgasmCount + 1;
      hasUpdates = true;

      console.info('[性斗学园脚本] 触发高潮！进入贤者时间');
    }

    // ==================== 步骤6: 检查是否可以升级 ====================
    const currentLevel = getValue(mvuData, '角色基础._等级', 1);
    const currentExp = getValue(mvuData, '角色基础.经验值', 0);

    let finalLevel = currentLevel; // 用于后续段位计算

    if (canLevelUp(currentLevel, currentExp)) {
      const newLevel = currentLevel + 1;
      const expNeeded = currentLevel * EXP_PER_LEVEL;

      // 计算升级奖励：根据潜力计算，每级获得 floor(潜力/2) 点（属性点和技能点相同）
      const pointsPerLevel = Math.floor(potential / 2);
      const currentAttributePoints = getValue(mvuData, '核心状态.$属性点', 0);
      const currentSkillPoints = getValue(mvuData, '核心状态.$技能点', 0);

      updates['角色基础._等级'] = newLevel;
      updates['角色基础.经验值'] = currentExp - expNeeded;
      updates['核心状态.$属性点'] = currentAttributePoints + pointsPerLevel;
      updates['核心状态.$技能点'] = currentSkillPoints + pointsPerLevel;
      hasUpdates = true;

      finalLevel = newLevel; // 更新最终等级
      console.info(
        `[性斗学园脚本] 升级！${currentLevel} → ${newLevel}，获得 ${pointsPerLevel} 属性点和 ${pointsPerLevel} 技能点`,
      );
    }

    // ==================== 步骤6.5: 根据等级自动更新段位 ====================
    const expectedRank = calculateRank(finalLevel);
    const currentRank = _.get(mvuData.stat_data, '角色基础._段位', '无段位');

    console.info(
      `[性斗学园脚本] 段位检查：当前等级=${finalLevel}, 当前段位="${currentRank}", 期望段位="${expectedRank}"`,
    );

    if (expectedRank !== currentRank) {
      updates['角色基础._段位'] = expectedRank;
      hasUpdates = true;
      console.info(
        `[性斗学园脚本] 段位需要更新：等级 ${finalLevel} → ${expectedRank}段 (从 "${currentRank}" 更新为 "${expectedRank}")`,
      );
    } else {
      console.info(`[性斗学园脚本] 段位无需更新：等级 ${finalLevel} 对应段位 "${expectedRank}" 已正确`);
    }

    // ==================== 步骤7: 应用所有更新 ====================
    if (hasUpdates) {
      console.info('[性斗学园脚本] 开始应用变量更新:', Object.keys(updates));

      // 直接使用 _.set 更新数据，然后一次性写回
      for (const [path, value] of Object.entries(updates)) {
        _.set(mvuData.stat_data, path, value);
        console.info(`[性斗学园脚本] 设置变量: ${path} = ${JSON.stringify(value)}`);
      }

      // 写回 MVU 数据
      await Mvu.replaceMvuData(mvuData, { type: 'message', message_id: 'latest' });
      console.info('[性斗学园脚本] 变量更新完成，已写回MVU数据');

      // 验证段位是否已更新
      if (updates['角色基础._段位']) {
        const verifyData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
        const verifyRank = _.get(verifyData?.stat_data, '角色基础._段位', '未知');
        console.info(`[性斗学园脚本] 段位更新验证：写回后的段位值为 "${verifyRank}"`);
      }
    } else {
      console.info('[性斗学园脚本] 无需更新变量（所有值已是最新）');
    }
  } catch (error) {
    console.error('[性斗学园脚本] 更新依赖变量时出错:', error);
    toastr.error('数值计算出错，请查看控制台', '脚本错误', { timeOut: 5000 });
  } finally {
    isUpdating = false;
  }
}

/**
 * 监听 MVU 变量更新事件
 * 在变量更新结束后，重新计算所有依赖的变量
 */
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, async (variables, variables_before_update) => {
  console.info('[性斗学园脚本] 检测到 MVU 变量更新事件');

  // 检查是否有基础变量发生变化（这些变量的变化会影响计算值）
  const basePaths = [
    '角色基础._等级',
    '角色基础.经验值',
    '角色基础._段位', // 段位变化时也需要重新检查并更新
    // 核心状态基础值
    '核心状态._潜力',
    '核心状态.$基础魅力',
    '核心状态.$基础幸运',
    '核心状态.$基础闪避率',
    '核心状态.$基础暴击率',
    '核心状态.$基础意志力',
    // 核心状态资源
    '核心状态.$最大快感',
    '核心状态.$快感',
    '核心状态.$最大耐力',
    '核心状态.$耐力',
    // 装备和状态
    '物品系统.装备总加成',
    '永久状态.加成统计',
    '永久状态.状态列表',
    '临时状态.状态列表',
    '临时状态.加成统计',
    '性斗系统.高潮次数',
  ];

  let hasBaseChange = false;
  const changedPaths: string[] = [];

  for (const path of basePaths) {
    const oldValue = _.get(variables_before_update, `stat_data.${path}`);
    const newValue = _.get(variables, `stat_data.${path}`);

    // 使用深度比较，因为可能是对象
    if (!_.isEqual(oldValue, newValue)) {
      hasBaseChange = true;
      changedPaths.push(path);
      console.info(`[性斗学园脚本] 检测到变量变化: ${path}`, { oldValue, newValue });
    }
  }

  // 如果有基础变量变化，更新依赖变量
  if (hasBaseChange) {
    console.info(`[性斗学园脚本] 检测到 ${changedPaths.length} 个变量变化，开始更新依赖变量`);
    // 使用 setTimeout 避免在事件处理中直接更新导致的问题
    setTimeout(async () => {
      await updateDependentVariables();
    }, 100); // 稍微延迟确保数据已完全写入
  }
});

/**
 * 监听变量初始化事件
 * 在变量初始化后，计算初始的依赖变量值
 */
eventOn(Mvu.events.VARIABLE_INITIALIZED, async () => {
  await updateDependentVariables();
});

/**
 * 处理对话后的耐力和快感更新
 * 每次对话后：耐力+5，快感-5
 */
async function handleConversationUpdate() {
  try {
    // 获取当前消息楼层的 MVU 数据
    const mvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    if (!mvuData || !mvuData.stat_data) {
      console.warn('[性斗学园脚本] 无法获取 MVU 数据，跳过对话更新');
      return;
    }

    const statData = mvuData.stat_data;

    // 获取当前耐力和快感值
    const currentStamina = getValue(mvuData, '核心状态.$耐力', 0);
    const maxStamina = getValue(mvuData, '核心状态.$最大耐力', 100);
    const currentLust = getValue(mvuData, '核心状态.$快感', 0);

    // 计算新值（带上下限限制）
    const newStamina = Math.min(maxStamina, Math.max(0, currentStamina + 5));
    const newLust = Math.max(0, currentLust - 5);

    // 更新值
    _.set(statData, '核心状态.$耐力', newStamina);
    _.set(statData, '核心状态.$快感', newLust);

    // 写回 MVU 数据
    await Mvu.replaceMvuData(mvuData, { type: 'message', message_id: 'latest' });

    console.info(
      `[性斗学园脚本] 对话后更新：耐力 ${currentStamina} → ${newStamina} (+5), 快感 ${currentLust} → ${newLust} (-5)`,
    );
  } catch (error) {
    console.error('[性斗学园脚本] 对话更新时出错:', error);
  }
}

/**
 * 监听消息接收事件（AI回复后触发）
 * 每次对话后更新耐力和快感
 */
// tavern_events 在脚本环境中是全局可用的
if (typeof tavern_events !== 'undefined' && tavern_events.MESSAGE_RECEIVED) {
  eventOn(tavern_events.MESSAGE_RECEIVED, async () => {
    console.info('[性斗学园脚本] 检测到消息接收事件，开始更新对话后的状态');
    // 延迟一点执行，确保消息已完全更新
    setTimeout(async () => {
      await handleConversationUpdate();
      // 对话后也需要重新计算依赖变量
      await updateDependentVariables();
    }, 200);
  });
  console.info('[性斗学园脚本] 已注册对话后状态更新监听器');
} else {
  console.warn('[性斗学园脚本] tavern_events.MESSAGE_RECEIVED 不可用，无法监听对话事件');
}

/**
 * 初始化时执行一次计算
 */
$(() => {
  // 显示加载提示
  toastr.success('性斗学园数值计算脚本已启动', '脚本加载成功', {
    timeOut: 3000,
    progressBar: true,
  });

  errorCatched(async () => {
    // 等待一小段时间确保 MVU 数据已加载
    await new Promise(resolve => setTimeout(resolve, 500));
    console.info('[性斗学园脚本] 初始化：开始首次计算');
    await updateDependentVariables();
    // 初始化时也更新段位
    await updateRank();
  })();

  // 添加定时检查机制（每10秒检查一次，确保实时更新）
  setInterval(async () => {
    if (!isUpdating) {
      await updateDependentVariables();
    }
    // 独立更新段位，确保段位始终与等级匹配
    await updateRank();
  }, 10000);

  // 初始化状态栏
  initStatusBar();

  // 注册按钮事件（按钮名：打开状态栏）
  eventOn(getButtonEvent('打开状态栏'), () => {
    console.info('[性斗学园脚本] 按钮被点击！');
    toggleStatusBar();
  });
});

/**
 * 初始化状态栏
 */
function initStatusBar() {
  if (statusBarApp) return;

  try {
    statusBarContainer = createScriptIdDiv();
    statusBarContainer.css({
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      width: '100%',
      height: '100%',
      zIndex: '99999', // 提高 z-index 确保在最上层
      pointerEvents: 'none', // 容器本身不拦截事件，但内部元素可以
      // 移动端适配
      touchAction: 'none', // 防止移动端手势冲突
      WebkitOverflowScrolling: 'touch', // iOS 平滑滚动
      margin: '0',
      padding: '0',
      overflow: 'visible', // 确保内容可见
    });

    // 确保添加到 body 的最上层
    $('body').append(statusBarContainer);

    const app = createApp(StatusBarWrapper);

    teleportStyle();
    statusBarApp = app;
    app.mount(statusBarContainer[0]);

    console.info('[性斗学园脚本] 状态栏已初始化');
  } catch (error) {
    console.error('[性斗学园脚本] 初始化状态栏失败:', error);
  }
}

/**
 * 切换状态栏显示
 */
function toggleStatusBar() {
  console.info('[性斗学园脚本] 切换状态栏，当前状态:', statusBarVisible);

  if (!statusBarApp) {
    console.info('[性斗学园脚本] 状态栏未初始化，开始初始化...');
    initStatusBar();
    // 等待初始化完成后再切换
    setTimeout(() => {
      const state = (window as any).__statusBarState;
      if (state && state.toggle) {
        state.toggle();
        statusBarVisible = state.isVisible.value;
      } else {
        statusBarVisible = !statusBarVisible;
      }
      console.info('[性斗学园脚本] 状态栏已切换为:', statusBarVisible);
    }, 300);
    return;
  }

  // 通过全局状态切换
  const state = (window as any).__statusBarState;
  if (state && state.toggle) {
    state.toggle();
    statusBarVisible = state.isVisible.value;
  } else {
    statusBarVisible = !statusBarVisible;
  }
  console.info('[性斗学园脚本] 状态栏已切换为:', statusBarVisible);
}

/**
 * 脚本卸载时显示提示
 */
$(window).on('pagehide', () => {
  toastr.info('性斗学园数值计算脚本已关闭', '脚本卸载', {
    timeOut: 2000,
    progressBar: true,
  });

  // 清理状态栏
  if (statusBarApp) {
    statusBarApp.unmount();
    statusBarApp = null;
  }
  if (statusBarContainer) {
    statusBarContainer.remove();
    statusBarContainer = null;
  }
  destroyScriptIdDiv();
  deteleportStyle();
});

console.info('性斗学园数值计算脚本已加载');
