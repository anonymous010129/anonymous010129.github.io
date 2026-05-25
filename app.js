const PIANO_SAMPLE_DIRS = ["ex00", "ex01", "ex02", "ex03", "ex04"];

const V2A_SAMPLE_ORDER = [
  "1WGfcIOLUK8_000030",
  "6I9BFjKBjLY_000037",
  "7l_TPfOhh5c_000570",
  "aDTCjyFFbkA_000142",
  "h8fMUaesCrA_000168",
  "KDE80kI1Kf0_000040",
  "kf0YrFpuNKQ_000030",
  "Kqw--nmhaRw_000931",
  "ocsV6Tit_9E_000200",
  "zd3SKCVbaWg_000001"
];

const T2A_SAMPLE_ORDER = [
  "1WGfcIOLUK8_000030",
  "6I9BFjKBjLY_000037",
  "AfyG5j2p39g_000010",
  "Kqw--nmhaRw_000931",
  "ocsV6Tit_9E_000200"
];

const V2A_MISSING_REFERENCE_AUDIO = {
  zd3SKCVbaWg_000001: {
    refMid: true,
    refRandom: true
  }
};

const PAGE_CONFIG = {
  piano: {
    kicker: "Page 1 of 3",
    title: "VGGSound-ConRet Dataset Check",
    description: "Shared piano retrieval pairs for side-by-side review of the ground-truth clip and two audio-conditioned variants. Each example keeps the retrieved reference audio next to the generated result so the conditioning intent is easy to verify.",
    toolbarNote: "All 5 shared piano examples are included.",
    jumpLabel: "Jump to example",
    load: loadPianoSamples,
    summary: (samples) => [
      { label: "Examples", value: String(samples.length) },
      { label: "Views", value: "GT + 2 variants" },
      { label: "Shared refs", value: `${samples.length * 2} audio files` }
    ],
    render: renderPianoSample
  },
  v2a: {
    kicker: "Page 2 of 3",
    title: "Audio Conditioned V2A Generation Quality Check",
    description: "A focused set of 10 shared V2A samples selected from the delivered folder contents. Each sample exposes the retrieved reference audio for both conditions together with the corresponding generated video output for quick qualitative comparison.",
    toolbarNote: "Using all 10 shared V2A sample IDs. One sample only includes generated videos in the shared folder, so its reference audio is marked unavailable.",
    jumpLabel: "Jump to sample",
    load: loadV2ASamples,
    summary: (samples) => [
      { label: "Sample IDs", value: String(samples.length) },
      { label: "Playable outputs", value: `${samples.length * 2} videos` },
      { label: "Selection", value: "Shared folder only" }
    ],
    render: renderV2ASample
  },
  t2a: {
    kicker: "Page 3 of 3",
    title: "Audio Conditioned T2A Generation Quality Check",
    description: "All shared T2A samples are presented with their no-reference generation, mid-reference generation, random-class reference generation, and the original shared reference audios when available.",
    toolbarNote: "All 5 shared T2A sample IDs are included.",
    jumpLabel: "Jump to sample",
    load: loadT2ASamples,
    summary: (samples) => [
      { label: "Sample IDs", value: String(samples.length) },
      { label: "Playable outputs", value: `${samples.length * 3} audios` },
      { label: "Reference sets", value: `${samples.length * 2} audios` }
    ],
    render: renderT2ASample
  }
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const pageKey = document.body.dataset.page || "piano";
  const config = PAGE_CONFIG[pageKey];
  if (!config) {
    return;
  }

  setPageChrome(pageKey, config);

  try {
    const samples = await config.load();
    renderSummary(config.summary(samples));
    renderToolbar(config, samples);
    renderSamples(samples, config.render);
  } catch (error) {
    renderError(error);
  }
}

function setPageChrome(pageKey, config) {
  document.getElementById("page-kicker").textContent = config.kicker;
  document.getElementById("page-title").textContent = config.title;
  document.getElementById("page-description").textContent = config.description;

  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.nav === pageKey);
  });
}

