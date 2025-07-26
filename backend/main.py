from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

from .config import settings
from .openai_vision import predict_locations
from .exif_utils import write_gps
import tempfile
import piexif
from PIL import Image
import io


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/ping")
async def ping():
    return {"status": "ok"}


@app.post("/geotag")
async def geotag(file: UploadFile = File(...)):
    if file.content_type != "image/jpeg":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG images are supported",
        )

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large (max 10MB)",
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    candidates = predict_locations(tmp_path)
    if not candidates:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="OpenAI vision failure")

    best = candidates[0]
    write_gps(tmp_path, best["latitude"], best["longitude"])

    headers = {"X-OpenAI-Confidence": str(best.get("confidence_pct"))}
    return StreamingResponse(open(tmp_path, "rb"), media_type="image/jpeg", headers=headers)


@app.post("/api/process-image")
async def process_image(image: UploadFile = File(...)):
    if image.content_type != "image/jpeg":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG images are supported",
        )

    data = await image.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large (max 10MB)",
        )

    # Estrai EXIF
    exifData = {}
    try:
        img = Image.open(io.BytesIO(data))
        exif_dict = piexif.load(img.info.get("exif", b""))
        # Data e ora
        dateTime = exif_dict["0th"].get(piexif.ImageIFD.DateTime, b"").decode() if exif_dict["0th"].get(piexif.ImageIFD.DateTime) else None
        # Camera
        make = exif_dict["0th"].get(piexif.ImageIFD.Make, b"").decode() if exif_dict["0th"].get(piexif.ImageIFD.Make) else None
        model = exif_dict["0th"].get(piexif.ImageIFD.Model, b"").decode() if exif_dict["0th"].get(piexif.ImageIFD.Model) else None
        # GPS
        gps = exif_dict.get("GPS", {})
        latitude = longitude = None
        if gps:
            def dms_to_deg(dms, ref):
                deg = dms[0][0] / dms[0][1]
                min = dms[1][0] / dms[1][1]
                sec = dms[2][0] / dms[2][1]
                val = deg + min / 60 + sec / 3600
                if ref in [b'S', b'W']:
                    val = -val
                return val
            if piexif.GPSIFD.GPSLatitude in gps and piexif.GPSIFD.GPSLatitudeRef in gps:
                latitude = dms_to_deg(gps[piexif.GPSIFD.GPSLatitude], gps[piexif.GPSIFD.GPSLatitudeRef])
            if piexif.GPSIFD.GPSLongitude in gps and piexif.GPSIFD.GPSLongitudeRef in gps:
                longitude = dms_to_deg(gps[piexif.GPSIFD.GPSLongitude], gps[piexif.GPSIFD.GPSLongitudeRef])
        # Technical
        aperture = exif_dict["Exif"].get(piexif.ExifIFD.FNumber)
        shutterSpeed = exif_dict["Exif"].get(piexif.ExifIFD.ExposureTime)
        iso = exif_dict["Exif"].get(piexif.ExifIFD.ISOSpeedRatings)
        focalLength = exif_dict["Exif"].get(piexif.ExifIFD.FocalLength)
        exifData = {
            "dateTime": dateTime,
            "camera": {"make": make, "model": model},
            "coordinates": {"latitude": latitude, "longitude": longitude},
            "technical": {
                "aperture": f"f/{aperture[0]/aperture[1]:.2f}" if aperture else None,
                "shutterSpeed": f"1/{int(1/shutterSpeed[0]*shutterSpeed[1])}" if shutterSpeed else None,
                "iso": str(iso) if iso else None,
                "focalLength": f"{focalLength[0]/focalLength[1]:.1f}mm" if focalLength else None,
            },
        }
    except Exception:
        exifData = None

    # Salva temporaneamente l'immagine
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    # AI location analysis
    candidates = predict_locations(tmp_path)
    probableLocations = []
    if candidates:
        for c in candidates:
            probableLocations.append({
                "name": c.get("place"),
                "lat": c.get("latitude"),
                "lng": c.get("longitude"),
                "confidence": c.get("confidence_pct"),
                "description": None
            })
    message = "Analisi completata con successo" if candidates else "Analisi completata, nessuna località trovata"

    return JSONResponse({
        "exifData": exifData,
        "probableLocations": probableLocations,
        "message": message
    })


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", reload=True)
