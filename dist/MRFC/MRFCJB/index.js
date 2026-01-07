/echo <script>
(function() {
    // 防止重复加载
    if (window.rvTerminalLoaded) {
        toastr.info('房车终端脚本已更新', '系统提示');
        $('#rv-hud-container').remove(); // 移除旧界面
    }
    window.rvTerminalLoaded = true;

    // --- 1. 样式配置 ---
    const css = `
    #rv-hud-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 20000; pointer-events: none; display: flex; justify-content: center; align-items: center; }
    #rv-hud-container .rv-mask { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.4); pointer-events: auto; }
    #rv-hud-container .bio-panel { pointer-events: auto; width: 380px; max-width: 95%; background: #0a0a0a; border: 1px solid #eab308; border-radius: 4px; box-shadow: 0 0 20px rgba(234, 179, 8, 0.2); font-family: 'Consolas', monospace; color: #eee; font-size: 12px; display: flex; flex-direction: column; overflow: hidden; animation: rv-pop 0.2s ease-out; }
    @keyframes rv-pop { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .rv-header { background: #eab308; color: #000; padding: 8px 12px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
    .rv-body { padding: 15px; overflow-y: auto; max-height: 80vh; }
    .rv-row { display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px dashed #333; padding-bottom: 2px; }
    .rv-title { color: #eab308; margin: 10px 0 5px 0; border-left: 3px solid #eab308; padding-left: 6px; font-weight: bold; }
    .rv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .rv-box { background: #1a1a1a; padding: 5px; border-radius: 3px; display: flex; justify-content: space-between; }
    .rv-tag { background: #222; border: 1px solid #444; padding: 2px 6px; margin: 2px; display: inline-block; border-radius: 2px; font-size: 11px; }
    .rv-close { cursor: pointer; font-size: 16px; font-weight: bold; }
    .rv-close:hover { color: #fff; }
    `;

    // 注入样式
    if (!$('#rv-style').length) $('head').append(`<style id="rv-style">${css}</style>`);

    // --- 2. 核心逻辑 ---
    function renderUI() {
        // 获取数据 (兼容不同环境)
        const vars = window.getAllVariables ? getAllVariables() : {}; 
        const get = (p, def) => {
            let v = window._ ? _.get(vars, `stat_data.${p}`) : def;
            return Array.isArray(v) ? v[0] : (v !== undefined ? v : def);
        };
        const getList = (p) => {
             let v = window._ ? _.get(vars, `stat_data.${p}`) : [];
             if(Array.isArray(v) && Array.isArray(v[0])) v = v[0];
             return Array.isArray(v) ? v.filter(i => typeof i === 'string' ? !i.startsWith('$') : true) : [];
        };

        // 构建 HTML
        const html = `
        <div class="rv-mask" onclick="$('#rv-hud-container').remove()"></div>
        <div class="bio-panel">
            <div class="rv-header">
                <span>🚐 房车终端系统 V2.0</span>
                <span class="rv-close" onclick="$('#rv-hud-container').remove()">×</span>
            </div>
            <div class="rv-body">
                <div class="rv-row">
                    <span>📅 ${get('系统.时间', '--')}</span>
                    <span>📍 ${get('系统.地点', '--')}</span>
                </div>
                
                <div class="rv-title">车辆状态</div>
                <div class="rv-grid">
                    <div class="rv-box"><span style="color:#f87171">🛡️ 装甲</span><b>${get('房车.状态.装甲',0)}%</b></div>
                    <div class="rv-box"><span style="color:#fbbf24">⛽ 燃料</span><b>${get('房车.状态.燃料',0)}%</b></div>
                    <div class="rv-box"><span style="color:#60a5fa">💧 水存</span><b>${get('房车.状态.水源',0)}L</b></div>
                    <div class="rv-box"><span style="color:#34d399">⚡ 电力</span><b>${get('房车.状态.电力',0)}%</b></div>
                </div>

                <div class="rv-title">驾驶员</div>
                <div class="rv-grid">
                    <div class="rv-box"><span>❤️ 生命</span><b>${get('角色.状态.HP',100)}</b></div>
                    <div class="rv-box"><span>👁️ SAN</span><b>${get('角色.状态.SAN',100)}</b></div>
                </div>

                <div class="rv-title">舱室布局</div>
                <div>${getList('房车.布局').map(i=>`<span class="rv-tag" style="border-color:#555">${i}</span>`).join('') || '<span style="color:#666">空</span>'}</div>

                <div class="rv-title">背包物品</div>
                <div>${getList('角色.背包').map(i=>`<span class="rv-tag">${typeof i=='object'?i.name:i}</span>`).join('') || '<span style="color:#666">空</span>'}</div>
            </div>
        </div>
        `;
        
        // 显示界面
        $('#rv-hud-container').remove();
        $('body').append(`<div id="rv-hud-container">${html}</div>`);
    }

    // --- 3. 终极监听器 (解决点不出来的问题) ---
    // 不再依赖 getButtonEvent，直接监听全局点击
    $(document).off('click.rvTrigger').on('click.rvTrigger', '.qr--button', function() {
        // 获取按钮上的文字
        const label = $(this).find('.qr--button-label').text().trim();
        // 只要按钮文字包含 \"房车终端\" 就触发
        if (label === '房车终端') {
            console.log('触发房车终端...');
            renderUI();
        }
    });

    console.log('房车终端脚本加载完毕，请点击按钮测试。');
    toastr.success('房车脚本已加载', 'Ready');
})();
</script>
//# sourceMappingURL=index.js.map
