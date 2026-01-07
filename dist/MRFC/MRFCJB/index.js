(function () {
    'use strict';

    console.log('[房车终端] 脚本正在加载...');

    // 1. 配置区域
    const CONFIG = {
        triggerButton: '房车终端', // 🔥 这里定义了触发按钮的名字，必须完全匹配
        domId: 'rv-hud-container', // 防止重复生成的 ID
        dependencies: ['Mvu', 'jQuery'] // 依赖项
    };

    // 2. 样式定义 (CSS)
    // 这里的样式加了 #rv-hud-container 前缀，防止污染酒馆其他界面
    const STYLES = `
        #${CONFIG.domId} {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 9999; pointer-events: none; /* 让点击穿透，除非点到面板 */
            display: flex; justify-content: center; align-items: center;
        }
        #${CONFIG.domId} * { box-sizing: border-box; }
        
        /* 核心面板样式 */
        #${CONFIG.domId} .bio-panel { 
            pointer-events: auto; /* 面板本身可以点击 */
            width: 90%; max-width: 400px;
            background: #080808; border: 1px solid #eab308; 
            border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            font-family: 'Courier Prime', 'Consolas', monospace; 
            font-size: 12px; color: #e5e5e5;
            animation: rv-slide-in 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }

        @keyframes rv-slide-in {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        /* 你的原始样式复刻 */
        #${CONFIG.domId} summary.bio-header { background: #eab308; color: #000; padding: 8px 12px; font-weight: 900; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; }
        #${CONFIG.domId} .panel-body { padding: 12px; background: #080808; max-height: 80vh; overflow-y: auto; }
        #${CONFIG.domId} .dashed-line { border-top: 1px dashed #333; margin: 10px 0; width: 100%; height: 1px; opacity: 0.5; }
        #${CONFIG.domId} .section-title { display: flex; align-items: center; color: #eab308; font-weight: bold; margin: 12px 0 8px 0; text-transform: uppercase; }
        #${CONFIG.domId} .section-title::before { content: ''; display: inline-block; width: 4px; height: 14px; background: #eab308; margin-right: 8px; }
        #${CONFIG.domId} .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 2px; }
        #${CONFIG.domId} .stat-box { background: #161616; border-radius: 4px; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; border-left: 1px solid #333; }
        #${CONFIG.domId} .stat-val { font-weight: bold; }
        
        /* 标签与模块 */
        #${CONFIG.domId} .tags-container { display: flex; flex-wrap: wrap; gap: 4px; }
        #${CONFIG.domId} .item-tag { background: #222; color: #ccc; border: 1px solid #444; padding: 2px 6px; border-radius: 2px; font-size: 11px; }
        #${CONFIG.domId} .layout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
        #${CONFIG.domId} .module-box { padding: 4px 6px; font-size: 11px; text-align: center; border-radius: 2px; background: #262626; border: 1px solid #525252; color: #e5e5e5; }
        
        /* 顶部信息栏 */
        #${CONFIG.domId} .top-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; color: #888; }
        #${CONFIG.domId} .close-btn { background: none; border: none; color: #000; font-weight: bold; cursor: pointer; padding: 0 4px; }
        #${CONFIG.domId} .close-btn:hover { color: #fff; }
    `;

    // 3. HTML 结构 (模板)
    const HTML_TEMPLATE = `
        <div class="bio-panel">
            <summary class="bio-header">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span>🚐 SURVIVAL HUD (终端)</span>
                </div>
                <button class="close-btn" onclick="$('#${CONFIG.domId}').remove()">✕</button>
            </summary>
            <div class="panel-body">
                <div class="top-info">
                    <span>📅 <span id="t-time">--</span></span>
                    <span>📍 <span id="t-loc">--</span></span>
                    <span>🌡️ <span id="t-wth">--</span></span>
                </div>
                
                <div class="section-title">🚜 Unimog 状态</div>
                <div class="stat-grid">
                    <div class="stat-box"><span style="color:#ef4444">🛡️ 装甲</span><span class="stat-val" id="v-armor">--</span></div>
                    <div class="stat-box"><span style="color:#f59e0b">⛽ 燃料</span><span class="stat-val" id="v-fuel">--</span></div>
                    <div class="stat-box"><span style="color:#3b82f6">💧 水源</span><span class="stat-val" id="v-water">--</span></div>
                    <div class="stat-box"><span style="color:#22c55e">⚡ 电力</span><span class="stat-val" id="v-power">--</span></div>
                </div>

                <div class="section-title">🤠 驾驶员状态</div>
                <div class="stat-grid">
                    <div class="stat-box"><span style="color:#f87171">❤️ 生命</span><span class="stat-val" id="v-hp">--</span></div>
                    <div class="stat-box"><span style="color:#d946ef">👁️ SAN</span><span class="stat-val" id="v-san">--</span></div>
                    <div class="stat-box"><span style="color:#fbbf24">🍗 饱腹</span><span class="stat-val" id="v-food">--</span></div>
                    <div class="stat-box"><span style="color:#60a5fa">💧 水分</span><span class="stat-val" id="v-thirst">--</span></div>
                </div>

                <div class="dashed-line"></div>
                <div class="section-title" style="font-size:11px; border:none;">📦 舱室模块</div>
                <div id="box-layout" class="layout-grid"></div>

                <div class="section-title" style="font-size:11px; border:none;">🎒 随身物品</div>
                <div id="box-pack" class="tags-container"></div>
            </div>
        </div>
    `;

    // 4. 数据获取与更新逻辑 (Core Logic)
    function updateData() {
        if (!window.Mvu) return;
        const data = window.getAllVariables ? getAllVariables() : {}; // 兼容旧版
        
        // --- 辅助函数 ---
        const getVal = (path, def) => {
            // 尝试从 stat_data 读取，失败则返回默认值
            let val = _.get(data, `stat_data.${path}`);
            // MVU 有时返回 [值, 类型] 的数组，这里做处理
            if (Array.isArray(val)) val = val[0];
            return (val !== undefined && val !== null) ? val : def;
        };
        
        const getList = (path) => {
            let list = _.get(data, `stat_data.${path}`);
            if (Array.isArray(list) && Array.isArray(list[0])) list = list[0]; // 解包
            if (!Array.isArray(list)) return [];
            return list.filter(i => typeof i === 'string' ? !i.startsWith('$') : true);
        };

        // --- 更新 DOM ---
        const $el = $(`#${CONFIG.domId}`);
        if ($el.length === 0) return; // 界面没打开就不更新

        // 基础数值
        $el.find('#t-time').text(getVal('系统.时间', '未知'));
        $el.find('#t-loc').text(getVal('系统.地点', '未知'));
        $el.find('#t-wth').text(getVal('系统.天气', '未知'));

        $el.find('#v-armor').text(getVal('房车.状态.装甲', 0) + '%');
        $el.find('#v-fuel').text(getVal('房车.状态.燃料', 0) + '%');
        $el.find('#v-water').text(getVal('房车.状态.水源', 0) + 'L');
        $el.find('#v-power').text(getVal('房车.状态.电力', 0) + '%');

        let hp = getVal('角色.状态.HP', 100);
        let hunger = getVal('角色.状态.饥饿', 0);
        $el.find('#v-hp').text(hp).css('color', hp < 30 ? '#ef4444' : '#f87171');
        $el.find('#v-san').text(getVal('角色.状态.SAN', 100));
        $el.find('#v-food').text(100 - hunger);
        $el.find('#v-thirst').text(100 - getVal('角色.状态.口渴', 0));

        // 列表渲染
        const renderList = (id, list, cls) => {
            const container = $el.find(id);
            container.empty();
            if (!list.length) container.html('<span style="color:#555;font-size:10px;">[空]</span>');
            else list.forEach(item => {
                let text = typeof item === 'object' ? (item.名称 || item.name || '物品') : item;
                container.append(`<div class="${cls}">${text}</div>`);
            });
        };

        renderList('#box-layout', getList('房车.布局'), 'module-box');
        renderList('#box-pack', getList('角色.背包'), 'item-tag');
    }

    // 5. 显示/隐藏控制函数 (Toggle)
    function toggleTerminal() {
        const existing = $(`#${CONFIG.domId}`);
        
        if (existing.length > 0) {
            // 如果已存在，关闭它 (带动画)
            existing.fadeOut(200, function() { $(this).remove(); });
            console.log('[房车终端] 关闭界面');
        } else {
            // 如果不存在，创建它
            console.log('[房车终端] 打开界面');
            
            // 注入样式 (仅一次)
            if ($(`#style-${CONFIG.domId}`).length === 0) {
                $('head').append(`<style id="style-${CONFIG.domId}">${STYLES}</style>`);
            }

            // 注入 HTML
            const $hud = $(`<div id="${CONFIG.domId}">${HTML_TEMPLATE}</div>`);
            $('body').append($hud);

            // 立即填充一次数据
            updateData();
        }
    }

    // 6. 初始化与事件监听 (Init)
    async function init() {
        // 等待环境就绪
        let attempts = 0;
        while ((!window.Mvu || !window.jQuery) && attempts < 10) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }

        if (!window.Mvu) {
            console.error('[房车终端] MVU 未加载，脚本无法运行');
            return;
        }

        console.info('[房车终端] 核心已就绪，正在注册事件...');

        // 🔥 关键点：注册按钮点击监听
        // 这就是 index.js 里的 `eventOn(getButtonEvent('打开状态栏'), ...)`
        if (window.getButtonEvent) {
            // 先解绑旧的，防止重复触发 (热重载时很有用)
            // 注意：SillyTavern 的 eventOff 可能需要具体的函数引用，这里作为保险
            try {
                // 监听名为 "房车终端" 的按钮
                eventOn(getButtonEvent(CONFIG.triggerButton), () => {
                    console.log('[房车终端] 检测到按钮点击事件');
                    toggleTerminal();
                });
                console.info(`[房车终端] 已绑定按钮监听: "${CONFIG.triggerButton}"`);
                
                // 顺便弹个窗告诉用户成功了
                if (window.toastr) toastr.success('房车终端系统已挂载', 'System Ready');
            } catch (e) {
                console.error('[房车终端] 绑定按钮失败:', e);
            }
        }

        // 🔥 注册数据更新监听 (MVU 变动时自动刷新界面)
        if (window.Mvu && Mvu.events) {
            eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
                // 只有当界面打开时才更新，节省性能
                if ($(`#${CONFIG.domId}`).length > 0) {
                    updateData();
                }
            });
        }
    }

    // 启动
    init();

})();
//# sourceMappingURL=index.js.map
