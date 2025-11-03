// Azure Functions (Node 18+) — käyttää globaalia fetchiä
module.exports = async function (context, req) {
  try {
    const { imageUrl } = req.body || {};

    if (!imageUrl || typeof imageUrl !== "string") {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { ok: false, error: 'Provide JSON body: { "imageUrl": "https://..." }' }
      };
      return;
    }

    const endpoint = process.env.PREDICTION_ENDPOINT;
    const projectId = process.env.PROJECT_ID;
    const published = process.env.PUBLISHED_NAME;
    const key = process.env.PREDICTION_KEY;
    const threshold = parseFloat(process.env.THRESHOLD || "0.8");

    const url = `${endpoint}/customvision/v3.0/Prediction/${projectId}/classify/iterations/${published}/url`;

    const predResp = await fetch(url, {
      method: "POST",
      headers: {
        "Prediction-Key": key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ Url: imageUrl })
    });

    if (!predResp.ok) {
      const details = await predResp.text();
      context.res = {
        status: 502,
        headers: { "Content-Type": "application/json" },
        body: { ok: false, error: "Prediction call failed", details }
      };
      return;
    }

    const predData = await predResp.json(); // { id, project, iteration, created, predictions: [{ probability, tagName, tagId }] }
    const predictions = (predData.predictions || [])
      .map(p => ({ tag: p.tagName, prob: p.probability }))
      .sort((a, b) => b.prob - a.prob);

    const top = predictions[0] || { tag: "unknown", prob: 0 };
    const decision = top.prob >= threshold ? top.tag : "unknown";

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        ok: true,
        threshold,
        topTag: top.tag,
        topProb: top.prob,
        predictions,
        decision
      }
    };
  } catch (err) {
    context.log.error(err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { ok: false, error: "Server error" }
    };
  }
};
