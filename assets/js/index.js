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
const controlSpin = (status) => {
  const dom = document.querySelector("#spinWrapper");
  dom.style.display = status === "close" ? "none" : "flex";
};
const renderMemberSelect = async () => {
  const resData = await fetch("./assets/models_data.json").then((res) =>
    res.json()
  );
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
        ".atlas": Array.isArray(resData.data[key].assetList[".atlas"])
          ? resData.data[key].assetList[".atlas"][0]
          : resData.data[key].assetList[".atlas"],
        ".png": Array.isArray(resData.data[key].assetList[".png"])
          ? resData.data[key].assetList[".png"][0]
          : resData.data[key].assetList[".png"],
        ".skel": Array.isArray(resData.data[key].assetList[".skel"])
          ? resData.data[key].assetList[".skel"][0]
          : resData.data[key].assetList[".skel"],
      },
    });
  }
  const selectDom = document.querySelector("#select");
  selectDom.options = data.map((item) => ({
    label: item.name,
    value: JSON.stringify(item),
    value: JSON.stringify(item),
  }));
  selectDom.addEventListener("change", async (e) => {
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

let canvas;
let gl;
let shader;
let batcher;
let mvp = new spine.webgl.Matrix4();
let assetManager;
let skeletonRenderer;

let lastFrameTime;
let spineboy;

let dir = "models/2025_shu_nian#11/";
let skelFile = "build_char_2025_shu_nian#11.skel";
let atlasFile = "build_char_2025_shu_nian#11.atlas";
const dpr = 3 || window.devicePixelRatio;
const AnimationName = "Relax";

function init(params) {
  // 传参
  if (params) {
    dir = params.dir;
    skelFile = params.skelFile;
    atlasFile = params.atlasFile;
  }
  // Setup canvas and WebGL context. We pass alpha: false to canvas.getContext() so we don't use premultiplied alpha when
  // loading textures. That is handled separately by PolygonBatcher.
  canvas = document.getElementById("canvas");
  let config = { alpha: true };
  gl =
    canvas.getContext("webgl", config) ||
    canvas.getContext("experimental-webgl", config);
  if (!gl) {
    alert("WebGL is unavailable.");
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
  requestAnimationFrame(load);
}

async function load(animaName) {
  // Wait until the AssetManager has loaded all resources, then load the skeletons.
  if (assetManager.isLoadingComplete()) {
    spineboy = await loadSpineboy(animaName, true);
    controlSpin("close");
    lastFrameTime = Date.now() / 1000;
    requestAnimationFrame(render); // Loading is done, call render every frame.
  } else {
    requestAnimationFrame(load);
  }
}
// 自定义逻辑
const renderBtn = (actionNameArr) => {
  const btnPanel = document.querySelector("#panel");
  btnPanel.innerHTML = "";
  actionNameArr.forEach((item) => {
    const btn = document.createElement("button");
    btn.textContent = item;
    btn.addEventListener("click", () => {
      window.load(item);
    });
    btnPanel.appendChild(btn);
  });
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
    skeletonData = skeletonBinary.readSkeletonData(
      assetManager.get(`${dir}${skelFile}`)
    );
  } else {
    var skeletonJson = new spine.SkeletonJson(atlasLoader);
    skeletonData = skeletonJson.readSkeletonData(
      assetManager.get(`${dir}${skelFile}`)
    );
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
  let now = Date.now() / 1000;
  let delta = now - lastFrameTime;
  lastFrameTime = now;

  // Update the MVP matrix to adjust for canvas size changes
  resize();
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

  requestAnimationFrame(render);
}
function resize() {
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  let bounds = spineboy.bounds;

  let centerX = bounds.offset.x + bounds.size.x / 2;
  let centerY = bounds.offset.y + bounds.size.y / 2;
  mvp.ortho2d(
    centerX / 20 - canvas.width / 2,
    centerY / 20 - canvas.height / 2,
    canvas.width,
    canvas.height
  );
  gl.viewport(0, 0, canvas.width, canvas.height);
}
init();
renderMemberSelect();
window.init = init;
window.load = load;