function renderSummary(metrics) {
  const summaryStrip = document.getElementById("summary-strip");
  summaryStrip.innerHTML = metrics.map((metric) => `
    <div class="summary-metric">
      <span class="summary-label">${escapeHtml(metric.label)}</span>
      <span class="summary-value">${escapeHtml(metric.value)}</span>
    </div>
  `).join("");
}

function renderToolbar(config, samples) {
  const toolbar = document.getElementById("toolbar");
  const options = samples.map((sample, index) => `
    <option value="${sample.anchor}">${escapeHtml(optionLabel(sample, index))}</option>
  `).join("");

  toolbar.innerHTML = `
    <div class="toolbar-note">${escapeHtml(config.toolbarNote)}</div>
    <div class="jump-wrap">
      <label for="jump-select">${escapeHtml(config.jumpLabel)}</label>
      <select id="jump-select">
        <option value="">Select a sample</option>
        ${options}
      </select>
    </div>
  `;

  const jumpSelect = document.getElementById("jump-select");
  jumpSelect.addEventListener("change", (event) => {
    const targetId = event.target.value;
    if (!targetId) {
      return;
    }
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderSamples(samples, renderer) {
  const content = document.getElementById("content");
  content.innerHTML = samples.map((sample, index) => renderer(sample, index)).join("");
}

function renderError(error) {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="state-message is-error">
      Failed to load the shared sample metadata.<br>
      ${escapeHtml(error.message)}
    </div>
  `;
}

async function loadPianoSamples() {
  const metas = await Promise.all(
    PIANO_SAMPLE_DIRS.map(async (dir) => {
      const meta = await fetchJson(`piano/${dir}/meta.json`);
      return {
        ...meta,
        exampleId: dir,
        anchor: `sample-${dir}`,
        paths: {
          gtVideo: `piano/${dir}/video_gt.mp4`,
          augAVideo: `piano/${dir}/video_aug_a.mp4`,
          augBVideo: `piano/${dir}/video_aug_b.mp4`,
          refA: `piano/${dir}/ref_a.wav`,
          refB: `piano/${dir}/ref_b.wav`
        }
      };
    })
  );

  return metas;
}

async function loadV2ASamples() {
  const mapping = await fetchJson("V2A_sample/refs_mapping.json");
  return V2A_SAMPLE_ORDER.map((id) => {
    const sample = mapping[id];
    if (!sample) {
      throw new Error(`Missing V2A mapping for ${id}`);
    }
    const missingAudio = V2A_MISSING_REFERENCE_AUDIO[id] || {};
    return {
      ...sample,
      id,
      anchor: `sample-${id}`,
      available: {
        refMid: !missingAudio.refMid,
        refRandom: !missingAudio.refRandom
      },
      paths: {
        refMid: `V2A_sample/ref_mid/${id}.wav`,
        refRandom: `V2A_sample/ref_random/${id}.wav`,
        genMid: `V2A_sample/gen_by_ref_mid/${id}.mp4`,
        genRandom: `V2A_sample/gen_by_ref_random/${id}.mp4`
      }
    };
  });
}

async function loadT2ASamples() {
  const mapping = await fetchJson("T2A_sample/refs_mapping.json");
  return T2A_SAMPLE_ORDER.map((id) => {
    const sample = mapping[id];
    if (!sample) {
      throw new Error(`Missing T2A mapping for ${id}`);
    }
    return {
      ...sample,
      id,
      anchor: `sample-${id}`,
      paths: {
        refMid: `T2A_sample/ref_mid/${id}.wav`,
        refRandom: `T2A_sample/ref_random/${id}.wav`,
        genMid: `T2A_sample/gen_by_ref_mid/${id}.wav`,
        genRandom: `T2A_sample/gen_by_ref_random/${id}.wav`,
        genNoRef: `T2A_sample/gen_no_ref/${id}.wav`
      }
    };
  });
}

function renderPianoSample(sample, index) {
  const pair = sample.pair;
  return `
    <section class="sample-block" id="${sample.anchor}">
      <div class="sample-head">
        <div class="sample-title-wrap">
          <span class="sample-index">Example ${String(index + 1).padStart(2, "0")}</span>
          <h2 class="sample-title">${escapeHtml(titleCase(sample.label))}</h2>
          <p class="sample-subtitle">${escapeHtml(sample.gt_caption)}</p>
        </div>
        <div class="meta-pills">
          <span class="meta-pill">${escapeHtml(sample.vid_id)}</span>
          <span class="meta-pill">cos sim ${formatNumber(pair.cos_sim)}</span>
        </div>
      </div>

      <div class="sample-grid grid-3">
        <div class="media-panel">
          <strong>Ground Truth Video</strong>
          <p class="media-copy">${escapeHtml(sample.gt_caption)}</p>
          <video controls preload="metadata" playsinline src="${sample.paths.gtVideo}"></video>
          <div class="caption-block">
            <div class="detail-list">
              <span>Label: ${escapeHtml(sample.label)}</span>
              <span>Original video id: ${escapeHtml(sample.vid_id)}</span>
            </div>
          </div>
        </div>

        <div class="media-panel">
          <strong>Condition A</strong>
          <p class="prompt-text">${escapeHtml(pair.aug_a_prompt)}</p>
          <video controls preload="metadata" playsinline src="${sample.paths.augAVideo}"></video>
          <audio controls preload="metadata" src="${sample.paths.refA}"></audio>
          <div class="caption-block">
            <div class="detail-list">
              <span>Ref key: ${escapeHtml(sample.ref_a.db_key)}</span>
              <span>Retriever score: ${formatNumber(sample.ref_a.score)}</span>
              <span>Prompt type: ${escapeHtml(pair.ptype_a)} / ${escapeHtml(pair.seed_a)}</span>
            </div>
          </div>
        </div>

        <div class="media-panel">
          <strong>Condition B</strong>
          <p class="prompt-text">${escapeHtml(pair.aug_b_prompt)}</p>
          <video controls preload="metadata" playsinline src="${sample.paths.augBVideo}"></video>
          <audio controls preload="metadata" src="${sample.paths.refB}"></audio>
          <div class="caption-block">
            <div class="detail-list">
              <span>Ref key: ${escapeHtml(sample.ref_b.db_key)}</span>
              <span>Retriever score: ${formatNumber(sample.ref_b.score)}</span>
              <span>Prompt type: ${escapeHtml(pair.ptype_b)} / ${escapeHtml(pair.seed_b)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderV2ASample(sample, index) {
  return `
    <section class="sample-block" id="${sample.anchor}">
      <div class="sample-head">
        <div class="sample-title-wrap">
          <span class="sample-index">Sample ${String(index + 1).padStart(2, "0")}</span>
          <h2 class="sample-title">${escapeHtml(titleCase(sample.label))}</h2>
          <p class="sample-subtitle">${escapeHtml(sample.id)}</p>
        </div>
        <div class="meta-pills">
          <span class="meta-pill">${sample.n_refs_in_json} refs in JSON</span>
          <span class="meta-pill">mid rank ${sample.ref_mid.rank + 1}</span>
          <span class="meta-pill">mid score ${formatNumber(sample.ref_mid.score)}</span>
        </div>
      </div>

      <div class="sample-grid grid-4">
        <div class="media-panel">
          <strong>Mid Reference Audio</strong>
          <p class="media-copy">${escapeHtml(sample.ref_mid.id)}</p>
          ${renderAudioOrMissing(sample.available.refMid, sample.paths.refMid, "Shared folder does not include this reference audio file.")}
          <div class="caption-block">
            <div class="detail-list">
              <span>Rank: ${sample.ref_mid.rank + 1}</span>
              <span>Score: ${formatNumber(sample.ref_mid.score)}</span>
              ${sample.ref_mid.note ? `<span>Note: ${escapeHtml(sample.ref_mid.note)}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="media-panel">
          <strong>Generated Video from Mid Ref</strong>
          <p class="media-copy">${escapeHtml(titleCase(sample.label))}</p>
          <video controls preload="metadata" playsinline src="${sample.paths.genMid}"></video>
          <p class="media-subcopy">Conditioned by the mid-ranked retrieved reference.</p>
        </div>

        <div class="media-panel">
          <strong>Random-Class Reference Audio</strong>
          <p class="media-copy">${escapeHtml(sample.ref_random_class.id)}</p>
          ${renderAudioOrMissing(sample.available.refRandom, sample.paths.refRandom, "Shared folder does not include this reference audio file.")}
          <div class="caption-block">
            <div class="detail-list">
              <span>Reference label: ${escapeHtml(sample.ref_random_class.label)}</span>
            </div>
          </div>
        </div>

        <div class="media-panel">
          <strong>Generated Video from Random Ref</strong>
          <p class="media-copy">${escapeHtml(titleCase(sample.label))}</p>
          <video controls preload="metadata" playsinline src="${sample.paths.genRandom}"></video>
          <p class="media-subcopy">Conditioned by a same-class random reference.</p>
        </div>
      </div>
    </section>
  `;
}

function renderT2ASample(sample, index) {
  return `
    <section class="sample-block" id="${sample.anchor}">
      <div class="sample-head">
        <div class="sample-title-wrap">
          <span class="sample-index">Sample ${String(index + 1).padStart(2, "0")}</span>
          <h2 class="sample-title">${escapeHtml(titleCase(sample.label))}</h2>
          <p class="sample-subtitle">${escapeHtml(sample.id)}</p>
        </div>
        <div class="meta-pills">
          <span class="meta-pill">${sample.n_refs_in_json} refs in JSON</span>
          <span class="meta-pill">mid score ${formatNumber(sample.ref_mid.score)}</span>
        </div>
      </div>

      <div class="sample-grid grid-5">
        <div class="media-panel">
          <strong>Mid Reference Audio</strong>
          <p class="media-copy">${escapeHtml(sample.ref_mid.id)}</p>
          <audio controls preload="metadata" src="${sample.paths.refMid}"></audio>
          <div class="caption-block">
            <div class="detail-list">
              <span>Rank: ${sample.ref_mid.rank + 1}</span>
              <span>Score: ${formatNumber(sample.ref_mid.score)}</span>
              ${sample.ref_mid.note ? `<span>Note: ${escapeHtml(sample.ref_mid.note)}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="media-panel">
          <strong>Generated Audio from Mid Ref</strong>
          <p class="media-copy">${escapeHtml(titleCase(sample.label))}</p>
          <audio controls preload="metadata" src="${sample.paths.genMid}"></audio>
        </div>

        <div class="media-panel">
          <strong>Random-Class Reference Audio</strong>
          <p class="media-copy">${escapeHtml(sample.ref_random_class.id)}</p>
          <audio controls preload="metadata" src="${sample.paths.refRandom}"></audio>
          <div class="caption-block">
            <div class="detail-list">
              <span>Reference label: ${escapeHtml(sample.ref_random_class.label)}</span>
            </div>
          </div>
        </div>

        <div class="media-panel">
          <strong>Generated Audio from Random Ref</strong>
          <p class="media-copy">${escapeHtml(titleCase(sample.label))}</p>
          <audio controls preload="metadata" src="${sample.paths.genRandom}"></audio>
        </div>

        <div class="media-panel">
          <strong>Generated Audio without Ref</strong>
          <p class="media-copy">${escapeHtml(titleCase(sample.label))}</p>
          <audio controls preload="metadata" src="${sample.paths.genNoRef}"></audio>
        </div>
      </div>
    </section>
  `;
}

function renderAudioOrMissing(isAvailable, src, message) {
  if (!isAvailable) {
    return `<div class="empty-media">${escapeHtml(message)}</div>`;
  }
  return `<audio controls preload="metadata" src="${src}"></audio>`;
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json();
}

function optionLabel(sample, index) {
  const token = sample.exampleId || sample.id || String(index + 1);
  const label = sample.label ? titleCase(sample.label) : token;
  return `${String(index + 1).padStart(2, "0")} - ${label}`;
}

function formatNumber(value) {
  return Number(value).toFixed(4);
}

function titleCase(text) {
  return String(text)
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
