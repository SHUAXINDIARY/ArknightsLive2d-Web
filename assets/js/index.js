export const controlSpin = (status) => {
    const dom = document.querySelector("#spinWrapper");
    if (dom) {
        dom.style.display = status === "close" ? "none" : "flex";
    }
};

export const STAGE_STATUS_EVENT = "ak:stage-status";

export const emitStageStatus = (state, payload = {}) => {
    window.dispatchEvent(
        new CustomEvent(STAGE_STATUS_EVENT, {
            detail: {
                state,
                ...payload,
            },
        })
    );
};

let canvas;
let gl;
let shader;
let batcher;
let mvp = new spine.webgl.Matrix4();
let assetManager;
let skeletonRenderer;

let lastFrameTime;
let spineboy;
let isRendering = false;
let loadFrameId = 0;
let renderFrameId = 0;

let dir = "Ark-Models/models/2025_shu_nian#11/";
let skelFile = "build_char_2025_shu_nian#11.skel";
let atlasFile = "build_char_2025_shu_nian#11.atlas";

// 设置居中基准（历史兼容参数）。默认 1 表示严格按包围盒中心居中。
// 如某些模型需要微调，可在 init 里传 positionBaseValX/Y（不推荐用大于 1 的默认值，否则会导致“看起来不居中”）
let positionBaseValX = 1;
let positionBaseValY = 1;

let dpr = window.devicePixelRatio;
// 额外超采样倍率：仅提升 canvas 后备缓冲分辨率，不改变视觉尺寸（默认温和一点）
let supersample = 1.25;
// 视野缩放：控制"视觉大小"。默认用 dpr，让高分屏下视觉尺寸更接近旧版（不至于过大）。
let viewScale;

// 是否自动缩放以完整显示模型（皮肤立绘专用）。默认 false 保持首页逻辑不变。
let fitToCanvas = false;

let AnimaName = "";

// 缓存画布尺寸，避免每帧都触发实际 resize（更省性能，也更稳定）
let lastCanvasW = 0;
let lastCanvasH = 0;

export function init(params) {
    // 设置默认值
    if (params) {
        dir = params.dir || dir;
        skelFile = params.skelFile || skelFile;
        atlasFile = params.atlasFile || atlasFile;
        positionBaseValX = params.positionBaseValX || positionBaseValX;
        positionBaseValY = params.positionBaseValY || positionBaseValY;
        dpr = params.dpr || dpr;
        supersample = params.supersample ?? supersample;
        viewScale = params.viewScale ?? viewScale;
        fitToCanvas = params.fitToCanvas ?? fitToCanvas;
        AnimaName = params.animaName;
    }
    emitStageStatus("loading", {
        title: "正在加载立绘资源",
        message: "首次加载可能需要几秒，请稍候。",
    });

    if (loadFrameId) {
        cancelAnimationFrame(loadFrameId);
        loadFrameId = 0;
    }
    if (renderFrameId) {
        cancelAnimationFrame(renderFrameId);
        renderFrameId = 0;
    }
    isRendering = false;

    // Setup canvas and WebGL context. We pass alpha: false to canvas.getContext() so we don't use premultiplied alpha when
    // loading textures. That is handled separately by PolygonBatcher.
    canvas = document.getElementById("canvas");
    let config = { alpha: true };
    gl = canvas.getContext("webgl", config) || canvas.getContext("experimental-webgl", config);
    if (!gl) {
        controlSpin("close");
        emitStageStatus("error", {
            title: "无法启动渲染",
            message: "当前浏览器不支持 WebGL，请尝试开启硬件加速或更换浏览器。",
        });
        return;
    }

    // Create a simple shader, mesh, model-view-projection matrix, SkeletonRenderer, and AssetManager.
    shader = spine.webgl.Shader.newTwoColoredTextured(gl);
    batcher = new spine.webgl.PolygonBatcher(gl);
    mvp.ortho2d(0, 0, canvas.width - 1, canvas.height - 1);
    skeletonRenderer = new spine.webgl.SkeletonRenderer(gl);
    assetManager = new spine.webgl.AssetManager(gl);

    // Tell AssetManager to load the resources for each skeleton, including the exported .skel file, the .atlas file and the .png
    // file for the atlas. We then wait until all resources are loaded in the load() method.
    const isSkel = skelFile.includes(".skel");
    if (isSkel) {
        assetManager.loadBinary(`${dir}${skelFile}`);
    } else {
        assetManager.loadText(`${dir}${skelFile}`);
    }
    assetManager.loadTextureAtlas(`${dir}${atlasFile}`);
    loadFrameId = requestAnimationFrame(load);
}

