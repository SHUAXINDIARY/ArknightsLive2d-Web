import { controlSpin } from "./index.js";

const dataFromPrts = [
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
export const renderMemberSelect = async () => {
    const resData = await fetch("./assets/models_data.json").then((res) => res.json());
    const data = [...dataFromPrts];
    for (let key in resData.data) {
        // 过滤皮肤
        if (key.includes("illust")) {
            continue;
        }
        data.push({
            dir: key,
            name: `${resData.data[key].name} - ${resData.data[key].skinGroupName}`,
            type: resData.data[key].type,
            assets: {
                ".atlas": Array.isArray(resData.data[key].assetList[".atlas"]) ? resData.data[key].assetList[".atlas"][0] : resData.data[key].assetList[".atlas"],
                ".png": Array.isArray(resData.data[key].assetList[".png"]) ? resData.data[key].assetList[".png"][0] : resData.data[key].assetList[".png"],
                ".skel": Array.isArray(resData.data[key].assetList[".skel"]) ? resData.data[key].assetList[".skel"][0] : resData.data[key].assetList[".skel"],
            },
        });
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
