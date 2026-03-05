import { controlSpin } from "./index.js";

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
    const resData = await fetch(PATH_MAP.MODELS_DATA).then((res) => res.json());
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
    selectDom.options = data.map((item) => ({
        label: item.name,
        value: JSON.stringify(item),
    }));
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
        window.init({
            dir: `Ark-Models/${prefix}/${item.dir}/`,
            atlasFile: item.assets[".atlas"],
            skelFile: item.assets[".skel"],
        });
    });
};
