const PIANO_SAMPLE_DIRS = ["ex00", "ex01", "ex02", "ex03", "ex04"];

const V2A_SAMPLE_ORDER = [
  "Hf-uMkF-gyA_000296",
  "TipVfZMxZbk_000010",
  "TY7UehpsaFQ_000144",
  "1WGfcIOLUK8_000030",
  "h8fMUaesCrA_000168",
  "B7ji5hTzBVA_000038",
  "MCiKNkQnN7w_000146",
  "UyCw7pCgYg8_000055",
  "0wzsE67O5tE_000230",
  "6V9JinlbpHw_000082",
  "nmp9yqhsjqg_000350"
];

const T2A_SAMPLE_ORDER = [
  "1WGfcIOLUK8_000030",
  "6I9BFjKBjLY_000037",
  "AfyG5j2p39g_000010",
  "Kqw--nmhaRw_000931",
  "ocsV6Tit_9E_000200"
];

const T2A_HIGH_SIM_SAMPLES = [
  {
    id: "01",
    caption: "subway train moving on tracks",
    referenceNote: "subway, metro, underground"
  },
  {
    id: "02",
    caption: "fire truck siren wailing loudly as vehicle moves past",
    referenceNote: "ambulance siren"
  },
  {
    id: "03",
    caption: "power tool drilling loudly",
    referenceNote: "electric grinder grinding"
  },
  {
    id: "04",
    caption: "thud followed by rhythmic clatter then another thud",
    referenceNote: "playing bongo"
  },
  {
    id: "05",
    caption: "Bird chirping, bird whistling",
    referenceNote: "people whistling"
  },
  {
    id: "06",
    caption: "wind blowing strongly",
    referenceNote: "wind noise"
  }
];

