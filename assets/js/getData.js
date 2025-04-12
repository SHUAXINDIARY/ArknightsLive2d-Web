import { controlSpin } from "./index.js";

// 补充数据
const OperatorDataExtra = [
    {
        dir: "char_4179_monstr",
        name: "Mon3tr - 默认服装",
        type: "Operator",
        assets: {
            ".atlas": "char_4179_monstr.atlas",
            ".png": "char_4179_monstr.png",
            ".skel": "char_4179_monstr.skel",
        },
    },
];
// 数据过滤
export const DATA_FILTER_TYPE = {
    Operator: "Operator",
    Enemy: "Enemy",
    DynIllust: "DynIllust",
};

// 渲染筛选数据
export const renderMemberSelect = async (DATA_FILTER_TYPE = []) => {
    const resData = await fetch("./assets/models_data.json").then((res) => res.json());
    const data = [];
    OperatorDataExtra.forEach((item) => {
        if (DATA_FILTER_TYPE.includes(item.type)) {
            data.push(item);
        }
    });
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
    const selectDom = document.querySelector("#select");
    selectDom.options = data.map((item) => ({
        label: item.name,
        value: JSON.stringify(item),
        value: JSON.stringify(item),
    }));
    selectDom.addEventListener("change", (e) => {
        controlSpin("open");
        const item = JSON.parse(e.target.value);
        let prefix = "";
        switch (item.type) {
            case "Operator":
                prefix = "models";
                break;
            case "Enemy":
                prefix = "models_enemies";
                break;
            case "DynIllust":
                prefix = "models_illust";
                break;

            default:
                break;
        }
        window.init({
            dir: `${prefix}/${item.dir}/`,
            atlasFile: item.assets[".atlas"],
            skelFile: item.assets[".skel"],
        });
    });
};
