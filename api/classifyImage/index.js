// POST /api/classify-image
// Body: raw image bytes (Content-Type: application/octet-stream)
module.exports = async function (context, req) {
  try {
    const endpoint = process.env.PREDICTION_ENDPOINT;
    const projectId = process.env.PROJECT_ID;
    const published = process.env.PUBLISHED_NAME;
    const key = process.env.PREDICTION_KEY;
    const threshold = parseFloat(process.env.THRESHOLD || "0.8");

    // Azure Functions JS (classic model) antaa raw-rungon Bufferina, kun Content-Type on application/octet-stream
    const raw = req.body;
    if (!(raw && raw.length)) {
      context.res = { status: 400, headers: { "Content-Type": "application/json" }, body: { ok: false, error: "Send image bytes with Content-Type: application/octet-stream" } };
      return;
    }

    const url = `${endpoint}/customvision/v3.0/Prediction/${projectId}/classify/iterations/${published}/image`;

    const predResp = await fetch(url, {
      method: "POST",
      headers: {
        "Prediction-Key": key,
        "Content-Type": "application/octet-stream"
      },
      body: raw
    });

    if (!predResp.ok) {
      const details = await predResp.text();
      context.res = { status: 502, headers: { "Content-Type": "application/json" }, body: { ok: false, error: "Prediction call failed", details } };
      return;
    }

    const data = await predResp.json(); // { predictions: [ { probability, tagName } ... ] }
    const predictions = (data.predictions || [])
      .map(p => ({ tag: p.tagName, prob: p.probability }))
      .sort((a, b) => b.prob - a.prob);

    const top = predictions[0] || { tag: "unknown", prob: 0 };
    const decision = top.prob >= threshold ? top.tag : "unknown";

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, threshold, topTag: top.tag, topProb: top.prob, predictions, decision }
    };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, headers: { "Content-Type": "application/json" }, body: { ok: false, error: "Server error" } };
  }
};
