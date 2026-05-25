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

const PAGE_CONFIG = {
  piano: {
    kicker: "Page 1",
    title: "VGGSound-ConRet Dataset Check",
    description: "Samples from the augmentation corpus. Each anchor video is paired with retrieved reference audio and generated variants so the conditioning signal can be checked directly.",
    load: loadPianoSamples,
    render: renderPianoSample
  },
  v2a: {
    kicker: "Page 2",
    title: "Audio Conditioned V2A Generation Quality Check",
    description: "Shared V2A subset arranged for direct baseline comparison. Each sample is shown with three reference conditions and outputs from ConRet, AC-Foley, and ControlFoley.",
    load: loadV2ASamples,
    render: renderV2ASample
  },
  t2a: {
    kicker: "Page 3",
    title: "Audio Conditioned T2A Generation Quality Check",
    description: "Shared T2A subset with no-reference, mid-reference, and random-reference generation modes. Reference inputs and generated outputs are separated below for easier listening.",
    load: loadT2ASamples,
    render: renderT2ASample
  }
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const pageKey = document.body.dataset.page;
  const config = PAGE_CONFIG[pageKey];
  if (!config) {
    return;
  }

  setPageChrome(pageKey, config);

  try {
    const samples = await config.load();
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
  return Promise.all(
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
}

async function loadV2ASamples() {
  const mapping = await fetchJson("V2A_sample/refs_mapping.json");
  return V2A_SAMPLE_ORDER.map((id) => {
    const sample = mapping[id];
    if (!sample) {
      throw new Error(`Missing V2A mapping for ${id}`);
    }

    return {
      ...sample,
      anchor: `sample-${id}`,
      paths: {
        refGt: `V2A_sample/ref_gt/${id}.wav`,
        refMid: `V2A_sample/ref_mid/${id}.wav`,
        refRandom: `V2A_sample/ref_random/${id}.wav`,
        conretGt: `V2A_sample/gen_by_ref_gt/${id}.mp4`,
        genMid: `V2A_sample/gen_by_ref_mid/${id}.mp4`,
        genRandom: `V2A_sample/gen_by_ref_random/${id}.mp4`,
        acfGt: `V2A_sample/acf_gen_by_ref_gt/${id}.mp4`,
        acfMid: `V2A_sample/acf_gen_by_ref_mid/${id}.mp4`,
        acfRandom: `V2A_sample/acf_gen_by_ref_random/${id}.mp4`,
        cfGt: `V2A_sample/cf_gen_by_ref_gt/${id}.mp4`,
        cfMid: `V2A_sample/cf_gen_by_ref_mid/${id}.mp4`,
        cfRandom: `V2A_sample/cf_gen_by_ref_random/${id}.mp4`
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
        <span class="sample-index">Sample ${String(index + 1).padStart(2, "0")}</span>
        <h2 class="sample-title">${escapeHtml(titleCase(sample.label))}</h2>
        <p class="sample-subtitle">Text: ${escapeHtml(sample.gt_caption)}</p>
      </div>

      <div class="sample-scroll">
        <div class="sample-grid grid-3">
          ${renderVideoPanel({
          panelClass: "piano-panel",
          tag: "Anchor video",
          title: "Ground-truth clip",
          rows: [
            { label: "Label", value: titleCase(sample.label) },
            { label: "Text", value: sample.gt_caption }
          ],
          videoSrc: sample.paths.gtVideo
        })}

        ${renderVideoAudioPanel({
          panelClass: "ref-panel piano-panel",
          tag: "Reference A",
          title: "Retrieved reference and generated result",
          rows: [
            { label: "Label", value: titleCase(sample.label) },
            { label: "Text", value: pair.aug_a_prompt },
            { label: "Retriever score", value: formatNumber(sample.ref_a.score) }
          ],
          videoSrc: sample.paths.augAVideo,
          audioSrc: sample.paths.refA
        })}

        ${renderVideoAudioPanel({
          panelClass: "ref-panel piano-panel",
          tag: "Reference B",
          title: "Retrieved reference and generated result",
          rows: [
            { label: "Label", value: titleCase(sample.label) },
            { label: "Text", value: pair.aug_b_prompt },
            { label: "Retriever score", value: formatNumber(sample.ref_b.score) }
          ],
          videoSrc: sample.paths.augBVideo,
          audioSrc: sample.paths.refB
        })}
        </div>
      </div>
    </section>
  `;
}

function renderV2ASample(sample, index) {
  return `
    <section class="sample-block" id="${sample.anchor}">
      <div class="sample-head">
        <span class="sample-index">Sample ${String(index + 1).padStart(2, "0")}</span>
        <h2 class="sample-title">${escapeHtml(titleCase(sample.label))}</h2>
      </div>

      <div class="sample-scroll">
        <div class="v2a-matrix-head">
          <div class="matrix-head-cell">Reference</div>
          <div class="matrix-head-cell">ConRet</div>
          <div class="matrix-head-cell">AC-Foley</div>
          <div class="matrix-head-cell">ControlFoley</div>
        </div>

        <div class="sample-grid grid-4">
          ${renderV2ARow({
          rowLabel: "Reference GT",
          refTitle: "Ground-truth reference audio",
          refRows: [
            { label: "Label", value: titleCase(sample.label) },
            { label: "Text", value: "Ground-truth reference audio" },
            { label: "Retriever score", value: "-" }
          ],
          refAudioSrc: sample.paths.refGt,
          conretVideoSrc: sample.paths.conretGt,
          acfVideoSrc: sample.paths.acfGt,
          cfVideoSrc: sample.paths.cfGt,
          label: sample.label,
          text: "Ground-truth reference audio"
        })}

        ${renderV2ARow({
          rowLabel: "Reference Mid",
          refTitle: "Mid-sim retrieval reference",
          refRows: [
            { label: "Label", value: titleCase(sample.label) },
            { label: "Text", value: "Mid-sim retrieval reference" },
            { label: "Retriever score", value: formatNumber(sample.ref_mid.score) }
          ],
          refAudioSrc: sample.paths.refMid,
          conretVideoSrc: sample.paths.genMid,
          acfVideoSrc: sample.paths.acfMid,
          cfVideoSrc: sample.paths.cfMid,
          label: sample.label,
          text: "Mid-sim retrieval reference"
        })}

        ${renderV2ARow({
          rowLabel: "Reference Random",
          refTitle: "Random same-class reference",
          refRows: [
            { label: "Label", value: titleCase(sample.label) },
            { label: "Text", value: "Random same-class reference" },
            { label: "Retriever score", value: "-" }
          ],
          refAudioSrc: sample.paths.refRandom,
          conretVideoSrc: sample.paths.genRandom,
          acfVideoSrc: sample.paths.acfRandom,
          cfVideoSrc: sample.paths.cfRandom,
          label: sample.label,
          text: "Random same-class reference"
        })}
        </div>
      </div>
    </section>
  `;
}

function renderV2ARow({
  rowLabel,
  refTitle,
  refRows,
  refAudioSrc,
  conretVideoSrc,
  acfVideoSrc,
  cfVideoSrc,
  label,
  text
}) {
  const commonRows = [
    { label: "Label", value: titleCase(label) },
    { label: "Text", value: text }
  ];

  return `
    ${renderAudioPanel({
      panelClass: "ref-panel v2a-panel",
      tag: rowLabel,
      title: refTitle,
      rows: refRows,
      audioSrc: refAudioSrc,
      isAvailable: true
    })}
    ${renderVideoPanel({
      panelClass: "gen-panel v2a-panel",
      tag: "ConRet",
      title: "Generated video",
      rows: commonRows,
      videoSrc: conretVideoSrc
    })}
    ${renderVideoPanel({
      panelClass: "gen-panel v2a-panel",
      tag: "AC-Foley",
      title: "Generated video",
      rows: commonRows,
      videoSrc: acfVideoSrc
    })}
    ${renderVideoPanel({
      panelClass: "gen-panel v2a-panel",
      tag: "ControlFoley",
      title: "Generated video",
      rows: commonRows,
      videoSrc: cfVideoSrc
    })}
  `;
}

function renderT2ASample(sample, index) {
  return `
    <section class="sample-block" id="${sample.anchor}">
      <div class="sample-head">
        <span class="sample-index">Sample ${String(index + 1).padStart(2, "0")}</span>
        <h2 class="sample-title">${escapeHtml(titleCase(sample.label))}</h2>
      </div>

      <div class="audio-group">
        <div class="audio-group-head">
          <h3>Reference Audio</h3>
          <p>Inputs provided to the model.</p>
        </div>
        <div class="sample-scroll">
          <div class="sample-grid grid-2">
            ${renderAudioPanel({
            panelClass: "ref-panel",
            tag: "Reference",
            title: "Mid-sim retrieval reference",
            rows: [
              { label: "Label", value: titleCase(sample.label) },
              { label: "Text", value: sample.label },
              { label: "Retriever score", value: formatNumber(sample.ref_mid.score) }
            ],
            audioSrc: sample.paths.refMid,
            isAvailable: true
          })}

          ${renderAudioPanel({
            panelClass: "ref-panel",
            tag: "Reference",
            title: "Random same-class reference",
            rows: [
              { label: "Label", value: titleCase(sample.label) },
              { label: "Text", value: sample.label }
            ],
            audioSrc: sample.paths.refRandom,
            isAvailable: true
          })}
          </div>
        </div>
      </div>

      <div class="audio-group">
        <div class="audio-group-head">
          <h3>Generated Audio</h3>
          <p>Outputs for the same label under different conditioning modes.</p>
        </div>
        <div class="sample-scroll">
          <div class="sample-grid grid-3-wide">
            ${renderAudioPanel({
            panelClass: "gen-panel",
            tag: "Generation",
            title: "Mid-conditioned generation",
            rows: [
              { label: "Label", value: titleCase(sample.label) },
              { label: "Text", value: sample.label }
            ],
            audioSrc: sample.paths.genMid,
            isAvailable: true
          })}

          ${renderAudioPanel({
            panelClass: "gen-panel",
            tag: "Generation",
            title: "Random-conditioned generation",
            rows: [
              { label: "Label", value: titleCase(sample.label) },
              { label: "Text", value: sample.label }
            ],
            audioSrc: sample.paths.genRandom,
            isAvailable: true
          })}

          ${renderAudioPanel({
            panelClass: "gen-panel",
            tag: "Generation",
            title: "No-reference generation",
            rows: [
              { label: "Label", value: titleCase(sample.label) },
              { label: "Text", value: sample.label }
            ],
            audioSrc: sample.paths.genNoRef,
            isAvailable: true
          })}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderVideoPanel({ panelClass, tag, title, rows, videoSrc }) {
  return `
    <div class="media-panel ${panelClass}">
      <span class="panel-tag">${escapeHtml(tag)}</span>
      <strong>${escapeHtml(title)}</strong>
      ${renderMetaList(rows)}
      <video controls preload="metadata" playsinline src="${videoSrc}"></video>
    </div>
  `;
}

function renderAudioPanel({ panelClass, tag, title, rows, audioSrc, isAvailable }) {
  return `
    <div class="media-panel ${panelClass}">
      <span class="panel-tag">${escapeHtml(tag)}</span>
      <strong>${escapeHtml(title)}</strong>
      ${renderMetaList(rows)}
      ${renderAudioOrMissing(isAvailable, audioSrc, "Reference audio is not included in the shared folder.")}
    </div>
  `;
}

function renderVideoAudioPanel({ panelClass, tag, title, rows, videoSrc, audioSrc }) {
  return `
    <div class="media-panel ${panelClass}">
      <span class="panel-tag">${escapeHtml(tag)}</span>
      <strong>${escapeHtml(title)}</strong>
      ${renderMetaList(rows)}
      <video controls preload="metadata" playsinline src="${videoSrc}"></video>
      <audio controls preload="metadata" src="${audioSrc}"></audio>
    </div>
  `;
}

function renderMetaList(rows) {
  return `
    <div class="meta-list">
      ${rows.map((row) => `
        <div class="meta-row"><span>${escapeHtml(row.label)}:</span> ${escapeHtml(row.value)}</div>
      `).join("")}
    </div>
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