async function load(animaName = "Move") {
    console.log("调试animaName", animaName);
    // Wait until the AssetManager has loaded all resources, then load the skeletons.
    try {
        if (assetManager.isLoadingComplete()) {
            spineboy = await loadSpineboy(typeof animaName === "string" ? animaName : AnimaName || "Move", true);
            controlSpin("close");
            emitStageStatus("success", {
                title: "立绘已就绪",
                message: "你可以继续搜索并切换角色。",
            });
            if (!isRendering) {
                lastFrameTime = Date.now() / 1000;
                isRendering = true;
                renderFrameId = requestAnimationFrame(render); // Loading is done, call render every frame.
            }
        } else {
            loadFrameId = requestAnimationFrame(load);
        }
    } catch (error) {
        controlSpin("close");
        isRendering = false;
        emitStageStatus("error", {
            title: "立绘加载失败",
            message: "资源文件可能缺失或网络中断。请重试或切换其他角色。",
            retryLabel: "重新加载",
            retry: () => {
                controlSpin("open");
                init({
                    dir,
                    skelFile,
                    atlasFile,
                    positionBaseValX,
                    positionBaseValY,
                    dpr,
                    supersample,
                    viewScale,
                    fitToCanvas,
                    animaName: AnimaName,
                });
            },
        });
        console.log("加载资源错误", error);
    }
}
// 自定义逻辑
const renderBtn = (actionNameArr) => {
    const btnPanel = document.querySelector("#panel");
    if (btnPanel) {
        btnPanel.innerHTML = "";
        actionNameArr.forEach((item) => {
            const btn = document.createElement("button");
            btn.textContent = item;
            btn.addEventListener("click", () => {
                window.load(item);
            });
            btnPanel.appendChild(btn);
        });
    }
};

function loadSpineboy(initialAnimation, premultipliedAlpha) {
    // Load the texture atlas from the AssetManager.
    let atlas = assetManager.get(`${dir}${atlasFile}`);

    // Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
    let atlasLoader = new spine.AtlasAttachmentLoader(atlas);

    // Create a SkeletonBinary instance for parsing the .skel file.
    let skeletonBinary = new spine.SkeletonBinary(atlasLoader);

    // Set the scale to apply during parsing, parse the file, and create a new skeleton.
    skeletonBinary.scale = 1;
    let skeletonData;
    // 区分是否是skel
    if (skelFile.includes(".skel")) {
        skeletonData = skeletonBinary.readSkeletonData(assetManager.get(`${dir}${skelFile}`));
    } else {
        var skeletonJson = new spine.SkeletonJson(atlasLoader);
        skeletonData = skeletonJson.readSkeletonData(assetManager.get(`${dir}${skelFile}`));
    }

    let skeleton = new spine.Skeleton(skeletonData);
    let bounds = calculateSetupPoseBounds(skeleton);

    // Create an AnimationState, and set the initial animation in looping mode.
    let animationStateData = new spine.AnimationStateData(skeleton.data);
    let animationState = new spine.AnimationState(animationStateData);
    animationState.setAnimation(0, initialAnimation, true);
    //   渲染动作按钮
    renderBtn(
        animationState.data.skeletonData.animations.reduce((total, item) => {
            if (item.name !== "Default") {
                total.push(item.name);
            }
            return total;
        }, [])
    );
    // Pack everything up and return to caller.
    return {
        skeleton: skeleton,
        state: animationState,
        bounds: bounds,
        premultipliedAlpha: premultipliedAlpha,
    };
}

function calculateSetupPoseBounds(skeleton) {
    skeleton.setToSetupPose();
    skeleton.updateWorldTransform();
    let offset = new spine.Vector2();
    let size = new spine.Vector2();
    skeleton.getBounds(offset, size, []);
    console.log("调试尺寸", size);
    return { offset: offset, size: size };
}

