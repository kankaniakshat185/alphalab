import logging
import os
import re

import httpx

logger = logging.getLogger("alphalab.worker.verdicts")

# Hard caps for layout safety
MAX_WORDS = 20
MAX_CHARACTERS = 120


def _get_api_key():
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    return gemini_key, openai_key


def clean_verdict(text: str) -> str:
    """Enforce layout constraints: strip quotes, limit to 1 sentence, and truncate to hard char cap."""
    if not text:
        return ""

    # Strip common markdown wrapper formatting
    text = text.strip().replace('"', "").replace("'", "")

    # Take only the first sentence
    sentences = re.split(r"(?<=[.!?])\s+", text)
    if sentences:
        text = sentences[0]

    # Hard length truncation
    if len(text) > MAX_CHARACTERS:
        text = text[: MAX_CHARACTERS - 3].strip() + "..."

    return text


def call_llm(prompt: str) -> str | None:
    """Invokes either Gemini or OpenAI API via raw HTTP request depending on environment keys."""
    gemini_key, openai_key = _get_api_key()

    try:
        if gemini_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 60},
            }
            with httpx.Client(timeout=8.0) as client:
                res = client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return clean_verdict(raw_text)
                else:
                    logger.warning(
                        f"Gemini API returned status code {res.status_code}: {res.text}"
                    )

        elif openai_key:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {openai_key}",
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 60,
            }
            with httpx.Client(timeout=8.0) as client:
                res = client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    return clean_verdict(raw_text)
                else:
                    logger.warning(
                        f"OpenAI API returned status code {res.status_code}: {res.text}"
                    )

    except Exception as e:
        logger.error(f"Error invoking LLM API: {e}")

    return None


def get_sharpe_verdict(sharpe: float, daily_mean: float, daily_std: float) -> str:
    """Generate Sharpe Ratio verdict with rule-based fallback."""
    # 1. Fallback Rule
    if sharpe < 0.5:
        fallback = "Weak risk-adjusted returns — the strategy does not generate meaningful risk-adjusted performance."
    elif sharpe >= 1.0:
        fallback = "Strong risk-adjusted returns — the strategy demonstrates excellent premium capture."
    else:
        fallback = "Moderate risk-adjusted returns — the strategy generates baseline performance with normal risk."

    prompt = (
        f"Analyze the Sharpe ratio of a quantitative factor strategy:\n"
        f"- Sharpe Ratio: {sharpe:.4f}\n"
        f"- Daily Return Mean: {daily_mean:.6f}\n"
        f"- Daily Return Std: {daily_std:.6f}\n\n"
        f"Provide a structured diagnostic verdict on the strategy's risk-adjusted returns.\n"
        f"Constraints:\n"
        f"- Exactly one sentence.\n"
        f"- Under 20 words.\n"
        f"- Focus strictly on what these numbers mean for risk-adjusted returns.\n"
    )

    verdict = call_llm(prompt)
    return verdict if verdict else clean_verdict(fallback)


def get_ic_verdict(ic: float) -> str:
    """Generate Information Coefficient verdict with rule-based fallback."""
    if ic < 0:
        fallback = "Anti-predictive signal — the factor has negative correlation to forward returns."
    elif ic >= 0.05:
        fallback = "Strong predictive power — the factor shows meaningful correlation to forward returns."
    else:
        fallback = "Weak predictive signal — the factor correlation to forward returns is near-zero."

    prompt = (
        f"Analyze the Information Coefficient (IC) of a quantitative alpha factor:\n"
        f"- Mean IC: {ic:.4f}\n\n"
        f"Provide a structured diagnostic verdict on the factor's predictive strength.\n"
        f"Constraints:\n"
        f"- Exactly one sentence.\n"
        f"- Under 20 words.\n"
        f"- Focus strictly on what this number means for alpha predictability.\n"
    )

    verdict = call_llm(prompt)
    return verdict if verdict else clean_verdict(fallback)


def get_mdd_verdict(mdd: float, peak_date: str, trough_date: str) -> str:
    """Generate Max Drawdown verdict with rule-based fallback."""
    if mdd > 0.30:
        fallback = "Severe drawdown risk — the strategy suffers extreme historical peak-to-trough declines."
    else:
        fallback = "Controlled drawdown risk — the strategy retains tight peak-to-trough bounds."

    prompt = (
        f"Analyze the Max Drawdown (MDD) of a quantitative factor strategy:\n"
        f"- Max Drawdown: {mdd * 100:.2f}%\n"
        f"- Peak Date: {peak_date}\n"
        f"- Trough Date: {trough_date}\n\n"
        f"Provide a structured diagnostic verdict on the strategy's downside risk.\n"
        f"Constraints:\n"
        f"- Exactly one sentence.\n"
        f"- Under 20 words.\n"
        f"- Focus strictly on what these numbers mean for capital preservation.\n"
    )

    verdict = call_llm(prompt)
    return verdict if verdict else clean_verdict(fallback)


def get_robustness_verdict(
    overall_score: float,
    baseline_sharpe: float,
    stressed_sharpe_avg: float,
    failure_reasons: dict | None,
) -> str:
    """Generate Robustness Score verdict with rule-based fallback."""
    if overall_score < 0.80:
        fallback = "Flagged as overfit — the factor decays significantly under synthetic stress perturbations."
    else:
        fallback = "Highly robust factor — performance survives synthetic pricing noise and bar drops."

    prompt = (
        f"Analyze the robustness stress test results of a quantitative alpha factor:\n"
        f"- Robustness Score: {overall_score:.4f} (Threshold: 0.80)\n"
        f"- Baseline Sharpe: {baseline_sharpe:.4f}\n"
        f"- Stressed Sharpe (Average): {stressed_sharpe_avg:.4f}\n"
        f"- Failure Reasons / Sensitive Areas: {failure_reasons}\n\n"
        f"Provide a structured diagnostic verdict on the factor's robustness and stability.\n"
        f"Constraints:\n"
        f"- Exactly one sentence.\n"
        f"- Under 20 words.\n"
        f"- Focus strictly on whether the factor is overfit or stable.\n"
    )

    verdict = call_llm(prompt)
    return verdict if verdict else clean_verdict(fallback)
