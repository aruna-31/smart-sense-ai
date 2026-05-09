from fastapi import APIRouter, HTTPException, Request, Depends, Header
from pydantic import BaseModel
from typing import Optional

from ..services.gemini import generate_text
from ..utils.limiter import rate_limit

router = APIRouter()


class MedicalSpec(BaseModel):
    condition: str
    audience: str  # 'Student' or 'Patient'


class GenerateRequest(BaseModel):
    prompt: Optional[str] = None
    model: Optional[str] = None
    max_tokens: Optional[int] = 512
    medical: Optional[MedicalSpec] = None


@router.post("/generate")
async def generate(req: GenerateRequest, request: Request, x_user_id: Optional[str] = Header(None), _: bool = Depends(rate_limit)):
    # When 'medical' is provided, build a safe prompt server-side to enforce disclaimers and templates
    if req.medical:
        cond = req.medical.condition.strip()
        aud = (req.medical.audience or "Patient").strip().lower()
        if not cond:
            raise HTTPException(status_code=400, detail="medical.condition is required")

        if aud == 'student':
            # Educational sample/template for student notes (clearly labeled as SAMPLE)
            prompt = (
                f"SAMPLE — Educational medical note/template for a student leave for: '{cond}'.\n"
                "Label the document clearly as 'SAMPLE — For educational use only — Not a real medical record.'\n"
                "Include the following sections: Student name (placeholder), Date (placeholder), Reason for leave, Suggested rest duration,\n"
                "Optional: fictional clinician signature line and clinic name (clearly marked fictional).\n"
                "Do NOT produce any real patient identifiers or instructions for misuse. Keep the tone professional and concise."
            )
            # Not a real medical document — educational only.
        else:
            # Patient-facing guidance: longer home-care tips and general medicine classes (no dosing or personalized prescriptions)
            prompt = (
                f"Patient-facing home care information for: '{cond}'.\n"
                "Provide: a clear description of the condition in simple language, common symptoms, immediate home-care tips (what to do at home),\n"
                "warning signs / red flags that require urgent medical attention, and general classes of over-the-counter medicines commonly used (NO dosing, no personalized prescriptions).\n"
                "Finish with a clear disclaimer: 'This is general information only — not medical advice. For personal medical concerns consult a qualified healthcare professional.'"
            )

        try:
            result = await generate_text(prompt, model=req.model, max_tokens=req.max_tokens)
            if isinstance(result, dict) and 'text' in result:
                return result
            return {"text": str(result), "raw": str(result)}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    # Fallback: old behavior using freeform prompt
    if not req.prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    try:
        result = await generate_text(req.prompt, model=req.model, max_tokens=req.max_tokens)
        # Sanitize result so it's JSON serializable
        if isinstance(result, dict) and 'text' in result:
            return result
        return {"text": str(result), "raw": str(result)}
    except Exception as exc:
        return {"text": f"(dev fallback) generate error: {exc}", "raw": {"error": str(exc)}}