const PAGE_CONFIG = {
  piano: {
    kicker: "Page 1",
    title: "VGGSound-ConRet Dataset Check",
    description: "This page is a quick sanity check for the augmented dataset. Each anchor clip is shown alongside the retrieved reference audio and the corresponding generated variant so the conditioning setup is easy to verify at a glance.",
    load: loadPianoSamples,
    render: renderPianoSample
  },
  v2a: {
    kicker: "Page 2",
    title: "Audio Conditioned V2A Generation Quality Check",
    description: "This page compares ConRet (Ours), AC-Foley, and ControlFoley in two settings. Each sample first shows video-to-audio outputs without an audio reference, then provides the retrieved reference audio, followed by the reference-conditioned outputs from the same three models.",
    load: loadV2ASamples,
    render: renderV2ASample
  },
  t2a: {
    kicker: "Page 3",
    title: "Audio Conditioned T2A Generation Quality Check",
    description: "This page focuses on how the generated audio changes under different conditioning modes. The first set compares mid-sim, random, and no-reference pairs; the second set compares high-sim and no-reference pairs.",
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
  setupLazyMedia();
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
  return V2A_SAMPLE_ORDER.map((id) => {
    const basePath = `web_demo_v2a/samples/${id}`;
    return {
      id,
      anchor: `sample-${id}`,
      paths: {
        refAudio: `${basePath}/ref.wav`,
        noRefConret: `${basePath}/noref_ours.mp4`,
        noRefAcFoley: `${basePath}/noref_acf.mp4`,
        noRefControlFoley: `${basePath}/noref_cf.mp4`,
        refConret: `${basePath}/ref_ours.mp4`,
        refAcFoley: `${basePath}/ref_acf.mp4`,
        refControlFoley: `${basePath}/ref_cf.mp4`
      }
    };
  });
}

async function loadT2ASamples() {
  const mapping = await fetchJson("T2A_sample/refs_mapping.json");
  const baseSamples = await Promise.all(T2A_SAMPLE_ORDER.map(async (id, index) => {
    const sample = mapping[id];
    if (!sample) {
      throw new Error(`Missing T2A mapping for ${id}`);
    }

    const meta = await fetchJson(`T2A_sample/meta/t2a/${id}/meta.json`);

    return {
      ...sample,
      meta,
      sampleSet: "base",
      title: titleCase(sample.label),
      groupTitle: index === 0 ? "Samples 01-05" : null,
      groupDescription: index === 0 ? "Mid-sim pair / Random pair / No-ref pair" : null,
      promptText: meta.afn_caption || meta.gt_caption || sample.label,
      anchor: `sample-${id}`,
      paths: {
        refMid: `T2A_sample/ref_mid/${id}.wav`,
        refRandom: `T2A_sample/ref_random/${id}.wav`,
        genMid: `T2A_sample/gen_by_ref_mid/${id}.wav`,
        genRandom: `T2A_sample/gen_by_ref_random/${id}.wav`,
        genNoRef: `T2A_sample/gen_no_ref/${id}.wav`
      }
    };
  }));

  const highSimSamples = T2A_HIGH_SIM_SAMPLES.map((sample, index) => ({
    ...sample,
    sampleSet: "high-sim",
    title: sample.referenceNote,
    promptText: sample.caption,
    groupTitle: index === 0 ? "Samples 06-11" : null,
    groupDescription: index === 0 ? "High-sim pair / No-ref pair" : null,
    anchor: `sample-high-sim-${sample.id}`,
    paths: {
      refHigh: `inert_picked6/${sample.id}_refaudio.wav`,
      genHigh: `inert_picked6/${sample.id}_refgen.wav`,
      genNoRef: `inert_picked6/${sample.id}_noref.wav`
    }
  }));

  return [...baseSamples, ...highSimSamples];
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
  const sampleNumber = String(index + 1).padStart(2, "0");
  const noRefVideos = [
    { label: "ConRet (Ours)", videoSrc: sample.paths.noRefConret, className: "ours" },
    { label: "AC-Foley", videoSrc: sample.paths.noRefAcFoley, className: "baseline" },
    { label: "ControlFoley", videoSrc: sample.paths.noRefControlFoley, className: "baseline" }
  ];
  const refVideos = [
    { label: "ConRet (Ours)", videoSrc: sample.paths.refConret, className: "ours" },
    { label: "AC-Foley", videoSrc: sample.paths.refAcFoley, className: "baseline" },
    { label: "ControlFoley", videoSrc: sample.paths.refControlFoley, className: "baseline" }
  ];

  return `
    <section class="sample-block" id="${sample.anchor}">
      <div class="sample-head">
        <h2 class="sample-title">Sample ${sampleNumber}</h2>
      </div>

      <div class="sample-scroll">
        <div class="v2a-listening-layout">
          ${renderV2AStage({
            title: "No-reference V2A",
            body: renderV2AVideoRow(noRefVideos)
          })}

          ${renderV2AStage({
            title: "Retrieved reference audio",
            body: renderV2AReference(sample.paths.refAudio)
          })}

          ${renderV2AStage({
            title: "Reference-conditioned V2A",
            body: renderV2AVideoRow(refVideos)
          })}
        </div>
      </div>
    </section>
  `;
}

function renderV2AStage({ title, body }) {
  return `
    <section class="v2a-stage">
      <h3 class="v2a-stage-title">${escapeHtml(title)}</h3>
      ${body}
    </section>
  `;
}

function renderV2AVideoRow(videos) {
  return `
    <div class="v2a-video-row">
      ${videos.map((video) => renderV2AVideoCard(video)).join("")}
    </div>
  `;
}

function renderV2AVideoCard({ label, videoSrc, className }) {
  return `
    <div class="media-panel gen-panel v2a-output-card ${escapeHtml(className)}">
      <strong>${escapeHtml(label)}</strong>
      ${renderVideoElement(videoSrc)}
    </div>
  `;
}

function renderV2AReference(audioSrc) {
  return `
    <div class="media-panel ref-panel v2a-reference-card">
      ${renderAudioElement(audioSrc)}
    </div>
  `;
}

function renderT2ASample(sample, index) {
  const sampleNumber = String(index + 1).padStart(2, "0");
  return `
    ${renderSampleGroupHeader(sample)}
    <section class="sample-block" id="${sample.anchor}">
      <div class="sample-head">
        <span class="sample-index">Sample ${sampleNumber}</span>
        <h2 class="sample-title">${escapeHtml(sample.title)}</h2>
        ${renderT2ASampleSubtitle(sample)}
      </div>

      <div class="sample-scroll">
        <div class="t2a-pair-list">
          ${renderT2APairRows(sample)}
        </div>
      </div>
    </section>
  `;
}

function renderSampleGroupHeader(sample) {
  if (!sample.groupTitle) {
    return "";
  }

  return `
    <section class="sample-group-head">
      <h2>${escapeHtml(sample.groupTitle)}</h2>
      <p>${escapeHtml(sample.groupDescription)}</p>
    </section>
  `;
}

function renderT2ASampleSubtitle(sample) {
  if (sample.sampleSet === "high-sim") {
    return `<p class="sample-subtitle">prompt: ${escapeHtml(sample.promptText)}</p>`;
  }
  return `<p class="sample-subtitle">Prompt: ${escapeHtml(sample.promptText)}</p>`;
}

function renderT2APairRows(sample) {
  if (sample.sampleSet === "high-sim") {
    return renderT2AHighSimPairRows(sample);
  }
  return renderT2ABasePairRows(sample);
}

function renderT2ABasePairRows(sample) {
  return `
    ${renderT2APairRow({
      pairLabel: "Mid-sim pair",
      leftPanel: renderAudioPanel({
        panelClass: "ref-panel",
        tag: "Reference",
        title: "Input reference audio",
        rows: [
          { label: "Retriever score", value: formatNumber(sample.ref_mid.score) }
        ],
        audioSrc: sample.paths.refMid,
        isAvailable: true
      }),
      rightPanel: renderAudioPanel({
        panelClass: "gen-panel",
        tag: "ConRet (Ours)",
        title: "Generated output",
        rows: [],
        audioSrc: sample.paths.genMid,
        isAvailable: true
      })
    })}

    ${renderT2APairRow({
      pairLabel: "Random pair",
      leftPanel: renderAudioPanel({
        panelClass: "ref-panel",
        tag: "Reference",
        title: "Input reference audio",
        rows: [
          { label: "Retriever score", value: randomPairScore(sample) }
        ],
        audioSrc: sample.paths.refRandom,
        isAvailable: true
      }),
      rightPanel: renderAudioPanel({
        panelClass: "gen-panel",
        tag: "ConRet (Ours)",
        title: "Generated output",
        rows: [],
        audioSrc: sample.paths.genRandom,
        isAvailable: true
      })
    })}

    ${renderT2APairRow({
      pairLabel: "No-ref pair",
      leftPanel: renderInfoPanel({
        panelClass: "ref-panel",
        tag: "Reference",
        title: "No reference input",
        body: "Prompt-only generation"
      }),
      rightPanel: renderAudioPanel({
        panelClass: "gen-panel",
        tag: "ConRet (Ours)",
        title: "Generated output",
        rows: [],
        audioSrc: sample.paths.genNoRef,
        isAvailable: true
      })
    })}
  `;
}

function renderT2AHighSimPairRows(sample) {
  return `
    ${renderT2APairRow({
      pairLabel: "High-sim pair",
      leftPanel: renderAudioPanel({
        panelClass: "ref-panel",
        tag: "Reference",
        title: "Input reference audio",
        rows: [
          { label: "Reference", value: sample.referenceNote }
        ],
        audioSrc: sample.paths.refHigh,
        isAvailable: true
      }),
      rightPanel: renderAudioPanel({
        panelClass: "gen-panel",
        tag: "ConRet (Ours)",
        title: "Generated output",
        rows: [],
        audioSrc: sample.paths.genHigh,
        isAvailable: true
      })
    })}

    ${renderT2APairRow({
      pairLabel: "No-ref pair",
      leftPanel: renderInfoPanel({
        panelClass: "ref-panel",
        tag: "Reference",
        title: "No reference input",
        body: "Prompt-only generation"
      }),
      rightPanel: renderAudioPanel({
        panelClass: "gen-panel",
        tag: "ConRet (Ours)",
        title: "Generated output",
        rows: [],
        audioSrc: sample.paths.genNoRef,
        isAvailable: true
      })
    })}
  `;
}

function renderT2APairRow({ pairLabel, leftPanel, rightPanel }) {
  return `
    <div class="t2a-pair-row">
      <div class="t2a-pair-label">${escapeHtml(pairLabel)}</div>
      ${leftPanel}
      ${rightPanel}
    </div>
  `;
}

function renderVideoPanel({ panelClass, tag, title, rows, videoSrc }) {
  return `
    <div class="media-panel ${panelClass}">
      <span class="panel-tag">${escapeHtml(tag)}</span>
      <strong>${escapeHtml(title)}</strong>
      ${renderMetaList(rows)}
      ${renderVideoElement(videoSrc)}
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

function renderBareAudioCell({ panelClass, audioSrc }) {
  return `
    <div class="media-panel bare-media-cell ${panelClass}">
      ${renderAudioElement(audioSrc)}
    </div>
  `;
}

function renderBareVideoCell({ panelClass, videoSrc }) {
  return `
    <div class="media-panel bare-media-cell ${panelClass}">
      ${renderVideoElement(videoSrc)}
    </div>
  `;
}

function renderInfoPanel({ panelClass, tag, title, body }) {
  return `
    <div class="media-panel ${panelClass}">
      <span class="panel-tag">${escapeHtml(tag)}</span>
      <strong>${escapeHtml(title)}</strong>
      <div class="empty-media">${escapeHtml(body)}</div>
    </div>
  `;
}

function randomPairScore(sample) {
  if (sample?.ref_random_class?.score !== undefined && sample?.ref_random_class?.score !== null) {
    return formatNumber(sample.ref_random_class.score);
  }
  return "N/A (not retrieval-ranked)";
}

function renderVideoAudioPanel({ panelClass, tag, title, rows, videoSrc, audioSrc }) {
  return `
    <div class="media-panel ${panelClass}">
      <span class="panel-tag">${escapeHtml(tag)}</span>
      <strong>${escapeHtml(title)}</strong>
      ${renderMetaList(rows)}
      ${renderVideoElement(videoSrc)}
      ${renderAudioElement(audioSrc)}
    </div>
  `;
}

function renderAudioElement(src) {
  return `
    <div class="audio-shell">
      <audio controls preload="none" data-media-src="${src}"></audio>
    </div>
  `;
}

function renderVideoElement(src) {
  return `
    <video controls preload="none" playsinline data-media-src="${src}"></video>
  `;
}

function setupLazyMedia() {
  const mediaElements = Array.from(document.querySelectorAll("audio[data-media-src], video[data-media-src]"));
  if (mediaElements.length === 0) {
    return;
  }

  const hydrateMedia = (media) => {
    const src = media.dataset.mediaSrc;
    if (!src) {
      return;
    }

    media.src = src;
    media.removeAttribute("data-media-src");
  };

  const primeNearbyMedia = () => {
    mediaElements.forEach((media) => {
      if (!media.dataset.mediaSrc) {
        return;
      }

      const rect = media.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 480 && rect.bottom >= -240) {
        hydrateMedia(media);
      }
    });
  };

  primeNearbyMedia();

  if (!("IntersectionObserver" in window)) {
    mediaElements.forEach(hydrateMedia);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      hydrateMedia(entry.target);
      observer.unobserve(entry.target);
    });
  }, {
    rootMargin: "480px 0px"
  });

  mediaElements.forEach((media) => {
    if (!media.dataset.mediaSrc) {
      return;
    }

    const wakeMedia = () => hydrateMedia(media);
    media.addEventListener("pointerenter", wakeMedia, { once: true });
    media.addEventListener("focus", wakeMedia, { once: true });
    media.addEventListener("pointerdown", wakeMedia, { once: true, capture: true });
    media.addEventListener("touchstart", wakeMedia, { once: true, passive: true });
    observer.observe(media);
  });
}

function renderMetaList(rows) {
  if (!rows || rows.length === 0) {
    return "";
  }

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
  return renderAudioElement(src);
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
