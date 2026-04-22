import { controlSpin, emitStageStatus } from "./index.js";

// 数据过滤
export const DATA_FILTER_TYPE = {
    Operator: "Operator",
    Enemy: "Enemy",
    DynIllust: "DynIllust",
};

const PATH_MAP = {
    // MODELS_DATA: "./assets/models_data.json",
    MODELS_DATA: "../Ark-Models/models_data.json",
    MODELS: "models",
    MODELS_ENEMIES: "models_enemies",
    MODELS_ILLUST: "models_illust",
};

// 渲染筛选数据
export const renderMemberSelect = async (DATA_FILTER_TYPE = [], className = "#select") => {
    let resData;
    try {
        const response = await fetch(PATH_MAP.MODELS_DATA);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        resData = await response.json();
    } catch (error) {
        controlSpin("close");
        emitStageStatus("error", {
            title: "模型索引加载失败",
            message: "暂时无法获取角色列表，请检查网络后重试。",
            retryLabel: "重试获取",
            retry: () => renderMemberSelect(DATA_FILTER_TYPE, className),
        });
        console.error("models_data fetch failed:", error);
        return;
    }

    const data = [];
    for (let key in resData.data) {
        const item = resData.data[key];
        // 过滤皮肤
        if (DATA_FILTER_TYPE.includes(item.type)) {
            data.push({
                dir: key,
                name: `${item.name} - ${item.skinGroupName}`,
                type: item.type,
                assets: {
                    ".atlas": Array.isArray(item.assetList[".atlas"]) ? item.assetList[".atlas"][0] : item.assetList[".atlas"],
                    ".png": Array.isArray(item.assetList[".png"]) ? item.assetList[".png"][0] : item.assetList[".png"],
                    ".skel": Array.isArray(item.assetList[".skel"]) ? item.assetList[".skel"][0] : item.assetList[".skel"],
                },
            });
        }
    }
    const selectDom = document.querySelector(className);
    if (!selectDom) return;

    selectDom.options = data.map((item) => ({
        label: item.name,
        value: JSON.stringify(item),
    }));

    if (data.length === 0) {
        emitStageStatus("empty", {
            title: "暂无可展示内容",
            message: "当前筛选条件没有可用数据，稍后可尝试切换类型。",
        });
        return;
    }

    selectDom.addEventListener("change", (e) => {
        const rawValue = e.target?.value;
        if (!rawValue) return;

        let item;
        try {
            item = JSON.parse(rawValue);
        } catch (error) {
            console.warn("search-select value parse failed:", error);
            return;
        }
        if (!item?.type || !item?.dir || !item?.assets) return;

        controlSpin("open");
        let prefix = "";
        switch (item.type) {
            case "Operator":
                prefix = PATH_MAP.MODELS;
                break;
            case "Enemy":
                prefix = PATH_MAP.MODELS_ENEMIES;
                break;
            case "DynIllust":
                prefix = PATH_MAP.MODELS_ILLUST;
                break;

            default:
                break;
        }
        const initParams = {
            dir: `Ark-Models/${prefix}/${item.dir}/`,
            atlasFile: item.assets[".atlas"],
            skelFile: item.assets[".skel"],
        };
        emitStageStatus("loading", {
            title: "模型资源加载中",
            message: `目标：${item.name}`,
            retryLabel: "重试加载",
            retry: () => {
                controlSpin("open");
                window.init(initParams);
            },
        });
        window.init(initParams);
    });
};
