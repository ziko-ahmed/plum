from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from document_generator import DocumentGenerator
import random

router = APIRouter(prefix="/api/samples", tags=["samples"])

@router.head("/approved")
@router.get("/approved")
async def get_approved_sample(flatten: bool = Query(False, description="Flatten to image to force OCR")):
    buffer = DocumentGenerator.generate_random_document(is_approved=True, flatten_to_image=flatten)
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=claim_sample_{random.randint(100,999)}.pdf"}
    )

@router.head("/rejected")
@router.get("/rejected")
async def get_rejected_sample(flatten: bool = Query(False, description="Flatten to image to force OCR")):
    buffer = DocumentGenerator.generate_random_document(is_approved=False, flatten_to_image=flatten)
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=claim_sample_{random.randint(100,999)}.pdf"}
    )