function render() {
    if (!isRendering || !spineboy) return;
    let now = Date.now() / 1000;
    let delta = now - lastFrameTime;
    lastFrameTime = now;

    // 先同步画布真实尺寸/viewport，避免 resize 发生在 clear 之后导致偶发残影
    syncCanvasSize();
    // 设置背景色
    // gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Apply the animation state based on the delta time.
    let skeleton = spineboy.skeleton;
    let state = spineboy.state;
    let premultipliedAlpha = spineboy.premultipliedAlpha;
    state.update(delta);
    state.apply(skeleton);
    skeleton.updateWorldTransform();

    // 更新 viewport 与 MVP：始终以“当前帧包围盒中心”对齐到画布正中心
    updateMvpToCenter(skeleton);

    // Bind the shader and set the texture and model-view-projection matrix.
    shader.bind();
    shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
    shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values);

    // Start the batch and tell the SkeletonRenderer to render the active skeleton.
    batcher.begin(shader);
    skeletonRenderer.premultipliedAlpha = premultipliedAlpha;
    skeletonRenderer.draw(batcher, skeleton);
    batcher.end();

    shader.unbind();

    renderFrameId = requestAnimationFrame(render);
}
function syncCanvasSize() {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    // 物理像素 = CSS 像素 * dpr * supersample（适当超采样提清晰度）
    const ss = Math.max(1, Math.min(2, Number(supersample) || 1));
    const scale = (Number(dpr) || 1) * ss;
    const nextW = Math.floor(cw * scale);
    const nextH = Math.floor(ch * scale);

    if (nextW === lastCanvasW && nextH === lastCanvasH) return;

    lastCanvasW = nextW;
    lastCanvasH = nextH;
    canvas.width = nextW;
    canvas.height = nextH;
    gl.viewport(0, 0, nextW, nextH);
}

function updateMvpToCenter(skeleton) {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;

    // 以"当前帧"包围盒中心为准，保证模型始终居中（动画不漂）
    const offset = new spine.Vector2();
    const size = new spine.Vector2();
    skeleton.getBounds(offset, size, []);
    const centerX = offset.x + size.x / 2;
    const centerY = offset.y + size.y / 2;

    // fitToCanvas 模式：自动缩放以完整显示模型（皮肤立绘专用）
    if (fitToCanvas) {
        // 计算需要多大的视野才能完整显示包围盒
        const boundsW = size.x || 1;
        const boundsH = size.y || 1;
        // 按宽高比决定缩放：取较小的缩放比保证完整显示
        const scaleX = cw / boundsW;
        const scaleY = ch / boundsH;
        const fitScale = Math.min(scaleX, scaleY);
        // 视野大小 = 包围盒大小 / fitScale（反过来算：让包围盒刚好填满画布短边）
        const worldW = cw / fitScale;
        const worldH = ch / fitScale;
        // 中心对齐包围盒中心
        mvp.ortho2d(centerX - worldW / 2, centerY - worldH / 2, worldW, worldH);
        return;
    }

    // 保持历史语义：positionBaseValX/Y 只影响"中心点平移缩放"（不影响模型大小）
    // 之前代码是 centerX / base - canvasWidth/2，因此默认 20 不会把模型缩小，只是改变居中参考点
    const baseX = Number(positionBaseValX) || 1;
    const baseY = Number(positionBaseValY) || 1;
    const worldCenterX = centerX / baseX;
    const worldCenterY = centerY / baseY;

    // 视觉尺寸控制：这里用 css * viewScale 来决定视野大小
    // - 默认 viewScale = dpr（更贴近旧版在高分屏的观感：不至于过大）
    // - supersample 只用于提高清晰度，不参与这里的视野计算
    const vs = Number(viewScale ?? dpr) || 1;
    const worldW = cw * vs;
    const worldH = ch * vs;

    mvp.ortho2d(worldCenterX - worldW / 2, worldCenterY - worldH / 2, worldW, worldH);
}
// 全局init
window.init = init;
// 全局加载
window.load = load;
